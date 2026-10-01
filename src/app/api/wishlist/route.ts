import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const Schema = z.object({ slug: z.string().min(1).optional(), productId: z.string().optional() });

/** POST /api/wishlist — toggle product in the signed-in user's wishlist */
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Login required to save items' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.slug && !parsed.data.productId)) {
    return NextResponse.json({ error: 'slug or productId required' }, { status: 422 });
  }
  const product = parsed.data.productId
    ? await prisma.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true, slug: true, name: true } })
    : await prisma.product.findUnique({ where: { slug: parsed.data.slug }, select: { id: true, slug: true, name: true } });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const existing = await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId: s.userId, productId: product.id } } });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, saved: false, productId: product.id });
  }
  await prisma.wishlistItem.create({ data: { userId: s.userId, productId: product.id } });
  await recordActivity(s.userId, 'WISHLIST_ADD', 'PRODUCT', product.id);
  return NextResponse.json({ ok: true, saved: true, productId: product.id });
}
