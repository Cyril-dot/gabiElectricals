'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from './Icon';

export function CookieConsent() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem('ge_cookies')) setShow(true); } catch { setShow(true); }
  }, []);
  if (!show) return null;
  const choose = (v: 'all' | 'essential') => {
    try { localStorage.setItem('ge_cookies', v); } catch {}
    if (v === 'all' && process.env.NEXT_PUBLIC_GA4_ID) {
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_ID}`;
      document.head.appendChild(s);
    }
    setShow(false);
  };
  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed inset-x-3 bottom-3 z-[75] md:inset-x-auto md:right-4 md:bottom-4 md:max-w-sm card shadow-pop p-4">
      <p className="text-sm font-bold mb-1 flex items-center gap-1.5"><Icon name="cookie" size={18} /> Your data, your choice</p>
      <p className="text-[13px] text-soft mb-3 leading-relaxed">We use essential cookies for cart & session. Analytics cookies only with your OK — see our <Link href="/privacy" className="text-blue font-semibold underline">Privacy Policy</Link> (Ghana Data Protection Act).</p>
      <div className="flex gap-2">
        <button onClick={() => choose('all')} className="btn-primary flex-1 !py-2.5 text-sm">Accept all</button>
        <button onClick={() => choose('essential')} className="btn-ghost flex-1 !py-2.5 text-sm">Essential only</button>
      </div>
    </div>
  );
}
