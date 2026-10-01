'use client';
import { useState } from 'react';
import { Badge, EmptyState, Field, Msg, Tabs, api, inputCls, labelCls, tableWrap, tdCls, thCls, useMsg } from '@/components/ops/ui';
import { ghs } from '@/lib/money';

type Sub = { id: string; email: string; active: boolean; createdAt: string };
type Lead = { id: string; email: string; phone: string | null; name: string | null; source: string; status: string; createdAt: string };
type Cart = { id: string; email: string; phone: string | null; value: number; recovered: boolean; items: string; createdAt: string; updatedAt: string };
const PIPELINE = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'];
const srcTone: Record<string, 'info' | 'gold' | 'navy' | 'soft'> = { POPUP: 'info', WHOLESALE: 'gold', QUOTE: 'navy', CONTACT: 'soft', NEWSLETTER: 'soft' };
const stTone: Record<string, 'info' | 'gold' | 'success' | 'danger' | 'soft'> = { NEW: 'info', CONTACTED: 'gold', QUALIFIED: 'navy' as never, WON: 'success', LOST: 'danger' };

export function MarketingBoard({ subs, leads, carts }: { subs: Sub[]; leads: Lead[]; carts: Cart[] }) {
  const [tab, setTab] = useState<'subs' | 'leads' | 'broadcast' | 'carts'>('subs');
  const { msg, setMsg } = useMsg();
  const [busy, setBusy] = useState<string | null>(null);
  const [b, setB] = useState({ channel: 'EMAIL', audience: 'SUBSCRIBERS', subject: '', message: '' });

  async function run(key: string, fn: () => Promise<unknown>, okText: string) {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ kind: 'ok', text: okText }); }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); }
    finally { setBusy(null); }
  }

  return (
    <main className="container-x py-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue">Growth</p>
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white">Marketing hub</h1>
      </header>
      <Tabs
        tabs={[
          { id: 'subs', label: 'Subscribers', count: subs.length },
          { id: 'leads', label: 'Leads', count: leads.length },
          { id: 'carts', label: 'Abandoned carts', count: carts.filter((c) => !c.recovered).length },
          { id: 'broadcast', label: 'Broadcast' },
        ]}
        active={tab}
        onChange={(t) => setTab(t as typeof tab)}
      />
      <Msg msg={msg} />

      {tab === 'subs' && (
        <>
          <div className="mb-3 flex justify-end"><a href="/api/admin/marketing/export?kind=subscribers" className="btn-ghost px-3 py-1.5 text-xs">Export CSV</a></div>
          <div className={tableWrap}>
            <table className="w-full min-w-[480px]">
              <thead className="border-b border-line bg-mist"><tr>{['Email', 'Status', 'Joined'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>{subs.map((s) => (
                <tr key={s.id} className="border-b border-line/60 last:border-0">
                  <td className={`${tdCls} font-semibold`}>{s.email}</td>
                  <td className={tdCls}><Badge tone={s.active ? 'success' : 'soft'}>{s.active ? 'ACTIVE' : 'UNSUB'}</Badge></td>
                  <td className={`${tdCls} text-xs text-soft`}>{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
            {subs.length === 0 && <EmptyState text="No newsletter subscribers yet." />}
          </div>
        </>
      )}

      {tab === 'leads' && (
        <>
          <div className="mb-3 flex justify-end"><a href="/api/admin/marketing/export?kind=leads" className="btn-ghost px-3 py-1.5 text-xs">Export CSV</a></div>
          <div className={tableWrap}>
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-line bg-mist"><tr>{['Name', 'Contact', 'Source', 'Pipeline', 'Captured'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>{leads.map((l) => (
                <tr key={l.id} className="border-b border-line/60 last:border-0">
                  <td className={tdCls}>{l.name ?? '—'}</td>
                  <td className={`${tdCls} text-xs`}>{l.email}{l.phone && <span className="block text-soft">{l.phone}</span>}</td>
                  <td className={tdCls}><Badge tone={srcTone[l.source] ?? 'soft'}>{l.source}</Badge></td>
                  <td className={tdCls}>
                    <select className={`${inputCls} w-36 py-1 text-xs`} value={l.status} disabled={busy === l.id}
                      onChange={(e) => run(l.id, async () => { await api(`/api/admin/marketing/leads/${l.id}`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) }); location.reload(); }, 'Lead moved')}>
                      {PIPELINE.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className={`${tdCls} text-xs text-soft`}>{new Date(l.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
            {leads.length === 0 && <EmptyState text="No leads captured yet." />}
          </div>
        </>
      )}

      {tab === 'carts' && (
        <>
          <div className="mb-3 flex justify-end"><a href="/api/admin/marketing/export?kind=carts" className="btn-ghost px-3 py-1.5 text-xs">Export CSV</a></div>
          <div className="grid gap-3">
            {carts.map((c) => (
              <div key={c.id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-navy dark:text-white">{c.email} · {ghs(c.value)} <Badge tone={c.recovered ? 'success' : 'warning'}>{c.recovered ? 'RECOVERED' : 'ABANDONED'}</Badge></p>
                  <p className="mt-1 max-w-xl truncate text-xs text-soft" title={c.items}>{c.items}</p>
                  <p className="text-[10px] text-soft">left {new Date(c.updatedAt).toLocaleString()}</p>
                </div>
                {c.phone && !c.recovered && (
                  <button disabled={busy === c.id} className="btn-primary px-3 py-1.5 text-xs" onClick={() => run(c.id, () => api('/api/admin/marketing/recover', { method: 'POST', body: JSON.stringify({ cartId: c.id }) }), `Recovery SMS queued to ${c.phone} (demo-logged)`)}>Send recovery SMS</button>
                )}
              </div>
            ))}
            {carts.length === 0 && <EmptyState text="No abandoned carts tracked." />}
          </div>
        </>
      )}

      {tab === 'broadcast' && (
        <section className="card max-w-2xl p-5">
          <h2 className="font-display mb-1 text-lg font-bold text-navy dark:text-white">Broadcast composer</h2>
          <p className="mb-4 text-xs text-soft">Demo mode: messages are written to the Notification Log only — nothing is really sent.</p>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Channel"><select className={inputCls} value={b.channel} onChange={(e) => setB({ ...b, channel: e.target.value })}><option>EMAIL</option><option>SMS</option><option>WHATSAPP</option></select></Field>
              <Field label="Audience"><select className={inputCls} value={b.audience} onChange={(e) => setB({ ...b, audience: e.target.value })}><option value="SUBSCRIBERS">Newsletter subscribers</option><option value="LEADS">Leads</option><option value="CUSTOMERS">Customers</option></select></Field>
            </div>
            {b.channel === 'EMAIL' && <Field label="Subject"><input className={inputCls} value={b.subject} onChange={(e) => setB({ ...b, subject: e.target.value })} placeholder="Rambo deals inside ⚡" /></Field>}
            <Field label="Message"><textarea rows={4} maxLength={1500} className={inputCls} value={b.message} onChange={(e) => setB({ ...b, message: e.target.value })} /></Field>
            <button disabled={busy !== null || b.message.length < 10} className="btn-gold px-4 py-2 text-sm"
              onClick={() => run('bc', () => api('/api/admin/marketing/broadcast', { method: 'POST', body: JSON.stringify({ channel: b.channel, audience: b.audience, subject: b.subject || undefined, message: b.message }) }), 'Broadcast logged to Notification Log (demo).')}>
              Queue broadcast
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
