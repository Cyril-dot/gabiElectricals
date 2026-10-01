import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Map product slugs → category slugs (used by the cart to validate category-restricted coupons). */
export async function GET(req: Request) {
  const slugs = (new URL(req.url).searchParams.get('slugs') ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 60);
  if (!slugs.length) return NextResponse.json({});
  const rows = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, category: { select: { slug: true } } },
  });
  return NextResponse.json(Object.fromEntries(rows.map(r => [r.slug, r.category.slug])));
}
