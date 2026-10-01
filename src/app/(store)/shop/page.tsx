import Link from 'next/link';
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ProductCard, type CardProduct } from '@/components/ProductCard';
import { JSONLd } from '@/components/JsonLd';
import { FadeUp } from '@/components/FadeUp';
import { Icon } from '@/components/Icon';
import { SortForm } from './SortForm';
import { jsonArr } from '@/lib/ghana';

export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

type SP = Record<string, string | string[] | undefined>;

const SORTS = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'rating', label: 'Top rated' },
  { key: 'new', label: 'Newest arrivals' },
  { key: 'best', label: 'Best sellers' },
] as const;

const PER_PAGE = 12;

function s(sp: SP, k: string): string {
  const v = sp[k];
  return typeof v === 'string' ? v : '';
}

function buildQuery(sp: SP) {
  const cat = s(sp, 'cat');
  const brand = s(sp, 'brand');
  const q = s(sp, 'q').slice(0, 60);
  const min = parseFloat(s(sp, 'min'));
  const max = parseFloat(s(sp, 'max'));
  const rating = parseFloat(s(sp, 'rating'));
  const stock = s(sp, 'stock') === '1';
  const warranty = parseInt(s(sp, 'warranty'), 10);

  const where: Prisma.ProductWhereInput = {
    status: 'PUBLISHED',
    ...(cat ? { category: { slug: cat } } : {}),
    ...(brand ? { brand: { slug: brand } } : {}),
    ...(stock ? { stock: { gt: 0 } } : {}),
    ...(Number.isFinite(rating) && rating > 0 ? { rating: { gte: rating } } : {}),
    ...(Number.isFinite(warranty) && warranty > 0 ? { warrantyMonths: { gte: warranty } } : {}),
    ...(Number.isFinite(min) || Number.isFinite(max) ? { price: { ...(Number.isFinite(min) ? { gte: min } : {}), ...(Number.isFinite(max) ? { lte: max } : {}) } } : {}),
    ...(q ? {
      OR: [
        { name: { contains: q } },
        { sku: { contains: q } },
        { description: { contains: q } },
        { category: { name: { contains: q } } },
        { brand: { name: { contains: q } } },
      ],
    } : {}),
  };
  return { where, cat, brand, q, min, max, rating, stock, warranty };
}

function orderBy(sort: string): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price-asc': return [{ price: 'asc' }];
    case 'price-desc': return [{ price: 'desc' }];
    case 'rating': return [{ rating: 'desc' }, { reviewCount: 'desc' }];
    case 'new': return [{ createdAt: 'desc' }];
    case 'best': return [{ soldCount: 'desc' }];
    default: return [{ featured: 'desc' }, { bestSeller: 'desc' }, { rating: 'desc' }];
  }
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = s(sp, 'cat');
  if (cat) {
    const c = await prisma.category.findUnique({ where: { slug: cat }, include: { SEO: true } });
    if (c) {
      return {
        title: c.SEO?.title ?? `${c.name} Ghana — Shop Online | GabiElectricals`,
        description: c.SEO?.desc ?? c.description ?? `Shop genuine ${c.name.toLowerCase()} with same-day delivery in Accra.`,
      };
    }
  }
  const q = s(sp, 'q');
  return {
    title: q ? `Search “${q}” — Shop` : 'Shop Electrical Materials Online in Ghana',
    description: 'Genuine cables, breakers, solar, tools and more — delivered across Ghana from Accra.',
  };
}

function chip(base: string, sp: SP, overrides: Record<string, string | null>, label: string, active: boolean) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string' && v && !['page'].includes(k)) params.set(k, v);
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null) params.delete(k);
    else { params.set(k, v); if (k !== 'page') params.delete('page'); }
  }
  const qs = params.toString();
  return (
    <Link key={label + qs} href={`${base}${qs ? `?${qs}` : ''}`} aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-semibold border transition-colors min-h-[38px] ${active ? 'bg-navy text-white border-navy' : 'bg-white dark:bg-navy border-line hover:border-blue text-ink/80'}`}>
      {label}
    </Link>
  );
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sort = SORTS.some(x => x.key === s(sp, 'sort')) ? s(sp, 'sort') : 'relevance';
  const view = s(sp, 'view') === 'list' ? 'list' : 'grid';
  const page = Math.max(1, parseInt(s(sp, 'page'), 10) || 1);
  const { where, cat, q } = buildQuery(sp);

  const [categories, brands, count, products, activeCat] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, name: true, _count: { select: { products: { where: { status: 'PUBLISHED' } } } } } }),
    prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { slug: true, name: true } }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where, orderBy: orderBy(sort),
      skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: { category: { select: { name: true, slug: true } }, brand: { select: { name: true } } },
    }),
    cat ? prisma.category.findUnique({ where: { slug: cat } }) : null,
  ]);

  const pages = Math.max(1, Math.ceil(count / PER_PAGE));
  const cards: CardProduct[] = products.map(p => ({
    slug: p.slug, name: p.name, price: p.price, compareAt: p.compareAtPrice,
    image: jsonArr(p.images)[0] ?? '/icon.svg', rating: p.rating, reviewCount: p.reviewCount,
    stock: p.stock, badges: jsonArr(p.badges), isNew: p.isNew, category: p.category.name,
  }));

  const h1 = q ? `Results for “${q}”` : activeCat ? activeCat.name : 'Shop all electricals';
  const crumb = [{ name: 'Home', url: '/' }, { name: 'Shop', url: '/shop' }, ...(activeCat ? [{ name: activeCat.name, url: `/shop?cat=${activeCat.slug}` }] : [])];

  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === 'string' && v && k !== 'page') params.set(k, v);
    params.set('page', String(n));
    return `/shop?${params.toString()}`;
  };

  return (
    <div className="container-x py-6 md:py-10">
      <JSONLd data={{
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: crumb.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${SITE}${c.url}` })),
      }} />
      <JSONLd data={{
        '@context': 'https://schema.org', '@type': 'ItemList', name: h1,
        numberOfItems: count,
        itemListElement: cards.map((c, i) => ({ '@type': 'ListItem', position: (page - 1) * PER_PAGE + i + 1, name: c.name, url: `${SITE}/product/${c.slug}` })),
      }} />

      <nav aria-label="Breadcrumb" className="text-[12.5px] text-soft mb-3 font-medium">
        {crumb.map((c, i) => (
          <span key={c.url}>
            {i > 0 && <span className="mx-1.5">/</span>}
            {i === crumb.length - 1 ? <span className="text-ink dark:text-white">{c.name}</span> : <Link href={c.url} className="hover:text-blue">{c.name}</Link>}
          </span>
        ))}
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold">{h1}</h1>
          <p className="text-sm text-soft mt-1">
            {count} {count === 1 ? 'product' : 'products'} · 100% genuine stock · same-day delivery in Accra
            {activeCat?.description ? ` — ${activeCat.description}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-[13px] font-bold">Sort</label>
          <SortForm sp={sp} sort={sort} sorts={SORTS} view={view} />
          <div className="hidden sm:flex rounded-xl border border-line overflow-hidden" role="group" aria-label="View mode">
            <Link href={pageHrefSafe(sp, 'grid')} aria-pressed={view === 'grid'} className={`px-3 py-2.5 text-sm font-bold inline-flex items-center gap-1.5 ${view === 'grid' ? 'bg-navy text-white' : 'hover:bg-mist dark:hover:bg-navy-700'}`}><Icon name="grid_view" size={16} /> Grid</Link>
            <Link href={pageHrefSafe(sp, 'list')} aria-pressed={view === 'list'} className={`px-3 py-2.5 text-sm font-bold border-l border-line inline-flex items-center gap-1.5 ${view === 'list' ? 'bg-navy text-white' : 'hover:bg-mist dark:hover:bg-navy-700'}`}><Icon name="menu" size={16} /> List</Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6 items-start">
        {/* ── Filters sidebar ── */}
        <aside aria-label="Product filters" className="card p-4 lg:sticky lg:top-20 space-y-5 max-lg:overflow-x-auto">
          <div>
            <p className="font-display font-extrabold text-sm mb-2">Category</p>
            <div className="flex lg:grid flex-wrap gap-1.5 max-lg:overflow-x-auto">
              {chip('/shop', sp, { cat: null }, 'All', !cat)}
              {categories.map(c => chip('/shop', sp, { cat: c.slug }, `${c.name} (${c._count.products})`, cat === c.slug))}
            </div>
          </div>

          <div>
            <p className="font-display font-extrabold text-sm mb-2">Brand</p>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
              {chip('/shop', sp, { brand: null }, 'Any brand', !s(sp, 'brand'))}
              {brands.slice(0, 18).map(b => chip('/shop', sp, { brand: b.slug }, b.name, s(sp, 'brand') === b.slug))}
            </div>
          </div>

          <form method="get" className="space-y-2">
            {Object.entries(sp).filter(([k, v]) => typeof v === 'string' && v && !['min', 'max', 'rating', 'stock', 'warranty'].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v as string} />)}
            <p className="font-display font-extrabold text-sm">Price range (₵)</p>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="min">Minimum price</label>
              <input id="min" name="min" type="number" min={0} placeholder="Min" defaultValue={s(sp, 'min')} className="w-full border border-line rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-navy" />
              <label className="sr-only" htmlFor="max">Maximum price</label>
              <input id="max" name="max" type="number" min={0} placeholder="Max" defaultValue={s(sp, 'max')} className="w-full border border-line rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-navy" />
            </div>
            <label htmlFor="rating" className="block text-sm font-bold">Minimum rating</label>
            <select id="rating" name="rating" defaultValue={s(sp, 'rating')} className="w-full border border-line rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-navy min-h-[40px]">
              <option value="">Any</option>
              <option value="4">4 stars &amp; up</option>
              <option value="4.5">4.5 stars &amp; up</option>
              <option value="5">5 stars only</option>
            </select>
            <label htmlFor="warranty" className="block text-sm font-bold mt-2">Warranty</label>
            <select id="warranty" name="warranty" defaultValue={s(sp, 'warranty')} className="w-full border border-line rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-navy min-h-[40px]">
              <option value="">Any</option>
              <option value="6">6 months+</option>
              <option value="12">12 months+</option>
              <option value="24">24 months+</option>
            </select>
            <label className="flex items-center gap-2 text-sm font-bold pt-1 cursor-pointer min-h-[40px]">
              <input type="checkbox" name="stock" value="1" defaultChecked={s(sp, 'stock') === '1'} className="w-4 h-4 accent-[#0C4A55]" />
              In stock only
            </label>
            <button className="btn-primary w-full !py-2.5 text-sm mt-1">Apply filters</button>
            {(q || s(sp, 'brand') || s(sp, 'min') || s(sp, 'max') || s(sp, 'rating') || s(sp, 'stock') || s(sp, 'warranty')) && (
              <Link href={cat ? `/shop?cat=${cat}` : '/shop'} className="block text-center text-[13px] font-bold text-danger hover:underline pt-1">Clear filters</Link>
            )}
          </form>
        </aside>

        {/* ── Results ── */}
        <section aria-label="Product results">
          {cards.length === 0 ? (
            <div className="card p-10 text-center">
              <span className="grid place-items-center w-16 h-16 rounded-2xl bg-mist dark:bg-navy-700 text-soft mb-3 mx-auto"><Icon name="search" size={30} /></span>
              <h2 className="font-display font-extrabold text-xl mb-2">Nothing matches — yet.</h2>
              <p className="text-sm text-soft mb-5 max-w-sm mx-auto">Try widening the price range or clearing filters. Can&apos;t find it? We source it — most special orders land within a week.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Link href="/shop" className="btn-primary !px-5 !py-2.5">Reset filters</Link>
                <Link href="/contact" className="btn-ghost !px-5 !py-2.5">Request a product</Link>
              </div>
            </div>
          ) : (
            <div className={view === 'list' ? 'grid gap-3' : 'grid grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4'}>
              {cards.map((p, i) => (
                <FadeUp key={p.slug} delay={Math.min(i * 0.04, 0.3)}>
                  <ProductCard p={p} list={view === 'list'} />
                </FadeUp>
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 mt-8">
              {page > 1 && <Link href={pageHref(page - 1)} className="btn-ghost !px-3.5 !py-2 text-sm" aria-label="Previous page"><Icon name="arrow_back" size={16} /></Link>}
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === pages || Math.abs(n - page) <= 2)
                .map((n, idx, arr) => (
                  <span key={n} className="flex items-center gap-1.5">
                    {idx > 0 && arr[idx - 1] !== n - 1 && <span className="text-soft px-1">…</span>}
                    <Link href={pageHref(n)} aria-current={n === page ? 'page' : undefined}
                      className={`min-w-[44px] min-h-[44px] grid place-items-center rounded-xl text-sm font-bold border ${n === page ? 'bg-blue text-white border-blue' : 'border-line hover:border-blue'}`}>{n}</Link>
                  </span>
                ))}
              {page < pages && <Link href={pageHref(page + 1)} className="btn-ghost !px-3.5 !py-2 text-sm" aria-label="Next page"><Icon name="arrow_forward" size={16} /></Link>}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}

function pageHrefSafe(sp: SP, viewMode: string): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string' && v && k !== 'view' && k !== 'page') params.set(k, v);
  if (viewMode !== 'grid') params.set('view', viewMode);
  const qs = params.toString();
  return `/shop${qs ? `?${qs}` : ''}`;
}
