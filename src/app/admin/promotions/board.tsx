'use client';
import { useState } from 'react';
import { Badge, EmptyState, Field, Msg, api, inputCls, tableWrap, tdCls, thCls, useMsg, labelCls } from '@/components/ops/ui';
import { ghs } from '@/lib/money';

type Coupon = { id: string; code: string; type: string; value: number; minSpend: number; maxDiscount: number | null; usageLimit: number | null; usedCount: number; perCustomerLimit: number; firstOrderOnly: boolean; referralOnly: boolean; categoryIds: string[]; productIds: string[]; startsAt: string | null; endsAt: string | null; active: boolean };
type Flash = { id: string; name: string; productId: string; productName: string; regularPrice: number; salePrice: number; qtyLimit: number; sold: number; startsAt: string; endsAt: string };
type Bundle = { id: string; name: string; slug: string; description: string | null; price: number; compareAt: number | null; active: boolean; items: { productId: string; qty: number; name: string; price: number }[] };
type Props = { coupons: Coupon[]; flash: Flash[]; bundles: Bundle[]; products: { id: string; name: string; price: number }[]; categories: { id: string; name: string }[] };

const dtLocal = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');

function CouponForm({ editing, categories, onDone, onCancel }: { editing?: Coupon | null; categories: Props['categories']; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    code: editing?.code ?? '', type: editing?.type ?? 'PERCENT', value: String(editing?.value ?? 10),
    minSpend: String(editing?.minSpend ?? 0), maxDiscount: editing?.maxDiscount != null ? String(editing.maxDiscount) : '',
    usageLimit: editing?.usageLimit != null ? String(editing.usageLimit) : '', perCustomerLimit: String(editing?.perCustomerLimit ?? 1),
    firstOrderOnly: editing?.firstOrderOnly ?? false, referralOnly: editing?.referralOnly ?? false,
    categoryIds: editing?.categoryIds ?? [] as string[], startsAt: dtLocal(editing?.startsAt), endsAt: dtLocal(editing?.endsAt), active: editing?.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  return (
    <form className="grid gap-3 md:grid-cols-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      const body = {
        code: f.code, type: f.type as never, value: Number(f.value), minSpend: Number(f.minSpend),
        maxDiscount: f.maxDiscount ? Number(f.maxDiscount) : null, usageLimit: f.usageLimit ? Number(f.usageLimit) : null,
        perCustomerLimit: Number(f.perCustomerLimit) || 1, firstOrderOnly: f.firstOrderOnly, referralOnly: f.referralOnly,
        categoryIds: f.categoryIds, startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null, endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null, active: f.active,
      };
      try { await api(editing ? `/api/admin/coupons/${editing.id}` : '/api/admin/coupons', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) }); onDone(); }
      catch (err) { alert(err instanceof Error ? err.message : 'Failed'); setBusy(false); }
    }}>
      <Field label="Code"><input required className={inputCls} value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="EASTER20" /></Field>
      <Field label="Type"><select className={inputCls} value={f.type} onChange={(e) => set('type', e.target.value)}><option>PERCENT</option><option>FIXED</option><option>FREE_DELIVERY</option></select></Field>
      <Field label={f.type === 'PERCENT' ? 'Percent off' : f.type === 'FIXED' ? 'Amount off (GHS)' : 'Value (unused)'}><input type="number" step="0.01" min="0" required className={inputCls} value={f.value} onChange={(e) => set('value', e.target.value)} /></Field>
      <Field label="Min spend (GHS)"><input type="number" min="0" className={inputCls} value={f.minSpend} onChange={(e) => set('minSpend', e.target.value)} /></Field>
      <Field label="Max discount (optional)"><input type="number" min="0" className={inputCls} value={f.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} /></Field>
      <Field label="Total usage limit"><input type="number" min="1" className={inputCls} value={f.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} placeholder="unlimited" /></Field>
      <Field label="Per customer"><input type="number" min="1" className={inputCls} value={f.perCustomerLimit} onChange={(e) => set('perCustomerLimit', e.target.value)} /></Field>
      <Field label="Starts"><input type="datetime-local" className={inputCls} value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></Field>
      <Field label="Ends"><input type="datetime-local" className={inputCls} value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} /></Field>
      <div className="md:col-span-3">
        <p className={labelCls}>Category scope (none = all categories)</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => set('categoryIds', f.categoryIds.includes(c.id) ? f.categoryIds.filter((x) => x !== c.id) : [...f.categoryIds, c.id])}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${f.categoryIds.includes(c.id) ? 'border-blue bg-blue text-white' : 'border-line text-soft'}`}>{c.name}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 md:col-span-3">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.firstOrderOnly} onChange={(e) => set('firstOrderOnly', e.target.checked)} /> First order only</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.referralOnly} onChange={(e) => set('referralOnly', e.target.checked)} /> Referral-only</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
      </div>
      <div className="flex gap-2 md:col-span-3">
        <button disabled={busy} className="btn-primary px-4 py-2 text-sm">{busy ? 'Saving…' : editing ? 'Save changes' : 'Create coupon'}</button>
        <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={onCancel}>{editing ? 'Cancel' : 'Reset'}</button>
      </div>
    </form>
  );
}

export function PromotionsBoard({ coupons, flash, bundles, products, categories }: Props) {
  const [tab, setTab] = useState<'coupons' | 'flash' | 'bundles'>('coupons');
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { msg, setMsg } = useMsg();
  const [busy, setBusy] = useState<string | null>(null);

  const [flashForm, setFlashForm] = useState({ name: '', productId: '', salePrice: '', qtyLimit: '20', startsAt: dtLocal(new Date().toISOString()), endsAt: dtLocal(new Date(Date.now() + 2 * 864e5).toISOString()) });
  const [bundleForm, setBundleForm] = useState({ name: '', description: '', price: '', compareAt: '', items: [{ productId: '', qty: '1' }] });

  async function run(key: string, fn: () => Promise<unknown>, okMsg: string) {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ kind: 'ok', text: okMsg }); setTimeout(() => location.reload(), 600); }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); setBusy(null); }
  }

  const tabs = [
    { id: 'coupons', label: 'Coupons', n: coupons.length },
    { id: 'flash', label: 'Flash sales', n: flash.length },
    { id: 'bundles', label: 'Bundles', n: bundles.length },
  ] as const;

  return (
    <main className="container-x py-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue">Marketing</p>
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white">Promotions</h1>
      </header>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false); setEditing(null); }}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold ${tab === t.id ? 'border-blue bg-blue text-white' : 'border-line text-soft hover:border-blue hover:text-blue'}`}>{t.label} <span className="text-xs opacity-70">{t.n}</span></button>
        ))}
        {tab === 'coupons' && <button className="btn-gold ml-auto px-3 py-1.5 text-xs" onClick={() => { setEditing(null); setShowForm(!showForm); }}>{showForm && !editing ? 'Close' : '+ New coupon'}</button>}
      </div>
      <Msg msg={msg} />

      {tab === 'coupons' && (showForm || editing) && (
        <section className="card mb-6 p-4">
          <h2 className="font-display mb-3 text-lg font-bold text-navy dark:text-white">{editing ? `Edit ${editing.code}` : 'New coupon'}</h2>
          <CouponForm editing={editing} categories={categories} onCancel={() => { setShowForm(false); setEditing(null); }} onDone={() => { setShowForm(false); setEditing(null); setMsg({ kind: 'ok', text: 'Coupon saved.' }); setTimeout(() => location.reload(), 600); }} />
        </section>
      )}

      {tab === 'coupons' && (
        <div className={tableWrap}>
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-line bg-mist"><tr>{['Code', 'Type', 'Value', 'Min spend', 'Redeemed', 'Limits', 'Window', 'Flags', 'Status', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-line/60 last:border-0">
                  <td className={`${tdCls} font-mono font-bold`}>{c.code}</td>
                  <td className={tdCls}><Badge tone={c.type === 'PERCENT' ? 'info' : c.type === 'FIXED' ? 'gold' : 'success'}>{c.type}</Badge></td>
                  <td className={`${tdCls} font-bold`}>{c.type === 'PERCENT' ? `${c.value}%` : c.type === 'FIXED' ? ghs(c.value) : '—'}</td>
                  <td className={tdCls}>{c.minSpend ? ghs(c.minSpend) : '—'}{c.maxDiscount != null && <span className="block text-[10px] text-soft">cap {ghs(c.maxDiscount)}</span>}</td>
                  <td className={tdCls}><span className="font-bold text-navy dark:text-white">{c.usedCount}</span><span className="text-soft">{c.usageLimit ? ` / ${c.usageLimit}` : ''}</span></td>
                  <td className={`${tdCls} text-xs`}>{c.perCustomerLimit}/customer{c.categoryIds.length > 0 && <span className="block text-[10px] text-soft">{c.categoryIds.length} categories</span>}</td>
                  <td className={`${tdCls} text-xs text-soft`}>{c.startsAt ? new Date(c.startsAt).toLocaleDateString() : 'now'} → {c.endsAt ? new Date(c.endsAt).toLocaleDateString() : '∞'}</td>
                  <td className={`${tdCls} text-xs`}>{[c.firstOrderOnly && 'first-order', c.referralOnly && 'referral'].filter(Boolean).join(', ') || '—'}</td>
                  <td className={tdCls}><Badge tone={c.active ? 'success' : 'soft'}>{c.active ? 'ACTIVE' : 'OFF'}</Badge></td>
                  <td className={tdCls}>
                    <div className="flex gap-1.5">
                      <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => { setEditing(c); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                      <button disabled={busy === c.id} className="btn-ghost px-2.5 py-1 text-xs" onClick={() => run(c.id, () => api(`/api/admin/coupons/${c.id}`, { method: 'PATCH', body: JSON.stringify({ active: !c.active }) }), 'Toggled')}>{c.active ? 'Disable' : 'Enable'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {coupons.length === 0 && <EmptyState text="No coupons yet." />}
        </div>
      )}

      {tab === 'flash' && (
        <div className="grid gap-6 lg:grid-cols-5">
          <section className="card h-fit p-4 lg:col-span-2">
            <h2 className="font-display mb-3 text-lg font-bold text-navy dark:text-white">New flash sale</h2>
            <form className="grid gap-3" onSubmit={(e) => {
              e.preventDefault();
              run('fs', () => api('/api/admin/flash-sales', {
                method: 'POST',
                body: JSON.stringify({ ...flashForm, salePrice: Number(flashForm.salePrice), qtyLimit: Number(flashForm.qtyLimit), startsAt: new Date(flashForm.startsAt).toISOString(), endsAt: new Date(flashForm.endsAt).toISOString() }),
              }), 'Flash sale created');
            }}>
              <Field label="Banner text"><input required minLength={3} className={inputCls} value={flashForm.name} onChange={(e) => setFlashForm({ ...flashForm, name: e.target.value })} placeholder="48h Surge Protection Sale" /></Field>
              <Field label="Product"><select required className={inputCls} value={flashForm.productId} onChange={(e) => setFlashForm({ ...flashForm, productId: e.target.value })}><option value="">Pick…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({ghs(p.price)})</option>)}</select></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sale price (GHS)"><input required type="number" step="0.01" min="0.01" className={inputCls} value={flashForm.salePrice} onChange={(e) => setFlashForm({ ...flashForm, salePrice: e.target.value })} /></Field>
                <Field label="Qty limit"><input type="number" min="1" className={inputCls} value={flashForm.qtyLimit} onChange={(e) => setFlashForm({ ...flashForm, qtyLimit: e.target.value })} /></Field>
                <Field label="Starts"><input required type="datetime-local" className={inputCls} value={flashForm.startsAt} onChange={(e) => setFlashForm({ ...flashForm, startsAt: e.target.value })} /></Field>
                <Field label="Ends"><input required type="datetime-local" className={inputCls} value={flashForm.endsAt} onChange={(e) => setFlashForm({ ...flashForm, endsAt: e.target.value })} /></Field>
              </div>
              <button className="btn-primary px-4 py-2 text-sm">Create flash sale</button>
            </form>
          </section>
          <section className="lg:col-span-3 space-y-3">
            {flash.map((f) => {
              const live = new Date(f.endsAt) > new Date();
              return (
                <div key={f.id} className="card flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-navy dark:text-white">{f.name}</p>
                    <p className="text-xs text-soft">{f.productName} · {ghs(f.regularPrice)} → <span className="font-bold text-gold-dark dark:text-gold">{ghs(f.salePrice)}</span></p>
                    <p className="text-xs text-soft">{new Date(f.startsAt).toLocaleString()} → {new Date(f.endsAt).toLocaleString()} · sold {f.sold}/{f.qtyLimit}</p>
                  </div>
                  <Badge tone={live ? 'success' : 'soft'}>{live ? 'LIVE' : 'ENDED'}</Badge>
                  <button disabled={busy === f.id} className="btn-ghost px-2.5 py-1 text-xs text-danger" onClick={() => run(f.id, () => api(`/api/admin/flash-sales/${f.id}`, { method: 'DELETE' }), 'Flash sale removed')}>Remove</button>
                </div>
              );
            })}
            {flash.length === 0 && <EmptyState text="No flash sales scheduled." />}
          </section>
        </div>
      )}

      {tab === 'bundles' && (
        <div className="grid gap-6 lg:grid-cols-5">
          <section className="card h-fit p-4 lg:col-span-2">
            <h2 className="font-display mb-3 text-lg font-bold text-navy dark:text-white">New bundle</h2>
            <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); run('b', () => api('/api/admin/bundles', { method: 'POST', body: JSON.stringify({ name: bundleForm.name, description: bundleForm.description || undefined, price: Number(bundleForm.price), compareAt: bundleForm.compareAt ? Number(bundleForm.compareAt) : null, items: bundleForm.items.filter((i) => i.productId).map((i) => ({ productId: i.productId, qty: Number(i.qty) || 1 })) }) }), 'Bundle created'); }}>
              <Field label="Name"><input required minLength={3} className={inputCls} value={bundleForm.name} onChange={(e) => setBundleForm({ ...bundleForm, name: e.target.value })} placeholder="Installer starter kit" /></Field>
              <Field label="Description"><input className={inputCls} maxLength={500} value={bundleForm.description} onChange={(e) => setBundleForm({ ...bundleForm, description: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bundle price (GHS)"><input required type="number" step="0.01" min="0.01" className={inputCls} value={bundleForm.price} onChange={(e) => setBundleForm({ ...bundleForm, price: e.target.value })} /></Field>
                <Field label="Compare at (GHS)"><input type="number" step="0.01" min="0" className={inputCls} value={bundleForm.compareAt} onChange={(e) => setBundleForm({ ...bundleForm, compareAt: e.target.value })} /></Field>
              </div>
              <p className={labelCls}>Items</p>
              {bundleForm.items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <select className={inputCls} value={it.productId} onChange={(e) => setBundleForm({ ...bundleForm, items: bundleForm.items.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)) })}>
                    <option value="">Product…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input className={`${inputCls} w-16`} type="number" min="1" value={it.qty} onChange={(e) => setBundleForm({ ...bundleForm, items: bundleForm.items.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)) })} />
                </div>
              ))}
              <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setBundleForm({ ...bundleForm, items: [...bundleForm.items, { productId: '', qty: '1' }] })}>+ Add item</button>
              <button className="btn-primary px-4 py-2 text-sm">Create bundle</button>
            </form>
          </section>
          <section className="lg:col-span-3 space-y-3">
            {bundles.map((b) => (
              <div key={b.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-navy dark:text-white">{b.name} <Badge tone={b.active ? 'success' : 'soft'}>{b.active ? 'ACTIVE' : 'OFF'}</Badge></p>
                    <p className="text-xs text-soft">{b.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}</p>
                    <p className="text-sm font-bold text-blue">{ghs(b.price)} {b.compareAt ? <span className="ml-1 text-xs font-normal text-soft line-through">{ghs(b.compareAt)}</span> : null}</p>
                  </div>
                  <button disabled={busy === b.id} className="btn-ghost px-2.5 py-1 text-xs text-danger" onClick={() => run(b.id, () => api(`/api/admin/bundles/${b.id}`, { method: 'DELETE' }), 'Bundle deleted')}>Delete</button>
                </div>
              </div>
            ))}
            {bundles.length === 0 && <EmptyState text="No bundles yet." />}
          </section>
        </div>
      )}
    </main>
  );
}
