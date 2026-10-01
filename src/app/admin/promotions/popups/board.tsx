'use client';
import { useState } from 'react';
import { Badge, EmptyState, Field, Msg, api, inputCls, labelCls, useMsg } from '@/components/ops/ui';

type Targeting = { pages: string[]; visitor: string; device: string; delaySec?: number; scrollPct?: number };
type Popup = {
  id: string; name: string; kind: string; headline: string; body: string; image: string | null;
  buttonLabel: string; buttonHref: string | null; couponCode: string | null; whatsappBtn: boolean; captureLead: boolean;
  bgColor: string; textColor: string; accentColor: string; targeting: Targeting; frequency: string; priority: number;
  active: boolean; startsAt: string | null; endsAt: string | null; impressions: number; conversions: number;
};
type Blank = Omit<Popup, 'id' | 'impressions' | 'conversions'>;
const blank: Blank = {
  name: '', kind: 'WELCOME', headline: '', body: '', image: '', buttonLabel: 'Claim Offer', buttonHref: '/shop',
  couponCode: '', whatsappBtn: false, captureLead: false, bgColor: '#062E33', textColor: '#FFFFFF', accentColor: '#22D3EE',
  targeting: { pages: [], visitor: 'ALL', device: 'ALL' }, frequency: 'SESSION', priority: 0, active: false, startsAt: null, endsAt: null,
};
const KINDS = ['WELCOME', 'TIMED', 'SCROLL', 'EXIT', 'CART', 'SEASONAL', 'BOOKING'];
const PAGES = ['home', 'shop', 'product', 'services', 'booking', 'cart', 'checkout', 'blog'];
const dtLocal = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');

export function PopupBoard({ popups, couponCodes }: { popups: Popup[]; couponCodes: string[] }) {
  const [form, setForm] = useState<Blank>(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const { msg, setMsg } = useMsg();
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Blank>(k: K, v: Blank[K]) => setForm((p) => ({ ...p, [k]: v }));

  function load(p: Popup) {
    setEditId(p.id);
    const { id: _id, impressions: _i, conversions: _c, ...rest } = p;
    setForm(rest);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save() {
    setBusy(true); setMsg(null);
    const body = {
      ...form,
      image: form.image || undefined, buttonHref: form.buttonHref || undefined, couponCode: form.couponCode || undefined,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      priority: Number(form.priority) || 0,
    };
    try {
      await api(editId ? `/api/admin/popups/${editId}` : '/api/admin/popups', { method: editId ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      setMsg({ kind: 'ok', text: editId ? 'Popup updated.' : 'Popup created.' });
      setEditId(null); setForm(blank);
      setTimeout(() => location.reload(), 700);
    } catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); }
    finally { setBusy(false); }
  }

  async function toggle(p: Popup) {
    try { await api(`/api/admin/popups/${p.id}`, { method: 'PATCH', body: JSON.stringify({ active: !p.active }) }); location.reload(); }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); }
  }

  return (
    <main className="container-x py-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue">Marketing</p>
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white">Popup builder</h1>
      </header>
      <Msg msg={msg} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card h-fit p-4">
          <h2 className="font-display mb-3 text-lg font-bold text-navy dark:text-white">{editId ? 'Edit popup' : 'New popup'}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Internal name"><input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Easter welcome" /></Field>
            <Field label="Type"><select className={inputCls} value={form.kind} onChange={(e) => set('kind', e.target.value)}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
            <div className="md:col-span-2"><Field label="Headline"><input className={inputCls} value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="10% off your first order 🔥" /></Field></div>
            <div className="md:col-span-2"><Field label="Body"><textarea rows={2} className={inputCls} maxLength={600} value={form.body} onChange={(e) => set('body', e.target.value)} /></Field></div>
            <Field label="Image URL"><input className={inputCls} value={form.image ?? ''} onChange={(e) => set('image', e.target.value)} placeholder="/images/…" /></Field>
            <Field label="Coupon code"><select className={inputCls} value={form.couponCode ?? ''} onChange={(e) => set('couponCode', e.target.value)}><option value="">None</option>{couponCodes.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Button label"><input className={inputCls} value={form.buttonLabel} onChange={(e) => set('buttonLabel', e.target.value)} /></Field>
            <Field label="Button link"><input className={inputCls} value={form.buttonHref ?? ''} onChange={(e) => set('buttonHref', e.target.value)} /></Field>
            <div className="flex flex-wrap gap-4 md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.whatsappBtn} onChange={(e) => set('whatsappBtn', e.target.checked)} /> WhatsApp button</label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.captureLead} onChange={(e) => set('captureLead', e.target.checked)} /> Capture lead</label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
            </div>
            <div className="flex gap-3 md:col-span-2">
              <Field label="BG"><input type="color" className="h-10 w-16 rounded-lg border border-line" value={form.bgColor} onChange={(e) => set('bgColor', e.target.value)} /></Field>
              <Field label="Text"><input type="color" className="h-10 w-16 rounded-lg border border-line" value={form.textColor} onChange={(e) => set('textColor', e.target.value)} /></Field>
              <Field label="Accent"><input type="color" className="h-10 w-16 rounded-lg border border-line" value={form.accentColor} onChange={(e) => set('accentColor', e.target.value)} /></Field>
              <Field label="Frequency"><select className={inputCls} value={form.frequency} onChange={(e) => set('frequency', e.target.value)}><option>SESSION</option><option>DAY</option><option>WEEK</option><option>ONCE</option></select></Field>
              <Field label="Priority"><input type="number" min="0" max="99" className={inputCls} value={form.priority} onChange={(e) => set('priority', Number(e.target.value) as never)} /></Field>
            </div>
            <Field label="Starts (optional)"><input type="datetime-local" className={inputCls} value={dtLocal(form.startsAt)} onChange={(e) => set('startsAt', e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
            <Field label="Ends (optional)"><input type="datetime-local" className={inputCls} value={dtLocal(form.endsAt)} onChange={(e) => set('endsAt', e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
            <div className="md:col-span-2">
              <p className={labelCls}>Show on pages (none = sitewide)</p>
              <div className="flex flex-wrap gap-1.5">
                {PAGES.map((pg) => (
                  <button key={pg} type="button" onClick={() => set('targeting', { ...form.targeting, pages: form.targeting.pages.includes(pg) ? form.targeting.pages.filter((x) => x !== pg) : [...form.targeting.pages, pg] })}
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${form.targeting.pages.includes(pg) ? 'border-blue bg-blue text-white' : 'border-line text-soft'}`}>{pg}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <Field label="Audience"><select className={inputCls} value={form.targeting.visitor} onChange={(e) => set('targeting', { ...form.targeting, visitor: e.target.value })}><option>ALL</option><option>NEW</option><option>RETURNING</option></select></Field>
              <Field label="Device"><select className={inputCls} value={form.targeting.device} onChange={(e) => set('targeting', { ...form.targeting, device: e.target.value })}><option>ALL</option><option>MOBILE</option><option>DESKTOP</option></select></Field>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled={busy || !form.name || !form.headline || !form.body} className="btn-primary px-4 py-2 text-sm" onClick={save}>{busy ? 'Saving…' : editId ? 'Save changes' : 'Create popup'}</button>
            {editId && <button className="btn-ghost px-4 py-2 text-sm" onClick={() => { setEditId(null); setForm(blank); }}>Cancel edit</button>}
          </div>
        </section>

        {/* Live preview */}
        <section>
          <p className={labelCls}>Preview</p>
          <div className="mx-auto max-w-sm overflow-hidden rounded-2xl shadow-pop" style={{ background: form.bgColor, color: form.textColor }}>
            {form.image && <img src={form.image} alt="" className="h-36 w-full object-cover" />}
            <div className="p-5 text-center">
              <Badge tone="gold">{form.kind}</Badge>
              <h3 className="font-display mt-2 text-xl font-extrabold">{form.headline || 'Your headline'}</h3>
              <p className="mt-2 text-sm opacity-90">{form.body || 'Popup body copy lands here.'}</p>
              {form.couponCode && <p className="mt-3 inline-block rounded-lg border border-dashed px-3 py-1 font-mono text-sm font-bold" style={{ borderColor: form.accentColor, color: form.accentColor }}>{form.couponCode}</p>}
              <div className="mt-4 flex flex-col gap-2">
                <span className="rounded-xl px-4 py-2.5 text-sm font-extrabold" style={{ background: form.accentColor, color: '#062E33' }}>{form.buttonLabel}</span>
                {form.whatsappBtn && <span className="rounded-xl border px-4 py-2 text-xs font-bold" style={{ borderColor: form.accentColor }}>Chat on WhatsApp</span>}
                {form.captureLead && <span className="rounded-xl border border-white/40 px-4 py-2 text-xs">+ email capture field</span>}
              </div>
              <p className="mt-3 text-[10px] opacity-60">Frequency {form.frequency} · Priority {form.priority} · {form.targeting.device} · {form.targeting.visitor}{form.targeting.pages.length ? ` · ${form.targeting.pages.join('/')}` : ''}</p>
            </div>
          </div>
        </section>
      </div>

      {/* List */}
      <section className="mt-8 grid gap-3 md:grid-cols-2">
        {popups.map((p) => (
          <div key={p.id} className="card flex items-center gap-3 p-4">
            <div className="h-12 w-12 shrink-0 rounded-xl" style={{ background: p.bgColor, border: `2px solid ${p.accentColor}` }} />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-navy dark:text-white">{p.name} <Badge tone={p.active ? 'success' : 'soft'}>{p.active ? 'ACTIVE' : 'PAUSED'}</Badge> <Badge tone="navy">{p.kind}</Badge></p>
              <p className="truncate text-xs text-soft">{p.headline}</p>
              <p className="text-[10px] text-soft">views {p.impressions} · conv {p.conversions} · prio {p.priority} · {p.frequency}{p.couponCode ? ` · ${p.couponCode}` : ''}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => load(p)}>Edit</button>
              <button className="btn-gold px-2.5 py-1 text-xs" onClick={() => toggle(p)}>{p.active ? 'Pause' : 'Activate'}</button>
            </div>
          </div>
        ))}
        {popups.length === 0 && <EmptyState text="No popups yet — build one above." />}
      </section>
    </main>
  );
}
