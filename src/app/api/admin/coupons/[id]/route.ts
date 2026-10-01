import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({
  code: z.string().trim().min(3).max(24).toUpperCase().optional(),
  type: z.enum(['PERCENT', 'FIXED', 'FREE_DELIVERY']).optional(),
  value: z.number().min(0).max(100000).optional(),
  minSpend: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.number().int().min(1).max(50).optional(),
  firstOrderOnly: z.boolean().optional(),
  referralOnly: z.boolean().optional(),
  categoryIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  active: z.boolean().optional(),
});
const dt = (v?: string | null) => (v ? new Date(v) : null);

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid coupon update.');
  const d = parsed.data;
  const data: Record<string, unknown> = {};
  for (const k of ['code', 'type', 'value', 'minSpend', 'perCustomerLimit', 'firstOrderOnly', 'referralOnly', 'active'] as const) if (d[k] !== undefined) data[k] = d[k];
  for (const k of ['maxDiscount', 'usageLimit', 'startsAt', 'endsAt'] as const) if (d[k] !== undefined) data[k] = dt(d[k] as string | null);
  if (d.categoryIds) data.categoryIds = JSON.stringify(d.categoryIds);
  if (d.productIds) data.productIds = JSON.stringify(d.productIds);
  const c = await prisma.coupon.update({ where: { id }, data: data as never }).catch(() => null);
  if (!c) return fail('Coupon not found.', 404);
  await recordActivity(g.user.userId, 'COUPON_UPDATED', 'Coupon', id);
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const c = await prisma.coupon.update({ where: { id }, data: { active: false } }).catch(() => null);
  if (!c) return fail('Coupon not found.', 404);
  await recordActivity(g.user.userId, 'COUPON_DEACTIVATED', 'Coupon', id);
  return NextResponse.json({ ok: true, note: 'Coupon deactivated (orders keep their history).' });
}
