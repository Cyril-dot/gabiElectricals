'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';

export type Slide = { headline: string; sub: string; ctaLabel: string; ctaHref: string; cta2Label?: string | null; cta2Href?: string | null; image: string; badge?: string | null };

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
      {/* ambient glows */}
      <div className="absolute inset-0 opacity-25 pointer-events-none" aria-hidden="true"
        style={{ backgroundImage: 'radial-gradient(circle at 18% 25%, #D7FF3E 0, transparent 42%), radial-gradient(circle at 85% 75%, #FF5C00 0, transparent 38%)' }} />
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-volt/15 blur-3xl animate-float pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/60 to-transparent" aria-hidden="true" />

      <div className="container-x relative grid lg:grid-cols-2 gap-8 items-center py-14 md:py-20 min-h-[440px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 28 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 * dir }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {s.badge && (
              <span className="inline-flex items-center gap-1.5 bg-gold/15 text-gold border border-gold/30 rounded-full px-3 py-1 text-[12px] font-bold mb-4">
                <Icon name="bolt" size={14} /> {s.badge}
              </span>
            )}
            <h1 className="font-display font-extrabold text-[34px] md:text-[52px] leading-[1.04] tracking-tight">{s.headline}</h1>
            <p className="mt-4 text-white/75 text-[15px] md:text-lg max-w-xl leading-relaxed">{s.sub}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={s.ctaHref} className="btn-gold !px-6 !py-3.5 text-[15px] shadow-pop link-nudge">
                {s.ctaLabel} <Icon name="arrow_forward" size={18} />
              </Link>
              {s.cta2Label && s.cta2Href && (
                <Link href={s.cta2Href} className="btn !px-6 !py-3.5 text-[15px] border border-white/25 text-white hover:bg-white/10 hover:border-white/40">
                  {s.cta2Label}
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="relative hidden lg:block">
          <div className="rounded-2xl overflow-hidden border border-white/15 shadow-pop">
            <AnimatePresence mode="wait">
              <motion.img
                key={s.image}
                src={s.image}
                alt={s.headline}
                width={760}
                height={430}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="w-full aspect-[16/9] object-cover animate-ken-burns"
              />
            </AnimatePresence>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="absolute -bottom-4 -left-4 card px-4 py-3 text-navy flex items-center gap-2.5"
          >
            <span className="grid place-items-center w-9 h-9 rounded-full bg-success/15 text-success"><Icon name="local_shipping" size={19} /></span>
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-widest text-soft">Same-day delivery</span>
              <span className="font-display font-extrabold">Accra • Tema • Kasoa</span>
            </span>
          </motion.div>
        </div>
      </div>

      <div className="container-x relative flex gap-2 pb-6 justify-center lg:justify-start">
        {slides.map((_, k) => (
          <button
            key={k}
            onClick={() => go(k)}
            aria-label={`Slide ${k + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${k === i ? 'w-8 bg-gold' : 'w-2 bg-white/30 hover:bg-white/60'}`}
          />
        ))}
      </div>
    </section>
  );
}

export function Countdown({ to }: { to: string }) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMs(new Date(to).getTime() - Date.now()), 1000);
    setMs(new Date(to).getTime() - Date.now());
    return () => clearInterval(t);
  }, [to]);
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="inline-flex items-center gap-1.5 font-mono font-black" aria-label={`${h} hours ${m} minutes remaining`}>
      <Icon name="timer" size={16} className="text-gold" />
      {[pad(h), pad(m), pad(sec)].map((v, k) => (
        <span key={k} className="bg-navy text-gold rounded-md px-2 py-1 text-sm tabular-nums">{v}{k < 2 && ':'}</span>
      ))}
    </span>
  );
}
