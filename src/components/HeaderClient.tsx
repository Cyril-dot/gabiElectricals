'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { Logo } from './Logo';
import { ghs } from '@/lib/money';

type Cat = { slug: string; name: string; icon: string | null };
type Props = {
  cats: Cat[];
  bar: { text: string; href: string | null } | null;
  user: { name: string; role: string } | null;
  biz: { phone: string; whatsapp: string };
};

const LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/services', label: 'Services' },
  { href: '/book', label: 'Book Electrician' },
  { href: '/deals', label: 'Deals' },
  { href: '/refer', label: 'Refer & Earn' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

export function HeaderClient({ cats, bar, user, biz }: Props) {
  const [drawer, setDrawer] = useState(false);
  const [mega, setMega] = useState(false);
  const [acct, setAcct] = useState(false);
  const [q, setQ] = useState('');
  const [sugg, setSugg] = useState<{ name: string; slug: string; price: number; image: string }[]>([]);
  const [dark, setDark] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const count = useCart(s => s.items.reduce((n, i) => n + i.qty, 0));
  const setOpenCart = useCart(s => s.setOpen);
  const router = useRouter();
  const path = usePathname();

  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  useEffect(() => {
    if (!q || q.length < 2) { setSugg([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(r => (r.ok ? r.json() : []))
        .then(d => setSugg(Array.isArray(d) ? d.slice(0, 6) : []))
        .catch(() => setSugg([]));
    }, 220);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) { setSugg([]); setAcct(false); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggleTheme = () => {
    const d = !dark;
    setDark(d);
    document.documentElement.classList.toggle('dark', d);
    try { localStorage.theme = d ? 'dark' : 'light'; } catch {}
  };

  const goSearch = () => {
    if (!q.trim()) return;
    setSugg([]);
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-50">
      {bar && (
        <div className="bg-navy text-white text-[13px] font-medium py-1.5 overflow-hidden">
          <div className="container-x text-center">
            {bar.href ? <Link href={bar.href} className="hover:text-gold">{bar.text}</Link> : bar.text}
          </div>
        </div>
      )}
      <div className="bg-white/90 dark:bg-navy/90 dark:border-b dark:border-line backdrop-blur border-b border-line">
        <div className="container-x flex items-center gap-3 h-16">
          <button className="lg:hidden btn-ghost !px-2.5 !py-2" aria-label="Open menu" onClick={() => setDrawer(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <Link href="/" className="shrink-0"><Logo size={30} /></Link>

          <nav className="hidden lg:flex items-center gap-0.5 ml-2" aria-label="Primary">
            {LINKS.map(l => (
              <div key={l.href} className="relative" onMouseEnter={() => l.href === '/shop' && setMega(true)} onMouseLeave={() => setMega(false)}>
                <Link href={l.href} className={`px-3 py-2 rounded-lg text-[14.5px] font-semibold transition-colors ${path.startsWith(l.href) ? 'text-blue dark:text-gold' : 'text-ink/80 hover:text-blue dark:hover:text-gold'}`}>
                  {l.label}{l.href === '/shop' ? ' ⌄' : ''}
                </Link>
                {l.href === '/shop' && mega && (
                  <div className="absolute left-0 top-full pt-2 w-[560px] hidden lg:block">
                    <div className="card shadow-pop p-4 grid grid-cols-2 gap-1">
                      {cats.map(c => (
                        <Link key={c.slug} href={`/shop?cat=${c.slug}`} className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-mist dark:hover:bg-navy-700 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gold shrink-0" /> {c.name}
                        </Link>
                      ))}
                      <Link href="/shop" className="col-span-2 mt-1 text-center text-sm font-bold text-blue hover:underline">Browse all 70+ products →</Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div ref={boxRef} className="relative flex-1 max-w-md ml-auto hidden md:block">
            <div className="flex items-center gap-1 border border-line dark:border-line rounded-xl bg-mist dark:bg-navy-700 px-3 py-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-soft"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
              <input
                value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && goSearch()}
                placeholder="Search cables, breakers, solar…" aria-label="Search products"
                className="bg-transparent flex-1 text-sm outline-none min-w-0"
              />
            </div>
            {sugg.length > 0 && (
              <div className="absolute top-full mt-2 w-full card shadow-pop overflow-hidden" role="listbox">
                {sugg.map(s => (
                  <Link key={s.slug} href={`/product/${s.slug}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-mist dark:hover:bg-navy-700 text-sm" onClick={() => setSugg([])}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.image} alt="" width={36} height={28} className="rounded-md border border-line object-cover" loading="lazy" />
                    <span className="flex-1 truncate font-medium">{s.name}</span>
                    <span className="font-bold text-blue">{ghs(s.price)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto md:ml-0">
            <button onClick={toggleTheme} aria-label="Toggle dark mode" className="btn-ghost !p-2 !rounded-lg">
              {dark ? '☀️' : '🌙'}
            </button>
            {user ? (
              <div className="relative">
                <button onClick={() => setAcct(a => !a)} aria-expanded={acct} className="btn-ghost !p-2 !rounded-lg text-sm font-bold max-w-[120px] truncate">
                  {user.name.split(' ')[0]} ▾
                </button>
                {acct && (
                  <div className="absolute right-0 top-full mt-2 w-52 card shadow-pop py-1.5 text-sm">
                    <Link href="/account" className="block px-4 py-2 hover:bg-mist dark:hover:bg-navy-700 font-semibold">My dashboard</Link>
                    <Link href="/account/orders" className="block px-4 py-2 hover:bg-mist dark:hover:bg-navy-700">Orders</Link>
                    <Link href="/account/bookings" className="block px-4 py-2 hover:bg-mist dark:hover:bg-navy-700">Bookings</Link>
                    <Link href="/account/referrals" className="block px-4 py-2 hover:bg-mist dark:hover:bg-navy-700">Referrals & wallet</Link>
                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && <Link href="/admin" className="block px-4 py-2 text-blue font-bold hover:bg-mist dark:hover:bg-navy-700">Admin panel</Link>}
                    {user.role === 'TECHNICIAN' && <Link href="/technician" className="block px-4 py-2 text-blue font-bold hover:bg-mist dark:hover:bg-navy-700">Technician app</Link>}
                    <form action="/api/auth/logout" method="post" className="mt-1 border-t border-line pt-1"><button className="w-full text-left px-4 py-2 text-danger font-semibold">Sign out</button></form>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-ghost !py-2 !px-3 text-sm hidden sm:inline-flex">Sign in</Link>
            )}
            <button onClick={() => setOpenCart(true)} aria-label={`Cart, ${count} items`} className="relative btn-gold !p-2.5 !rounded-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>
              {count > 0 && <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] grid place-items-center px-1">{count}</span>}
            </button>
          </div>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true">
          <button aria-label="Close menu" className="absolute inset-0 bg-navy/60" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-white dark:bg-navy shadow-pop p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-4"><Logo size={28} /><button className="btn-ghost !p-2" onClick={() => setDrawer(false)} aria-label="Close menu">✕</button></div>
            <div className="md:hidden mb-4 flex gap-2">
              <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setDrawer(false), goSearch())} placeholder="Search…" aria-label="Search" className="flex-1 border border-line rounded-xl px-3 py-2.5 text-sm bg-mist dark:bg-navy-700" />
            </div>
            <nav className="grid gap-1" aria-label="Mobile">
              {LINKS.map(l => <Link key={l.href} href={l.href} onClick={() => setDrawer(false)} className="px-4 py-3 rounded-xl font-bold text-[15.5px] hover:bg-mist dark:hover:bg-navy-700">{l.label}</Link>)}
            </nav>
            <p className="mt-5 mb-2 px-4 text-[11px] font-black uppercase tracking-widest text-soft">Categories</p>
            <div className="grid gap-0.5">
              {cats.map(c => <Link key={c.slug} href={`/shop?cat=${c.slug}`} onClick={() => setDrawer(false)} className="px-4 py-2 rounded-lg text-sm hover:bg-mist dark:hover:bg-navy-700 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-gold rounded-full" />{c.name}</Link>)}
            </div>
            <div className="mt-6 grid gap-2">
              <a href={`tel:${biz.phone.replace(/\s/g, '')}`} className="btn-primary !py-3">📞 Call {biz.phone}</a>
              {!user && <Link href="/login" onClick={() => setDrawer(false)} className="btn-ghost !py-3 justify-center">Sign in / Register</Link>}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
