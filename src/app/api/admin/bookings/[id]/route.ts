import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logNotify, recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

export const FLOW = ['REQUESTED', 'CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'];

const Schema = z.object({
  status: z.enum(['REQUESTED', 'CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  technicianId: z.string().optional(),
  note: z.string().max(300).optional(),
});

export const STATUS_MSG: Record<string, string> = {
  CONFIRMED: 'Booking {{bookingNo}} confirmed — we will call before arrival.',
  ASSIGNED: 'Technician {{techName}} is assigned to booking {{bookingNo}} (rated {{rating}}).',
  ON_THE_WAY: 'GabiElectricals: {{techName}} is on the way to booking {{bookingNo}}.',
  IN_PROGRESS: 'GabiElectricals: work started on booking {{bookingNo}}.',
  COMPLETED: 'GabiElectricals: booking {{bookingNo}} completed. Rate your technician: {{site}}/track',
  CANCELLED: 'GabiElectricals: booking {{bookingNo}} was cancelled. Reason: {{note}}',
};

/** PATCH /api/admin/bookings/[id] — status transition + technician assignment (each writes BookingEvent + notify) */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid booking update.');
  const { status, technicianId, note } = parsed.data;

  const b = await prisma.booking.findUnique({ where: { id }, include: { technician: { include: { user: true } } } });
  if (!b) return fail('Booking not found.', 404);

  if (technicianId && technicianId !== b.technicianId) {
    const tech = await prisma.technician.findUnique({ where: { id: technicianId }, include: { user: true } });
    if (!tech) return fail('Technician not found.', 404);
    await prisma.booking.update({ where: { id }, data: { technicianId: tech.id, status: 'ASSIGNED' } });
    await prisma.bookingEvent.create({ data: { bookingId: id, status: 'ASSIGNED', note: `${tech.user.name}${note ? ` — ${note}` : ''}` } });
    await logNotify('WHATSAPP', b.contactPhone, 'TECH_ASSIGNED', STATUS_MSG.ASSIGNED.replace('{{techName}}', tech.user.name).replace('{{bookingNo}}', b.bookingNo).replace('{{rating}}', tech.rating.toFixed(1)));
    await recordActivity(g.user.userId, 'BOOKING_ASSIGNED', 'Booking', id, undefined, { technicianId: tech.id });
    return NextResponse.json({ ok: true, id, status: 'ASSIGNED' });
  }

  if (!status) return fail('Nothing to update.');
  if (status === b.status) return fail(`Booking is already ${status}.`);
  if (status !== 'CANCELLED') {
    const from = FLOW.indexOf(b.status);
    const to = FLOW.indexOf(status);
    if (to > from + 1) return fail(`Cannot jump ${b.status} → ${status}. Follow Requested → Confirmed → Assigned → On the way → In progress → Completed.`);
    if (to < from && status !== 'COMPLETED') return fail('Cannot move a booking backwards.');
    if (status === 'ASSIGNED' && !b.technicianId) return fail('Assign a technician first.');
  }
  await prisma.booking.update({ where: { id }, data: { status: status as never, ...(status === 'CANCELLED' && note ? { cancelReason: note } : {}) } });
  await prisma.bookingEvent.create({ data: { bookingId: id, status, note: note ?? null } });
  const tmpl = STATUS_MSG[status];
  if (tmpl) {
    const body = tmpl
      .replace('{{bookingNo}}', b.bookingNo)
      .replace('{{techName}}', b.technician?.user.name ?? 'our team')
      .replace('{{rating}}', (b.technician?.rating ?? 4.8).toFixed(1))
      .replace('{{note}}', note ?? 'n/a')
      .replace('{{site}}', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
    await logNotify('WHATSAPP', b.contactPhone, `BOOKING_${status}`, body);
  }
  if (status === 'COMPLETED') await prisma.technician.update({ where: { id: b.technicianId ?? '' }, data: { jobsCompleted: { increment: 1 } } }).catch(() => null);
  await recordActivity(g.user.userId, 'BOOKING_STATUS', 'Booking', id, undefined, { from: b.status, to: status });
  return NextResponse.json({ ok: true, id, status });
}
