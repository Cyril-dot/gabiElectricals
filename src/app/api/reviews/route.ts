import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/notify';

const Schema = z.object({
  slug: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(80),
  body: z.string().trim().min(10).max(1200),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Please sign in to write a review.' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Fill in the rating, a short title and at least a sentence about the product.' }, { status: 400 });
  const { slug, rating, title, body } = parsed.data;

  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  // verified purchase = a DELIVERED order containing this product
  const owned = await prisma.orderItem.findFirst({
    where: { product: { id: product.id }, order: { userId: session.userId, status: 'DELIVERED' } },
    select: { id: true, orderId: true },
  });

  const review = await prisma.review.create({
    data: { productId: product.id, userId: session.userId, rating, title, body, verified: !!owned, orderId: owned?.orderId ?? null },
  });
  const agg = await prisma.review.aggregate({ where: { productId: product.id, status: 'PUBLISHED' }, _avg: { rating: true }, _count: true });
  await prisma.product.update({
    where: { id: product.id },
    data: { rating: +(agg._avg.rating ?? 0).toFixed(2), reviewCount: agg._count },
  });
  await recordActivity(session.userId, 'REVIEW_CREATED', 'Review', review.id);
  return NextResponse.json({ ok: true, verified: !!owned });
}
