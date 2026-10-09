import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Total mobile-money collections sitting on the 360Pay (LibertePay) merchant
// when the giveback sale was declared — LibertePay portal, 2026-10-09. The
// flash sale gives this same amount back to customers in discounts: the
// discount pool below is computed live from the real FlashSale rows, and the
// popup presents the two figures side by side. Update this number as the
// collections total grows.
const MADE_VIA_360PAY_GHS = 45713;

const firstImg = (j: string) => {
  try { const a = JSON.parse(j); return a[0] ?? '/icon.svg'; } catch { return '/icon.svg'; }
};

/**
 * Public promo state for the full-screen flash-sale takeover.
 * The popup renders ONLY when a real flash sale is live; the discount pool
 * is the sale's true maths — Σ (price − salePrice) × qty — so the giveback
 * figure on screen is always the store's actual committed discount value.
 */
export async function GET() {
  try {
    const now = new Date();
    const sales = await prisma.flashSale.findMany({
      where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } },
      include: { product: { select: { name: true, slug: true, price: true, images: true } } },
      orderBy: { endsAt: 'asc' },
    });
    if (!sales.length) return NextResponse.json({ active: false });

    let poolTotal = 0;
    let poolLeft = 0;
    const deals = sales.map(s => {
      const saving = Math.max(0, s.product.price - s.salePrice);
      const left = Math.max(0, s.qtyLimit - s.sold);
      poolTotal += saving * s.qtyLimit;
      poolLeft += saving * left;
      return {
        slug: s.product.slug,
        name: s.product.name,
        image: firstImg(s.product.images),
        price: s.product.price,
        salePrice: s.salePrice,
        pct: s.product.price > 0 ? Math.round((saving / s.product.price) * 100) : 0,
        left,
      };
    }).filter(d => d.left > 0).slice(0, 3);

    return NextResponse.json({
      active: true,
      name: sales[0].name,
      endsAt: sales[0].endsAt.toISOString(),
      madeGhs: MADE_VIA_360PAY_GHS,
      poolTotal: Math.round(poolTotal),
      poolLeft: Math.round(poolLeft),
      deals,
    });
  } catch {
    return NextResponse.json({ active: false });
  }
}
