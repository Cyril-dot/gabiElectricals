import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logNotify, recordActivity } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().min(1).max(600),
  phone: z.string().optional(),
});

/** PATCH /api/bookings/[bookingNo]/review — after COMPLETED, sets REVIEWED. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ bookingNo: string }> }) {
  const { bookingNo } = await ctx.params;
  const booking = await prisma.booking.findUnique({ where: { bookingNo } });
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Rating (1–5) and review text required' }, { status: 422 });
  const { rating, review, phone } = parsed.data;

  const s = await getSession();
  const isStaff = s && ['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(s.role);
  const isOwner = s && booking.userId === s.userId;
  const guestMatch = phone && phone.replace(/\s/g, '').endsWith(booking.contactPhone.replace(/\s/g, '').slice(-7));
  if (!isStaff && !isOwner && !guestMatch) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  if (booking.status !== 'COMPLETED' && booking.status !== 'REVIEWED') {
    return NextResponse.json({ error: 'You can only review a completed job' }, { status: 409 });
  }

  const firstReview = booking.status !== 'REVIEWED';
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'REVIEWED', rating, review,
      events: firstReview ? { create: [{ status: 'REVIEWED', note: `${rating}★ rating left` }] } : undefined,
    },
  });
  await recordActivity(s?.userId ?? null, 'BOOKING_REVIEWED', 'BOOKING', booking.id, undefined, { rating });
  await logNotify('SMS', booking.contactPhone, 'REVIEW_RECEIVED', `GabiElectricals: Thanks for rating booking ${booking.bookingNo} ${rating}★ — it helps other customers choose certified techs.`, booking.userId ?? undefined);

  // nudge the technician's reputation (demo: just log)
  return NextResponse.json({ ok: true, bookingNo: updated.bookingNo, rating, status: updated.status });
}
