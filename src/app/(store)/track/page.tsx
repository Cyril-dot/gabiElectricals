'use client';
import Link from 'next/link';
import { useState } from 'react';
import { OrderTimeline, type TimelineEvent } from '@/components/OrderTimeline';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ghs } from '@/lib/money';

type Lookup = {
  orderNo: string; status: string; total: number; createdAt: string;
  addrCity?: string | null; addrRegion?: string | null; fulfilment: string;
  items: { name: string; qty: number; price: number; image?: string | null }[];
  events: TimelineEvent[];
  payment: { reference: string; status: string; method: string } | null;
};

function TrackInner() {
  const sp = useSearchParams();
  const [orderNo, setOrderNo] = useState((sp.get('orderNo') ?? '').toUpperCase());
  const [email, setEmail] = useState(sp.get('email') ?? '');
  const [data, setData] = useState<Lookup | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(''); setData(null);
    try {
      const res = await fetch(`/api/orders/lookup?orderNo=${encodeURIComponent(orderNo)}&email=${encodeURIComponent(email)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Not found.');
      setData(j);
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Lookup failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="container-x py-10 max-w-2xl">
      <h1 className="font-display text-2xl md:text-3xl font-extrabold mb-1">Track your order</h1>
      <p className="text-sm text-soft mb-6">Enter the GE-2026-… number from your confirmation SMS with the email you used.</p>

      <form onSubmit={lookup} className="card p-5 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end mb-6">
        <div>
          <label htmlFor="orderNo" className="text-[13px] font-bold mb-1 block">Order number</label>
          <input id="orderNo" required value={orderNo} onChange={e => setOrderNo(e.target.value.toUpperCase())} placeholder="GE-2026-1001"
            className="w-full border border-line rounded-xl px-3.5 py-3 text-sm bg-white dark:bg-navy outline-none focus:border-blue min-h-[44px] font-mono" />
        </div>
        <div>
          <label htmlFor="t-email" className="text-[13px] font-bold mb-1 block">Email used at checkout</label>
          <input id="t-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
            className="w-full border border-line rounded-xl px-3.5 py-3 text-sm bg-white dark:bg-navy outline-none focus:border-blue min-h-[44px]" />
        </div>
        <button disabled={busy} className="btn-primary !px-5 !py-3 min-h-[44px]">{busy ? 'Checking…' : 'Track'}</button>
      </form>

      {err && <p role="alert" className="card p-4 text-sm font-semibold text-danger mb-6">{err}</p>}

      {data && (
        <div className="card p-6 space-y-6">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="font-display text-xl font-extrabold">{data.orderNo}</p>
              <p className="text-[13px] text-soft">{ghs(data.total)} · {new Date(data.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })} · {data.fulfilment === 'PICKUP' ? 'Pickup' : `Deliver to ${data.addrCity ?? ''}${data.addrRegion ? ', ' + data.addrRegion : ''}`}</p>
            </div>
            <span className={`text-[12px] font-black rounded-full px-3 py-1.5 self-start ${data.status === 'DELIVERED' ? 'bg-success/15 text-success' : data.status === 'PENDING_PAYMENT' ? 'bg-warning/15 text-warning' : 'bg-blue/10 text-blue'}`}>{data.status.replaceAll('_', ' ')}</span>
          </div>
          <OrderTimeline status={data.status} events={data.events} />
          <div>
            <p className="font-bold text-sm mb-2">Items</p>
            <ul className="text-[13px] space-y-1">
              {data.items.map((it, i) => <li key={i} className="flex justify-between gap-3"><span>{it.qty} × {it.name}</span><span className="font-bold whitespace-nowrap">{ghs((it.price * it.qty))}</span></li>)}
            </ul>
          </div>
          {(data.status === 'PENDING_PAYMENT' || data.status === 'PARTIALLY_PAID') && (
            <Link href={`/order/${data.orderNo}/pay`} className="btn-primary w-full !py-3">💰 Pay now</Link>
          )}
        </div>
      )}

      {!data && !err && (
        <p className="text-[13px] text-soft text-center">Tip: try a seeded order — e.g. <button type="button" onClick={() => setOrderNo('GE-2026-1001')} className="font-mono font-bold text-blue hover:underline">GE-2026-1001</button> with its customer email, or check your own order after checkout.</p>
      )}
    </div>
  );
}

export default function TrackPage() {
  return <Suspense fallback={<div className="container-x py-10"><div className="skeleton h-24 w-full rounded-[14px]" /></div>}><TrackInner /></Suspense>;
}
