import Link from 'next/link';
import { prisma } from '@/lib/db';
import { HomeHero, Countdown } from '@/components/HomeHero';
import { ProductCard, Stars } from '@/components/ProductCard';
import type { CardProduct } from '@/components/ProductCard';
import { JSONLd } from '@/components/JsonLd';
import { FadeUp, Stagger, StaggerItem } from '@/components/FadeUp';
import { Rail } from '@/components/Rail';
import { Icon } from '@/components/Icon';
import { categoryIcon } from '@/components/category-icons';
import { ghs } from '@/lib/money';

const parseImgs = (j: string) => { try { const a = JSON.parse(j); return Array.isArray(a) && a.length ? a[0] : '/icon.svg'; } catch { return '/icon.svg'; } };

function toCard(p: { slug: string; name: string; price: number; compareAtPrice: number | null; images: string; rating: number; reviewCount: number; stock: number; badges: string; isNew: boolean; category: { name: string } | null }): CardProduct {
  return { slug: p.slug, name: p.name, price: p.price, compareAt: p.compareAtPrice, image: parseImgs(p.images), rating: p.rating, reviewCount: p.reviewCount, stock: p.stock, badges: (() => { try { return JSON.parse(p.badges); } catch { return []; } })(), isNew: p.isNew, category: p.category?.name };
}

const STATS: [string, string][] = [
  ['1,400+', 'certified jobs completed'],
  ['74', 'genuine products in stock'],
  ['5', 'regions served'],
  ['25yr', 'maximum warranty'],
];

export default async function HomePage() {
  const [slides, cats, featured, best, fresh, flash, testimonials, brands, services, prodImgs] = await Promise.all([
    prisma.heroSlide.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { products: true } } } }),
    prisma.product.findMany({ where: { featured: true, status: 'PUBLISHED' }, take: 10, include: { category: true } }),
    prisma.product.findMany({ where: { bestSeller: true, status: 'PUBLISHED' }, take: 8, include: { category: true } }),
    prisma.product.findMany({ where: { isNew: true, status: 'PUBLISHED' }, take: 8, include: { category: true } }),
    prisma.flashSale.findFirst({ where: { active: true, endsAt: { gt: new Date() } }, include: { product: { include: { category: true } } } }),
    prisma.testimonial.findMany({ where: { active: true }, take: 3 }),
    prisma.brand.findMany({ take: 14 }),
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' }, take: 8 }),
    prisma.product.findMany({ where: { status: 'PUBLISHED' }, select: { categoryId: true, images: true }, take: 300 }),
  ]);
  const catImg = new Map<string, string>();
  for (const p of prodImgs) {
    if (p.categoryId && !catImg.has(p.categoryId)) catImg.set(p.categoryId, parseImgs(p.images));
  }

  return (
    <>
      <JSONLd data={{ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'GabiElectricals', description: 'Premium electrical products store and certified electrical services in Ghana', telephone: '+233241002030', email: 'hello@gabielectricals.com', address: { '@type': 'PostalAddress', streetAddress: 'Ghana House, 44 Liberation Link, Osu', addressLocality: 'Accra', addressCountry: 'GH' }, areaServed: ['Greater Accra', 'Kumasi', 'Takoradi', 'Tamale', 'Cape Coast'], priceRange: '₵₵', url: process.env.NEXT_PUBLIC_SITE_URL }} />
      <HomeHero slides={slides.map(s => ({ headline: s.headline, sub: s.sub, ctaLabel: s.ctaLabel, ctaHref: s.ctaHref, cta2Label: s.cta2Label, cta2Href: s.cta2Href, image: s.image, badge: s.badge }))} />

      {/* ── Category showcase ── */}
      <section className="py-12 md:py-16" aria-labelledby="cats-h">
        <div className="container-x flex items-end justify-between mb-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-soft mb-1.5">Browse the warehouse</p>
            <h2 id="cats-h" className="font-display font-bold text-2xl md:text-[32px] tracking-tight">Shop by category</h2>
          </div>
          <Link href="/shop" className="text-sm font-bold text-blue dark:text-volt hover:underline inline-flex items-center gap-1 link-nudge shrink-0">All products <Icon name="arrow_forward" size={16} /></Link>
        </div>
        <div className="container-x">
          <Stagger className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" gap={0.05}>
            {cats.map(c => (
              <StaggerItem key={c.slug} className="snap-start shrink-0 w-[172px] md:w-[220px]">
                <Link href={`/shop?cat=${c.slug}`} className="group relative block rounded-[1.6rem] overflow-hidden h-[244px] md:h-[264px] border border-white/10 ring-1 ring-navy/10 dark:ring-white/10 shadow-soft hover:shadow-pop hover:-translate-y-1.5 active:scale-[0.96] transition-all duration-300 ease-out">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={catImg.get(c.id) ?? '/icon.svg'} alt="" width={220} height={264} loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
                  <span className="absolute inset-0 bg-gradient-to-t from-navy via-navy/25 to-navy/0" aria-hidden="true" />
                  {/* volt accent line */}
                  <span className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-volt via-volt/50 to-transparent origin-left scale-x-100 md:scale-x-0 md:group-hover:scale-x-100 transition-transform duration-500" aria-hidden="true" />
                  {/* glass icon chip */}
                  <span className="absolute top-3 left-3 grid place-items-center w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white shadow-lg group-hover:bg-volt group-hover:text-navy group-hover:border-volt group-hover:-rotate-6 group-hover:scale-110 transition-all duration-300"><Icon name={categoryIcon(c.icon)} size={21} /></span>
                  {/* item count */}
                  <span className="absolute top-[18px] right-3 text-[10px] font-black text-white/95 bg-navy/45 backdrop-blur-md border border-white/15 rounded-full px-2.5 py-1">{c._count.products} items</span>
                  <span className="absolute bottom-0 inset-x-0 p-4">
                    <span className="block font-display font-bold text-white text-[15.5px] md:text-[17px] leading-tight [text-shadow:0_2px_12px_rgb(0_0_0/0.5)]">{c.name}</span>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-black text-volt">Shop now <Icon name="arrow_forward" size={13} className="group-hover:translate-x-1 transition-transform" /></span>
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Premium picks rail ── */}
      <Rail
        title="Premium picks"
        icon="workspace_premium"
        action={<Link href="/shop" className="text-sm font-bold text-blue dark:text-volt hover:underline mr-1">Shop all</Link>}
      >
        {featured.map(p => (
          <div key={p.id} className="snap-start shrink-0 w-[240px] md:w-[280px]"><ProductCard p={toCard(p)} /></div>
        ))}
      </Rail>

      {/* ── Flash deal ── */}
      {flash && (
        <section className="container-x py-4 md:py-8" aria-labelledby="flash-h">
          <FadeUp>
            <div className="relative rounded-[2rem] bg-navy text-white p-6 md:p-10 grid md:grid-cols-2 gap-8 items-center overflow-hidden shadow-pop">
              <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
                style={{ backgroundImage: 'radial-gradient(45% 60% at 90% 15%, rgb(34 211 238 / 0.25), transparent 65%), radial-gradient(35% 50% at 5% 90%, rgb(255 92 0 / 0.14), transparent 60%)' }} />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/70 to-transparent" aria-hidden="true" />
              <div className="relative">
                <p className="inline-flex items-center gap-1.5 text-volt font-black text-xs tracking-[0.25em] uppercase mb-3"><Icon name="bolt" size={15} /> 48-hour flash sale</p>
                <h2 id="flash-h" className="font-display font-bold text-2xl md:text-[34px] leading-tight tracking-tight mb-2">{flash.product.name}</h2>
                <p className="text-white/70 text-sm mb-5 max-w-md">Save {ghs((flash.product.price - flash.salePrice))} — limited stock at this price while the timer runs.</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-display font-bold text-3xl md:text-4xl text-volt">{ghs(flash.salePrice)}</span>
                  <span className="line-through text-white/45">{ghs(flash.product.price)}</span>
                  <Countdown to={flash.endsAt.toISOString()} />
                </div>
                <Link href={`/product/${flash.product.slug}`} className="btn-gold !px-6 !py-3.5 !rounded-2xl mt-6 link-nudge">Grab the deal <Icon name="arrow_forward" size={18} /></Link>
              </div>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={parseImgs(flash.product.images)} alt={flash.product.name} width={420} height={300} className="rounded-2xl w-full max-h-72 object-contain bg-white/[0.06] p-6 border border-white/10 backdrop-blur-sm hover:scale-[1.02] transition-transform duration-500" />
              </div>
            </div>
          </FadeUp>
        </section>
      )}

      {/* ── Stats band ── */}
      <section className="mt-12 md:mt-16 bg-navy text-white relative overflow-hidden" aria-label="GabiElectricals in numbers">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
          style={{ backgroundImage: 'radial-gradient(40% 80% at 50% 0%, rgb(34 211 238 / 0.14), transparent 70%)' }} />
        <Stagger className="container-x relative grid grid-cols-2 md:grid-cols-4 gap-6 py-12 md:py-16" gap={0.08}>
          {STATS.map(([v, l]) => (
            <StaggerItem key={l} className="text-center md:text-left md:border-l md:border-volt/30 md:pl-6 first:border-0 first:pl-0">
              <p className="font-display font-bold text-4xl md:text-5xl text-volt tracking-tight">{v}</p>
              <p className="mt-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-white/55">{l}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ── Best sellers + new arrivals rails ── */}
      <Rail title="Best sellers in Accra" icon="local_fire_department">
        {best.map(p => (
          <div key={p.id} className="snap-start shrink-0 w-[240px] md:w-[280px]"><ProductCard p={toCard(p)} /></div>
        ))}
      </Rail>
      <div className="-mt-6">
        <Rail title="Just arrived" icon="auto_awesome">
          {fresh.map(p => (
            <div key={p.id} className="snap-start shrink-0 w-[240px] md:w-[280px]"><ProductCard p={toCard(p)} /></div>
          ))}
        </Rail>
      </div>

      {/* ── Services showcase ── */}
      <section className="py-12 md:py-16 bg-mist dark:bg-navy-700/30" aria-labelledby="svc-h">
        <div className="container-x flex items-end justify-between mb-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-soft mb-1.5">Certified crews</p>
            <h2 id="svc-h" className="font-display font-bold text-2xl md:text-[32px] tracking-tight">Book an electrician</h2>
          </div>
          <Link href="/services" className="text-sm font-bold text-blue dark:text-volt hover:underline inline-flex items-center gap-1 link-nudge shrink-0">All 12 services <Icon name="arrow_forward" size={16} /></Link>
        </div>
        <div className="container-x">
          <Stagger className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" gap={0.06}>
            {services.map(s => (
              <StaggerItem key={s.id} className="snap-start shrink-0 w-[248px] md:w-[300px]">
                <Link href={`/services/${s.slug}`} className="group relative block rounded-[1.6rem] overflow-hidden h-[292px] md:h-[304px] border border-white/10 ring-1 ring-navy/10 dark:ring-white/10 shadow-soft hover:shadow-pop hover:-translate-y-1.5 active:scale-[0.96] transition-all duration-300 ease-out">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image ?? '/images/hero/hero-technician.webp'} alt={s.name} width={300} height={304} loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]" />
                  <span className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-navy/0" aria-hidden="true" />
                  {/* glass price badge */}
                  <span className="absolute top-3 right-3 bg-white/15 backdrop-blur-md border border-white/25 text-white text-[11px] font-black rounded-xl px-3 py-1.5 shadow-lg">From {ghs(s.basePrice, { cents: false })}</span>
                  {/* certified chip */}
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-volt/90 text-navy text-[10px] font-black rounded-full px-2.5 py-1.5 shadow-lg"><Icon name="verified" size={12} /> Certified</span>
                  <span className="absolute bottom-0 inset-x-0 p-5">
                    <span className="block font-display font-bold text-white text-[17.5px] md:text-[18px] leading-tight [text-shadow:0_2px_12px_rgb(0_0_0/0.5)]">{s.name}</span>
                    <span className="mt-3 inline-flex items-center gap-2 bg-volt text-navy text-[12.5px] font-black rounded-full pl-4 pr-2 py-1.5 shadow-lg group-hover:gap-3 group-active:scale-95 transition-all duration-300">Book now <span className="grid place-items-center w-7 h-7 rounded-full bg-navy text-volt"><Icon name="arrow_forward" size={15} /></span></span>
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Brands marquee ── */}
      <div className="border-y border-line py-5 overflow-hidden" aria-label="Brands we stock">
        <div className="flex gap-12 animate-marquee w-max hover:[animation-play-state:paused]">
          {[...brands, ...brands].map((b, i) => (
            <span key={`${b.id}-${i}`} className="font-display font-bold text-lg text-soft whitespace-nowrap flex items-center gap-12">{b.name}<Icon name="bolt" size={12} className="text-volt/60" /></span>
          ))}
        </div>
      </div>

      {/* ── Why us + testimonials ── */}
      <section className="container-x py-14 md:py-20 grid lg:grid-cols-2 gap-12" aria-labelledby="why-h">
        <FadeUp>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-soft mb-2">Why GabiElectricals</p>
          <h2 id="why-h" className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-5">Why the price is premium — <span className="text-blue dark:text-volt">and worth it</span></h2>
          <p className="text-soft leading-relaxed mb-6">Counterfeit cable and blown capacitors cost Ghanaians homes and appliances every year. We only buy from authorised channels, verify serials, and put our name on every connection. You are not paying for a box — you are paying for a circuit that will not burn your house down.</p>
          <ul className="space-y-3.5">
            {['Serial-verified Folded Cable, Nexans, Schneider & ABB stock', 'Every order ships with warranty card and VAT invoice', 'Certified technicians installed 1,400+ jobs across 5 regions', 'Free load advice before you buy — WhatsApp us first'].map(x => (
              <li key={x} className="flex gap-3 text-[14.5px] font-medium">
                <span className="grid place-items-center w-6 h-6 rounded-full bg-volt/25 text-navy dark:text-volt shrink-0 mt-0.5"><Icon name="check" size={14} /></span>{x}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/book" className="btn-primary !px-6 !py-3.5 !rounded-2xl"><Icon name="engineering" size={18} /> Book an electrician</Link>
            <a href="https://wa.me/233241002030" className="btn !px-6 !py-3.5 !rounded-2xl bg-[#25D366] text-white hover:bg-[#1fb857]" target="_blank" rel="noreferrer"><Icon name="chat" size={18} /> Ask on WhatsApp</a>
          </div>
        </FadeUp>
        <Stagger className="grid gap-4 content-start" gap={0.1}>
          {testimonials.map(t => (
            <StaggerItem key={t.id}>
              <figure className="rounded-2xl bg-white dark:bg-navy-700 border border-line p-6 shadow-soft hover:shadow-pop hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
                <Icon name="format_quote" size={40} className="absolute top-3 right-4 text-volt/30 rotate-180" />
                <Stars r={t.rating} />
                <blockquote className="mt-2.5 text-[15px] leading-relaxed relative">“{t.quote}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span className="grid place-items-center w-10 h-10 rounded-full bg-navy text-volt font-display font-bold">{t.name.charAt(0)}</span>
                  <span className="text-[13px] font-bold">{t.name}<span className="block font-medium text-soft text-[12px]">{t.role}</span></span>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ── CTA band ── */}
      <section className="container-x pb-16 md:pb-20">
        <FadeUp>
          <div className="relative rounded-[2rem] bg-navy text-white p-8 md:p-14 overflow-hidden shadow-pop">
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
              style={{ backgroundImage: 'radial-gradient(50% 70% at 85% 20%, rgb(34 211 238 / 0.28), transparent 65%), radial-gradient(40% 60% at 10% 90%, rgb(34 211 238 / 0.12), transparent 60%)' }} />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/70 to-transparent" aria-hidden="true" />
            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-volt mb-3">Installation & repairs</p>
                <h2 className="font-display font-bold text-3xl md:text-[40px] leading-[1.05] tracking-tight">Need it installed? We send the inspectors’ favourites.</h2>
                <p className="mt-4 text-white/70 max-w-lg">Rewires, DB upgrades, solar, CCTV and 24/7 emergencies — certified crews in Greater Accra, Kumasi, Takoradi, Tamale and Cape Coast.</p>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 lg:justify-end">
                <Link href="/book" className="btn-gold !px-7 !py-4 !rounded-2xl link-nudge whitespace-nowrap">Book a service <Icon name="arrow_forward" size={18} /></Link>
                <Link href="/tools/load-calculator" className="btn !px-7 !py-4 !rounded-2xl border border-white/25 text-white hover:bg-white/10 hover:border-volt/60 whitespace-nowrap"><Icon name="calculate" size={18} /> Load calculator</Link>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>
    </>
  );
}
