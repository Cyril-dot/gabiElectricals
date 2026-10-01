import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ghs } from '@/lib/money';
import { JSONLd } from '@/components/JsonLd';
import { getSettings } from '@/lib/settings';
import { URGENCIES, type UrgencyKey } from '@/lib/booking';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

const parse = <T,>(raw: string, fb: T): T => { try { return JSON.parse(raw) as T; } catch { return fb; } };

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const svc = await prisma.service.findUnique({ where: { slug }, select: { name: true, shortDesc: true, description: true, basePrice: true } });
  if (!svc) return { title: 'Service not found' };
  return {
    title: `${svc.name} in Ghana — from ${ghs(svc.basePrice, { cents: false })}`,
    description: (svc.shortDesc ?? svc.description).slice(0, 155),
  };
}

const URGENCY_BLURB: Record<UrgencyKey, string> = {
  STANDARD: 'Scheduled at the next open slot — best value.',
  URGENT: 'Priority routing, aimed at same/next-day attendance.',
  EMERGENCY: 'Top of the queue, including nights — we roll fast.',
};

export default async function ServiceDetailPage({ params }: Params) {
  const { slug } = await params;
  const svc = await prisma.service.findUnique({ where: { slug } });
  if (!svc || !svc.active) notFound();

  const [settings, related] = await Promise.all([
    getSettings(),
    prisma.service.findMany({ where: { active: true, slug: { not: svc.slug } }, orderBy: { sortOrder: 'asc' }, take: 4 }),
  ]);
  const includes = parse<string[]>(svc.includes, []);
  const faqs = parse<{ q: string; a: string }[]>(svc.faqs, []);
  const urgencyMap = parse<Partial<Record<UrgencyKey, number>>>(svc.urgencyJson, {});
  const gallery = parse<string[]>(svc.gallery, []);
  const wa = settings.business.whatsapp.replace(/[^\d]/g, '');

  const jsonLd: object[] = [
    {
      '@context': 'https://schema.org', '@type': 'Service', name: svc.name, description: svc.description,
      serviceType: svc.name, provider: { '@type': 'LocalBusiness', name: settings.business.name, telephone: settings.business.phone },
      areaServed: 'Ghana', offers: { '@type': 'Offer', price: svc.basePrice, priceCurrency: 'GHS', availability: 'https://schema.org/InStock', url: `/services/${svc.slug}` },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
        { '@type': 'ListItem', position: 2, name: 'Services', item: '/services' },
        { '@type': 'ListItem', position: 3, name: svc.name, item: `/services/${svc.slug}` },
      ],
    },
  ];
  if (faqs.length) {
    jsonLd.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }

  return (
    <div className="bg-mist dark:bg-navy">
      {jsonLd.map((d, i) => <JSONLd key={i} data={d} />)}

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="bg-white dark:bg-navy-700 border-b border-line">
        <ol className="container-x py-3 flex flex-wrap gap-1.5 text-[12.5px] text-soft items-center">
          <li><Link href="/" className="hover:text-blue">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/services" className="hover:text-blue">Services</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-bold text-ink dark:text-white">{svc.name}</li>
        </ol>
      </nav>

      <article className="container-x py-8 md:py-12">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-10 items-start">
          {/* Main column */}
          <div className="space-y-8 min-w-0">
            <div>
              <div className="relative rounded-card overflow-hidden border border-line shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={svc.image ?? '/images/hero/hero-technician.webp'} alt={`${svc.name} by a GabiElectricals technician`}
                  width={1280} height={720} className="w-full h-48 md:h-72 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent" aria-hidden="true" />
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                  <p className="text-gold text-[11px] font-black uppercase tracking-[0.18em] mb-1">Certified Electricians · Warranty Included</p>
                  <h1 className="font-display text-2xl md:text-4xl font-extrabold text-white">{svc.name}</h1>
                </div>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-ink/90 dark:text-white/85">{svc.description}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-[13px] font-semibold text-soft">
                <span className="inline-flex items-center gap-1.5"><Icon name="schedule" size={15} /> Typical duration: <b className="text-ink dark:text-white">{Math.round(svc.durationMins / 60)} hr{svc.durationMins >= 120 ? 's' : ''}</b></span>
                <span className="inline-flex items-center gap-1.5"><Icon name="work" size={15} /> Deposit policy: <b className="text-ink dark:text-white">{svc.depositPct}% to lock the slot</b></span>
              </div>
            </div>

            {/* Includes */}
            <section aria-labelledby="incl-h" className="card p-5 md:p-6">
              <h2 id="incl-h" className="font-display font-extrabold text-lg mb-4">What&apos;s included</h2>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {includes.map(i => (
                  <li key={i} className="flex items-start gap-2 text-[14px]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success" aria-hidden="true"><Icon name="check" size={12} /></span>
                    {i}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12.5px] text-soft border-t border-line pt-3 inline-flex items-start gap-1.5">
                <Icon name="lock" size={15} className="mt-0.5 shrink-0" /> <span>Every job finishes with testing and a <b>{svc.durationMins >= 480 ? '12-month' : 'workmanship'} warranty</b> — we return free if anything we touched fails.</span>
              </p>
            </section>

            {/* Urgency table */}
            <section aria-labelledby="urg-h" className="card p-5 md:p-6">
              <h2 id="urg-h" className="font-display font-extrabold text-lg">Urgency &amp; call-out options</h2>
              <p className="text-[13px] text-soft mt-1 mb-4">Surcharges are fixed per job and always quoted before we start — no surprises.</p>
              <div className="overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0">
                <table className="w-full text-[13.5px] min-w-[480px] border-collapse">
                  <thead>
                    <tr className="text-left border-b border-line text-[11.5px] uppercase tracking-wide text-soft">
                      <th scope="col" className="py-2.5 pr-4">Option</th>
                      <th scope="col" className="py-2.5 pr-4">Surcharge</th>
                      <th scope="col" className="py-2.5 pr-4">Your total from</th>
                      <th scope="col" className="py-2.5">When it applies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {URGENCIES.map(u => {
                      const sur = u === 'STANDARD' ? 0 : (urgencyMap[u] ?? 0);
                      const pct = sur > 0 ? Math.round((sur / svc.basePrice) * 100) : 0;
                      return (
                        <tr key={u} className="border-b border-line/60 last:border-0">
                          <td className="py-3 pr-4 font-bold inline-flex items-center gap-1.5">{u === 'STANDARD' ? 'Standard' : u === 'URGENT' ? <><Icon name="schedule" size={16} /> Urgent</> : <><Icon name="siren" size={16} /> Emergency</>}</td>
                          <td className="py-3 pr-4">{sur === 0 ? <span className="text-success font-bold">No fee</span> : <span>{ghs(sur)} <span className="text-soft">(+{pct}%)</span></span>}</td>
                          <td className="py-3 pr-4 font-extrabold text-navy dark:text-white">{ghs(svc.basePrice + sur)}</td>
                          <td className="py-3 text-soft">{URGENCY_BLURB[u]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Deposit policy */}
            <section aria-labelledby="dep-h" className="card p-5 md:p-6 bg-blue/5 border-blue/20">
              <h2 id="dep-h" className="font-display font-extrabold text-lg">Deposit policy</h2>
              <ul className="mt-3 space-y-2 text-[14px]">
                <li className="flex gap-2"><b className="text-blue">1.</b> A refundable <b>{svc.depositPct}% deposit ({ghs(Math.round((svc.basePrice * svc.depositPct) / 100))}+ depending on urgency)</b> locks your slot and buys materials.</li>
                <li className="flex gap-2"><b className="text-blue">2.</b> The balance is paid after the job — MoMo, card, QR or bank transfer, invoice included.</li>
                <li className="flex gap-2"><b className="text-blue">3.</b> Free reschedule or cancellation up to 24h before, and before a technician is dispatched. Deposit is fully transferable to a new date.</li>
                <li className="flex gap-2"><b className="text-blue">4.</b> Bigger or uncertain scopes (rewires, solar): we survey first and issue a fixed written quote — you only pay against that.</li>
              </ul>
            </section>

            {/* FAQs */}
            <section aria-labelledby="faq-h">
              <h2 id="faq-h" className="font-display font-extrabold text-lg mb-4">Frequently asked</h2>
              {faqs.length > 0 ? (
                <div className="space-y-3">
                  {faqs.map(f => (
                    <details key={f.q} className="card p-4 group">
                      <summary className="cursor-pointer font-bold text-[14.5px] list-none flex justify-between items-center gap-3">
                        {f.q}
                        <span aria-hidden="true" className="text-blue font-black group-open:rotate-45 transition-transform">+</span>
                      </summary>
                      <p className="mt-2 text-[13.5px] text-soft leading-relaxed">{f.a}</p>
                    </details>
                  ))}
                </div>
              ) : (
                <div className="card p-5 text-[13.5px] text-soft">
                  <p><b>Common questions:</b> We use pure copper cable only, all techs are NIET-certified, and every job carries a written warranty.</p>
                  <a className="btn-ghost mt-3 px-4 py-2 text-[13px] inline-flex" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I have a question about ${svc.name}`)}`} target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a>
                </div>
              )}
            </section>

            {/* Related */}
            {related.length > 0 && (
              <section aria-labelledby="rel-h">
                <h2 id="rel-h" className="font-display font-extrabold text-lg mb-4">Related services</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {related.map(r => (
                    <Link key={r.id} href={`/services/${r.slug}`} className="card p-4 flex items-center gap-4 hover:border-blue transition-colors group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.image ?? '/images/hero/hero-technician.webp'} alt="" aria-hidden="true" width={72} height={72} className="h-16 w-16 rounded-lg object-cover bg-mist shrink-0" />
                      <span className="min-w-0">
                        <span className="block font-bold text-[14px] group-hover:text-blue transition-colors line-clamp-1">{r.name}</span>
                        <span className="block text-[12.5px] text-soft mt-0.5 line-clamp-1">{r.shortDesc}</span>
                        <span className="block text-[12px] font-extrabold text-gold-dark mt-1">From {ghs(r.basePrice, { cents: false })}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {gallery.length > 0 && (
              <section aria-labelledby="gal-h">
                <h2 id="gal-h" className="font-display font-extrabold text-lg mb-4">Recent work</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {gallery.map(g => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={g} src={g} alt={`${svc.name} completed project`} loading="lazy" className="rounded-card border border-line h-28 w-full object-cover" />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sticky booking rail */}
          <aside className="lg:sticky lg:top-24 card p-5 md:p-6 order-first lg:order-none" aria-label="Book this service">
            <p className="text-[11px] font-black uppercase tracking-widest text-soft">Starting from</p>
            <p className="font-display text-4xl font-extrabold text-navy dark:text-white mt-1">
              {ghs(svc.basePrice, { cents: false })}
              <span className="text-[13px] font-bold text-soft ml-1">before free quote check</span>
            </p>
            <ul className="mt-4 space-y-2 text-[13px]">
              <li className="flex gap-2 items-center"><span className="text-success" aria-hidden="true"><Icon name="check" size={14} /></span> NIET-certified electricians</li>
              <li className="flex gap-2 items-center"><span className="text-success" aria-hidden="true"><Icon name="check" size={14} /></span> Warranty included</li>
              <li className="flex gap-2 items-center"><span className="text-success" aria-hidden="true"><Icon name="check" size={14} /></span> {ghs(Math.round((svc.basePrice * svc.depositPct) / 100))} deposit · balance after job</li>
              <li className="flex gap-2 items-center"><span className="text-success" aria-hidden="true"><Icon name="check" size={14} /></span> Genuine materials only</li>
            </ul>
            <Link href={`/book?service=${svc.slug}`} className="btn-primary w-full mt-5 py-3.5 text-[15px]">
              Book {svc.name.split(' ').slice(0, 3).join(' ')}
            </Link>
            <Link href="/book" className="btn-ghost w-full mt-2 py-2.5 text-[13px]">Book a different service</Link>
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I'd like a price for ${svc.name} (${svc.slug})`)}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px] border border-success/40 text-success text-[13px] font-bold hover:bg-success/10 transition-colors">
              <span aria-hidden="true"><Icon name="chat" size={16} /></span> Ask an electrician on WhatsApp
            </a>
            <div className="mt-4 border-t border-line pt-3 text-[12px] text-soft space-y-1">
              <p className="inline-flex items-center gap-1.5"><Icon name="call" size={14} /> {settings.business.phone}</p>
              <p className="inline-flex items-center gap-1.5"><Icon name="schedule" size={14} /> {settings.business.hours}</p>
              <p className="inline-flex items-center gap-1.5"><Icon name="location_on" size={14} /> {settings.business.address}</p>
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
