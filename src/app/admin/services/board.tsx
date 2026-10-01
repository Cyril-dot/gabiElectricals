'use client';
import { useState } from 'react';
import { Badge, EmptyState, Field, Msg, api, inputCls, useMsg } from '@/components/ops/ui';
import { ghs } from '@/lib/money';

type Svc = { id: string; slug: string; name: string; description: string; shortDesc: string | null; basePrice: number; depositPct: number; durationMins: number; image: string | null; includes: string[]; urgency: Record<string, number>; active: boolean; sortOrder: number; bookings: number };
type Form = { name: string; description: string; basePrice: string; depositPct: string; durationMins: string; image: string; includes: string; std: string; urg: string; emg: string; active: boolean; sortOrder: string };
const blank: Form = { name: '', description: '', basePrice: '300', depositPct: '30', durationMins: '120', image: '', includes: '', std: '0', urg: '60', emg: '150', active: true, sortOrder: '0' };

export function ServicesBoard({ services }: { services: Svc[] }) {
  const [form, setForm] = useState<Form>(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const { msg, setMsg } = useMsg();
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  function load(s: Svc) {
    setEditId(s.id);
    setForm({ name: s.name, description: s.description, basePrice: String(s.basePrice), depositPct: String(s.depositPct), durationMins: String(s.durationMins), image: s.image ?? '', includes: s.includes.join('\n'), std: String(s.urgency.STANDARD ?? 0), urg: String(s.urgency.URGENT ?? 0), emg: String(s.urgency.EMERGENCY ?? 0), active: s.active, sortOrder: String(s.sortOrder) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save() {
    setBusy(true); setMsg(null);
    const body = {
      name: form.name, description: form.description, basePrice: Number(form.basePrice), depositPct: Number(form.depositPct),
      durationMins: Number(form.durationMins), image: form.image || undefined,
      includes: form.includes.split('\n').map((x) => x.trim()).filter(Boolean),
      urgencyJson: { STANDARD: Number(form.std) || 0, URGENT: Number(form.urg) || 0, EMERGENCY: Number(form.emg) || 0 },
      active: form.active, sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      await api(editId ? `/api/admin/services/${editId}` : '/api/admin/services', { method: editId ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      setMsg({ kind: 'ok', text: 'Service saved.' });
      setEditId(null); setForm(blank);
      setTimeout(() => location.reload(), 600);
    } catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); setBusy(false); }
  }

  return (
    <main className="container-x py-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue">Operations</p>
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white">Service catalogue editor</h1>
      </header>
      <Msg msg={msg} />
      <section className="card mb-6 p-4">
        <h2 className="font-display mb-3 text-lg font-bold text-navy dark:text-white">{editId ? 'Edit service' : 'New service'}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Base price (GHS)"><input type="number" className={inputCls} value={form.basePrice} onChange={(e) => set('basePrice', e.target.value)} /></Field>
          <Field label="Deposit %"><input type="number" className={inputCls} value={form.depositPct} onChange={(e) => set('depositPct', e.target.value)} /></Field>
          <Field label="Duration (mins)"><input type="number" className={inputCls} value={form.durationMins} onChange={(e) => set('durationMins', e.target.value)} /></Field>
          <Field label="Image path"><input className={inputCls} value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="/images/…" /></Field>
          <Field label="Sort order"><input type="number" className={inputCls} value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} /></Field>
          <div className="md:col-span-3"><Field label="Description"><textarea rows={3} className={inputCls} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
          <div className="md:col-span-2"><Field label="Includes (one per line)"><textarea rows={3} className={inputCls} value={form.includes} onChange={(e) => set('includes', e.target.value)} placeholder={'Fault diagnosis\nCertification report'} /></Field></div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-soft">Urgency surcharges (GHS)</p>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Std"><input type="number" className={inputCls} value={form.std} onChange={(e) => set('std', e.target.value)} /></Field>
              <Field label="Urg"><input type="number" className={inputCls} value={form.urg} onChange={(e) => set('urg', e.target.value)} /></Field>
              <Field label="Emerg"><input type="number" className={inputCls} value={form.emg} onChange={(e) => set('emg', e.target.value)} /></Field>
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button disabled={busy || form.name.length < 3 || form.description.length < 10} className="btn-primary px-4 py-2 text-sm" onClick={save}>{busy ? 'Saving…' : editId ? 'Save changes' : 'Create service'}</button>
          {editId && <button className="btn-ghost px-4 py-2 text-sm" onClick={() => { setEditId(null); setForm(blank); }}>Cancel</button>}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {services.map((s) => (
          <div key={s.id} className="card flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-navy dark:text-white">{s.name} <Badge tone={s.active ? 'success' : 'soft'}>{s.active ? 'ON' : 'OFF'}</Badge></p>
              <p className="text-xs text-soft">{s.slug} · from {ghs(s.basePrice)} · {s.durationMins} min · deposit {s.depositPct}% · {s.bookings} bookings</p>
              <p className="mt-1 text-xs text-soft">Urgency: +{ghs(s.urgency.URGENT ?? 0)} urgent / +{ghs(s.urgency.EMERGENCY ?? 0)} emergency · includes: {s.includes.length}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => load(s)}>Edit</button>
              <button className="btn-ghost px-2.5 py-1 text-xs text-danger" onClick={async () => { try { await api(`/api/admin/services/${s.id}`, { method: 'DELETE' }); location.reload(); } catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); } }}>{s.active ? 'Disable' : 'Delete'}</button>
            </div>
          </div>
        ))}
        {services.length === 0 && <EmptyState text="No services configured." />}
      </div>
    </main>
  );
}
