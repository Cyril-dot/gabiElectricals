import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jsonArr } from '@/lib/ghana';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) return NextResponse.json([]);
  const frag = q.slice(0, 60);
  const products = await prisma.product.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { name: { contains: frag } },
        { sku: { contains: frag } },
        { category: { name: { contains: frag } } },
        { brand: { name: { contains: frag } } },
      ],
    },
    include: { category: { select: { name: true } } },
    take: 12,
    orderBy: [{ soldCount: 'desc' }, { rating: 'desc' }],
  });
  const out = products.map(p => ({
    name: p.name,
    slug: p.slug,
    price: p.price,
    image: jsonArr(p.images)[0] ?? '/icon.svg',
    category: p.category.name,
    stock: p.stock,
  }));
  return NextResponse.json(out);
}
