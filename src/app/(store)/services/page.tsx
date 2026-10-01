import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ghs } from '@/lib/money';
import { JSONLd } from '@/components/JsonLd';
import { getSettings } from '@/lib/settings';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Certified Electrical Services in Ghana',
  description:
    'House wiring, fault finding, DB upgrades, solar, CCTV and 24/7 emergency call-outs by NIET-certified electricians. Warranty included on every job.',
};

const parse = <T,>(raw: string, fb: T): T => { try { return JSON.parse(raw) as T; } catch { return fb; } };

export default async function ServicesPage() {
  const [services, settings] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    getSettings(),
  ]);
  const wa = settings.business.whatsapp.replace(/[^\d]/g, '');

  const itemList = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: 'GabiElectricals Services',
    itemListElement: services.map((s, i) => ({
      '@type': 'ListItem', position: i + 1, name: s.name, url: `/services/${s.slug}`,
    })),
  };

  return (
    <div className="bg-mist dark:bg-navy">
      <JSONLd data={itemList} />
      {/* Hero */}
      <section className="bg-navy text-white">
        <div className="container-x py-12 md:py-16">
          <p className="text-gold text-xs font-black uppercase tracking-[0.2em] mb-3">Services · NIET-Certified</p>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold leading-tight max-w-3xl">
            Electricians who put their name on <span className="text-gold">every connection</span>
          </h1>
          <p className="mt-4 text-white/70 max-w-2xl text-sm md:text-base">
            From a single sparking socket to full estate contracts — genuine materials, tested work,
            and a written warranty on every job across Greater Accra, Kumasi, Takoradi and Tamale.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold"><Icon name="verified" size={15} className="text-gold" /> Certified Electricians</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold"><Icon name="workspace_premium" size={15} className="text-gold" /> Warranty Included</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold"><Icon name="bolt" size={15} className="text-gold" /> Same-day slots in Accra</span>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="container-x py-10 md:py-14">
        <h2 className="sr-only">Our {services.length} services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {services.map(s => {
            const includes = parse<string[]>(s.includes, []).slice(0, 3);
            return (
              <article key={s.id} className="card lift overflow-hidden flex flex-col group">
                <Link href={`/services/${s.slug}`} aria-label={`View ${s.name} details`} className="relative block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image ?? '/images/hero/hero-technician.webp'} alt={s.name} width={640} height={360} loading="lazy"
                    className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/10 to-transparent" aria-hidden="true" />
                  <span className="absolute bottom-3 left-3 bg-gold text-navy text-[11px] font-black rounded-lg px-2 py-1">
                    From {ghs(s.basePrice, { cents: false })}
                  </span>
                  <span className="absolute bottom-3 right-3 bg-white/90 text-navy text-[11px] font-bold rounded-lg px-2 py-1 inline-flex items-center gap-1">
                    <Icon name="schedule" size={13} /> {s.durationMins >= 60 ? `${Math.round(s.durationMins / 60)} hr${s.durationMins >= 120 ? 's' : ''}` : `${s.durationMins} min`} typical
                  </span>
                </Link>
                <div className="p-4 md:p-5 flex flex-col flex-1">
                  <h3 className="font-display font-extrabold text-[16px] leading-snug">
                    <Link href={`/services/${s.slug}`} className="hover:text-blue transition-colors">{s.name}</Link>
                  </h3>
                  <p className="mt-1.5 text-[13px] text-soft line-clamp-2">{s.shortDesc ?? s.description}</p>
                  <ul className="mt-3 space-y-1 text-[12.5px] text-ink/80 flex-1">
                    {includes.map(i => <li key={i} className="flex gap-1.5"><Icon name="check_circle" size={15} className="text-success shrink-0 mt-[1px]" />{i}</li>)}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wide text-success bg-success/10 rounded-md px-1.5 py-0.5">Certified Electricians</span>
                    <span className="text-[10px] font-black uppercase tracking-wide text-blue bg-blue/10 rounded-md px-1.5 py-0.5">Warranty Included</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link href={`/services/${s.slug}`} className="btn-ghost !py-2 text-[13px]">Details</Link>
                    <Link href={`/book?service=${s.slug}`} className="btn-primary !py-2 text-[13px]">Book now</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {services.length === 0 && (
          <div className="card p-10 text-center text-soft">
            <p className="font-bold">Services coming online shortly.</p>
            <p className="text-sm mt-1">Call {settings.business.phone} and we will schedule you directly.</p>
          </div>
        )}
      </section>

      {/* WhatsApp ask strip */}
      <section className="container-x pb-12">
        <div className="card p-5 md:p-7 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <h2 className="font-display font-extrabold text-lg">Not sure which service you need?</h2>
            <p className="text-sm text-soft mt-1">Send a photo or voice note — a certified tech will reply with the right fix and honest price.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent('Hi GabiElectricals, I need help with an electrical problem:')}`}
              target="_blank" rel="noopener noreferrer" className="btn-gold px-5 py-3 text-sm">Ask on WhatsApp</a>
            <Link href="/book" className="btn-primary px-5 py-3 text-sm">Book a service</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
