import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ProductCard, type CardProduct } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

export default async function AccountWishlist() {
  const s = await getSession();
  if (!s) redirect('/login?next=/account/wishlist');
  const items = await prisma.wishlistItem.findMany({
    where: { userId: s.userId }, orderBy: { id: 'desc' }, take: 60,
    include: { product: { include: { category: { select: { name: true } } } } },
  });

  const cards: CardProduct[] = items.map(w => ({
    slug: w.product.slug, name: w.product.name, price: w.product.price, compareAt: w.product.compareAtPrice,
    image: (JSON.parse(w.product.images || '[]') as string[])[0] ?? '/icon.svg',
    rating: w.product.rating, reviewCount: w.product.reviewCount, stock: w.product.stock,
    badges: JSON.parse(w.product.badges || '[]') as string[], isNew: w.product.isNew, category: w.product.category.name,
  }));

  return (
    <section aria-label="Wishlist" className="space-y-4">
      <h2 className="font-display font-extrabold text-xl">Wishlist <span className="text-soft font-semibold text-[14px]">({cards.length})</span></h2>
      {cards.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl" aria-hidden="true">♡</p>
          <p className="font-bold mt-2">Nothing saved yet</p>
          <p className="text-[13px] text-soft mt-1">Tap the heart on any product to keep it here for later.</p>
          <Link href="/shop" className="btn-primary mt-4 px-5 py-2.5 text-[13.5px] inline-flex">Browse products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {cards.map(p => (
            <div key={p.slug} className="relative">
              <ProductCard p={p} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
