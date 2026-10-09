'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';
import { ghs } from '@/lib/money';

type PromoDeal = { slug: string; name: string; image: string; price: number; salePrice: number; pct: number; left: number };
type Promo = {
  active: boolean; name?: string; endsAt?: string; madeGhs?: number;
  poolTotal?: number; poolLeft?: number; deals?: PromoDeal[];
};

const SKIP_PREFIXES = ['/checkout', '/cart', '/admin', '/pay'];

function pad(n: number) { return String(Math.max(0, n)).padStart(2, '0'); }

/**
 * Full-screen flash-sale takeover. Renders only while a real FlashSale is
 * live (data from /api/promo/current) and shares the `ge_popup_shown`
 * session slot with PopupHost, so the two never stack in one session.
 */
export function FlashSalePopup() {
  const pathname = usePathname();
  const [promo, setPromo] = useState<Promo | null>(null);
  const [open, setOpen] = useState(false);
  const [msLeft, setMsLeft] = useState(0);
  const shownRef = useRef(false);

  useEffect(() => {
    if (SKIP_PREFIXES.some(p => pathname?.startsWith(p))) return;
    if (sessionStorage.getItem('ge_popup_shown')) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const res = await fetch('/api/promo/current');
        if (!res.ok || cancelled) return;
        const j: Promo = await res.json();
        if (cancelled || !j.active) return;
        setPromo(j);
        timer = setTimeout(() => {
          if (cancelled || shownRef.current) return;
          if (sessionStorage.getItem('ge_popup_shown')) return;
          shownRef.current = true;
          sessionStorage.setItem('ge_popup_shown', 'flash-sale');
          setOpen(true);
        }, 1100);
      } catch { /* silent — no sale, no popup */ }
    })();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [pathname]);

  useEffect(() => {
    if (!open || !promo?.endsAt) return;
    const end = new Date(promo.endsAt).getTime();
    const tick = () => setMsLeft(end - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', esc);
    return () => {
      clearInterval(t);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', esc);
    };
  }, [open, promo]);

  if (!open || !promo?.active) return null;

  const poolTotal = promo.poolTotal ?? 0;
  const poolLeft = promo.poolLeft ?? 0;
  const poolPct = poolTotal > 0 ? Math.min(100, Math.max(0, (poolLeft / poolTotal) * 100)) : 0;
  const secs = Math.floor(msLeft / 1000);
  const cd = [
    { v: pad(Math.floor(secs / 86400)), l: 'Days' },
    { v: pad(Math.floor((secs % 86400) / 3600)), l: 'Hrs' },
    { v: pad(Math.floor((secs % 3600) / 60)), l: 'Min' },
    { v: pad(secs % 60), l: 'Sec' },
  ];

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto fs-root" role="dialog" aria-modal="true" aria-label={promo.name || 'Flash sale'}>
      <style>{`
        .fs-root { background: radial-gradient(120% 90% at 50% 0%, #14306B 0%, #0B1B3A 48%, #060D21 100%); animation: fsIn .45s cubic-bezier(.2,.9,.25,1) both; }
        @keyframes fsIn { from { opacity: 0 } to { opacity: 1 } }
        .fs-card { animation: fsUp .55s cubic-bezier(.2,.9,.25,1) both; }
        @keyframes fsUp { from { opacity: 0; transform: translateY(26px) scale(.985) } to { opacity: 1; transform: none } }
        .fs-glow { position: absolute; border-radius: 9999px; filter: blur(90px); opacity: .5; pointer-events: none; animation: fsPulse 5s ease-in-out infinite; }
        @keyframes fsPulse { 0%,100% { transform: scale(1); opacity: .45 } 50% { transform: scale(1.15); opacity: .65 } }
        .fs-big { background: linear-gradient(100deg, #A5F3FC 10%, #22D3EE 38%, #FFFFFF 50%, #22D3EE 62%, #A5F3FC 90%); background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: fsShine 3.2s linear infinite; }
        @keyframes fsShine { to { background-position: -220% 0 } }
        .fs-stripes { background-image: repeating-linear-gradient(-45deg, rgba(255,255,255,.14) 0 10px, transparent 10px 20px); animation: fsSlide 1.2s linear infinite; }
        @keyframes fsSlide { to { background-position: 28px 0 } }
        .fs-live { animation: fsBlink 1.6s ease-in-out infinite; }
        @keyframes fsBlink { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
        @media (prefers-reduced-motion: reduce) { .fs-root, .fs-card, .fs-glow, .fs-big, .fs-stripes, .fs-live { animation: none !important } }
      `}</style>

      <div className="fs-glow" style={{ width: 480, height: 480, top: -140, left: -120, background: '#2E7CF6' }} />
      <div className="fs-glow" style={{ width: 420, height: 420, bottom: -160, right: -100, background: '#22D3EE', animationDelay: '1.4s' }} />
      <div className="fs-glow" style={{ width: 260, height: 260, top: '42%', left: '58%', background: '#17C3A5', opacity: 0.28, animationDelay: '2.2s' }} />

      <button onClick={() => setOpen(false)} aria-label="Close flash sale"
        className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white grid place-items-center transition">
        <Icon name="close" size={20} />
      </button>

      <div className="relative z-10 min-h-full flex items-center justify-center px-4 py-10">
        <div className="fs-card w-full max-w-3xl text-center text-white">
          <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-black tracking-[0.28em] uppercase bg-volt text-navy px-3.5 py-1.5 rounded-full">
            <span className="fs-live w-2 h-2 rounded-full bg-navy inline-block" />
            <Icon name="bolt" size={14} /> Flash sale — live now
          </span>

          <p className="mt-6 text-[12px] sm:text-sm font-bold tracking-[0.22em] uppercase text-white/70">The 360Pay giveback sale</p>
          <h2 className="font-display font-black leading-[0.95] mt-2 text-[clamp(2rem,6vw,3.6rem)]">
            You powered <span className="whitespace-nowrap">{ghs(promo.madeGhs ?? 0)}</span><br />in MoMo sales —
          </h2>
          <p className="font-display font-black leading-none mt-3 text-[clamp(3.2rem,11vw,6.5rem)] fs-big">{ghs(poolLeft)}</p>
          <p className="text-base sm:text-lg text-white/85 font-semibold mt-2">of flash discounts is on the house, until the pool runs dry.</p>

          <div className="max-w-md mx-auto mt-6">
            <div className="h-3.5 rounded-full bg-white/12 border border-white/20 overflow-hidden">
              <div className="h-full rounded-full fs-stripes" style={{ width: `${poolPct}%`, backgroundColor: '#22D3EE' }} />
            </div>
            <p className="text-[12.5px] text-white/70 mt-2 font-semibold">{ghs(poolLeft)} of {ghs(poolTotal)} still in the pool</p>
          </div>

          <div className="flex items-stretch justify-center gap-2 sm:gap-3 mt-7" aria-label="Sale ends in">
            {cd.map((b, i) => (
              <div key={b.l} className="flex items-center gap-2 sm:gap-3">
                <div className="bg-black/40 border border-volt/40 rounded-2xl px-3 sm:px-4 py-2.5 min-w-[64px]">
                  <div className="font-mono font-black text-2xl sm:text-3xl text-volt tabular-nums leading-none">{b.v}</div>
                  <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60 mt-1.5">{b.l}</div>
                </div>
                {i < cd.length - 1 && <span className="font-black text-volt/70 text-xl">:</span>}
              </div>
            ))}
          </div>

          {!!promo.deals?.length && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 text-left">
              {promo.deals.map(d => (
                <Link key={d.slug} href={`/product/${d.slug}`} onClick={() => setOpen(false)}
                  className="group bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 hover:border-gold/60 rounded-2xl p-3 transition flex sm:block gap-3 items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.image} alt={d.name} className="w-16 h-16 sm:w-full sm:h-32 object-cover rounded-xl shrink-0" loading="lazy" />
                  <div className="min-w-0 sm:mt-3">
                    <p className="text-[13px] font-bold leading-snug line-clamp-2">{d.name}</p>
                    <p className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                      <span className="font-display font-extrabold text-lg text-gold">{ghs(d.salePrice)}</span>
                      <span className="text-[12px] text-white/55 line-through">{ghs(d.price)}</span>
                      <span className="text-[10px] font-black bg-danger text-white rounded px-1.5 py-0.5">−{d.pct}%</span>
                    </p>
                    <p className="text-[11px] font-bold text-danger mt-1">{d.left} left at this price</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9">
            <Link href="/deals" onClick={() => setOpen(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gold text-navy font-black text-base rounded-2xl px-8 py-4 shadow-[0_18px_40px_-12px_rgba(34,211,238,0.55)] hover:brightness-105 active:scale-[0.99] transition">
              Shop the flash sale <Icon name="arrow_forward" size={20} />
            </Link>
            <button onClick={() => setOpen(false)} className="text-white/75 hover:text-white font-bold text-sm underline underline-offset-4 px-4 py-2">No thanks, I&apos;ll pay full price</button>
          </div>

          <p className="text-[11.5px] text-white/45 mt-6 inline-flex items-center gap-1.5">
            <Icon name="verified" size={13} /> Genuine stock, prices as marked on the Deals page while flash quantities last.
          </p>
        </div>
      </div>
    </div>
  );
}
