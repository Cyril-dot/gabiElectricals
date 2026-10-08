'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { categoryIcon } from './category-icons';
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
  const [scrolled, setScrolled] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const acctRef = useRef<HTMLDivElement>(null);
  const count = useCart(s => s.items.reduce((n, i) => n + i.qty, 0));
  const setOpenCart = useCart(s => s.setOpen);
  const router = useRouter();
  const path = usePathname();

  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
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
    // Each popover closes only when the click lands outside ITSELF.
    // Sharing one ref here was the dead-menu bug: the account menu
    // closed on mousedown — before the click could reach its links —
    // because the only ref watched the search box.
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setSugg([]);
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) setAcct(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  useEffect(() => { setAcct(false); setDrawer(false); }, [path]);

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
        <div className="bg-volt text-navy text-[13px] font-bold py-1.5 overflow-hidden">
          <div className="container-x flex items-center justify-center gap-2">
            <Icon name="campaign" size={15} />
            {bar.href ? <Link href={bar.href} className="hover:underline underline-offset-2">{bar.text}</Link> : bar.text}
          </div>
        </div>
      )}
      <div className={`bg-white/90 dark:bg-navy/90 backdrop-blur-xl border-b border-line transition-shadow duration-300 ${scrolled ? 'shadow-pop' : ''}`}>
        <div className="container-x flex items-center gap-2 sm:gap-3 h-16">
          <button className="lg:hidden icon-btn" aria-label="Open menu" onClick={() => setDrawer(true)}>
            <Icon name="menu" size={22} />
          </button>
          <Link href="/" className="shrink-0 transition-transform duration-200 hover:scale-[1.03]"><Logo size={30} /></Link>

          <nav className="hidden lg:flex items-center gap-0.5 ml-2" aria-label="Primary">
            {LINKS.map(l => (
              <div key={l.href} className="relative" onMouseEnter={() => l.href === '/shop' && setMega(true)} onMouseLeave={() => setMega(false)}>
                <Link href={l.href} className={`px-3 py-2 rounded-lg text-[14.5px] font-semibold transition-all duration-200 inline-flex items-center gap-0.5 ${path === l.href || (l.href !== '/' && path.startsWith(l.href)) ? 'text-blue dark:text-gold bg-blue/5 dark:bg-gold/10' : 'text-ink/80 hover:text-blue dark:hover:text-gold hover:bg-mist dark:hover:bg-white/5'}`}>
                  {l.label}{l.href === '/shop' && <Icon name="expand_more" size={16} className={`transition-transform duration-200 ${mega ? 'rotate-180' : ''}`} />}
                </Link>
                {l.href === '/shop' && mega && (
                  <div className="absolute left-0 top-full pt-2 w-[600px] hidden lg:block animate-scale-in origin-top-left">
                    <div className="card shadow-pop p-3 grid grid-cols-2 gap-1">
                      {cats.map(c => (
                        <Link key={c.slug} href={`/shop?cat=${c.slug}`} className="px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-mist dark:hover:bg-navy-700 flex items-center gap-2.5 transition-colors group/cat">
                          <span className="grid place-items-center w-8 h-8 rounded-lg bg-gold/15 text-gold-dark dark:text-gold group-hover/cat:scale-110 transition-transform"><Icon name={categoryIcon(c.icon)} size={18} /></span>
                          {c.name}
                        </Link>
                      ))}
                      <Link href="/shop" className="col-span-2 mt-1 text-center text-sm font-bold text-blue hover:underline inline-flex items-center justify-center gap-1 link-nudge">Browse all 70+ products <Icon name="arrow_forward" size={16} /></Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div ref={boxRef} className="relative flex-1 max-w-md ml-auto hidden md:block">
            <div className="flex items-center gap-1.5 border border-line dark:border-line rounded-xl bg-mist dark:bg-navy-700 px-3 py-2 transition-all duration-200 focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/20 focus-within:bg-white dark:focus-within:bg-navy">
              <Icon name="search" size={17} className="text-soft" />
              <input
                value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && goSearch()}
                placeholder="Search cables, breakers, solar…" aria-label="Search products"
                className="bg-transparent flex-1 text-sm outline-none min-w-0"
              />
              {q && <button onClick={() => { setQ(''); setSugg([]); }} aria-label="Clear search" className="text-soft hover:text-ink transition-colors"><Icon name="close" size={15} /></button>}
            </div>
            {sugg.length > 0 && (
              <div className="absolute top-full mt-2 w-full card shadow-pop overflow-hidden animate-scale-in origin-top" role="listbox">
                {sugg.map(s => (
                  <Link key={s.slug} href={`/product/${s.slug}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-mist dark:hover:bg-navy-700 text-sm transition-colors" onClick={() => setSugg([])}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.image} alt="" width={36} height={28} className="rounded-md border border-line object-cover" loading="lazy" />
                    <span className="flex-1 truncate font-medium">{s.name}</span>
                    <span className="font-bold text-blue">{ghs(s.price)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 ml-auto md:ml-0">
            <button onClick={toggleTheme} aria-label="Toggle dark mode" className="icon-btn" title={dark ? 'Light mode' : 'Dark mode'}>
              <span key={dark ? 'd' : 'l'} className="animate-scale-in grid place-items-center"><Icon name={dark ? 'light_mode' : 'dark_mode'} size={20} /></span>
            </button>
            {user ? (
              <div className="relative" ref={acctRef}>
                <button onClick={() => setAcct(a => !a)} aria-expanded={acct} aria-haspopup="menu" className="inline-flex items-center gap-1 rounded-[10px] px-2 py-2 text-sm font-bold text-ink hover:bg-mist dark:hover:bg-navy-700 hover:text-blue transition-colors min-w-0 max-w-[9.5rem]">
                  <Icon name="person" size={20} className="shrink-0" />
                  <span className="truncate min-w-0 hidden sm:inline">{user.name.split(' ')[0]}</span>
                  <Icon name="expand_more" size={15} className={`shrink-0 transition-transform duration-200 ${acct ? 'rotate-180' : ''}`} />
                </button>
                {acct && (
                  <div role="menu" className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] card shadow-pop py-1.5 text-sm animate-scale-in origin-top-right z-50">
                    <Link href="/account" onClick={() => setAcct(false)} className="flex items-center gap-2.5 px-4 py-2 hover:bg-mist dark:hover:bg-navy-700 font-semibold transition-colors"><Icon name="dashboard" size={17} className="text-soft" />My dashboard</Link>
                    <Link href="/account/orders" onClick={() => setAcct(false)} className="flex items-center gap-2.5 px-4 py-2 hover:bg-mist dark:hover:bg-navy-700 transition-colors"><Icon name="receipt_long" size={17} className="text-soft" />Orders</Link>
                    <Link href="/account/bookings" onClick={() => setAcct(false)} className="flex items-center gap-2.5 px-4 py-2 hover:bg-mist dark:hover:bg-navy-700 transition-colors"><Icon name="calendar_month" size={17} className="text-soft" />Bookings</Link>
                    <Link href="/account/referrals" onClick={() => setAcct(false)} className="flex items-center gap-2.5 px-4 py-2 hover:bg-mist dark:hover:bg-navy-700 transition-colors"><Icon name="wallet" size={17} className="text-soft" />Referrals & wallet</Link>
                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && <Link href="/admin" onClick={() => setAcct(false)} className="flex items-center gap-2.5 px-4 py-2 text-blue font-bold hover:bg-mist dark:hover:bg-navy-700 transition-colors"><Icon name="settings" size={17} />Admin panel</Link>}
                    {user.role === 'TECHNICIAN' && <Link href="/technician" onClick={() => setAcct(false)} className="flex items-center gap-2.5 px-4 py-2 text-blue font-bold hover:bg-mist dark:hover:bg-navy-700 transition-colors"><Icon name="engineering" size={17} />Technician app</Link>}
                    <form action="/api/auth/logout" method="post" className="mt-1 border-t border-line pt-1"><button className="w-full flex items-center gap-2.5 px-4 py-2 text-danger font-semibold hover:bg-danger/5 transition-colors"><Icon name="logout" size={17} />Sign out</button></form>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-ghost !py-2 !px-3 text-sm hidden sm:inline-flex"><Icon name="person" size={17} />Sign in</Link>
            )}
            <button onClick={() => setOpenCart(true)} aria-label={`Cart, ${count} items`} className="relative btn-gold !p-2.5 !rounded-xl overflow-visible">
              <Icon name="shopping_cart" size={19} />
              {count > 0 && <span key={count} className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] grid place-items-center px-1 animate-scale-in">{count}</span>}
            </button>
          </div>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true">
          <button aria-label="Close menu" className="absolute inset-0 bg-navy/60 backdrop-blur-[2px] animate-fade-in" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-white dark:bg-navy shadow-pop p-5 overflow-y-auto animate-slide-in-left">
            <div className="flex justify-between items-center mb-4"><Logo size={28} /><button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close menu"><Icon name="close" size={20} /></button></div>
            <div className="md:hidden mb-4 flex gap-2">
              <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setDrawer(false), goSearch())} placeholder="Search…" aria-label="Search" className="flex-1 border border-line rounded-xl px-3 py-2.5 text-sm bg-mist dark:bg-navy-700" />
            </div>
            <nav className="grid gap-1" aria-label="Mobile">
              {LINKS.map(l => <Link key={l.href} href={l.href} onClick={() => setDrawer(false)} className="px-4 py-3 rounded-xl font-bold text-[15.5px] hover:bg-mist dark:hover:bg-navy-700 transition-colors flex items-center justify-between">{l.label}<Icon name="chevron_right" size={17} className="text-soft" /></Link>)}
            </nav>
            <p className="mt-5 mb-2 px-4 text-[11px] font-black uppercase tracking-widest text-soft">Categories</p>
            <div className="grid gap-0.5">
              {cats.map(c => <Link key={c.slug} href={`/shop?cat=${c.slug}`} onClick={() => setDrawer(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-mist dark:hover:bg-navy-700 transition-colors flex items-center gap-2.5"><Icon name={categoryIcon(c.icon)} size={17} className="text-gold-dark dark:text-gold" />{c.name}</Link>)}
            </div>
            <div className="mt-6 grid gap-2">
              <a href={`tel:${biz.phone.replace(/\s/g, '')}`} className="btn-primary !py-3"><Icon name="call" size={17} /> Call {biz.phone}</a>
              {!user && <Link href="/login" onClick={() => setDrawer(false)} className="btn-ghost !py-3 justify-center">Sign in / Register</Link>}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
