import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({
  id: z.string().optional(),
  serviceId: z.string().nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  capacity: z.number().int().min(1).max(50),
  slots: z.array(z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/)).min(1).max(12),
});

/** POST /api/admin/slot-capacity — upsert per-day slot template */
export async function POST(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid slot capacity. Slots look like 09:00-11:00.');
  const d = parsed.data;
  const data = { serviceId: d.serviceId ?? null, dayOfWeek: d.dayOfWeek, capacity: d.capacity, slotsJson: JSON.stringify(d.slots) };
  const row = d.id
    ? await prisma.slotCapacity.update({ where: { id: d.id }, data }).catch(() => null)
    : await prisma.slotCapacity.create({ data });
  if (!row) return fail('Row not found.', 404);
  await recordActivity(g.user.userId, 'SLOT_CAPACITY_SAVED', 'SlotCapacity', row.id);
  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return fail('id required');
  await prisma.slotCapacity.delete({ where: { id } }).catch(() => null);
  await recordActivity(g.user.userId, 'SLOT_CAPACITY_DELETED', 'SlotCapacity', id);
  return NextResponse.json({ ok: true });
}
