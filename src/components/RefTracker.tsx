'use client';
import { useEffect } from 'react';

/** Captures ?ref=CODE or /r/CODE landings into a 30-day cookie for attribution. */
export function RefTracker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      let code = params.get('ref') || '';
      const m = location.pathname.match(/^\/r\/([A-Za-z0-9]+)/);
      if (m) code = m[1];
      if (code) {
        document.cookie = `ge_ref=${code.toUpperCase()};max-age=${30 * 86400};path=/;samesite=lax`;
        history.replaceState(null, '', location.pathname);
      }
    } catch {}
  }, []);
  return null;
}
