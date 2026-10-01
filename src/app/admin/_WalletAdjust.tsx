'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { ghs } from '@/lib/money';

export function WalletAdjust({ userId, balance }: { userId: string; balance: number }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const submit = async (direction: 'credit' | 'debit') => {
    const a = parseFloat(amount);
    if (!Number.isFinite(a) || a <= 0) { toast('Enter a positive amount', 'err'); return; }
    if (!reason.trim()) { toast('Reason is required', 'err'); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/customers/${userId}/wallet`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: a, direction, reason: reason.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      toast(res.ok ? `${direction === 'credit' ? 'Credited' : 'Debited'} ${ghs(a)} — new balance ${ghs(j.balanceAfter)}` : j.error ?? 'Failed', res.ok ? 'ok' : 'err');
      if (res.ok) { setAmount(''); setReason(''); router.refresh(); }
    } finally {
      setBusy(false);
    }
  };

  const field = 'rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue dark:bg-navy';
  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Wallet adjustment · balance {ghs(balance)}</h2>
      <div className="flex flex-wrap gap-2">
        <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount ₵" aria-label="Adjustment amount" className={`${field} w-28`} />
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (e.g. goodwill for late delivery)" aria-label="Adjustment reason" className={`${field} min-w-[180px] flex-1`} />
      </div>
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => void submit('credit')} className="btn-primary flex-1 py-2 text-sm">+ Credit</button>
        <button disabled={busy} onClick={() => void submit('debit')} className="btn-ghost flex-1 py-2 text-sm text-danger">− Debit</button>
      </div>
      <p className="text-[11px] font-semibold text-soft">Every adjustment writes a LedgerEntry (ADMIN_ADJUST) and an activity log record.</p>
    </div>
  );
}
