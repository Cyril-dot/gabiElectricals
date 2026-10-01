'use client';
import { useState } from 'react';
import { Badge, CopyButton, EmptyState, Msg, QrBox, api, inputCls, labelCls, tableWrap, tdCls, thCls, useMsg, waShare } from '@/components/ops/ui';
import { ghs } from '@/lib/money';

type Item = { label: string; qty: number; amount: number };
type Q = { id: string; quoteNo: string; customerName: string; customerPhone: string; customerEmail: string | null; description: string; amount: number; status: string; bookingNo: string | null; createdAt: string; validUntil: string | null; items: Item[]; payUrl: string | null };
const stTone: Record<string, 'warning' | 'info' | 'gold' | 'success' | 'danger' | 'soft'> = { DRAFT: 'soft', SENT: 'info', ACCEPTED: 'gold', DECLINED: 'danger', PAID: 'success', EXPIRED: 'warning' };

export function QuotesBoard({ quotes, activeId }: { quotes: Q[]; activeId: string | null }) {
  const { msg, setMsg } = useMsg();
  const [busy, setBusy] = useState<string | null>(null);
  const open = quotes.find((q) => q.id === activeId) ?? null;
  const [items, setItems] = useState<Item[]>(open?.items ?? []);
  const [loadedFor, setLoadedFor] = useState<string | null>(activeId);
  if (open && loadedFor !== open.id) { setItems(open.items); setLoadedFor(open.id); }

  async function run(key: string, fn: () => Promise<unknown>, text: string) {
    setBusy(key); setMsg(null);
    try { const r = await fn(); setMsg({ kind: 'ok', text: typeof r === 'object' && r && 'payUrl' in r && (r as { payUrl?: string }).payUrl ? `${text} Link: ${(r as { payUrl: string }).payUrl}` : text }); setTimeout(() => location.reload(), 1200); }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); setBusy(null); }
  }

  const total = items.reduce((a, i) => a + i.qty * i.amount, 0);

  return (
    <main className="container-x py-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue">Operations</p>
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white">Quotes</h1>
      </header>
      <Msg msg={msg} />

      {open ? (
        <section className="card mb-8 p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl font-extrabold text-navy dark:text-white">{open.quoteNo}</h2>
            <Badge tone={stTone[open.status] ?? 'soft'}>{open.status}</Badge>
            {open.bookingNo && <span className="text-xs text-soft">booking {open.bookingNo}</span>}
            <a href="/admin/quotes" className="btn-ghost ml-auto px-3 py-1.5 text-xs">Back to list</a>
          </div>
          <p className="mb-1 text-sm"><span className="font-bold">{open.customerName}</span> · <a className="text-blue underline" href={`tel:${open.customerPhone}`}>{open.customerPhone}</a>{open.customerEmail ? ` · ${open.customerEmail}` : ''}</p>
          <p className="mb-4 text-xs text-soft">{open.description}</p>

          <p className={labelCls}>Line items</p>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input className={`${inputCls} flex-1 min-w-40`} value={it.label} placeholder="Item / labour" onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input className={`${inputCls} w-16`} type="number" min="1" value={it.qty} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} />
                <input className={`${inputCls} w-28`} type="number" min="0" step="0.01" value={it.amount} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)))} />
                <button className="btn-ghost px-2.5 py-1 text-xs text-danger" onClick={() => setItems(items.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setItems([...items, { label: '', qty: 1, amount: 0 }])}>+ Add line</button>
            <p className="text-sm font-extrabold text-blue">Total {ghs(total)}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={busy !== null || items.length === 0} className="btn-primary px-3 py-1.5 text-sm" onClick={() => run('items', () => api(`/api/admin/quotes/${open.id}`, { method: 'PATCH', body: JSON.stringify({ items }) }), 'Items saved.')}>Save items</button>
            {(open.status === 'DRAFT' || open.status === 'SENT') && <button disabled={busy !== null} className="btn-gold px-3 py-1.5 text-sm" onClick={() => run('send', () => api(`/api/admin/quotes/${open.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'SENT', items: items.length ? items : undefined }) }), 'Quote sent — payment link generated.')}>Send + payment link</button>}
            {open.status === 'SENT' && <button disabled={busy !== null} className="btn-ghost px-3 py-1.5 text-sm" onClick={() => run('acc', () => api(`/api/admin/quotes/${open.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'ACCEPTED' }) }), 'Marked ACCEPTED.')}>Mark accepted</button>}
            {open.status === 'SENT' && <button disabled={busy !== null} className="btn-ghost px-3 py-1.5 text-sm text-danger" onClick={() => run('dec', () => api(`/api/admin/quotes/${open.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'DECLINED' }) }), 'Marked DECLINED.')}>Declined</button>}
            {['SENT', 'ACCEPTED'].includes(open.status) && <button disabled={busy !== null} className="btn-ghost px-3 py-1.5 text-sm text-success" onClick={() => run('paid', () => api(`/api/admin/quotes/${open.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'PAID' }) }), 'Marked PAID.')}>Mark paid</button>}
          </div>
          {open.payUrl && (
            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-blue/30 bg-blue/5 p-4">
              <QrUrl url={open.payUrl} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-soft">Quote payment link</p>
                <p className="break-all font-mono text-sm font-bold text-blue">{open.payUrl}</p>
                <div className="mt-2 flex gap-2">
                  <CopyButton text={open.payUrl} />
                  <button className="px-3 py-1.5 text-xs font-bold text-white" style={{ background: '#12B76A', borderRadius: 10 }} onClick={() => waShare(`${open.quoteNo}: ${open.payUrl}`)}>WhatsApp</button>
                  <a className="btn-ghost px-3 py-1.5 text-xs" href={open.payUrl} target="_blank" rel="noreferrer">Open</a>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <div className={tableWrap}>
        <table className="w-full min-w-[700px]">
          <thead className="border-b border-line bg-mist"><tr>{['Quote', 'Customer', 'Items', 'Amount', 'Status', 'Created', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
          <tbody>{quotes.map((q) => {
            const cnt = q.items.length;
            return (
              <tr key={q.id} className="border-b border-line/60 last:border-0">
                <td className={`${tdCls} font-mono text-xs font-bold`}>{q.quoteNo}{q.bookingNo && <span className="block text-[10px] font-normal text-soft">{q.bookingNo}</span>}</td>
                <td className={tdCls}>{q.customerName}<span className="block text-xs text-soft">{q.customerPhone}</span></td>
                <td className={`${tdCls} text-xs text-soft`}>{cnt > 0 ? q.items[0].label + (cnt > 1 ? ` +${cnt - 1}` : '') : q.description.slice(0, 30)}</td>
                <td className={`${tdCls} font-bold`}>{ghs(q.amount)}</td>
                <td className={tdCls}><Badge tone={stTone[q.status] ?? 'soft'}>{q.status}</Badge></td>
                <td className={`${tdCls} text-xs text-soft`}>{new Date(q.createdAt).toLocaleDateString()}</td>
                <td className={tdCls}><a href={`/admin/quotes?id=${q.id}`} className="btn-primary px-3 py-1 text-xs">Open</a></td>
              </tr>
            );
          })}</tbody>
        </table>
        {quotes.length === 0 && <EmptyState text="No quotes yet." />}
      </div>
    </main>
  );
}

function QrUrl({ url }: { url: string }) {
  return <QrBox url={url} />;
}
