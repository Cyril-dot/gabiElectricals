'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Icon, ICONS } from './_ui';

/**
 * Stock control for the product details page: type a quantity and save it, or
 * set the product out of stock in one click (two-step inline confirm — the
 * button arms first, no dialogs). The storefront treats stock 0 as
 * "Out of stock" everywhere (badge, disabled buy button, notify list).
 */
export function StockControl({ id, stock, lowStockAlert }: { id: string; stock: number; lowStockAlert: number }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(String(stock));
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setValue(String(stock)); }, [stock]);
  useEffect(() => () => { if (armTimer.current) clearTimeout(armTimer.current); }, []);

  const save = async (next: number) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stock', stock: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast(j.error ?? 'Could not update stock', 'err'); return; }
      toast(next === 0 ? 'Product set to out of stock' : `Stock set to ${next}`, 'ok');
      setArmed(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const parsed = Number.parseInt(value, 10);
  const valid = Number.isFinite(parsed) && parsed >= 0 && String(parsed) === value.trim();
  const dirty = valid && parsed !== stock;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-soft">Units in stock</span>
          <input
            type="number" min={0} step={1} inputMode="numeric" value={value} disabled={busy}
            onChange={e => setValue(e.target.value.replace(/[^0-9]/g, ''))}
            className="mt-1 h-11 w-full rounded-xl border border-line bg-mist px-3 font-bold text-navy outline-none focus:border-blue dark:text-white"
          />
        </label>
        <button
          type="button" disabled={busy || !dirty} onClick={() => void save(parsed)}
          className="btn-primary h-11 px-4 text-sm disabled:opacity-40"
        >
          Save stock
        </button>
        <button
          type="button" disabled={busy || stock === 0}
          onClick={() => {
            if (!armed) {
              setArmed(true);
              armTimer.current = setTimeout(() => setArmed(false), 3000);
              return;
            }
            if (armTimer.current) clearTimeout(armTimer.current);
            void save(0);
          }}
          className={`h-11 rounded-xl px-4 text-sm font-bold transition-colors disabled:opacity-40 ${armed ? 'bg-danger text-white' : 'border border-danger/40 text-danger hover:bg-danger/10'}`}
        >
          {stock === 0 ? 'Out of stock' : armed ? 'Sure? Set to 0' : 'Set out of stock'}
        </button>
      </div>
      <p className="mt-2 text-xs text-soft">
        {stock === 0
          ? 'This product shows as out of stock in the store — customers see a notify-me option instead of buying.'
          : stock <= lowStockAlert
            ? `Low stock — the alert level is ${lowStockAlert}. Setting stock to 0 marks it out of stock in the store.`
            : 'Setting stock to 0 marks the product out of stock in the store — badge shown, buying disabled, notify-me offered.'}
      </p>
      {busy && <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-soft"><Icon d={ICONS.products} className="h-3.5 w-3.5 animate-pulse" /> Saving…</p>}
    </div>
  );
}
