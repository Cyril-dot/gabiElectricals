import { prisma } from '@/lib/db';
import { ReviewsBoard } from './board';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = sp.status ?? 'PENDING';
  const [reviews, counts, summary] = await Promise.all([
    prisma.review.findMany({
      where: { status },
      include: { product: { select: { name: true, slug: true } }, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 150,
    }),
    prisma.review.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.review.groupBy({ by: ['productId'], _count: { _all: true }, _avg: { rating: true } }),
  ]);
  const prods = await prisma.product.findMany({ where: { id: { in: summary.map((s) => s.productId) } }, select: { id: true, name: true, slug: true, rating: true, reviewCount: true } });
  const prodMap = new Map(prods.map((p) => [p.id, p]));

  return (
    <ReviewsBoard
      reviews={reviews.map((r) => ({
        id: r.id, rating: r.rating, title: r.title, body: r.body, verified: r.verified, status: r.status,
        product: r.product.name, productSlug: r.product.slug, customer: r.user.name, email: r.user.email,
        createdAt: r.createdAt.toISOString(),
      }))}
      counts={Object.fromEntries(counts.map((c) => [c.status, c._count._all]))}
      summary={summary
        .map((s) => ({ name: prodMap.get(s.productId)?.name ?? '—', slug: prodMap.get(s.productId)?.slug ?? '', avg: s._avg.rating ?? 0, n: s._count._all }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 12)}
      activeStatus={status}
    />
  );
}
