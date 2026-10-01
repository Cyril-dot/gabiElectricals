import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import Link from 'next/link';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { NewsletterForm } from './NewsletterForm';

const PAY = ['MTN MoMo', 'Telecel Cash', 'AT Money', 'Visa', 'Mastercard', 'GhIPSS', 'QR Pay'];

export async function Footer() {
  const [cats, biz] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, name: true } }),
    getSettings().then(s => s.business),
  ]);
  return (
    <footer className="mt-auto bg-navy text-white/85">
      <div className="container-x py-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo size={34} light />
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Premium electrical products and NIET-certified installation crews across Ghana.
            100% genuine stock, verified by serial, delivered fast.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {PAY.map(p => (
              <span key={p} className="text-[11px] font-bold bg-white/10 rounded-md px-2 py-1 border border-white/15">{p}</span>
            ))}
          </div>
        </div>
        <nav aria-label="Shop categories">
          <h3 className="font-display font-extrabold text-white mb-4 text-sm uppercase tracking-wider">Shop</h3>
          <ul className="space-y-2 text-sm">
            {cats.slice(0, 8).map(c => <li key={c.slug}><Link href={`/shop?cat=${c.slug}`} className="hover:text-gold">{c.name}</Link></li>)}
            <li><Link href="/shop" className="hover:text-gold font-semibold text-gold inline-flex items-center gap-1 link-nudge">All categories <Icon name="arrow_forward" size={14} /></Link></li>
          </ul>
        </nav>
        <nav aria-label="Services & company">
          <h3 className="font-display font-extrabold text-white mb-4 text-sm uppercase tracking-wider">Services & Company</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/services" className="hover:text-gold">All electrical services</Link></li>
            <li><Link href="/book" className="hover:text-gold">Book an electrician</Link></li>
            <li><Link href="/emergency" className="hover:text-gold font-semibold text-gold">24/7 Emergency call-out</Link></li>
            <li><Link href="/refer" className="hover:text-gold">Refer & Earn</Link></li>
            <li><Link href="/deals" className="hover:text-gold">Flash deals</Link></li>
            <li><Link href="/about" className="hover:text-gold">About us</Link></li>
            <li><Link href="/blog" className="hover:text-gold">Electrical safety blog</Link></li>
            <li><Link href="/faq" className="hover:text-gold">FAQ</Link></li>
          </ul>
        </nav>
        <div>
          <h3 className="font-display font-extrabold text-white mb-4 text-sm uppercase tracking-wider">Reach us</h3>
          <address className="not-italic text-sm space-y-2.5 text-white/75">
            <p className="flex gap-2"><Icon name="location_on" size={16} className="text-gold shrink-0 mt-0.5" />{biz.address}</p>
            <p className="flex gap-2 items-center"><Icon name="my_location" size={16} className="text-gold shrink-0" /><span>Ghana Post GPS: <span className="font-mono text-gold">{biz.gps}</span></span></p>
            <p><a href={`tel:${biz.phone.replace(/\s/g, '')}`} className="hover:text-gold font-semibold flex gap-2 items-center transition-colors"><Icon name="call" size={16} className="text-gold shrink-0" />{biz.phone}</a></p>
            <p><a href={`mailto:${biz.email}`} className="hover:text-gold flex gap-2 items-center transition-colors"><Icon name="mail" size={16} className="text-gold shrink-0" />{biz.email}</a></p>
            <p className="flex gap-2 items-center"><Icon name="schedule" size={16} className="text-gold shrink-0" />{biz.hours}</p>
          </address>
          <div className="mt-5"><NewsletterForm /></div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x py-5 flex flex-col md:flex-row gap-3 items-center justify-between text-xs text-white/55">
          <p>© {new Date().getFullYear()} GabiElectricals. Premium Power. Trusted Safety. Done Right.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-gold">Terms</Link>
            <Link href="/privacy" className="hover:text-gold">Privacy (Ghana Data Protection Act)</Link>
            <Link href="/returns" className="hover:text-gold">Refunds & Warranty</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
