'use client';
import { useState } from 'react';
import { useToast } from './Toast';

const ghPhone = /^(\+?233|0)[2-59]\d{7}$/;

export function ContactForms() {
  const toast = useToast();
  const [tab, setTab] = useState<'support' | 'wholesale'>('support');
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: object) {
    setBusy(true);
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    toast(res.ok ? (tab === 'support' ? 'Ticket opened — we reply within 4 working hours.' : 'Wholesale request received — expect pricing within 1 business day.') : 'Something went wrong — try WhatsApp instead', res.ok ? 'ok' : 'err');
  }

  return (
    <form
      className="card p-6 space-y-4"
      onSubmit={e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const obj = Object.fromEntries(fd.entries());
        if (!ghPhone.test(String(obj.phone || ''))) { toast('Enter a valid Ghana phone (024… or +23324…)', 'err'); return; }
        post(tab === 'support' ? '/api/support' : '/api/wholesale', obj);
      }}
    >
      <div role="tablist" aria-label="Contact form type" className="flex gap-2">
        {(['support', 'wholesale'] as const).map(t => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === t ? 'bg-blue text-white' : 'bg-mist dark:bg-navy-700'}`}>
            {t === 'support' ? 'Support ticket' : 'Wholesale / contractor pricing'}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm font-bold space-y-1">Name<input name="name" required className="w-full border border-line rounded-lg px-3 py-2.5 bg-mist dark:bg-navy-700 font-medium" /></label>
        <label className="text-sm font-bold space-y-1">Phone<input name="phone" required placeholder="024 123 4567" className="w-full border border-line rounded-lg px-3 py-2.5 bg-mist dark:bg-navy-700 font-medium" /></label>
      </div>
      <label className="text-sm font-bold space-y-1 block">Email<input name="email" type="email" required className="w-full border border-line rounded-lg px-3 py-2.5 bg-mist dark:bg-navy-700 font-medium" /></label>
      {tab === 'support' ? (
        <>
          <label className="text-sm font-bold space-y-1 block">Subject<input name="subject" required className="w-full border border-line rounded-lg px-3 py-2.5 bg-mist dark:bg-navy-700 font-medium" /></label>
          <label className="text-sm font-bold space-y-1 block">How can we help?<textarea name="message" required rows={5} className="w-full border border-line rounded-lg px-3 py-2.5 bg-mist dark:bg-navy-700 font-medium" /></label>
        </>
      ) : (
        <>
          <label className="text-sm font-bold space-y-1 block">Business / project<input name="business" required placeholder="e.g. Owusu Electricals Ltd — 12-unit estate at Oyibi" className="w-full border border-line rounded-lg px-3 py-2.5 bg-mist dark:bg-navy-700 font-medium" /></label>
          <label className="text-sm font-bold space-y-1 block">What do you need priced? (items, quantities, brands)<textarea name="message" required rows={5} className="w-full border border-line rounded-lg px-3 py-2.5 bg-mist dark:bg-navy-700 font-medium" /></label>
        </>
      )}
      <button disabled={busy} className="btn-primary w-full !py-3.5">{busy ? 'Sending…' : tab === 'support' ? 'Open ticket' : 'Request pricing'}</button>
      <p className="text-xs text-soft">We reply Mon–Sat, 8am–6pm. Emergencies ring the 24/7 line.</p>
    </form>
  );
}
