import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail, slugify } from '@/lib/ops-api';

const Schema = z.object({
  name: z.string().trim().min(3).max(80),
  slug: z.string().trim().min(3).max(60).optional(),
  description: z.string().max(500).optional(),
  price: z.number().min(0.01).max(1000000),
  compareAt: z.number().min(0).max(1000000).nullable().optional(),
  image: z.string().max(300).optional(),
  active: z.boolean().default(true),
  items: z.array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(20) })).min(1).max(10),
});

export async function POST(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid bundle.');
  const d = parsed.data;
  const ids = d.items.map((i) => i.productId);
  const found = await prisma.product.count({ where: { id: { in: ids } } });
  if (found !== new Set(ids).size) return fail('One or more products do not exist.');
  let slug = d.slug ? slugify(d.slug) : slugify(d.name);
  const clash = await prisma.bundle.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  const b = await prisma.bundle.create({
    data: {
      name: d.name, slug, description: d.description || null, price: d.price, compareAt: d.compareAt ?? null,
      image: d.image || null, active: d.active, items: { create: d.items.map((i) => ({ productId: i.productId, qty: i.qty })) },
    },
  });
  await recordActivity(g.user.userId, 'BUNDLE_CREATED', 'Bundle', b.id);
  return NextResponse.json({ ok: true, id: b.id, slug: b.slug }, { status: 201 });
}
