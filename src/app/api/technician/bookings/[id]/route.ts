import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { logNotify, recordActivity } from '@/lib/notify';
import { rateLimit, ipOf } from '@/lib/rate-limit';
import { fail } from '@/lib/ops-api';

const FLOW = ['REQUESTED', 'CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'];

const Schema = z.object({
  action: z.enum(['status', 'note', 'media']),
  note: z.string().max(500).optional(),
  path: z.string().max(300).optional(),
});

async function me(req: NextRequest) {
  const s = await requireRole('TECHNICIAN', 'ADMIN', 'SUPER_ADMIN').catch(() => null);
  if (!s) return null;
  const rl = rateLimit(`tech:${s.userId}:${ipOf(req)}`, 10, 60_000);
  if (!rl.ok) return 'RL' as const;
  return s;
}

async function myBooking(userId: string, id: string) {
  const b = await prisma.booking.findUnique({ where: { id }, include: { service: { select: { name: true } }, technician: true } });
  if (!b) return null;
  const tech = await prisma.technician.findUnique({ where: { userId } });
  const isMe = !!tech && b.technicianId === tech.id;
  return { b, tech, isMe };
}

/** PATCH /api/technician/bookings/[id] — advance status / append note / append media (tech must own the job) */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await me(req);
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (s === 'RL') return fail('Too many requests.', 429);
  const { id } = await ctx.params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid payload.');
  const mb = await myBooking(s.userId, id);
  if (!mb) return fail('Booking not found.', 404);
  const isAdmin = s.role === 'ADMIN' || s.role === 'SUPER_ADMIN';
  if (!mb.isMe && !isAdmin) return fail('This job is not assigned to you.', 403);
  const { b, tech } = mb;
  const d = parsed.data;

  if (d.action === 'status') {
    if (!tech && !isAdmin) return fail('No technician profile found for your account.', 404);
    const idx = FLOW.indexOf(b.status);
    if (idx < 0) return fail(`Job is ${b.status} — nothing to advance.`);
    if (idx === FLOW.length - 1) return fail('Job already completed.');
    const next = FLOW[idx + 1];
    if (next === 'ASSIGNED' && !b.technicianId) {
      await prisma.booking.update({ where: { id }, data: { technicianId: tech!.id, status: 'ASSIGNED' } });
      await prisma.bookingEvent.create({ data: { bookingId: id, status: 'ASSIGNED', note: `Self-assigned ${s.name}` } });
      await logNotify('WHATSAPP', b.contactPhone, 'TECH_ASSIGNED', `GabiElectricals: ${s.name} is your technician for ${b.bookingNo}.`);
      return NextResponse.json({ ok: true, status: 'ASSIGNED' });
    }
    await prisma.booking.update({ where: { id }, data: { status: next as never } });
    await prisma.bookingEvent.create({ data: { bookingId: id, status: next, note: d.note ?? `Updated by technician ${s.name}` } });
    const msgMap: Record<string, string> = {
      ON_THE_WAY: `GabiElectricals: ${s.name} is on the way for ${b.bookingNo}.`,
      IN_PROGRESS: `GabiElectricals: work has started on ${b.bookingNo}.`,
      COMPLETED: `GabiElectricals: ${b.bookingNo} completed. Thank you! Rate us: ${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/track`,
      CONFIRMED: `GabiElectricals: booking ${b.bookingNo} confirmed for ${b.date.toDateString()} ${b.timeSlot}.`,
    };
    if (msgMap[next]) await logNotify('WHATSAPP', b.contactPhone, `BOOKING_${next}`, msgMap[next]);
    if (next === 'COMPLETED') await prisma.technician.update({ where: { id: b.technicianId ?? '' }, data: { jobsCompleted: { increment: 1 } } }).catch(() => null);
    await recordActivity(s.userId, 'TECH_BOOKING_STATUS', 'Booking', id, undefined, { to: next });
    return NextResponse.json({ ok: true, status: next });
  }

  if (d.action === 'note') {
    if (!d.note) return fail('note required');
    const stamp = new Date().toLocaleString('en-GH');
    await prisma.booking.update({ where: { id }, data: { description: `${b.description}\n[tech note ${stamp}] ${d.note}` } });
    await prisma.bookingEvent.create({ data: { bookingId: id, status: b.status, note: `Note: ${d.note}` } });
    return NextResponse.json({ ok: true });
  }

  if (d.action === 'media') {
    if (!d.path) return fail('path required — upload first via /api/upload');
    let arr: string[] = [];
    try { arr = JSON.parse(b.media); } catch { arr = []; }
    arr.push(d.path);
    await prisma.booking.update({ where: { id }, data: { media: JSON.stringify(arr) } });
    await prisma.bookingEvent.create({ data: { bookingId: id, status: b.status, note: `Photo added (${d.path})` } });
    return NextResponse.json({ ok: true, media: arr });
  }
  return fail('Unknown action.');
}
