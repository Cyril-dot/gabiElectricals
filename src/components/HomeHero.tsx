'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export type Slide = { headline: string; sub: string; ctaLabel: string; ctaHref: string; cta2Label?: string | null; cta2Href?: string | null; image: string; badge?: string | null };

export function HomeHero({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI(x => (x + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);
  if (!slides.length) return null;
  const s = slides[i];
  return (
    <section className="relative bg-navy text-white overflow-hidden">
      <div className="absolute inset-0 opacity-[0.14]" aria-hidden="true" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #0A5CFF 0, transparent 45%), radial-gradient(circle at 85% 70%, #FFB020 0, transparent 40%)' }} />
      <div className="container-x relative grid lg:grid-cols-2 gap-8 items-center py-14 md:py-20 min-h-[440px]">
        <div key={i} className="animate-[fadeUp_.5s_ease]">
          {s.badge && <span className="inline-flex items-center gap-1.5 bg-gold/15 text-gold border border-gold/30 rounded-full px-3 py-1 text-[12px] font-bold mb-4">⚡ {s.badge}</span>}
          <h1 className="font-display font-extrabold text-[34px] md:text-[52px] leading-[1.04] tracking-tight">{s.headline}</h1>
          <p className="mt-4 text-white/75 text-[15px] md:text-lg max-w-xl leading-relaxed">{s.sub}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={s.ctaHref} className="btn-gold !px-6 !py-3.5 text-[15px] shadow-pop">{s.ctaLabel} →</Link>
            {s.cta2Label && s.cta2Href && <Link href={s.cta2Href} className="btn !px-6 !py-3.5 text-[15px] border border-white/25 text-white hover:bg-white/10">{s.cta2Label}</Link>}
          </div>
        </div>
        <div className="relative hidden lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.image} alt={s.headline} width={760} height={430} className="rounded-2xl border border-white/15 shadow-pop w-full object-cover" key={s.image} />
          <div className="absolute -bottom-4 -left-4 card px-4 py-3 text-navy">
            <p className="text-[11px] font-bold uppercase tracking-widest text-soft">Same-day delivery</p>
            <p className="font-display font-extrabold">Accra • Tema • Kasoa</p>
          </div>
        </div>
      </div>
      <div className="container-x relative flex gap-2 pb-6 justify-center lg:justify-start">
        {slides.map((_, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} className={`h-2 rounded-full transition-all ${k === i ? 'w-8 bg-gold' : 'w-2 bg-white/30'}`} />
        ))}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
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
    <span className="inline-flex items-center gap-1 font-mono font-black" aria-label={`${h} hours ${m} minutes remaining`}>
      {[pad(h), pad(m), pad(sec)].map((v, k) => (
        <span key={k} className="bg-navy text-gold rounded-md px-2 py-1 text-sm tabular-nums">{v}{k < 2 && ':'}</span>
      ))}
    </span>
  );
}
