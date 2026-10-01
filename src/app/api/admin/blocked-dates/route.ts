import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({ date: z.string(), reason: z.string().max(200).optional(), serviceId: z.string().optional() });

/** POST /api/admin/blocked-dates — block a day (all or one service) */
export async function POST(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid blocked date.');
  const d = parsed.data;
  const date = new Date(d.date);
  if (Number.isNaN(+date)) return fail('Bad date.');
  date.setHours(0, 0, 0, 0);
  const b = await prisma.blockedDate.create({ data: { date, reason: d.reason || null, serviceId: d.serviceId || null } });
  await recordActivity(g.user.userId, 'DATE_BLOCKED', 'BlockedDate', b.id);
  return NextResponse.json({ ok: true, id: b.id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return fail('id required');
  await prisma.blockedDate.delete({ where: { id } }).catch(() => null);
  await recordActivity(g.user.userId, 'DATE_UNBLOCKED', 'BlockedDate', id);
  return NextResponse.json({ ok: true });
}
