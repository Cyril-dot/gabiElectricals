import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { margin } from '@/lib/pricing';
import { JSONLd } from '@/components/JsonLd';
import { Stars, ProductCard, type CardProduct } from '@/components/ProductCard';
import { FadeUp } from '@/components/FadeUp';
import { jsonArr, waDigits } from '@/lib/ghana';
import { Gallery, PurchasePanel, NotifyMe, ReviewForm, RecentlyViewed } from './client-parts';

export const dynamic = 'force-dynamic';

type Spec = { label: string; value: string };

function parseSpecs(raw: string): Spec[] {
  const arr = jsonArr<unknown>(raw);
  return arr.map((x): Spec => {
    if (Array.isArray(x) && x.length >= 2) return { label: String(x[0]), value: String(x[1]) };
    const o = x as Partial<Spec>;
    return { label: String(o?.label ?? ''), value: String(o?.value ?? '') };
  }).filter(s => s.label);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({ where: { slug }, select: { metaTitle: true, metaDescription: true, name: true, images: true, status: true } });
  if (!p) return { title: 'Product not found' };
  return {
    title: p.metaTitle ?? `${p.name} Ghana | GabiElectricals`,
    description: p.metaDescription ?? `Buy ${p.name} — genuine, warranty-backed, delivered in Ghana.`,
    openGraph: { title: p.name, description: p.metaDescription ?? undefined, images: jsonArr<string>(p.images).slice(0, 1) },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true, brand: true },
  });
  if (!product || product.status === 'DRAFT') notFound();

  const [session, settings, reviews, related, faqs] = await Promise.all([
    getSession(),
    getSettings(),
    prisma.review.findMany({
      where: { productId: product.id, status: 'PUBLISHED' },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: 8,
    }),
    prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, status: 'PUBLISHED' },
      orderBy: [{ rating: 'desc' }, { soldCount: 'desc' }], take: 4,
      include: { category: { select: { name: true } } },
    }),
    prisma.faq.findMany({ where: { category: { in: ['Shop', 'Delivery', 'General'] }, context: 'PUBLIC' }, orderBy: { sortOrder: 'asc' }, take: 4 }),
  ]);

  const images = jsonArr<string>(product.images);
  const badges = jsonArr<string>(product.badges);
  const specs = parseSpecs(product.specs);
  const m = margin(product.costPrice, product.price, product.compareAtPrice);
  const wa = waDigits(settings.business.whatsapp);

  const relatedCards: CardProduct[] = related.map(p => ({
    slug: p.slug, name: p.name, price: p.price, compareAt: p.compareAtPrice,
    image: jsonArr(p.images)[0] ?? '/icon.svg', rating: p.rating, reviewCount: p.reviewCount,
    stock: p.stock, badges: jsonArr(p.badges), isNew: p.isNew, category: p.category.name,
  }));

  const crumbs = [
    { name: 'Home', url: '/' },
    { name: 'Shop', url: '/shop' },
    { name: product.category.name, url: `/shop?cat=${product.category.slug}` },
    { name: product.name, url: `/product/${product.slug}` },
  ];

  return (
    <div className="container-x py-5 md:py-8">
      <JSONLd data={{
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name })),
      }} />
      <JSONLd data={{
        '@context': 'https://schema.org', '@type': 'Product', name: product.name, sku: product.sku,
        description: product.metaDescription ?? product.shortDesc ?? product.description.slice(0, 200),
        image: images, brand: { '@type': 'Brand', name: product.brand?.name ?? 'GabiElectricals' },
        category: product.category.name,
        offers: {
          '@type': 'Offer', price: product.price, priceCurrency: 'GHS',
          availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: `/product/${product.slug}`,
        },
        ...(product.reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount } } : {}),
      }} />
      {faqs.length > 0 && (
        <JSONLd data={{
          '@context': 'https://schema.org', '@type': 'FAQPage',
          mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
        }} />
      )}

      <nav aria-label="Breadcrumb" className="text-[12.5px] text-soft mb-4 font-medium line-clamp-1">
        {crumbs.map((c, i) => (
          <span key={c.url}>
            {i > 0 && <span className="mx-1.5">/</span>}
            {i === crumbs.length - 1 ? <span className="text-ink dark:text-white">{c.name}</span> : <Link href={c.url} className="hover:text-blue">{c.name}</Link>}
          </span>
        ))}
      </nav>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-start">
        <div data-product-image>
          <Gallery images={images.map((src, i) => ({ src, alt: `${product.name} image ${i + 1}` }))} name={product.name} off={m.strikePct} />
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {badges.map(b => <span key={b} className="text-[11px] font-black text-success bg-success/10 rounded-md px-2 py-1">✓ {b}</span>)}
            {product.isNew && <span className="text-[11px] font-black text-white bg-blue rounded-md px-2 py-1">NEW</span>}
            {product.bestSeller && <span className="text-[11px] font-black text-navy bg-gold rounded-md px-2 py-1">BEST SELLER</span>}
          </div>
          <h1 className="font-display text-2xl md:text-[28px] font-extrabold leading-tight" data-product-price={String(product.price)}>{product.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[13px]">
            <span className="flex items-center gap-1.5"><Stars r={product.rating} /><span className="text-soft font-semibold">({product.reviewCount} reviews)</span></span>
            {product.brand && <span className="text-soft">Brand: <Link href={`/shop?brand=${product.brand.slug}`} className="font-bold text-blue hover:underline">{product.brand.name}</Link></span>}
            <span className="text-soft">SKU: <span className="font-mono text-[12px]">{product.sku}</span></span>
          </div>

          <div className="my-4 h-px bg-line" />

          {/* stock indicator */}
          {product.stock > 5 ? (
            <p className="text-sm font-bold text-success mb-4" role="status">● In stock — {product.stock}+ units at our Accra warehouse</p>
          ) : product.stock > 0 ? (
            <p className="text-sm font-bold text-warning mb-4" role="status">⚡ Only {product.stock} left — restock takes 2–3 weeks, buy now</p>
          ) : (
            <p className="text-sm font-bold text-danger mb-4" role="status">✕ Out of stock — join the notify list below</p>
          )}

          <PurchasePanel
            p={{ slug: product.slug, name: product.name, price: product.price, compareAt: product.compareAtPrice, stock: product.stock, images: product.images, categorySlug: product.category.slug }}
            whatsapp={wa}
          />

          {/* warranty + trust */}
          <div className="mt-5 card p-4 grid sm:grid-cols-2 gap-3 text-[13px]">
            <div className="flex gap-2.5 items-start">
              <span className="text-xl" aria-hidden>🛡️</span>
              <p><span className="font-bold">Warranty: </span>
                {product.warrantyMonths > 0
                  ? `${product.warrantyMonths} months on this ${product.name.split('—')[0].trim()} — register at pickup, claim through us, not the importer.`
                  : 'Genuine-product guarantee: if it is not as described, return it in 7 days for a full refund.'}
              </p>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="text-xl" aria-hidden>🚚</span>
              <p><span className="font-bold">Delivery: </span>same-day in Accra before 2PM · 1–3 days to Kumasi, Takoradi, Tamale. Or pick up at {settings.business.address}.</p>
            </div>
          </div>
        </div>
      </div>

      {product.stock === 0 && (
        <div className="mt-6 max-w-xl"><NotifyMe slug={product.slug} name={product.name} /></div>
      )}

      {/* description + specs */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-8 mt-12 items-start">
        <section aria-labelledby="desc-h" className="space-y-4">
          <h2 id="desc-h" className="font-display text-xl font-extrabold">Why electricians choose this</h2>
          <p className="text-[15px] leading-relaxed text-ink/90 dark:text-white/85 whitespace-pre-line">{product.description}</p>
          {product.tags && jsonArr<string>(product.tags).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {jsonArr<string>(product.tags).filter(t => !['bestseller'].includes(t)).map(t => (
                <Link key={t} href={`/shop?q=${encodeURIComponent(t)}`} className="text-[11.5px] font-bold text-soft bg-mist dark:bg-navy-700 rounded-full px-2.5 py-1 hover:text-blue">#{t}</Link>
              ))}
            </div>
          )}

          <h2 id="faq-h" className="font-display text-xl font-extrabold pt-2">Questions buyers ask</h2>
          <div className="space-y-2">
            {faqs.map(f => (
              <details key={f.id} className="card p-4 group">
                <summary className="font-bold text-[14px] cursor-pointer list-none flex justify-between items-center gap-3">
                  {f.question}
                  <span aria-hidden className="text-soft group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                </summary>
                <p className="text-sm text-soft mt-2.5 leading-relaxed">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="specs-h">
          <h2 id="specs-h" className="font-display text-xl font-extrabold mb-3">Specifications</h2>
          <table className="w-full card overflow-hidden text-sm">
            <tbody>
              {specs.map((s, i) => (
                <tr key={s.label} className={i % 2 ? 'bg-mist/60 dark:bg-navy-700/60' : ''}>
                  <th scope="row" className="text-left font-bold px-4 py-2.5 w-[45%] align-top">{s.label}</th>
                  <td className="px-4 py-2.5 text-ink/90 dark:text-white/85">{s.value}</td>
                </tr>
              ))}
              <tr className={specs.length % 2 ? 'bg-mist/60 dark:bg-navy-700/60' : ''}>
                <th scope="row" className="text-left font-bold px-4 py-2.5">Category</th>
                <td className="px-4 py-2.5"><Link href={`/shop?cat=${product.category.slug}`} className="text-blue font-semibold hover:underline">{product.category.name}</Link></td>
              </tr>
            </tbody>
          </table>
          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hello GabiElectricals — technical question about "${product.name}" (${product.sku}).`)}`}
            target="_blank" rel="noopener noreferrer" className="btn-ghost w-full !py-3 text-sm mt-3">👷 Ask our technician a spec question</a>
        </section>
      </div>

      {/* reviews */}
      <section aria-labelledby="rev-h" className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 id="rev-h" className="font-display text-xl font-extrabold">Customer reviews ({product.reviewCount})</h2>
          <span className="flex items-center gap-2 text-sm font-bold"><Stars r={product.rating} /> {product.rating.toFixed(1)} / 5</span>
        </div>
        <div className="grid md:grid-cols-[1fr_380px] gap-6 items-start">
          <div className="space-y-3">
            {reviews.length === 0 && <p className="card p-5 text-sm text-soft">No reviews yet — be the first to confirm this is the real deal.</p>}
            {reviews.map(r => (
              <article key={r.id} className="card p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-navy text-white grid place-items-center text-xs font-black">{r.user.name.slice(0, 1)}</span>
                    <div>
                      <p className="text-[13px] font-bold leading-tight">{r.user.name.split(' ')[0]} {r.user.name.split(' ')[1]?.[0]}.</p>
                      <p className="text-[11px] text-soft">{r.createdAt.toISOString().slice(0, 10)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars r={r.rating} />
                    {r.verified && <span className="text-[10.5px] font-black text-success bg-success/10 rounded-md px-1.5 py-1">✓ VERIFIED PURCHASE</span>}
                  </div>
                </div>
                <h3 className="font-bold text-[14px] mt-2.5">{r.title}</h3>
                <p className="text-sm text-ink/85 dark:text-white/75 mt-1 leading-relaxed">{r.body}</p>
              </article>
            ))}
          </div>
          <ReviewForm slug={product.slug} signedIn={!!session} />
        </div>
      </section>

      {/* related */}
      {relatedCards.length > 0 && (
        <section aria-labelledby="rel-h" className="mt-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 id="rel-h" className="font-display text-xl font-extrabold">More in {product.category.name}</h2>
            <Link href={`/shop?cat=${product.category.slug}`} className="text-sm font-bold text-blue hover:underline">See all →</Link>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
            {relatedCards.map((p, i) => (
              <FadeUp key={p.slug} delay={i * 0.05}><ProductCard p={p} /></FadeUp>
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed currentSlug={product.slug} />
    </div>
  );
}
