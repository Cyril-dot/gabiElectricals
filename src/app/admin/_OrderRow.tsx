'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Icon, ICONS, StatusBadge, fmtDateTime } from './_ui';
import { ghs } from '@/lib/money';

const TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['PROCESSING', 'CANCELLED'],
  PARTIALLY_PAID: ['CANCELLED'],
  PAID: ['PROCESSING', 'REFUNDED', 'CANCELLED'],
  PROCESSING: ['OUT_FOR_DELIVERY', 'CANCELLED', 'REFUNDED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [], REFUNDED: [],
};
const NEEDS_NOTE = ['CANCELLED', 'REFUNDED'];

export type OrderRowData = {
  id: string; orderNo: string; email: string; phone: string; name: string | null;
  status: string; total: number; createdAt: string; itemCount: number;
  items: { name: string; qty: number; price: number }[];
  payments: { method: string; status: string; amount: number }[];
};

export function OrderRow({ order }: { order: OrderRowData }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<{ id: string; status: string; note: string | null; at: string }[] | null>(null);
  const [next, setNext] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const toggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && events === null) {
      const res = await fetch(`/api/admin/orders/${order.id}/events`);
      if (res.ok) setEvents(await res.json());
      else setEvents([]);
    }
  };

  const apply = async (body: Record<string, unknown>, msg: string, url = `/api/admin/orders/${order.id}`) => {
    setBusy(true);
    try {
      const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      toast(res.ok ? msg : j.error ?? 'Action failed', res.ok ? 'ok' : 'err');
      if (res.ok) { setNext(''); setNote(''); router.refresh(); }
    } finally {
      setBusy(false);
    }
  };

  const markCash = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      toast(res.ok ? `Marked paid — ${j.reference}` : j.error ?? 'Failed', res.ok ? 'ok' : 'err');
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const options = TRANSITIONS[order.status] ?? [];
  const paidSum = order.payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="card overflow-hidden">
      <button onClick={() => void toggle()} aria-expanded={open} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-mist">
        <Icon d={ICONS.chevron} className={`h-4 w-4 shrink-0 text-soft transition-transform ${open ? 'rotate-90' : ''}`} />
        <Link href={`/admin/orders/${order.id}`} onClick={e => e.stopPropagation()} className="font-mono text-sm font-extrabold text-blue hover:underline">{order.orderNo}</Link>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{order.name ?? order.email}</span>
        <span className="text-xs font-bold text-soft">{order.itemCount} item{order.itemCount === 1 ? '' : 's'}</span>
        <span className="text-sm font-extrabold">{ghs(order.total)}</span>
        <StatusBadge status={order.status} />
        <span className="hidden whitespace-nowrap text-xs text-soft sm:block">{fmtDateTime(order.createdAt)}</span>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-line bg-mist p-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-soft">Items</h3>
            <ul className="space-y-1 text-sm">
              {order.items.map((i, n) => (
                <li key={n} className="flex justify-between gap-3 rounded-lg bg-white px-3 py-1.5 font-semibold dark:bg-navy">
                  <span className="truncate">{i.qty} × {i.name}</span><span>{ghs(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <h3 className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-wide text-soft">Payments · {ghs(paidSum)} of {ghs(order.total)}</h3>
            <ul className="space-y-1 text-sm">
              {order.payments.map((p, n) => (
                <li key={n} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-1.5 font-semibold dark:bg-navy">
                  <span>{p.method.replaceAll('_', ' ')}</span>
                  <span className="flex items-center gap-2"><span>{ghs(p.amount)}</span><StatusBadge status={p.status} /></span>
                </li>
              ))}
              {order.payments.length === 0 && <li className="rounded-lg bg-white px-3 py-1.5 text-xs text-soft dark:bg-navy">No payments recorded.</li>}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-soft">Timeline</h3>
            <ol className="relative ml-2 space-y-2 border-l-2 border-line pl-4">
              {(events ?? [{ id: 'x', status: order.status, note: 'Loading…', at: order.createdAt }]).map(e => (
                <li key={e.id} className="text-sm">
                  <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-blue" />
                  <p className="font-extrabold">{e.status.replaceAll('_', ' ')}</p>
                  <p className="text-xs text-soft">{e.note ? `${e.note} · ` : ''}{fmtDateTime(e.at)}</p>
                </li>
              ))}
            </ol>

            <div className="mt-4 space-y-2">
              {options.length > 0 && (
                <div className="flex gap-2">
                  <select value={next} onChange={e => setNext(e.target.value)} aria-label="Update status"
                    className="flex-1 rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold dark:bg-navy">
                    <option value="">Update status…</option>
                    {options.map(s => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}
                  </select>
                  <button disabled={!next || busy} onClick={() => void apply({ status: next, note: note || undefined }, 'Status updated')}
                    className="btn-primary px-4 py-2 text-sm">Go</button>
                </div>
              )}
              {next && NEEDS_NOTE.includes(next) && (
                <input value={note} onChange={e => setNote(e.target.value)} placeholder={`Reason for ${next.toLowerCase().replaceAll('_', ' ')} (required)`}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue dark:bg-navy" />
              )}
              {(order.status === 'PENDING_PAYMENT' || order.status === 'PARTIALLY_PAID') && (
                <button disabled={busy} onClick={() => void markCash()} className="btn-gold w-full py-2.5 text-sm">
                  <Icon d={ICONS.cash} className="h-4 w-4" /> Mark paid (cash)
                </button>
              )}
              <Link href={`/admin/orders/${order.id}`} className="btn-ghost block w-full py-2 text-sm">Invoice &amp; details →</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
