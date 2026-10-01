'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

export type Addr = { id: string; label: string; region: string; city: string; landmark: string | null; gps: string | null; phone: string; isDefault: boolean };

const REGIONS = ['Greater Accra', 'Ashanti', 'Western', 'Northern', 'Central', 'Eastern', 'Volta', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo', 'Savannah', 'North East', 'Western North', 'Oti'];
const EMPTY = { label: 'Home', region: 'Greater Accra', city: '', landmark: '', gps: '', phone: '', isDefault: false };

export default function AddressesManager({ initial }: { initial: Addr[] }) {
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  function startEdit(a: Addr) { setEditing(a.id); setForm({ label: a.label, region: a.region, city: a.city, landmark: a.landmark ?? '', gps: a.gps ?? '', phone: a.phone, isDefault: a.isDefault }); }
  function startNew() { setEditing('new'); setForm({ ...EMPTY, isDefault: initial.length === 0 }); }

  async function save() {
    if (form.city.trim().length < 2) { toast('City is required', 'err'); return; }
    if (!/^(\+?233|0)(24|25|54|55|59|27|26|2\d|3\d)[0-9]{7}$/.test(form.phone.replace(/\s/g, ''))) { toast('Enter a valid Ghana phone', 'err'); return; }
    setBusy(true);
    try {
      const isEdit = editing !== 'new' && editing !== null;
      const r = await fetch('/api/addresses', {
        method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editing, ...form } : form),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast(j.error ?? 'Could not save address', 'err'); return; }
      toast(isEdit ? 'Address updated ✓' : 'Address saved ✓', 'ok');
      setEditing(null); router.refresh();
    } catch { toast('Network error', 'err'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const r = await fetch('/api/addresses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast(j.error ?? 'Could not delete', 'err'); return; }
      toast('Address removed', 'ok');
      router.refresh();
    } catch { toast('Network error', 'err'); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      {initial.length === 0 && editing !== 'new' && (
        <div className="card p-10 text-center">
          <p className="text-4xl" aria-hidden="true">📍</p>
          <p className="font-bold mt-2">No addresses saved</p>
          <p className="text-[13px] text-soft mt-1">Save your site or home address for one-tap checkout.</p>
        </div>
      )}

      {initial.map(a => (
        editing === a.id ? (
          <div key={a.id} className="card p-4 border-blue">
            <FormFields form={form} setForm={setForm} />
            <div className="flex gap-2 mt-3">
              <button onClick={save} disabled={busy} className="btn-primary px-4 py-2 text-[13px]">{busy ? 'Saving…' : 'Save changes'}</button>
              <button onClick={() => setEditing(null)} className="btn-ghost px-4 py-2 text-[13px]">Cancel</button>
            </div>
          </div>
        ) : (
          <div key={a.id} className={`card p-4 flex flex-wrap gap-2 items-start justify-between ${a.isDefault ? 'border-blue/40' : ''}`}>
            <div className="min-w-0">
              <p className="font-bold text-[14px]">
                {a.label} {a.isDefault && <span className="text-[10px] font-black bg-blue/10 text-blue rounded-md px-1.5 py-0.5 ml-1">DEFAULT</span>}
              </p>
              <p className="text-[12.5px] text-soft mt-1">{a.city}, {a.region}{a.landmark ? ` · ${a.landmark}` : ''}</p>
              <p className="text-[12px] text-soft mt-0.5">📞 {a.phone}{a.gps ? ` · GPS ${a.gps}` : ''}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => startEdit(a)} className="btn-ghost px-3 py-1.5 text-[12px]">Edit</button>
              <button onClick={() => remove(a.id)} disabled={busy} className="btn-ghost px-3 py-1.5 text-[12px] text-danger border-danger/30">Delete</button>
            </div>
          </div>
        )
      ))}

      {editing === 'new' ? (
        <div className="card p-4 border-blue">
          <p className="font-bold text-[14px] mb-3">New address</p>
          <FormFields form={form} setForm={setForm} />
          <div className="flex gap-2 mt-3">
            <button onClick={save} disabled={busy} className="btn-primary px-4 py-2 text-[13px]">{busy ? 'Saving…' : 'Save address'}</button>
            <button onClick={() => setEditing(null)} className="btn-ghost px-4 py-2 text-[13px]">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={startNew} className="btn-gold px-4 py-2.5 text-[13px]">+ Add new address</button>
      )}
    </div>
  );
}

function FormFields({ form, setForm }: { form: typeof EMPTY; setForm: (f: typeof EMPTY | ((x: typeof EMPTY) => typeof EMPTY)) => void }) {
  const set = (k: keyof typeof EMPTY, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <label htmlFor="addr-label" className="block text-[11.5px] font-bold mb-1">Label</label>
        <input id="addr-label" value={form.label} onChange={e => set('label', e.target.value)} list="addr-labels" className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13.5px]" />
        <datalist id="addr-labels"><option value="Home" /><option value="Site" /><option value="Office" /><option value="Shop" /></datalist>
      </div>
      <div>
        <label htmlFor="addr-region" className="block text-[11.5px] font-bold mb-1">Region</label>
        <select id="addr-region" value={form.region} onChange={e => set('region', e.target.value)} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13.5px]">
          {REGIONS.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="addr-city" className="block text-[11.5px] font-bold mb-1">City / Town *</label>
        <input id="addr-city" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Spintex" className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13.5px]" />
      </div>
      <div>
        <label htmlFor="addr-land" className="block text-[11.5px] font-bold mb-1">Landmark</label>
        <input id="addr-land" value={form.landmark} onChange={e => set('landmark', e.target.value)} placeholder="Blue gate, last street" className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13.5px]" />
      </div>
      <div>
        <label htmlFor="addr-gps" className="block text-[11.5px] font-bold mb-1">Ghana Post GPS</label>
        <input id="addr-gps" value={form.gps} onChange={e => set('gps', e.target.value.toUpperCase())} placeholder="GA-123-4567" className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13.5px]" />
      </div>
      <div>
        <label htmlFor="addr-phone" className="block text-[11.5px] font-bold mb-1">Phone *</label>
        <input id="addr-phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="024 123 4567" className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13.5px]" />
      </div>
      <label className="sm:col-span-2 flex items-center gap-2 text-[12.5px] font-bold">
        <input type="checkbox" checked={form.isDefault} onChange={e => set('isDefault', e.target.checked)} className="accent-blue" />
        Set as default address
      </label>
    </div>
  );
}
