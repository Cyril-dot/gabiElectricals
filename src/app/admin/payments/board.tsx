'use client';
import { useState } from 'react';
import { Badge, CopyButton, EmptyState, Field, Msg, QrBox, api, inputCls, labelCls, payTone, thCls, tdCls, tableWrap, useMsg, waShare } from '@/components/ops/ui';
import { ghs } from '@/lib/money';

type Ev = { type: string; note: string | null; at: string };
type Pay = {
  id: string; reference: string; amount: number; status: string; method: string; provider: string;
  providerRef: string | null; payerName: string | null;
  payerPhone: string | null; payerEmail: string | null; refundNote: string | null; proofImage: string | null;
  createdAt: string; confirmedAt: string | null; expiresAt: string | null;
  orderNo: string | null; bookingNo: string | null; linkLabel: string | null; linkCode: string | null;
  city: string | null; region: string | null; landmark: string | null;
  items: { name: string; image: string | null; qty: number; price: number }[];
  orderId: string | null; bookingId: string | null; linkId: string | null; events: Ev[];
};
type Link = { id: string; code: string; label: string; amount: number; forType: string; status: string; createdAt: string; expiresAt: string | null; paid: boolean };
type Summary = { paidCount: number; paidTotal: number; pendingCount: number };
type Props = { payments: Pay[]; awaiting: Pay[]; links: Link[]; counts: Record<string, number>; filters: Record<string, string>; summary: Summary };

const networkLabel = (m: string) => m === 'MOMO_MTN' ? 'MTN' : m === 'MOMO_TELECEL' ? 'Telecel' : m === 'MOMO_AT' ? 'AirtelTigo' : m;

const STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_PAID', 'EXPIRED', 'AWAITING_APPROVAL'];
const METHODS = ['MOMO_MTN', 'MOMO_TELECEL', 'MOMO_AT', 'CARD', 'BANK_TRANSFER', 'GHIPSS', 'QR', 'CASH', 'MANUAL_TRANSFER', 'PAY_ON_DELIVERY', 'WALLET'];

const entityLabel = (p: Pay) => p.orderNo ? `Order ${p.orderNo}` : p.bookingNo ? `Booking ${p.bookingNo}` : p.linkLabel ? `Link ${p.linkLabel}` : 'Direct';

function Timeline({ events }: { events: Ev[] }) {
  if (!events.length) return <p className="text-xs text-soft">No gateway events recorded.</p>;
  return (
    <ol className="space-y-2">
      {events.map((e, i) => (
        <li key={i} className="flex gap-2 text-xs">
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${e.type === 'SUCCESS' ? 'bg-success' : e.type === 'FAILED' ? 'bg-danger' : 'bg-blue'}`} />
          <div><span className="font-bold">{e.type}</span> · <span className="text-soft">{new Date(e.at).toLocaleString()}</span>{e.note && <p className="text-soft">{e.note}</p>}</div>
        </li>
      ))}
    </ol>
  );
}

export function PaymentBoard({ payments, awaiting, links, counts, filters, summary }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { msg, setMsg } = useMsg();

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ kind: 'ok', text: 'Done — refreshing.' }); setTimeout(() => location.reload(), 700); }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); }
    finally { setBusy(null); }
  }

  // link generator
  const [gen, setGen] = useState({ label: '', description: '', amount: '150', flexible: false, expiresInMin: '1440' });
  const [made, setMade] = useState<{ code: string; url: string } | null>(null);
  const [genBusy, setGenBusy] = useState(false);

  return (
    <main className="container-x py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue">Payments</p>
          <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white">{filters.src === 'all' ? 'Transactions & approval queue' : 'LibertePay transactions'}</h1>
          <div className="mt-2 flex gap-2 text-xs font-bold">
            <a href="/admin/payments" className={filters.src !== 'all' ? 'btn-primary px-3 py-1.5' : 'btn-ghost px-3 py-1.5'}>LibertePay</a>
            <a href="/admin/payments?src=all" className={filters.src === 'all' ? 'btn-primary px-3 py-1.5' : 'btn-ghost px-3 py-1.5'}>All sources</a>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {STATUSES.map((s) => counts[s] ? <Badge key={s} tone={payTone[s]}>{s} {counts[s]}</Badge> : null)}
        </div>
      </header>

      {/* LibertePay summary — same shape as the ShinobiPay transactions list */}
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-soft">Successful collections</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-navy dark:text-white">{summary.paidCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-soft">Total collected via LibertePay</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-navy dark:text-white">{ghs(summary.paidTotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-soft">Pending at LibertePay</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-navy dark:text-white">{summary.pendingCount}</p>
        </div>
      </section>

      {/* Awaiting approval */}
      <section className="card mb-6 border-gold/50 p-4">
        <h2 className="font-display mb-3 text-lg font-bold text-navy dark:text-gold">Awaiting approval <Badge tone="gold">{awaiting.length}</Badge></h2>
        {awaiting.length === 0 ? <EmptyState text="No manual transfers waiting. Nice." /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {awaiting.map((p) => (
              <div key={p.id} className="flex gap-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
                {p.proofImage ? (
                  <a href={p.proofImage} target="_blank" rel="noreferrer"><img src={p.proofImage} alt="Transfer proof" className="h-20 w-20 rounded-lg border border-line object-cover" /></a>
                ) : <div className="grid h-20 w-20 place-items-center rounded-lg border border-line bg-mist text-xs text-soft">No proof</div>}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-navy dark:text-white">{ghs(p.amount)} · {p.method} <Badge tone="gold">{p.status}</Badge></p>
                  <p className="truncate text-xs text-soft">{p.reference} · {entityLabel(p)} · {p.payerPhone ?? p.payerEmail ?? '—'}</p>
                  <p className="text-xs text-soft">{new Date(p.createdAt).toLocaleString()}</p>
                  <div className="mt-2 flex gap-2">
                    <button disabled={busy === p.id} className="btn-primary px-3 py-1.5 text-xs" onClick={() => act(p.id, () => api(`/api/admin/payments/${p.id}/approve`, { method: 'POST', body: JSON.stringify({ action: 'APPROVE' }) }))}>Approve</button>
                    <button disabled={busy === p.id} className="btn-ghost px-3 py-1.5 text-xs text-danger" onClick={() => act(p.id, () => api(`/api/admin/payments/${p.id}/approve`, { method: 'POST', body: JSON.stringify({ action: 'REJECT', note: 'Proof did not match bank statement' }) }))}>Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Filters */}
      <form className="card mb-6 grid gap-3 p-4 md:grid-cols-6" method="get" action="/admin/payments">
        <input type="hidden" name="src" value={filters.src} />
        <Field label="Search ref / phone"><input name="q" defaultValue={filters.q} className={inputCls} placeholder="GABI… / GE_PAY_… or 024…" /></Field>
        <Field label="Status"><select name="status" defaultValue={filters.status} className={inputCls}><option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Method"><select name="method" defaultValue={filters.method} className={inputCls}><option value="">All</option>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
        <Field label="From"><input name="from" type="date" defaultValue={filters.from} className={inputCls} /></Field>
        <Field label="To"><input name="to" type="date" defaultValue={filters.to} className={inputCls} /></Field>
        <div className="flex items-end gap-2"><button className="btn-primary px-4 py-2 text-sm">Apply</button><a href="/admin/payments" className="btn-ghost px-3 py-2 text-sm">Clear</a></div>
      </form>
      <Msg msg={msg} />

      {/* Table — ShinobiPay transactions layout + the products each payment bought */}
      <div className={`${tableWrap} mb-8`}>
        <table className="w-full min-w-[1080px]">
          <thead className="border-b border-line bg-mist"><tr>{['Date', 'Number', 'Name', 'Product', 'Transaction', 'Amount', 'Network', 'Status', 'Actions'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-line/60 last:border-0 hover:bg-mist/50">
                <td className={`${tdCls} whitespace-nowrap text-xs text-soft`}>{new Date(p.createdAt).toLocaleString()}</td>
                <td className={`${tdCls} whitespace-nowrap font-mono text-xs font-bold`}>{p.payerPhone ?? '—'}</td>
                <td className={`${tdCls} text-xs`}>
                  {p.payerName ?? '—'}
                  {p.city && <span className="block text-[10px] text-soft">{p.city}{p.region ? `, ${p.region}` : ''}</span>}
                </td>
                <td className={tdCls}>
                  {p.items.length > 0 ? (
                    <div className="flex items-center gap-2">
                      {p.items[0].image
                        ? <img src={p.items[0].image} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-line object-cover" />
                        : <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-mist text-[9px] text-soft">GE</div>}
                      <div className="min-w-0">
                        <p className="max-w-44 truncate text-xs font-bold text-navy dark:text-white">{p.items[0].name} <span className="font-semibold text-soft">×{p.items[0].qty}</span></p>
                        {p.items.length > 1 && <p className="text-[10px] text-soft">+{p.items.length - 1} more product{p.items.length > 2 ? 's' : ''}</p>}
                      </div>
                    </div>
                  ) : <span className="text-xs text-soft">{entityLabel(p)}</span>}
                </td>
                <td className={tdCls}>
                  <span className="font-mono text-xs font-bold">{p.providerRef ?? p.reference}</span>
                  <span className="block text-[10px] text-soft">{p.reference} · {entityLabel(p)}</span>
                </td>
                <td className={`${tdCls} whitespace-nowrap font-bold`}>{ghs(p.amount)}</td>
                <td className={`${tdCls} text-xs`}>{networkLabel(p.method)}<span className="block text-[10px] text-soft">{p.provider}</span></td>
                <td className={tdCls}><Badge tone={payTone[p.status] ?? 'soft'}>{p.status}</Badge>{p.refundNote && <p className="mt-1 max-w-40 truncate text-[10px] text-soft" title={p.refundNote}>{p.refundNote}</p>}</td>
                <td className={tdCls}>
                  <div className="flex flex-wrap gap-1.5">
                    <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? 'Hide' : 'Detail'}</button>
                    {p.status === 'PAID' && <button disabled={busy === p.id} className="btn-ghost px-2.5 py-1 text-xs text-danger" onClick={() => { const note = window.prompt('Refund note (required, min 5 chars):'); if (note) act(p.id, () => api('/api/admin/refunds', { method: 'POST', body: JSON.stringify({ paymentId: p.id, note }) })); }}>Refund</button>}
                    {p.status === 'AWAITING_APPROVAL' && <button disabled={busy === p.id} className="btn-gold px-2.5 py-1 text-xs" onClick={() => act(p.id, () => api(`/api/admin/payments/${p.id}/approve`, { method: 'POST', body: JSON.stringify({ action: 'APPROVE' }) }))}>Approve</button>}
                  </div>
                  {open === p.id && (
                    <div className="mt-2 w-80 rounded-lg border border-line bg-white p-3 dark:bg-navy-700">
                      {p.city && (
                        <p className="mb-2 text-xs text-soft">
                          <span className="font-bold text-navy dark:text-white">Location:</span>{' '}
                          {p.city}{p.region ? `, ${p.region}` : ''}{p.landmark ? ` — near ${p.landmark}` : ''}
                        </p>
                      )}
                      {p.items.length > 0 && (
                        <div className="mb-3">
                          <p className="mb-2 text-xs font-bold text-navy dark:text-white">Products bought</p>
                          <ul className="space-y-1.5">
                            {p.items.map((it, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs">
                                {it.image
                                  ? <img src={it.image} alt="" className="h-7 w-7 shrink-0 rounded-md border border-line object-cover" />
                                  : <div className="h-7 w-7 shrink-0 rounded-md border border-line bg-mist" />}
                                <span className="min-w-0 flex-1 truncate">{it.name} <span className="text-soft">×{it.qty}</span></span>
                                <span className="font-bold">{ghs(it.price * it.qty)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="mb-2 text-xs font-bold text-navy dark:text-white">Event timeline</p>
                      <Timeline events={p.events} />
                      {p.proofImage && <a className="mt-2 block text-xs text-blue underline" href={p.proofImage} target="_blank" rel="noreferrer">View transfer proof</a>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && <EmptyState text="No payments match these filters." />}
      </div>

      {/* Link generator */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-display mb-3 text-lg font-bold text-navy dark:text-white">Payment link generator</h2>
          <div className="grid gap-3">
            <Field label="Label"><input className={inputCls} value={gen.label} onChange={(e) => setGen({ ...gen, label: e.target.value })} placeholder="e.g. Site visit — East Legon rewire" /></Field>
            <Field label="Description (optional)"><input className={inputCls} value={gen.description} onChange={(e) => setGen({ ...gen, description: e.target.value })} maxLength={240} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (GHS)">
                <input className={inputCls} type="number" min={0} disabled={gen.flexible} value={gen.flexible ? '' : gen.amount} onChange={(e) => setGen({ ...gen, amount: e.target.value })} placeholder={gen.flexible ? 'Payer decides' : ''} />
              </Field>
                <Field label="Expires after (minutes)"><input className={inputCls} type="number" min={5} value={gen.expiresInMin} onChange={(e) => setGen({ ...gen, expiresInMin: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={gen.flexible} onChange={(e) => setGen({ ...gen, flexible: e.target.checked })} /> Flexible amount (payer enters)</label>
            <button disabled={genBusy || gen.label.length < 2} className="btn-primary px-4 py-2 text-sm" onClick={async () => {
              setGenBusy(true); setMsg(null);
              try {
                const j = await api<{ code: string; url: string }>('/api/paylinks', {
                  method: 'POST',
                  body: JSON.stringify({ label: gen.label, description: gen.description || undefined, amount: gen.flexible ? 0 : Number(gen.amount), forType: 'CUSTOM', expiresInMin: Number(gen.expiresInMin) || undefined }),
                });
                setMade(j);
              } catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); }
              finally { setGenBusy(false); }
            }}>Generate link + QR</button>
            <Msg msg={msg} />
          </div>
          {made && (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-blue/30 bg-blue/5 p-3">
              <QrBox url={made.url} />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-soft">Share this link</p>
                <p className="break-all font-mono text-sm font-bold text-blue">{made.url}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CopyButton text={made.url} />
                  <button className="btn-success px-3 py-1.5 text-xs" style={{ background: '#12B76A', color: '#fff' }} onClick={() => waShare(`Pay GabiElectricals: ${made.url}`)}>WhatsApp</button>
                  <a className="btn-ghost px-3 py-1.5 text-xs" href={made.url} target="_blank" rel="noreferrer">Open</a>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="card overflow-x-auto p-0">
          <h2 className="font-display px-4 pt-4 text-lg font-bold text-navy dark:text-white">Existing payment links <span className="text-sm font-normal text-soft">({links.length})</span></h2>
          <div className="mt-3">
            <table className="w-full min-w-[520px]">
              <thead className="border-y border-line bg-mist"><tr>{['Code', 'Label', 'Amount', 'For', 'Status', 'Created'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id} className="border-b border-line/60 last:border-0">
                    <td className={`${tdCls} font-mono text-xs font-bold`}><a className="text-blue hover:underline" href={`/pay/${l.code}`}>{l.code}</a></td>
                    <td className={`${tdCls} max-w-44 truncate`}>{l.label}</td>
                    <td className={tdCls}>{l.amount === 0 ? <Badge tone="info">Flexible</Badge> : ghs(l.amount)}</td>
                    <td className={`${tdCls} text-xs`}>{l.forType}</td>
                    <td className={tdCls}><Badge tone={l.status === 'PAID' ? 'success' : l.status === 'ACTIVE' ? (l.paid ? 'success' : 'info') : l.status === 'EXPIRED' ? 'soft' : 'danger'}>{l.status}</Badge></td>
                    <td className={`${tdCls} text-xs text-soft`}>{new Date(l.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {links.length === 0 && <EmptyState text="No payment links yet — generate one." />}
          </div>
        </section>
      </div>
    </main>
  );
}
