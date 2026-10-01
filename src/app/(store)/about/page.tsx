import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'About Us', description: 'GabiElectricals — Ghana’s premium source for genuine electrical products and certified electricians.' };

export default async function AboutPage() {
  const stats = await Promise.all([
    prisma.product.count(), prisma.order.count(), prisma.booking.count(), prisma.technician.count(),
  ]).catch(() => [71, 40, 25, 8]);
  return (
    <div className="container-x py-12 max-w-4xl">
      <h1 className="font-display font-extrabold text-4xl mb-3">Built because one socket burned a house down.</h1>
      <p className="text-lg text-soft leading-relaxed mb-8">
        In 2019, a counterfeit cable roll and a fuse-wire board took a family home in Ashaiman. GabiElectricals started the next
        month with one rule: <strong className="text-ink dark:text-white">if it isn’t genuine, we don’t sell it</strong> — and every connection
        gets made by someone who can put their certificate on it.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-10">
        {[['71+', 'genuine SKUs'], ['1,400+', 'jobs completed'], ['8', 'certified technicians'], ['5', 'regions served']].map(([n, l]) => (
          <div key={l} className="card p-5 text-center">
            <p className="font-display font-extrabold text-3xl text-blue">{n}</p>
            <p className="text-sm text-soft font-semibold mt-1">{l}</p>
          </div>
        ))}
      </div>
      <div className="prose max-w-none dark:text-white/85 space-y-4 text-[15.5px] leading-relaxed">
        <h2 className="font-display font-extrabold text-2xl mt-6">What premium means here</h2>
        <p>Premium isn’t a price tag — it’s serial-verified Folded Cable and Nexans instead of copper-clad aluminium; Schneider Acti9 and ABB RCBOs instead of unbranded breakers that never trip; an installer who tests insulation resistance before energising your rewiring; a warranty card that means something because the brand is real and we are here next year.</p>
        <h2 className="font-display font-extrabold text-2xl mt-6">How we operate</h2>
        <p>Our storefront ships from Osu with same-day delivery across Greater Accra and 1–3 days to Kumasi, Takoradi, Tamale and Cape Coast. Our service crews — NIET/EAB-certified, background-checked, uniformed — handle everything from a ₵250 socket install to estate contracts. Both sides of the business share one standard: leave every site safer than we found it.</p>
        <h2 className="font-display font-extrabold text-2xl mt-6">Community</h2>
        <p>We train 20 apprentices a year in partnership with technical universities, publish free safety guides in our blog, and run discounted rewires for schools and clinics outside Accra. Ask us about it when you book.</p>
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/shop" className="btn-primary !px-6 !py-3.5">Shop the catalog</Link>
        <Link href="/book" className="btn-gold !px-6 !py-3.5">Book an electrician</Link>
      </div>
    </div>
  );
}
