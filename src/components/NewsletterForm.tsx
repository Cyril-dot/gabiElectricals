'use client';
import { useState } from 'react';
import { useToast } from './Toast';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <form
      className="flex gap-2"
      onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        setBusy(false);
        if (res.ok) { setEmail(''); toast('Subscribed — welcome to the Power Notes list!'); }
        else toast('Please enter a valid email', 'err');
      }}
    >
      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email for power tips & deals" aria-label="Email address" className="flex-1 min-w-0 rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-sm placeholder:text-white/40 outline-none focus:border-gold" />
      <button disabled={busy} className="btn-gold !px-4 !py-2.5 text-sm">Join</button>
    </form>
  );
}
