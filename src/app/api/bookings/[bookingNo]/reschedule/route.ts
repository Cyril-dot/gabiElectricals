import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { slotIsOpen } from '@/lib/booking';
import { logNotify, recordActivity } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().min(3),
  phone: z.string().optional(), // guest verification
});

const MAX_RESCHEDULES = 3;

async function loadBooking(bookingNo: string) {
  return prisma.booking.findUnique({ where: { bookingNo }, include: { service: true } });
}
async function authorize(req: Request, booking: { userId: string | null; contactPhone: string }, providedPhone?: string) {
  const s = await getSession();
  if (s && booking.userId === s.userId) return { ok: true as const, userId: s.userId };
  if (s && ['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(s.role)) return { ok: true as const, userId: s.userId };
  // guest path: must supply matching contact phone
  if (providedPhone && providedPhone.replace(/\s/g, '').endsWith(booking.contactPhone.replace(/\s/g, '').slice(-7))) {
    return { ok: true as const, userId: null };
  }
  return { ok: false as const };
}

/** POST /api/bookings/[bookingNo]/reschedule */
export async function POST(req: NextRequest, ctx: { params: Promise<{ bookingNo: string }> }) {
  const { bookingNo } = await ctx.params;
  const booking = await loadBooking(bookingNo);
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid reschedule data' }, { status: 422 });
  const { date, timeSlot, phone } = parsed.data;

  const auth = await authorize(req, booking, phone);
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized to reschedule this booking' }, { status: 403 });

  if (!['REQUESTED', 'CONFIRMED'].includes(booking.status)) {
    return NextResponse.json({ error: `Cannot reschedule a ${booking.status.toLowerCase()} booking. Call us if needed.` }, { status: 409 });
  }
  if (booking.rescheduleCount >= MAX_RESCHEDULES) {
    return NextResponse.json({ error: `Maximum of ${MAX_RESCHEDULES} reschedules reached. Contact support.` }, { status: 409 });
  }

  // must move at least 24h into the future
  const target = new Date(`${date}T${(timeSlot.split('-')[0] || '00:00')}:00`);
  if (target.getTime() - Date.now() < 24 * 3600_000) {
    return NextResponse.json({ error: 'Reschedule must be at least 24 hours from now' }, { status: 422 });
  }

  // revalidate new slot via availability engine, excluding this booking
  const open = await slotIsOpen(booking.service.slug, date, timeSlot, booking.id);
  if (!open) return NextResponse.json({ error: 'That new slot is not available. Choose another.' }, { status: 409 });

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      date: new Date(`${date}T00:00:00`), timeSlot,
      rescheduleCount: { increment: 1 },
      events: { create: [{ status: booking.status, note: `Rescheduled to ${date} ${timeSlot} (attempt ${booking.rescheduleCount + 1}/${MAX_RESCHEDULES})` }] },
    },
  });
  await recordActivity(auth.userId, 'BOOKING_RESCHEDULED', 'BOOKING', booking.id, req.headers.get('x-forwarded-for') ?? undefined, { to: `${date} ${timeSlot}` });
  await logNotify('SMS', booking.contactPhone, 'BOOKING_RESCHEDULED', `GabiElectricals: Booking ${booking.bookingNo} moved to ${date}, ${timeSlot}. Thanks for the heads up.`, auth.userId ?? undefined);
  if (booking.contactEmail) await logNotify('EMAIL', booking.contactEmail, 'BOOKING_RESCHEDULED', `Booking ${booking.bookingNo} rescheduled to ${date} ${timeSlot}.`, auth.userId ?? undefined);

  return NextResponse.json({ ok: true, bookingNo: updated.bookingNo, date, timeSlot, rescheduleCount: updated.rescheduleCount });
}
