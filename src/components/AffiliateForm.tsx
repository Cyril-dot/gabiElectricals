'use client';
import { useState } from 'react';
import { useToast } from './Toast';

export function AffiliateForm({ loggedIn }: { loggedIn: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="bg-white/10 border border-white/15 rounded-2xl p-5 space-y-3"
      onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        const fd = new FormData(e.currentTarget);
        const res = await fetch('/api/affiliate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(fd)) });
        setBusy(false);
        e.currentTarget.reset();
        toast(res.ok ? 'Application received — we review within 2 business days.' : (await res.json().catch(() => ({})))?.error || 'Please check the form fields', res.ok ? 'ok' : 'err');
      }}
    >
      <p className="font-display font-extrabold text-lg">{loggedIn ? 'Apply for affiliate tier' : 'Apply — sign in first, or tell us about yourself'}</p>
      <input name="name" required placeholder="Full name" aria-label="Full name" className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm placeholder:text-white/40 outline-none focus:border-gold" />
      <input name="phone" required placeholder="Phone (024…)" aria-label="Phone" className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm placeholder:text-white/40 outline-none focus:border-gold" />
      <textarea name="audience" required rows={3} placeholder="Your trade or audience — e.g. “site foreman, 3 estates in Kasoa” or “12k TikTok DIY followers”" aria-label="Your trade or audience" className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm placeholder:text-white/40 outline-none focus:border-gold" />
      <button disabled={busy} className="btn-gold w-full !py-3">{busy ? 'Sending…' : 'Apply for commission tier'}</button>
    </form>
  );
}
