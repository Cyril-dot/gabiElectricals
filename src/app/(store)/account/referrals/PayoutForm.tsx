'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ghs } from '@/lib/money';
import { useToast } from '@/components/Toast';
import { Icon } from '@/components/Icon';

type Props = { available: number; minPayout: number; defaultPhone: string; pending: number; balance: number };

export default function PayoutForm({ available, minPayout, defaultPhone, pending }: Props) {
  const [amount, setAmount] = useState('');
  const [momo, setMomo] = useState(defaultPhone);
  const [network, setNetwork] = useState<'MTN' | 'Telecel' | 'AT'>('MTN');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const canPayout = available >= minPayout;

  async function submit() {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) { toast('Enter a valid amount', 'err'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/payouts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, momoNumber: momo.replace(/\s/g, ''), network }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast(j.error ?? 'Could not submit payout request', 'err'); return; }
      toast(`Payout of ${ghs(amt)} requested — approval within 2 business days`, 'ok');
      setDone(true); setAmount('');
      router.refresh();
    } catch { toast('Network error', 'err'); }
    finally { setBusy(false); }
  }

  return (
    <div className="card p-5" aria-label="Request a payout">
      <h3 className="font-bold text-[14.5px] mb-1">Withdraw to Mobile Money</h3>
      {canPayout ? (
        <>
          <p className="text-[12.5px] text-soft mb-4">Minimum {ghs(minPayout)} · available {ghs(available)}. Funds arrive within 2 business days after approval.</p>
          {done ? (
            <div className="rounded-xl bg-success/10 border border-success/30 p-4 text-success font-bold text-[13.5px]">
              <Icon name="check" size={14} className="inline" /> Request received — track it in Payout history below.
            </div>
          ) : (
            <div className="grid sm:grid-cols-[1fr_1.3fr_1fr_auto] gap-3 items-end">
              <div>
                <label htmlFor="po-amt" className="block text-[11.5px] font-bold mb-1">Amount (₵)</label>
                <input id="po-amt" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder={available.toFixed(2)} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13.5px]" />
              </div>
              <div>
                <label htmlFor="po-momo" className="block text-[11.5px] font-bold mb-1">MoMo number</label>
                <input id="po-momo" type="tel" value={momo} onChange={e => setMomo(e.target.value)} placeholder="024 123 4567"
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13.5px]" />
              </div>
              <div>
                <label htmlFor="po-net" className="block text-[11.5px] font-bold mb-1">Network</label>
                <select id="po-net" value={network} onChange={e => setNetwork(e.target.value as typeof network)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13.5px]">
                  <option>MTN</option><option>Telecel</option><option>AT</option>
                </select>
              </div>
              <button onClick={submit} disabled={busy || amount === ''} className="btn-primary px-4 py-2 text-[13px]">
                {busy ? 'Sending…' : 'Request'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl bg-mist dark:bg-navy-700 border border-line p-4 text-[13px]">
          <p className="font-bold">You need {ghs(minPayout)} available to withdraw.</p>
          <p className="text-soft mt-1">Currently {ghs(available)} available{pending ? ` (${ghs(pending)} held by pending requests)` : ''}. Earn more by sharing your link above!</p>
        </div>
      )}
    </div>
  );
}
