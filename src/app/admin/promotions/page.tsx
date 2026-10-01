import { prisma } from '@/lib/db';
import { PromotionsBoard } from './board';

export const dynamic = 'force-dynamic';

export default async function AdminPromotionsPage() {
  const [coupons, flash, bundles, products, categories] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { code: 'asc' }, take: 60 }),
    prisma.flashSale.findMany({ include: { product: { select: { name: true, price: true, slug: true } } }, orderBy: { startsAt: 'desc' }, take: 40 }),
    prisma.bundle.findMany({ include: { items: { include: { product: { select: { id: true, name: true, price: true } } } } }, orderBy: { name: 'asc' }, take: 40 }),
    prisma.product.findMany({ select: { id: true, name: true, price: true }, orderBy: { name: 'asc' }, take: 400 }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { sortOrder: 'asc' } }),
  ]);

  return (
    <PromotionsBoard
      coupons={coupons.map((c) => ({
        id: c.id, code: c.code, type: c.type, value: c.value, minSpend: c.minSpend, maxDiscount: c.maxDiscount,
        usageLimit: c.usageLimit, usedCount: c.usedCount, perCustomerLimit: c.perCustomerLimit,
        firstOrderOnly: c.firstOrderOnly, referralOnly: c.referralOnly,
        categoryIds: JSON.parse(c.categoryIds) as string[], productIds: JSON.parse(c.productIds) as string[],
        startsAt: c.startsAt?.toISOString() ?? null, endsAt: c.endsAt?.toISOString() ?? null, active: c.active,
      }))}
      flash={flash.map((f) => ({
        id: f.id, name: f.name, productId: f.productId, productName: f.product.name, regularPrice: f.product.price,
        salePrice: f.salePrice, qtyLimit: f.qtyLimit, sold: f.sold, startsAt: f.startsAt.toISOString(), endsAt: f.endsAt.toISOString(), active: f.active,
      }))}
      bundles={bundles.map((b) => ({
        id: b.id, name: b.name, slug: b.slug, description: b.description, price: b.price, compareAt: b.compareAt,
        image: b.image, active: b.active, items: b.items.map((i) => ({ productId: i.productId, qty: i.qty, name: i.product.name, price: i.product.price })),
      }))}
      products={products}
      categories={categories}
    />
  );
}
