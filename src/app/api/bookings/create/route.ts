import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getQuoteEstimate, slotIsOpen, URGENCIES, type UrgencyKey } from '@/lib/booking';
import { initiatePayment, type GatewayMethod } from '@/lib/gateway';
import { logNotify, recordActivity, trackEvent } from '@/lib/notify';
import { round2 } from '@/lib/money';

export const dynamic = 'force-dynamic';

const ghPhone = z
  .string()
  .trim()
  .regex(/^(\+?233|0)(24|25|20|54|55|59|27|26|3\d{2}?)[0-9]{7}$|^\+?233\d{8,9}$|^0\d{9,10}$/, 'Enter a valid Ghana phone (e.g. 0241234567 or +233241234567)');

const CreateSchema = z.object({
  serviceSlug: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().min(3),
  urgency: z.enum(['STANDARD', 'URGENT', 'EMERGENCY']),
  region: z.string().min(2).max(60),
  city: z.string().min(2).max(60),
  landmark: z.string().max(160).optional().or(z.literal('')),
  gps: z.string().max(20).optional().or(z.literal('')),
  description: z.string().min(10).max(2000),
  media: z.array(z.string().max(200)).max(8).default([]),
  contactName: z.string().min(2).max(80),
  contactPhone: ghPhone,
  contactEmail: z.union([z.string().email(), z.literal('')]).optional(),
  paymentMode: z.enum(['DEPOSIT', 'FULL', 'AFTER', 'QUOTE']),
  payMethod: z.enum(['MOMO_MTN', 'MOMO_TELECEL', 'MOMO_AT', 'CARD', 'BANK_TRANSFER', 'GHIPSS', 'QR']).optional(),
});

const GPS_RE = /^[A-Z]{2}-?\d{1,4}-?\d{1,5}$/i;

async function nextBookingNo(): Promise<string> {
  const year = new Date().getFullYear();
  const c = await prisma.booking.count({ where: { bookingNo: { startsWith: `GB-${year}-` } } });
  // 2100 base avoids colliding with the demo seed range (GB-2026-20xx)
  return `GB-${year}-${2100 + c}`;
}

/** POST /api/bookings/create — server-authoritative booking creation */
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input', issues: parsed.error.issues }, { status: 422 });
  }
  const d = parsed.data;

  const service = await prisma.service.findUnique({ where: { slug: d.serviceSlug } });
  if (!service || !service.active) return NextResponse.json({ error: 'Unknown or inactive service' }, { status: 404 });

  // Ghana Post GPS shape hint — reject obviously wrong executables-free but not fatal
  if (d.gps && !GPS_RE.test(d.gps.trim())) {
    return NextResponse.json({ error: 'Ghana Post GPS looks wrong. Use format like GA-123-4567.' }, { status: 422 });
  }

  // slot revalidated by the availability engine
  const open = await slotIsOpen(service.slug, d.date, d.timeSlot);
  if (!open) return NextResponse.json({ error: 'That slot just filled or the date is blocked. Pick another slot.' }, { status: 409 });

  // recompute price SERVER-side from DB base + urgency surcharge (never trust client)
  const est = await getQuoteEstimate(service.id, d.urgency as UrgencyKey);
  if (!est) return NextResponse.json({ error: 'Pricing error' }, { status: 500 });

  const s = await getSession();
  let bookingNo = await nextBookingNo();

  let booking;
  try {
    booking = await prisma.booking.create({
      data: {
        bookingNo,
        userId: s?.userId ?? null,
        serviceId: service.id,
        date: new Date(`${d.date}T00:00:00`),
        timeSlot: d.timeSlot,
        status: 'REQUESTED',
        urgency: d.urgency,
        region: d.region, city: d.city, landmark: d.landmark || null, gps: d.gps?.toUpperCase() || null,
        description: d.description,
        media: JSON.stringify(d.media),
        contactName: d.contactName, contactPhone: d.contactPhone, contactEmail: d.contactEmail || null,
        paymentMode: d.paymentMode,
        price: round2(est.total),
        depositDue: round2(est.deposit),
        events: { create: [{ status: 'REQUESTED', note: `Slot ${d.timeSlot} · ${d.city}` }] },
      },
    });
  } catch (e) {
    // bookingNo collision — retry once with random suffix
    bookingNo = `GB-${new Date().getFullYear()}-${Math.floor(5000 + Math.random() * 4000)}`;
    booking = await prisma.booking.create({
      data: {
        bookingNo, userId: s?.userId ?? null, serviceId: service.id,
        date: new Date(`${d.date}T00:00:00`), timeSlot: d.timeSlot, status: 'REQUESTED', urgency: d.urgency,
        region: d.region, city: d.city, landmark: d.landmark || null, gps: d.gps?.toUpperCase() || null,
        description: d.description, media: JSON.stringify(d.media),
        contactName: d.contactName, contactPhone: d.contactPhone, contactEmail: d.contactEmail || null,
        paymentMode: d.paymentMode, price: round2(est.total), depositDue: round2(est.deposit),
        events: { create: [{ status: 'REQUESTED', note: `Slot ${d.timeSlot} · ${d.city}` }] },
      },
    });
  }

  const link = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/booking/${booking.bookingNo}`;
  await recordActivity(s?.userId ?? null, 'BOOKING_REQUESTED', 'BOOKING', booking.id, req.headers.get('x-forwarded-for') ?? undefined, { serviceSlug: service.slug });
  await trackEvent('BOOKING', { bookingNo: booking.bookingNo, service: service.slug, urgency: d.urgency }, est.total);

  const needsPayment = d.paymentMode === 'DEPOSIT' || d.paymentMode === 'FULL';
  const amountDue = d.paymentMode === 'FULL' ? est.total : est.deposit;

  if (!needsPayment) {
    const tpl = d.paymentMode === 'QUOTE' ? 'BOOKING_REQUESTED' : 'BOOKING_CONFIRMED';
    const msg = d.paymentMode === 'QUOTE'
      ? `GabiElectricals: Quote request ${booking.bookingNo} (${service.name}) received. We'll send a fixed price within 24h.`
      : `GabiElectricals: Booking ${booking.bookingNo} for ${service.name} on ${d.date} ${d.timeSlot} received. Confirmation pending payment/tech assignment.`;
    await logNotify('SMS', d.contactPhone, tpl, msg, s?.userId);
    if (d.contactEmail) await logNotify('EMAIL', d.contactEmail, tpl, msg, s?.userId);
    return NextResponse.json({ ok: true, bookingNo: booking.bookingNo, redirect: `/booking/${booking.bookingNo}`, amountDue: 0 });
  }

  // deposit or full — initiate payment then redirect with ?pay=<ref>
  const method: GatewayMethod = (d.payMethod ?? 'MOMO_MTN') as GatewayMethod;
  const pay = await initiatePayment({
    amount: round2(amountDue),
    email: d.contactEmail || `booking-${booking.bookingNo}@gabielectricals.local`,
    phone: d.contactPhone,
    method,
    bookingId: booking.id,
    meta: { bookingNo: booking.bookingNo, paymentMode: d.paymentMode },
  });
  await logNotify('SMS', d.contactPhone, 'BOOKING_CONFIRMED', `GabiElectricals: Booking ${booking.bookingNo} created. Complete ${d.paymentMode === 'FULL' ? 'payment' : `${Math.round(service.depositPct)}% deposit`} of GHS ${round2(amountDue).toFixed(2)} to confirm: ${link}`, s?.userId);
  if (d.contactEmail) await logNotify('EMAIL', d.contactEmail, 'BOOKING_CONFIRMED', `Confirm booking ${booking.bookingNo}: pay GHS ${round2(amountDue).toFixed(2)}. ${link}`, s?.userId);

  return NextResponse.json({
    ok: true, bookingNo: booking.bookingNo,
    redirect: `/booking/${booking.bookingNo}?pay=${pay.reference}`,
    reference: pay.reference, qrPayload: pay.qrPayload, prompt: pay.prompt, pollUrl: pay.pollUrl,
    amountDue: round2(amountDue),
  }, { status: 201 });
}
