'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from './Toast';
import { Icon } from './Icon';

type ActivePopup = {
  id: string; kind: string; headline: string; body: string; buttonLabel: string; buttonHref?: string | null;
  couponCode?: string | null; whatsappBtn?: boolean; captureLead?: boolean; bgColor: string; textColor: string; accentColor: string;
  targeting: { delaySec?: number; scrollPct?: number; device?: string; visitor?: string }; frequency: string; priority: number;
};

export function PopupHost() {
  const [popup, setPopup] = useState<ActivePopup | null>(null);
  const [email, setEmail] = useState('');
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    const clean: (() => void)[] = [];
    async function choose() {
      try {
        const res = await fetch('/api/popups/active');
        if (!res.ok || cancelled) return;
        const list: ActivePopup[] = await res.json();
        const seen = JSON.parse(localStorage.getItem('ge_popups') || '{}') as Record<string, number>;
        const now = Date.now();
        const windowDays = { SESSION: 0, DAY: 1, WEEK: 7, ONCE: 3650 } as Record<string, number>;
        const eligible = list.filter(p => {
          const last = seen[p.id] ?? 0;
          const limit = p.frequency === 'SESSION' ? 6 * 3600_000 : (windowDays[p.frequency] ?? 7) * 86400_000;
          return now - last > limit;
        });
        if (!eligible.length) return;
        if (sessionStorage.getItem('ge_popup_shown')) return;
        const p = eligible.sort((a, b) => b.priority - a.priority)[0];

        const show = () => {
          if (cancelled || sessionStorage.getItem('ge_popup_shown')) return;
          sessionStorage.setItem('ge_popup_shown', String(p.id));
          seen[p.id] = Date.now();
          localStorage.setItem('ge_popups', JSON.stringify(seen));
          setPopup(p);
          fetch('/api/popups/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) }).catch(() => {});
        };

        // A modal must never interrupt the arrival: each kind waits for its own trigger.
        if (p.kind === 'TIMED') {
          const t = setTimeout(show, (p.targeting.delaySec ?? 25) * 1000);
          clean.push(() => clearTimeout(t));
        } else if (p.kind === 'SCROLL') {
          const onScroll = () => {
            const max = document.body.scrollHeight - innerHeight;
            if (max > 0 && (window.scrollY / max) * 100 >= (p.targeting.scrollPct ?? 55)) { show(); window.removeEventListener('scroll', onScroll); }
          };
          window.addEventListener('scroll', onScroll, { passive: true });
          clean.push(() => window.removeEventListener('scroll', onScroll));
        } else {
          // EXIT: dwell for 10s first, then fire on real exit intent (pointer leaving through the top) or tab hide.
          let armed = false;
          const arm = setTimeout(() => { armed = true; }, 10_000);
          const leave = (e: MouseEvent) => { if (armed && e.clientY <= 0) show(); };
          const hide = () => { if (armed && document.visibilityState === 'hidden') show(); };
          document.addEventListener('mouseout', leave);
          document.addEventListener('visibilitychange', hide);
          clean.push(() => { clearTimeout(arm); document.removeEventListener('mouseout', leave); document.removeEventListener('visibilitychange', hide); });
        }
      } catch {}
    }
    if (!location.pathname.startsWith('/checkout') && !location.pathname.startsWith('/admin')) choose();
    return () => { cancelled = true; clean.forEach(f => f()); };
  }, []);

  if (!popup) return null;
  const claim = async () => {
    await fetch('/api/popups/convert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: popup.id, email }) }).catch(() => {});
    if (popup.couponCode) { toast(`Coupon ${popup.couponCode} copied — paste at checkout`, 'info'); try { await navigator.clipboard.writeText(popup.couponCode); } catch {} }
    setPopup(null);
  };
  return (
    <div className="fixed inset-0 z-[85] grid place-items-end sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={popup.headline}>
      <button aria-label="Close popup" className="absolute inset-0 bg-navy/70 backdrop-blur-sm" onClick={() => setPopup(null)} />
      <div className="relative w-full sm:w-auto sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-pop overflow-hidden" style={{ background: popup.bgColor, color: popup.textColor }}>
        <button onClick={() => setPopup(null)} aria-label="Dismiss" className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/25 text-white font-black hover:bg-black/40 grid place-items-center"><Icon name="close" size={16} /></button>
        <div className="p-7">
          <span className="inline-block text-[11px] font-black tracking-[0.25em] uppercase px-2.5 py-1 rounded-full mb-4" style={{ background: popup.accentColor, color: popup.bgColor }}><Icon name="bolt" size={13} className="inline align-middle" /> Limited offer</span>
          <h3 className="font-display font-extrabold text-2xl leading-tight mb-2">{popup.headline}</h3>
          <p className="text-sm opacity-90 leading-relaxed mb-5">{popup.body}</p>
          {popup.captureLead && (
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email for the code" aria-label="Email address"
              className="w-full rounded-xl px-4 py-3 mb-3 text-sm bg-white/15 border border-white/25 outline-none placeholder:opacity-60" style={{ color: popup.textColor }} />
          )}
          <div className="flex gap-2">
            <button onClick={claim} className="btn flex-1 !py-3 text-sm" style={{ background: popup.accentColor, color: popup.bgColor }}>{popup.buttonLabel}</button>
            {popup.whatsappBtn && (
              <a href="https://wa.me/233241002030" target="_blank" rel="noreferrer" className="btn !px-4 !py-3 text-sm bg-[#25D366] text-white">WhatsApp</a>
            )}
          </div>
          {popup.buttonHref && <Link href={popup.buttonHref} onClick={() => setPopup(null)} className="block text-center text-[13px] mt-3 underline opacity-80">or browse {popup.buttonHref.replace('/', '')} →</Link>}
        </div>
      </div>
    </div>
  );
}
