'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';

export type Slide = { headline: string; sub: string; ctaLabel: string; ctaHref: string; cta2Label?: string | null; cta2Href?: string | null; image: string; badge?: string | null };

const TICKER = ['100% GENUINE STOCK', 'NIET-CERTIFIED ELECTRICIANS', 'SAME-DAY DELIVERY IN ACCRA', 'UP TO 25-YEAR WARRANTY', 'MOMO • CARD • QR PAYMENTS', 'FREE LOAD ADVICE'];

export function HomeHero({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => { setDir(1); setI(x => (x + 1) % slides.length); }, 6500);
    return () => clearInterval(t);
  }, [slides.length]);
  if (!slides.length) return null;
  const s = slides[i];
  const go = (k: number) => { setDir(k > i ? 1 : -1); setI(k); };

  return (
    <section className="relative bg-navy text-white overflow-hidden">
      {/* arctic glow mesh */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
        style={{ backgroundImage: 'radial-gradient(52% 60% at 12% 18%, rgb(34 211 238 / 0.22), transparent 65%), radial-gradient(40% 50% at 88% 85%, rgb(34 211 238 / 0.12), transparent 60%), radial-gradient(30% 35% at 70% 20%, rgb(255 255 255 / 0.06), transparent 60%)' }} />
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" aria-hidden="true"
        style={{ backgroundImage: 'linear-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.5) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/70 to-transparent" aria-hidden="true" />

      <div className="container-x relative grid lg:grid-cols-12 gap-10 items-center pt-14 pb-10 md:pt-20 md:pb-14 min-h-[620px]">
        {/* copy */}
        <div className="lg:col-span-6 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 32 * dir }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 * dir }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {s.badge && (
                <span className="inline-flex items-center gap-1.5 bg-volt/10 text-volt border border-volt/30 rounded-full px-3.5 py-1.5 text-[12px] font-bold mb-5 backdrop-blur-sm">
                  <Icon name="bolt" size={14} /> {s.badge}
                </span>
              )}
              <h1 className="font-display font-bold text-[40px] md:text-[60px] leading-[1.02] tracking-tight text-balance">{s.headline}</h1>
              <p className="mt-5 text-white/70 text-[15px] md:text-lg max-w-xl leading-relaxed">{s.sub}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={s.ctaHref} className="btn-gold !px-7 !py-4 text-[15px] shadow-pop link-nudge !rounded-2xl">
                  {s.ctaLabel} <Icon name="arrow_forward" size={18} />
                </Link>
                {s.cta2Label && s.cta2Href && (
                  <Link href={s.cta2Href} className="btn !px-7 !py-4 text-[15px] !rounded-2xl border border-white/25 text-white hover:bg-white/10 hover:border-volt/60">
                    {s.cta2Label}
                  </Link>
                )}
              </div>
              {/* mini stats */}
              <dl className="mt-10 grid grid-cols-3 max-w-md gap-4">
                {[['1,400+', 'jobs done'], ['5', 'regions'], ['25yr', 'max warranty']].map(([v, l]) => (
                  <div key={l} className="border-l-2 border-volt/50 pl-3">
                    <dt className="sr-only">{l}</dt>
                    <dd className="font-display font-bold text-2xl text-volt">{v}</dd>
                    <dd className="text-[11px] uppercase tracking-widest text-white/55 font-semibold">{l}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex gap-2">
            {slides.map((_, k) => (
              <button key={k} onClick={() => go(k)} aria-label={`Slide ${k + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${k === i ? 'w-10 bg-volt' : 'w-2 bg-white/25 hover:bg-white/60'}`} />
            ))}
          </div>
        </div>

        {/* visual */}
        <div className="lg:col-span-6 relative hidden lg:block">
          <div className="relative">
            <div className="absolute -inset-6 bg-volt/15 blur-3xl rounded-full pointer-events-none" aria-hidden="true" />
            <div className="relative rounded-[2rem] overflow-hidden border border-white/15 shadow-pop rotate-1">
              <AnimatePresence mode="wait">
                <motion.img
                  key={s.image}
                  src={s.image}
                  alt={s.headline}
                  width={760}
                  height={520}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="w-full aspect-[4/3] object-cover animate-ken-burns"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-navy/50 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
            </div>
            {/* floating chips */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.45 }}
              className="absolute -left-6 top-8 card !bg-white/95 dark:!bg-navy-700/95 backdrop-blur px-4 py-3 flex items-center gap-2.5 animate-float">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-volt/25 text-navy dark:text-volt"><Icon name="local_shipping" size={19} /></span>
              <span><span className="block text-[11px] font-bold uppercase tracking-widest text-soft">Same-day</span><span className="font-display font-bold text-navy dark:text-white">Accra • Tema • Kasoa</span></span>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.45 }}
              className="absolute -right-4 bottom-10 card !bg-white/95 dark:!bg-navy-700/95 backdrop-blur px-4 py-3 flex items-center gap-2.5">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-volt/25 text-navy dark:text-volt"><Icon name="workspace_premium" size={19} /></span>
              <span><span className="block text-[11px] font-bold uppercase tracking-widest text-soft">Warranty</span><span className="font-display font-bold text-navy dark:text-white">up to 25 years</span></span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ticker */}
      <div className="relative border-t border-white/10 bg-black/20 backdrop-blur-sm overflow-hidden" aria-hidden="true">
        <div className="flex gap-0 animate-marquee w-max py-3">
          {[...TICKER, ...TICKER].map((t, k) => (
            <span key={k} className="flex items-center gap-6 px-6 text-[11px] font-black tracking-[0.22em] text-volt/90 whitespace-nowrap">
              {t} <Icon name="bolt" size={12} className="opacity-70" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Countdown({ to }: { to: string }) {
  const [ms, setMs] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return; ref.current = true;
    const t = setInterval(() => setMs(new Date(to).getTime() - Date.now()), 1000);
    setMs(new Date(to).getTime() - Date.now());
    return () => clearInterval(t);
  }, [to]);
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="inline-flex items-center gap-1.5 font-mono font-black" aria-label={`${h} hours ${m} minutes remaining`}>
      <Icon name="timer" size={16} className="text-volt" />
      {[pad(h), pad(m), pad(sec)].map((v, k) => (
        <span key={k} className="bg-black/40 text-volt border border-volt/30 rounded-lg px-2.5 py-1.5 text-sm tabular-nums">{v}{k < 2 && ':'}</span>
      ))}
    </span>
  );
}
