import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({
  name: z.string().trim().min(3).max(80),
  productId: z.string().min(1),
  salePrice: z.number().min(0.01).max(1000000),
  qtyLimit: z.number().int().min(1).max(10000).default(20),
  startsAt: z.string(),
  endsAt: z.string(),
  active: z.boolean().default(true),
});

/** POST /api/admin/flash-sales — banner-style timed deal */
export async function POST(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid flash sale.');
  const d = parsed.data;
  const prod = await prisma.product.findUnique({ where: { id: d.productId } });
  if (!prod) return fail('Product not found.', 404);
  if (d.salePrice >= prod.price) return fail('Sale price must be below the regular price.');
  if (new Date(d.endsAt) <= new Date(d.startsAt)) return fail('End must be after start.');
  const f = await prisma.flashSale.create({
    data: { name: d.name, productId: d.productId, salePrice: d.salePrice, qtyLimit: d.qtyLimit, startsAt: new Date(d.startsAt), endsAt: new Date(d.endsAt), active: d.active },
  });
  await recordActivity(g.user.userId, 'FLASH_SALE_CREATED', 'FlashSale', f.id);
  return NextResponse.json({ ok: true, id: f.id }, { status: 201 });
}
