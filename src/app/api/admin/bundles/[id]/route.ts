import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  description: z.string().max(500).optional(),
  price: z.number().min(0.01).max(1000000).optional(),
  compareAt: z.number().min(0).max(1000000).nullable().optional(),
  image: z.string().max(300).optional(),
  active: z.boolean().optional(),
  items: z.array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(20) })).min(1).max(10).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid bundle update.');
  const d = parsed.data;
  const data: Record<string, unknown> = {};
  for (const k of ['name', 'price', 'compareAt', 'active', 'image', 'description'] as const) if (d[k] !== undefined) data[k] = d[k] === '' ? null : d[k];
  if (d.items) {
    const ids = d.items.map((i) => i.productId);
    const found = await prisma.product.count({ where: { id: { in: ids } } });
    if (found !== new Set(ids).size) return fail('One or more products do not exist.');
    data.items = { deleteMany: {}, create: d.items.map((i) => ({ productId: i.productId, qty: i.qty })) };
  }
  const b = await prisma.bundle.update({ where: { id }, data: data as never }).catch(() => null);
  if (!b) return fail('Bundle not found.', 404);
  await recordActivity(g.user.userId, 'BUNDLE_UPDATED', 'Bundle', id);
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  await prisma.bundle.delete({ where: { id } }).catch(() => null);
  await recordActivity(g.user.userId, 'BUNDLE_DELETED', 'Bundle', id);
  return NextResponse.json({ ok: true });
}
