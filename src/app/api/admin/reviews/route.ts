import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({ ids: z.array(z.string()).min(1).max(200), status: z.enum(['PUBLISHED', 'PENDING', 'REJECTED']) });

/** POST /api/admin/reviews — moderate (Review uses string status: PUBLISHED|PENDING|REJECTED) */
export async function POST(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid moderation payload.');
  const { ids, status } = parsed.data;
  const r = await prisma.review.updateMany({ where: { id: { in: ids } }, data: { status } });
  if (status === 'PUBLISHED') {
    // refresh product aggregates for affected products
    const reviews = await prisma.review.findMany({ where: { id: { in: ids } }, select: { productId: true } });
    for (const productId of new Set(reviews.map((x) => x.productId))) {
      const agg = await prisma.review.aggregate({ where: { productId, status: 'PUBLISHED' }, _avg: { rating: true }, _count: { _all: true } });
      await prisma.product.update({ where: { id: productId }, data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count._all } });
    }
  }
  await recordActivity(g.user.userId, 'REVIEWS_MODERATED', 'Review', undefined, undefined, { status, count: r.count });
  return NextResponse.json({ ok: true, updated: r.count });
}
