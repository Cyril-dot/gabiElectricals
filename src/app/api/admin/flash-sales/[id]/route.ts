import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  productId: z.string().optional(),
  salePrice: z.number().min(0.01).max(1000000).optional(),
  qtyLimit: z.number().int().min(1).max(10000).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid update.');
  const d = parsed.data;
  const data: Record<string, unknown> = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.productId !== undefined) data.productId = d.productId;
  if (d.salePrice !== undefined) data.salePrice = d.salePrice;
  if (d.qtyLimit !== undefined) data.qtyLimit = d.qtyLimit;
  if (d.active !== undefined) data.active = d.active;
  if (d.startsAt) data.startsAt = new Date(d.startsAt);
  if (d.endsAt) data.endsAt = new Date(d.endsAt);
  const f = await prisma.flashSale.update({ where: { id }, data: data as never }).catch(() => null);
  if (!f) return fail('Flash sale not found.', 404);
  await recordActivity(g.user.userId, 'FLASH_SALE_UPDATED', 'FlashSale', id);
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  await prisma.flashSale.delete({ where: { id } }).catch(() => null);
  await recordActivity(g.user.userId, 'FLASH_SALE_DELETED', 'FlashSale', id);
  return NextResponse.json({ ok: true });
}
