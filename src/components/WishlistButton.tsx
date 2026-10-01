'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

type Props = {
  slug: string;
  initialSaved?: boolean;
  variant?: 'icon' | 'button';
  className?: string;
};

/** Heart toggle that POSTs /api/wishlist. Shows login redirect for guests. */
export default function WishlistButton({ slug, initialSaved = false, variant = 'icon', className = '' }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      const r = await fetch('/api/wishlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { toast('Log in to save items', 'info'); router.push(`/login?next=/account/wishlist`); return; }
      if (!r.ok) { toast(j.error ?? 'Could not update wishlist', 'err'); return; }
      setSaved(!!j.saved);
      toast(j.saved ? 'Saved to wishlist ♡' : 'Removed from wishlist', 'ok');
    } catch { toast('Network error', 'err'); }
    finally { setBusy(false); }
  }

  if (variant === 'button') {
    return (
      <button onClick={toggle} disabled={busy} aria-pressed={saved} aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
        className={`${className} btn-ghost px-4 py-2 text-[13px] ${saved ? '!border-gold !text-gold-dark' : ''}`}>
        {busy ? '…' : saved ? '♥ Saved' : '♡ Save for later'}
      </button>
    );
  }
  return (
    <button onClick={toggle} disabled={busy} aria-pressed={saved}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'} title={saved ? 'Saved' : 'Save for later'}
      className={`h-8 w-8 rounded-full flex items-center justify-center text-[15px] bg-white/90 border border-line shadow-soft transition-transform hover:scale-110 ${saved ? 'text-danger border-danger/40' : 'text-soft'} ${className}`}>
      {busy ? '…' : saved ? '♥' : '♡'}
    </button>
  );
}
