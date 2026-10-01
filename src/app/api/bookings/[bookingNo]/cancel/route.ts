import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logNotify, recordActivity } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  reason: z.string().min(3).max(300),
  phone: z.string().optional(),
});

/** POST /api/bookings/[bookingNo]/cancel — free before tech assigned; flagged after. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ bookingNo: string }> }) {
  const { bookingNo } = await ctx.params;
  const booking = await prisma.booking.findUnique({ where: { bookingNo } });
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'A cancellation reason is required' }, { status: 422 });
  const { reason, phone } = parsed.data;

  const s = await getSession();
  const isStaff = s && ['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(s.role);
  const isOwner = s && booking.userId === s.userId;
  const guestMatch = !isOwner && phone && phone.replace(/\s/g, '').endsWith(booking.contactPhone.replace(/\s/g, '').slice(-7));
  if (!isStaff && !isOwner && !guestMatch) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  if (booking.status === 'CANCELLED') return NextResponse.json({ error: 'Already cancelled' }, { status: 409 });
  if (['COMPLETED', 'REVIEWED'].includes(booking.status)) return NextResponse.json({ error: 'Cannot cancel a completed job' }, { status: 409 });

  // Rules: free before technician assigned (REQUESTED/CONFIRMED); after ASSIGNED it's flagged
  const preAssign = ['REQUESTED', 'CONFIRMED'].includes(booking.status);
  const charged = !preAssign; // ASSIGNED / ON_THE_WAY / IN_PROGRESS
  const storedReason = `${charged ? '[FLAGGED · cancelled after dispatch] ' : '[free cancellation] '}${reason}`.slice(0, 300);

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'CANCELLED', cancelReason: storedReason,
      events: { create: [{ status: 'CANCELLED', note: storedReason }] },
    },
  });
  await recordActivity(s?.userId ?? null, 'BOOKING_CANCELLED', 'BOOKING', booking.id, req.headers.get('x-forwarded-for') ?? undefined, { charged, reason });
  await logNotify('SMS', booking.contactPhone, 'BOOKING_CANCELLED',
    `GabiElectricals: Booking ${booking.bookingNo} cancelled. ${charged ? 'Cancelled after dispatch — a call-out fee may apply per policy.' : 'No charge — free cancellation.'}`,
    booking.userId ?? undefined);
  if (booking.contactEmail) await logNotify('EMAIL', booking.contactEmail, 'BOOKING_CANCELLED', `Booking ${booking.bookingNo} cancelled.${charged ? ' Post-dispatch — see policy on call-out fee.' : ''}`, booking.userId ?? undefined);

  return NextResponse.json({ ok: true, bookingNo: updated.bookingNo, flagged: charged });
}
