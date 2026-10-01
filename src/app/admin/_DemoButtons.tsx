'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Icon, ICONS } from './_ui';

export function DemoButtons() {
  const [confirmFor, setConfirmFor] = useState<'reset' | 'clear' | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const run = async () => {
    if (!confirmFor) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: confirmFor }) });
      const j = await res.json().catch(() => ({}));
      toast(res.ok ? j.message ?? 'Done' : j.error ?? 'Failed', res.ok ? 'ok' : 'err');
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
      setConfirmFor(null);
    }
  };

  const copy = confirmFor === 'reset'
    ? { title: 'Reset ALL demo data?', body: 'This wipes every table and re-runs the seeder (takes ~30–60s). Orders, payments and settings return to factory demo state.', danger: true }
    : { title: 'Clear sample transactions?', body: 'Deletes orders, bookings, payments, reviews, ledger entries and logs — keeps catalog, users and settings.', danger: true };

  return (
    <section className="card space-y-3 border-danger/40 p-4 md:p-5">
      <h2 className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-wide text-danger"><Icon d={ICONS.alert} /> Demo data controls (super admin)</h2>
      <p className="text-xs font-semibold text-soft">Only shown while DEMO_MODE is on. Live deployments keep the catalog untouched by these buttons — they are removed at build time when DEMO_MODE=false.</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setConfirmFor('clear')} className="btn-ghost px-4 py-2 text-sm text-danger">Clear all sample data</button>
        <button onClick={() => setConfirmFor('reset')} className="btn-gold px-4 py-2 text-sm">Reset demo data (re-seed)</button>
      </div>

      {confirmFor && (
        <div role="dialog" aria-modal className="fixed inset-0 z-[80] grid place-items-center bg-navy/70 p-4">
          <div className="card w-full max-w-sm space-y-3 p-5">
            <h3 className="font-display text-lg font-extrabold text-danger">{copy.title}</h3>
            <p className="text-sm font-semibold text-soft">{copy.body}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConfirmFor(null)} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
              <button disabled={busy} onClick={() => void run()} className="btn-primary flex-1 bg-danger py-2 text-sm hover:!bg-danger">
                {busy ? 'Running…' : 'Yes, proceed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
