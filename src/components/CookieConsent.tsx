'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';

// Google Analytics 4 — consent-gated. The measurement ID comes from
// NEXT_PUBLIC_GA4_MEASUREMENT_ID (see .env.example). Until that is set
// in Vercel, nothing loads and no analytics data is sent.
const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA4_ID || '';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function loadGA(id: string) {
  if (!id || typeof window === 'undefined' || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  window.gtag('config', id, { page_path: window.location.pathname });
}

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  // Returning visitor who already accepted: load GA on mount, no re-prompt.
  useEffect(() => {
    try {
      const choice = localStorage.getItem('ge_cookies');
      if (choice === 'all') loadGA(GA_ID);
      else if (!choice) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);
  // Track client-side navigation as page views (gtag.js only fires one
  // automatically on the first load).
  useEffect(() => {
    try {
      if (GA_ID && localStorage.getItem('ge_cookies') === 'all' && window.gtag) {
        window.gtag('config', GA_ID, { page_path: pathname });
      }
    } catch { /* analytics must never break the storefront */ }
  }, [pathname]);
  if (!show) return null;
  const choose = (v: 'all' | 'essential') => {
    try { localStorage.setItem('ge_cookies', v); } catch {}
    if (v === 'all') loadGA(GA_ID);
    setShow(false);
  };
  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed inset-x-3 bottom-3 z-[75] md:inset-x-auto md:right-4 md:bottom-4 md:max-w-sm card shadow-pop p-4">
      <p className="text-sm font-bold mb-1 flex items-center gap-1.5"><Icon name="cookie" size={18} /> Your data, your choice</p>
      <p className="text-[13px] text-soft mb-3 leading-relaxed">We use essential cookies for cart &amp; session. Analytics cookies only with your OK — see our <Link href="/privacy" className="text-blue font-semibold underline">Privacy Policy</Link> (Ghana Data Protection Act).</p>
      <div className="flex gap-2">
        <button onClick={() => choose('all')} className="btn-primary flex-1 !py-2.5 text-sm">Accept all</button>
        <button onClick={() => choose('essential')} className="btn-ghost flex-1 !py-2.5 text-sm">Essential only</button>
      </div>
    </div>
  );
}
