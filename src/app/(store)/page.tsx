import Link from 'next/link';
import { prisma } from '@/lib/db';
import { HomeHero, Countdown } from '@/components/HomeHero';
import { ProductCard, Stars } from '@/components/ProductCard';
import type { CardProduct } from '@/components/ProductCard';
import { JSONLd } from '@/components/JsonLd';
import { FadeUp, Stagger, StaggerItem } from '@/components/FadeUp';
import { Icon } from '@/components/Icon';
import { categoryIcon } from '@/components/category-icons';
import { ghs } from '@/lib/money';

const parseImgs = (j: string) => { try { const a = JSON.parse(j); return Array.isArray(a) && a.length ? a[0] : '/icon.svg'; } catch { return '/icon.svg'; } };

function toCard(p: { slug: string; name: string; price: number; compareAtPrice: number | null; images: string; rating: number; reviewCount: number; stock: number; badges: string; isNew: boolean; category: { name: string } | null }): CardProduct {
  return { slug: p.slug, name: p.name, price: p.price, compareAt: p.compareAtPrice, image: parseImgs(p.images), rating: p.rating, reviewCount: p.reviewCount, stock: p.stock, badges: (() => { try { return JSON.parse(p.badges); } catch { return []; } })(), isNew: p.isNew, category: p.category?.name };
}

const TRUST: { icon: 'verified' | 'workspace_premium' | 'engineering' | 'local_shipping'; t: string; s: string }[] = [
  { icon: 'verified', t: '100% Genuine', s: 'serial-verified stock' },
  { icon: 'workspace_premium', t: 'Warranty Included', s: 'up to 25 years' },
  { icon: 'engineering', t: 'Certified Electricians', s: 'NIET-approved crews' },
  { icon: 'local_shipping', t: 'Same-Day in Accra', s: 'order before 2 PM' },
];

export default async function HomePage() {
  const [slides, cats, featured, best, fresh, flash, testimonials, brands] = await Promise.all([
    prisma.heroSlide.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.product.findMany({ where: { featured: true, status: 'PUBLISHED' }, take: 8, include: { category: true } }),
    prisma.product.findMany({ where: { bestSeller: true, status: 'PUBLISHED' }, take: 4, include: { category: true } }),
    prisma.product.findMany({ where: { isNew: true, status: 'PUBLISHED' }, take: 4, include: { category: true } }),
    prisma.flashSale.findFirst({ where: { active: true, endsAt: { gt: new Date() } }, include: { product: { include: { category: true } } } }),
    prisma.testimonial.findMany({ where: { active: true }, take: 3 }),
    prisma.brand.findMany({ take: 14 }),
  ]);

  return (
    <>
      <JSONLd data={{ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'GabiElectricals', description: 'Premium electrical products store and certified electrical services in Ghana', telephone: '+233241002030', email: 'hello@gabielectricals.com', address: { '@type': 'PostalAddress', streetAddress: 'Ghana House, 44 Liberation Link, Osu', addressLocality: 'Accra', addressCountry: 'GH' }, areaServed: ['Greater Accra', 'Kumasi', 'Takoradi', 'Tamale', 'Cape Coast'], priceRange: '₵₵', url: process.env.NEXT_PUBLIC_SITE_URL }} />
      <HomeHero slides={slides.map(s => ({ headline: s.headline, sub: s.sub, ctaLabel: s.ctaLabel, ctaHref: s.ctaHref, cta2Label: s.cta2Label, cta2Href: s.cta2Href, image: s.image, badge: s.badge }))} />

      {/* trust strip */}
      <div className="bg-white dark:bg-navy border-b border-line">
        <Stagger className="container-x grid grid-cols-2 md:grid-cols-4 gap-4 py-6" gap={0.08}>
          {TRUST.map(({ icon, t, s }) => (
            <StaggerItem key={t} className="flex items-center gap-3 justify-center md:justify-start">
              <span className="grid place-items-center w-11 h-11 rounded-2xl bg-volt/30 text-navy dark:bg-volt/15 dark:text-volt shrink-0"><Icon name={icon} size={22} /></span>
              <span className="text-left"><span className="block text-[13px] font-extrabold">{t}</span><span className="block text-[11px] text-soft">{s}</span></span>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      {/* categories */}
      <section className="container-x py-12" aria-labelledby="cats-h">
        <FadeUp>
          <div className="flex items-end justify-between mb-6">
            <h2 id="cats-h" className="font-display font-extrabold text-2xl md:text-3xl">Shop by category</h2>
            <Link href="/shop" className="text-sm font-bold text-blue hover:underline inline-flex items-center gap-1 link-nudge">All products <Icon name="arrow_forward" size={16} /></Link>
          </div>
        </FadeUp>
        <Stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" gap={0.05}>
          {cats.map(c => (
            <StaggerItem key={c.slug}>
              <Link href={`/shop?cat=${c.slug}`} className="card lift p-4 group block h-full">
                <span className="grid place-items-center w-10 h-10 rounded-xl bg-gold/15 text-gold-dark dark:text-gold group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"><Icon name={categoryIcon(c.icon)} size={21} /></span>
                <h3 className="font-bold text-[14px] mt-2.5 leading-snug group-hover:text-blue transition-colors">{c.name}</h3>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* flash deal */}
      {flash && (
        <section className="container-x pb-12" aria-labelledby="flash-h">
          <FadeUp>
            <div className="rounded-3xl bg-gradient-to-br from-navy via-navy-700 to-blue-deep text-white p-6 md:p-10 grid md:grid-cols-2 gap-6 items-center relative overflow-hidden shadow-pop">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue/30 rounded-full blur-3xl animate-float" aria-hidden="true" />
              <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-gold/20 rounded-full blur-3xl" aria-hidden="true" />
              <div className="relative">
                <p className="inline-flex items-center gap-1.5 text-gold font-black text-xs tracking-[0.25em] uppercase mb-3"><Icon name="bolt" size={15} /> 48-hour flash sale</p>
                <h2 id="flash-h" className="font-display font-extrabold text-2xl md:text-[34px] leading-tight mb-2">{flash.product.name}</h2>
                <p className="text-white/75 text-sm mb-5 max-w-md">Save {ghs((flash.product.price - flash.salePrice))} — limited stock at this price while the timer runs.</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-display font-extrabold text-3xl md:text-4xl">{ghs(flash.salePrice)}</span>
                  <span className="line-through text-white/50">{ghs(flash.product.price)}</span>
                  <Countdown to={flash.endsAt.toISOString()} />
                </div>
                <Link href={`/product/${flash.product.slug}`} className="btn-gold !px-6 !py-3.5 mt-6 link-nudge">Grab the deal <Icon name="arrow_forward" size={18} /></Link>
              </div>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={parseImgs(flash.product.images)} alt={flash.product.name} width={420} height={300} className="rounded-2xl w-full max-h-72 object-contain bg-white/10 p-6 backdrop-blur-sm border border-white/10 hover:scale-[1.02] transition-transform duration-500" />
              </div>
            </div>
          </FadeUp>
        </section>
      )}

      {/* featured */}
      <section className="container-x pb-12" aria-labelledby="feat-h">
        <FadeUp>
          <div className="flex items-end justify-between mb-6">
            <h2 id="feat-h" className="font-display font-extrabold text-2xl md:text-3xl">Premium picks</h2>
            <Link href="/shop" className="text-sm font-bold text-blue hover:underline inline-flex items-center gap-1 link-nudge">Shop all <Icon name="arrow_forward" size={16} /></Link>
          </div>
        </FadeUp>
        <Stagger className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" gap={0.06}>
          {featured.map(p => <StaggerItem key={p.id}><ProductCard p={toCard(p)} /></StaggerItem>)}
        </Stagger>
      </section>

      {/* bestsellers + new */}
      <section className="container-x pb-12 grid lg:grid-cols-2 gap-8">
        <FadeUp>
          <h2 className="font-display font-extrabold text-xl md:text-2xl mb-4 flex items-center gap-2"><Icon name="local_fire_department" size={22} className="text-danger" /> Best sellers in Accra</h2>
          <div className="grid grid-cols-2 gap-4">{best.map(p => <ProductCard key={p.id} p={toCard(p)} />)}</div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <h2 className="font-display font-extrabold text-xl md:text-2xl mb-4 flex items-center gap-2"><Icon name="auto_awesome" size={22} className="text-gold-dark dark:text-gold" /> Just arrived</h2>
          <div className="grid grid-cols-2 gap-4">{fresh.map(p => <ProductCard key={p.id} p={toCard(p)} />)}</div>
        </FadeUp>
      </section>

      {/* brands marquee */}
      <div className="border-y border-line bg-mist dark:bg-navy-700/40 py-5 overflow-hidden" aria-label="Brands we stock">
        <div className="flex gap-10 animate-marquee w-max hover:[animation-play-state:paused]">
          {[...brands, ...brands].map((b, i) => <span key={`${b.id}-${i}`} className="font-display font-extrabold text-lg text-soft whitespace-nowrap">{b.name}</span>)}
        </div>
      </div>

      {/* Why Us */}
      <section className="container-x py-14 grid md:grid-cols-2 gap-10" aria-labelledby="why-h">
        <FadeUp>
          <h2 id="why-h" className="font-display font-extrabold text-2xl md:text-3xl mb-4">Why the price is premium — and worth it</h2>
          <p className="text-soft leading-relaxed mb-5">Counterfeit cable and blown capacitors cost Ghanaians homes and appliances every year. We only buy from authorised channels, verify serials, and put our name on every connection. You are not paying for a box — you are paying for a circuit that will not burn your house down.</p>
          <ul className="space-y-3">
            {['Serial-verified Folded Cable, Nexans, Schneider & ABB stock', 'Every order ships with warranty card and VAT invoice', 'Certified technicians installed 1,400+ jobs across 5 regions', 'Free load advice before you buy — WhatsApp us first'].map(x => (
              <li key={x} className="flex gap-2.5 text-[14.5px] font-medium"><Icon name="check_circle" size={19} className="text-success shrink-0 mt-0.5" />{x}</li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/book" className="btn-primary !px-5 !py-3"><Icon name="engineering" size={18} /> Book an electrician</Link>
            <a href="https://wa.me/233241002030" className="btn !px-5 !py-3 bg-[#25D366] text-white hover:bg-[#1fb857]" target="_blank" rel="noreferrer"><Icon name="chat" size={18} /> Ask on WhatsApp</a>
          </div>
        </FadeUp>
        <Stagger className="grid gap-4 content-start" gap={0.1}>
          {testimonials.map(t => (
            <StaggerItem key={t.id}>
              <figure className="card lift p-5">
                <Stars r={t.rating} />
                <blockquote className="mt-2 text-[14.5px] leading-relaxed">“{t.quote}”</blockquote>
                <figcaption className="mt-3 text-[12.5px] font-bold text-soft flex items-center gap-2">
                  <span className="grid place-items-center w-8 h-8 rounded-full bg-blue/10 text-blue font-display font-extrabold text-xs">{t.name.charAt(0)}</span>
                  <span>{t.name} — <span className="font-medium">{t.role}</span></span>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* service CTA */}
      <section className="container-x pb-16">
        <FadeUp>
          <div className="rounded-3xl bg-blue text-white p-8 md:p-12 text-center relative overflow-hidden shadow-pop">
            <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0 2px, transparent 2px 24px)' }} aria-hidden="true" />
            <div className="absolute -top-20 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" aria-hidden="true" />
            <h2 className="font-display font-extrabold text-2xl md:text-4xl relative">Need it installed? We send the inspectors’ favourites.</h2>
            <p className="relative mt-3 text-white/85 max-w-xl mx-auto">Rewires, DB upgrades, solar, CCTV and 24/7 emergencies — certified crews in Greater Accra, Kumasi, Takoradi, Tamale and Cape Coast.</p>
            <div className="relative mt-7 flex flex-wrap gap-3 justify-center">
              <Link href="/book" className="btn-gold !px-6 !py-3.5 link-nudge">Book a service <Icon name="arrow_forward" size={18} /></Link>
              <Link href="/services" className="btn !px-6 !py-3.5 border border-white/40 text-white hover:bg-white/10 hover:border-white/60">See all 12 services</Link>
              <Link href="/tools/load-calculator" className="btn !px-6 !py-3.5 border border-white/40 text-white hover:bg-white/10 hover:border-white/60"><Icon name="calculate" size={18} /> Solar load calculator</Link>
            </div>
          </div>
        </FadeUp>
      </section>
    </>
  );
}
