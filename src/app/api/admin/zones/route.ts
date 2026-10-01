import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { recordActivity } from '@/lib/notify';
import { rateLimit, ipOf } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  name: z.string().trim().min(2).max(80),
  regions: z.array(z.string().trim().min(1)).min(1, 'Cover at least one region'),
  fee: z.coerce.number().min(0).max(10000),
  freeOver: z.coerce.number().min(0).nullable().optional(),
  etaDays: z.coerce.number().int().min(0).max(30).default(2),
  active: z.coerce.boolean().default(true),
});

async function guard(req: Request) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch {
    return { res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }
  const ip = ipOf(req);
  const rl = rateLimit(`admin:zones:${ip}`, 30, 60_000);
  if (!rl.ok) return { res: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) } as const;
  return { ip } as const;
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (g.res) return g.res;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid zone' }, { status: 400 });
  const d = parsed.data;
  const z0 = await prisma.deliveryZone.create({ data: { name: d.name, regions: JSON.stringify(d.regions), fee: d.fee, freeOver: d.freeOver ?? null, etaDays: d.etaDays, active: d.active } });
  await recordActivity(null, 'ZONE_CREATED', 'ZONE', z0.id, g.ip, { name: d.name });
  return NextResponse.json({ ok: true, id: z0.id }, { status: 201 });
}

export async function PATCH(req: Request) {
  const g = await guard(req);
  if (g.res) return g.res;
  const body = z.object({ id: z.string().min(1) }).and(Schema.partial()).safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
  const { id, ...d } = body.data;
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) {
    if (v === undefined) continue;
    data[k] = k === 'regions' ? JSON.stringify(v) : k === 'freeOver' ? (v ?? null) : v;
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  await prisma.deliveryZone.update({ where: { id }, data });
  await recordActivity(null, 'ZONE_UPDATED', 'ZONE', id, g.ip, data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const g = await guard(req);
  if (g.res) return g.res;
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const used = await prisma.order.count({ where: { zoneId: parsed.data.id } });
  if (used > 0) {
    await prisma.deliveryZone.update({ where: { id: parsed.data.id }, data: { active: false } });
    await recordActivity(null, 'ZONE_DEACTIVATED', 'ZONE', parsed.data.id, g.ip, { orders: used });
    return NextResponse.json({ ok: true, deactivated: true, note: `Zone is on ${used} orders — deactivated instead of deleting.` });
  }
  await prisma.deliveryZone.delete({ where: { id: parsed.data.id } });
  await recordActivity(null, 'ZONE_DELETED', 'ZONE', parsed.data.id, g.ip);
  return NextResponse.json({ ok: true });
}
