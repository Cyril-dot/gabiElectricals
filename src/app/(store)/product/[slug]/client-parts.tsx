'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { useToast } from '@/components/Toast';
import { Stars } from '@/components/ProductCard';
import { ghs } from '@/lib/money';

type Img = { src: string; alt: string };

export function Gallery({ images, name, off }: { images: Img[]; name: string; off: number }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const cur = images[Math.min(idx, images.length - 1)];
  return (
    <div>
      <div
        className="relative card overflow-hidden bg-mist dark:bg-navy-700 cursor-zoom-in"
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
        }}
      >
        {off > 0 && <span className="absolute top-3 left-3 z-10 bg-danger text-white text-[12px] font-black px-2 py-1 rounded-md -rotate-2">-{off}% TODAY</span>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cur?.src} alt={`${name} — view ${(Math.min(idx, images.length - 1)) + 1} of ${images.length}`}
          className="w-full h-64 sm:h-80 md:h-96 object-contain p-6 transition-transform duration-200 will-change-transform"
          style={{ transform: zoom ? 'scale(1.8)' : undefined, transformOrigin: origin }}
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-3" role="tablist" aria-label="Product image gallery">
          {images.map((im, i) => (
            <button key={im.src} role="tab" aria-selected={i === idx} aria-label={`Show image ${i + 1}`} onClick={() => setIdx(i)}
              className={`w-18 h-16 sm:w-20 sm:h-18 rounded-xl border overflow-hidden bg-mist dark:bg-navy-700 transition-shadow ${i === idx ? 'border-blue ring-2 ring-blue/30' : 'border-line hover:border-blue/50'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.src} alt="" className="w-full h-full object-contain p-1.5" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PurchasePanel({ p, whatsapp }: {
  p: { slug: string; name: string; price: number; compareAt?: number | null; stock: number; images: string; categorySlug: string };
  whatsapp: string;
}) {
  const add = useCart(s => s.add);
  const toast = useToast();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [install, setInstall] = useState(false);
  const image = (JSON.parse(p.images || '[]') as string[])[0] ?? '/icon.svg';

  const line = () => p.price * qty * (install ? 1.1 : 1);
  const doAdd = () => {
    add({ slug: p.slug, name: p.name, price: p.price, image, stock: p.stock, install }, qty);
    toast(`Added ${qty} × ${p.name.slice(0, 30)}${install ? ' with installation' : ''}`);
  };

  if (p.stock === 0) return <NotifyMe slug={p.slug} name={p.name} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-3xl font-extrabold text-navy dark:text-white">{ghs(p.price)}</span>
        {p.compareAt && p.compareAt > p.price && (
          <>
            <span className="text-lg line-through text-soft">{ghs(p.compareAt)}</span>
            <span className="text-[13px] font-black text-danger bg-danger/10 rounded-md px-2 py-1">SAVE {ghs((p.compareAt - p.price))}</span>
          </>
        )}
        <span className="text-[11.5px] text-soft font-semibold w-full">VAT included · Price cedi-stable, no surprise forex</span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center border border-line rounded-xl overflow-hidden bg-white dark:bg-navy" role="group" aria-label="Quantity">
          <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3.5 py-3 font-black hover:bg-mist dark:hover:bg-navy-700 min-h-[44px]" aria-label="Decrease quantity">−</button>
          <span className="w-10 text-center font-extrabold" aria-live="polite">{qty}</span>
          <button onClick={() => setQty(q => Math.min(p.stock, q + 1))} className="px-3.5 py-3 font-black hover:bg-mist dark:hover:bg-navy-700 min-h-[44px]" aria-label="Increase quantity">+</button>
        </div>
        <span className="text-[13px] font-bold text-navy dark:text-white">{qty} × {install ? 'with install' : 'unit'} = <span className="text-blue">{ghs(line())}</span></span>
      </div>

      <label className="flex items-start gap-2.5 border border-line rounded-xl p-3 cursor-pointer hover:border-blue transition-colors">
        <input type="checkbox" checked={install} onChange={e => setInstall(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#0A5CFF]" />
        <span className="text-sm">
          <span className="font-bold">Add professional installation</span>
          <span className="block text-[12.5px] text-soft mt-0.5">+10% — a certified NIET electrician fits it for you, tested and documented. Popular in Accra & Kumasi.</span>
        </span>
      </label>

      <div className="grid sm:grid-cols-2 gap-2.5">
        <button onClick={doAdd} className="btn-primary !py-3.5 min-h-[48px]">🛒 Add to cart</button>
        <button onClick={() => { add({ slug: p.slug, name: p.name, price: p.price, image, stock: p.stock, install }, qty); router.push('/checkout'); }}
          className="btn-gold !py-3.5 min-h-[48px]">⚡ Buy now — checkout</button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello GabiElectricals, I have a question about "${p.name}" (${ghs(p.price)}) — see /product/${p.slug}`)}`}
          target="_blank" rel="noopener noreferrer" className="btn-ghost !py-3 text-sm min-h-[44px] justify-center">
          💬 Ask on WhatsApp
        </a>
        <ShareButtons name={p.name} slug={p.slug} />
      </div>
    </div>
  );
}

export function ShareButtons({ name, slug }: { name: string; slug: string }) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  useEffect(() => setUrl(`${location.origin}/product/${slug}`), [slug]);
  return (
    <div className="flex gap-2">
      <button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(url); toast('Link copied — share it and earn when they buy!'); }
        catch { toast('Copy failed — long-press the address bar.', 'err'); }
      }} className="btn-ghost !py-3 text-sm min-h-[44px] flex-1 justify-center">🔗 Copy link</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(`Check this out from GabiElectricals: ${name} ${url}`)}`} target="_blank" rel="noopener noreferrer"
        className="btn-ghost !py-3 text-sm min-h-[44px] flex-1 justify-center">↗ Share</a>
    </div>
  );
}

export function NotifyMe({ slug, name }: { slug: string; name: string }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <div className="card p-4 border-warning/40 bg-warning/5">
      <p className="font-bold text-warning mb-1">😴 Out of stock — we restock weekly</p>
      <p className="text-sm text-soft mb-3">Leave your email and we will alert you the moment {name.split('—')[0].trim()} lands.</p>
      {done ? (
        <p className="text-sm font-bold text-success">✓ You are on the list — we will notify you first.</p>
      ) : (
        <form onSubmit={async e => {
          e.preventDefault();
          setBusy(true); setErr('');
          const res = await fetch('/api/stockalert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, email }) });
          setBusy(false);
          if (res.ok) setDone(true);
          else setErr((await res.json().catch(() => ({}))).error ?? 'Try again.');
        }} className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="notify-email" className="sr-only">Email for stock alert</label>
          <input id="notify-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
            className="flex-1 border border-line rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-navy outline-none focus:border-blue min-h-[44px]" />
          <button disabled={busy} className="btn-primary !px-4 !py-2.5 text-sm min-h-[44px]">{busy ? 'Saving…' : 'Notify me'}</button>
          {err && <p role="alert" className="text-xs text-danger font-semibold w-full">{err}</p>}
        </form>
      )}
    </div>
  );
}

export function ReviewForm({ slug, signedIn }: { slug: string; signedIn: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!signedIn) {
    return (
      <div className="card p-5 text-center">
        <p className="text-sm text-soft mb-3 font-medium">Sign in to review this product — verified purchases get a ✓ badge.</p>
        <Link href="/login" className="btn-primary !px-5 !py-2.5 text-sm">Sign in to review</Link>
      </div>
    );
  }
  return (
    <form className="card p-5 space-y-3" onSubmit={async e => {
      e.preventDefault();
      setBusy(true); setErr('');
      const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, rating, title, body }) });
      setBusy(false);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? 'Could not save review.'); if (res.status === 401) router.push('/login'); return; }
      toast(j.verified ? 'Review posted — marked Verified purchase ✓' : 'Review posted — thank you!');
      router.refresh();
      setTitle(''); setBody('');
    }}>
      <div className="flex items-center gap-2" role="radiogroup" aria-label="Your rating">
        <span className="text-sm font-bold">Your rating</span>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)}
            className={`text-2xl leading-none min-w-[36px] min-h-[36px] transition-transform ${n <= rating ? 'text-gold scale-110' : 'text-line'}`}>★</button>
        ))}
      </div>
      <div>
        <label htmlFor="rv-title" className="text-[13px] font-bold block mb-1">Headline</label>
        <input id="rv-title" required minLength={2} maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Genuine copper, exactly as described"
          className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-navy outline-none focus:border-blue min-h-[44px]" />
      </div>
      <div>
        <label htmlFor="rv-body" className="text-[13px] font-bold block mb-1">Your experience</label>
        <textarea id="rv-body" required minLength={10} maxLength={1200} rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="How did it perform on site? Delivery? Warranty?"
          className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-navy outline-none focus:border-blue" />
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-danger">{err}</p>}
      <button disabled={busy} className="btn-primary !px-5 !py-2.5 text-sm min-h-[44px]">{busy ? 'Posting…' : 'Post review'}</button>
    </form>
  );
}

export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const [items, setItems] = useState<{ slug: string; name: string; price: number; image: string }[]>([]);
  useEffect(() => {
    try {
      // record this visit
      const raw = localStorage.getItem('ge_recent');
      const list: { slug: string; name: string; price: number; image: string; at: number }[] = raw ? JSON.parse(raw) : [];
      const img = (document.querySelector('meta[property="og:image"]')?.getAttribute('content')
        ?? (document.querySelector('[data-product-image]') as HTMLImageElement | null)?.src
        ?? '/icon.svg');
      const name = document.querySelector('h1')?.textContent ?? currentSlug;
      const price = Number((document.querySelector('[data-product-price]') as HTMLElement)?.dataset.price ?? 0);
      const next = [{ slug: currentSlug, name, price, image: img, at: Date.now() }, ...list.filter(x => x.slug !== currentSlug)].slice(0, 12);
      localStorage.setItem('ge_recent', JSON.stringify(next));
      setItems(next.filter(x => x.slug !== currentSlug).slice(0, 4));
    } catch { /* private mode etc. */ }
  }, [currentSlug]);
  if (items.length === 0) return null;
  return (
    <section aria-label="Recently viewed products" className="mt-12">
      <h2 className="font-display text-xl font-extrabold mb-4">Recently viewed</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map(it => (
          <Link key={it.slug} href={`/product/${it.slug}`} className="card p-3 hover:border-blue transition-colors group flex gap-3 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.image} alt="" width={56} height={42} className="w-14 h-11 object-contain bg-mist dark:bg-navy-700 rounded-lg p-1 shrink-0" />
            <span className="min-w-0">
              <span className="block text-[12.5px] font-bold line-clamp-2 group-hover:text-blue transition-colors">{it.name}</span>
              <span className="text-[13px] font-extrabold text-navy dark:text-white">{ghs(it.price)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
