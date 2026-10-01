'use client';
import { useState } from 'react';
import { Badge, EmptyState, Msg, api, tableWrap, tdCls, thCls, useMsg } from '@/components/ops/ui';
import { Icon } from '@/components/Icon';

type Rev = { id: string; rating: number; title: string; body: string; verified: boolean; status: string; product: string; productSlug: string; customer: string; email: string; createdAt: string };
const Stars = ({n}:{n:number}) => (<span className="inline-flex">{Array.from({length:5},(_,i)=>(<Icon key={i} name="star" size={13} filled={i<Math.round(n)} className={i<Math.round(n)?'text-gold':'text-line'} />))}</span>);

export function ReviewsBoard({ reviews, counts, summary, activeStatus }: { reviews: Rev[]; counts: Record<string, number>; summary: { name: string; slug: string; avg: number; n: number }[]; activeStatus: string }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const { msg, setMsg } = useMsg();
  const [busy, setBusy] = useState(false);

  async function moderate(status: string, ids = [...sel]) {
    if (!ids.length) { setMsg({ kind: 'err', text: 'Select at least one review.' }); return; }
    setBusy(true); setMsg(null);
    try { await api('/api/admin/reviews', { method: 'POST', body: JSON.stringify({ ids, status }) }); setMsg({ kind: 'ok', text: `${ids.length} review(s) → ${status}.` }); setTimeout(() => location.reload(), 600); }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); setBusy(false); }
  }

  return (
    <main className="container-x py-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue">Social proof</p>
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white">Review moderation</h1>
      </header>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {['PENDING', 'PUBLISHED', 'REJECTED'].map((s) => (
          <a key={s} href={`/admin/reviews?status=${s}`} className={`rounded-full border px-4 py-1.5 text-sm font-bold ${activeStatus === s ? 'border-blue bg-blue text-white' : 'border-line text-soft hover:border-blue'}`}>
            {s} <span className="text-xs opacity-70">{counts[s] ?? 0}</span>
          </a>
        ))}
      </div>
      <Msg msg={msg} />
      {activeStatus === 'PENDING' && reviews.length > 0 && (
        <div className="mb-3 flex gap-2">
          <button disabled={busy} className="btn-primary px-3 py-1.5 text-xs" onClick={() => moderate('PUBLISHED')}>Approve selected</button>
          <button disabled={busy} className="btn-ghost px-3 py-1.5 text-xs text-danger" onClick={() => moderate('REJECTED')}>Reject selected</button>
          <button disabled={busy} className="btn-gold px-3 py-1.5 text-xs" onClick={() => moderate('PUBLISHED', reviews.map((r) => r.id))}>Approve all {reviews.length}</button>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <div className={`${tableWrap} overflow-x-auto`}>
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-line bg-mist"><tr>
                <th className={thCls}> </th><th className={thCls}>Review</th><th className={thCls}>Product</th><th className={thCls}>Customer</th><th className={thCls}>Status</th>
              </tr></thead>
              <tbody>{reviews.map((r) => (
                <tr key={r.id} className="border-b border-line/60 last:border-0 align-top">
                  <td className={tdCls}>{r.status === 'PENDING' && <input type="checkbox" className="h-4 w-4 accent-[#0C4A55]" checked={sel.has(r.id)} onChange={() => setSel((p) => { const n = new Set(p); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} />}</td>
                  <td className={tdCls}>
                    <p className="text-sm font-bold text-gold-dark dark:text-gold">{<Stars n={r.rating} />} <span className="ml-1 text-ink dark:text-white">{r.title}</span></p>
                    <p className="mt-0.5 max-w-md text-xs text-soft">{r.body}</p>
                    {r.verified && <Badge tone="success">verified purchase</Badge>}
                  </td>
                  <td className={`${tdCls} text-xs`}><a className="text-blue hover:underline" href={`/product/${r.productSlug}`}>{r.product}</a></td>
                  <td className={`${tdCls} text-xs`}>{r.customer}<span className="block text-soft">{r.email}</span><span className="block text-soft">{new Date(r.createdAt).toLocaleDateString()}</span></td>
                  <td className={tdCls}>
                    <Badge tone={r.status === 'PUBLISHED' ? 'success' : r.status === 'REJECTED' ? 'danger' : 'warning'}>{r.status}</Badge>
                    {r.status !== 'PUBLISHED' && <button disabled={busy} className="btn-ghost mt-1 block px-2 py-1 text-[10px] text-success" onClick={() => moderate('PUBLISHED', [r.id])}>Publish</button>}
                    {r.status !== 'REJECTED' && <button disabled={busy} className="btn-ghost mt-1 block px-2 py-1 text-[10px] text-danger" onClick={() => moderate('REJECTED', [r.id])}>Reject</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {reviews.length === 0 && <EmptyState text={`No ${activeStatus.toLowerCase()} reviews.`} />}
          </div>
        </div>
        <section className="card h-fit p-4">
          <h2 className="font-display mb-3 text-base font-bold text-navy dark:text-white">Rating summary</h2>
          {summary.map((s) => (
            <div key={s.slug} className="mb-2.5">
              <p className="truncate text-xs font-bold text-navy dark:text-white">{s.name}</p>
              <p className="text-[11px] text-gold-dark dark:text-gold">{<Stars n={s.avg} />} <span className="text-soft">{s.avg.toFixed(1)} · {s.n} reviews</span></p>
            </div>
          ))}
          {summary.length === 0 && <EmptyState text="No ratings yet." />}
        </section>
      </div>
    </main>
  );
}
