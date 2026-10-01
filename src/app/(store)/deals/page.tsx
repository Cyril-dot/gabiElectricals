import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ProductCard } from '@/components/ProductCard';
import { Countdown } from '@/components/HomeHero';
import { JSONLd } from '@/components/JsonLd';
import { ghs } from '@/lib/money';

export const metadata: Metadata = { title: 'Deals & Flash Sales', description: '48-hour flash sales, bundle pricing and coupon codes — genuine electrical gear at premium-grade value.' };

const parseImgs = (j: string) => { try { const a = JSON.parse(j); return a[0] ?? '/icon.svg'; } catch { return '/icon.svg'; } };

export default async function DealsPage() {
  const [deals, bundles, coupons] = await Promise.all([
    prisma.flashSale.findMany({ where: { active: true, endsAt: { gt: new Date() } }, include: { product: { include: { category: true } } }, take: 12 }),
    prisma.bundle.findMany({ where: { active: true }, include: { items: { include: { product: true } } } }),
    prisma.coupon.findMany({ where: { active: true, endsAt: { gt: new Date() } } }).catch(() => []),
  ]);
  return (
    <div className="container-x py-12">
      <JSONLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'GabiElectricals Deals', itemListElement: deals.map((d, i) => ({ '@type': 'ListItem', position: i + 1, name: d.product.name, url: `${process.env.NEXT_PUBLIC_SITE_URL}/product/${d.product.slug}` })) }} />
      <div className="text-center max-w-2xl mx-auto mb-10">
        <p className="text-gold font-black text-xs tracking-[0.3em] uppercase mb-2">Premium, priced honestly</p>
        <h1 className="font-display font-extrabold text-4xl mb-3">⚡ Deals & Flash Sales</h1>
        <p className="text-soft">Time-limited pricing on genuine stock. When the timer ends, the price returns — because real copper and certified protection are never actually cheap.</p>
      </div>

      {deals.length === 0 && <div className="card p-10 text-center mb-10"><p className="text-4xl mb-2">⏳</p><p className="font-bold">No live flash sale right now — check back, they run 48-hour windows.</p><Link href="/shop" className="btn-primary !px-5 !py-2.5 mt-4">Browse the catalog</Link></div>}
      {deals.length > 0 && (
        <section className="mb-12" aria-labelledby="flash-h">
          <div className="flex items-end justify-between mb-5">
            <h2 id="flash-h" className="font-display font-extrabold text-2xl">Live now — ends in</h2>
            {deals[0] && <Countdown to={deals[0].endsAt.toISOString()} />}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {deals.map(d => (
              <div key={d.id} className="relative">
                <ProductCard p={{ slug: d.product.slug, name: d.product.name, price: d.salePrice, compareAt: d.product.price, image: parseImgs(d.product.images), rating: d.product.rating, reviewCount: d.product.reviewCount, stock: Math.max(1, d.qtyLimit - d.sold), badges: ['Flash price'], category: d.product.category.name }} />
                <span className="absolute top-2 right-2 bg-danger text-white text-[10px] font-black rounded-md px-1.5 py-0.5 z-10">{Math.max(1, d.qtyLimit - d.sold)} left</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {bundles.length > 0 && (
        <section className="mb-12" aria-labelledby="bundle-h">
          <h2 id="bundle-h" className="font-display font-extrabold text-2xl mb-5">Frequently-booked-together bundles</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {bundles.map(b => (
              <div key={b.id} className="card p-6 flex flex-col sm:flex-row gap-5">
                <div className="flex-1">
                  <h3 className="font-display font-extrabold text-lg mb-1">{b.name}</h3>
                  <p className="text-sm text-soft mb-3">{b.description}</p>
                  <ul className="text-[13px] space-y-1 mb-4">
                    {b.items.map(it => <li key={it.id} className="flex gap-2"><span className="text-success font-black">✓</span>{it.qty} × {it.product.name}</li>)}
                  </ul>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display font-extrabold text-2xl text-navy dark:text-white">{ghs(b.price)}</span>
                    {b.compareAt && <span className="line-through text-soft">{ghs(b.compareAt)}</span>}
                    {b.compareAt && b.compareAt - b.price > 0 && <span className="bg-success/10 text-success text-xs font-black rounded-md px-2 py-1">Save {ghs((b.compareAt - b.price))}</span>}
                  </div>
                  <Link href="/checkout" className="btn-gold w-full sm:w-auto !px-5 !py-2.5 mt-4 sm:inline-flex">Add bundle to cart</Link>
                </div>
                <div className="flex sm:flex-col gap-2 sm:w-28 shrink-0">
                  {b.items.slice(0, 3).map(it => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={it.id} src={parseImgs(it.product.images)} alt={it.product.name} width={112} height={84} className="w-full h-20 object-contain bg-mist dark:bg-navy-700 rounded-lg p-1" loading="lazy" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {coupons.length > 0 && (
        <section aria-labelledby="coupon-h">
          <h2 id="coupon-h" className="font-display font-extrabold text-2xl mb-5">Coupon codes this week</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map(c => (
              <div key={c.id} className="card p-4 flex items-center justify-between gap-3 border-dashed !border-2">
                <div>
                  <p className="font-mono font-black text-lg text-blue tracking-wide">{c.code}</p>
                  <p className="text-[12.5px] text-soft">{c.type === 'PERCENT' ? `${c.value}% off` : c.type === 'FIXED' ? `${ghs(c.value)} off` : 'Free delivery'} {c.minSpend > 0 && `on ${ghs(c.minSpend)}+`} {c.firstOrderOnly && '· first order'}</p>
                </div>
                <span className="text-[10px] font-black bg-gold/20 text-gold-dark rounded-md px-2 py-1 rotate-[-4deg]">COPY AT<br />CHECKOUT</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
