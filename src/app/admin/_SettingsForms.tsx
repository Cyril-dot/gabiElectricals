'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Icon, ICONS } from './_ui';

type Settings = {
  business: { name: string; tagline: string; phone: string; whatsapp: string; email: string; address: string; gps: string; hours: string };
  tax: { vatPct: number; vatInclusive: boolean; levyPct: number };
  referral: { referrerReward: number; friendReward: number; minOrder: number; minPayout: number; affiliateDefaultPct: number };
  payments: { enabled: Record<string, boolean>; qrExpiryMinutes: number };
};
type Zone = { id: string; name: string; regions: string[]; fee: number; freeOver: number | null; etaDays: number; active: boolean };

const field = 'w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue dark:bg-navy';
const label = 'mb-1 block text-[11px] font-extrabold uppercase tracking-wide text-soft';
const REGIONS = ['Greater Accra', 'Ashanti', 'Western', 'Western North', 'Central', 'Eastern', 'Volta', 'Oti', 'Northern', 'Savannah', 'North East', 'Upper East', 'Upper West', 'Bono', 'Bono East'];

function saveSetting(key: string, value: unknown) {
  return fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
}

export function SettingsForms({ initial, defaultPayments, zones, templates }: {
  initial: Settings; defaultPayments: Settings['payments']; zones: Zone[]; templates: Record<string, string>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [biz, setBiz] = useState(initial.business);
  const [tax, setTax] = useState(initial.tax);
  const [ref, setRef] = useState(initial.referral);
  const [pay, setPay] = useState<Settings['payments']>({ enabled: { ...defaultPayments.enabled, ...initial.payments.enabled }, qrExpiryMinutes: initial.payments.qrExpiryMinutes });
  const [tpl, setTpl] = useState(templates);
  const [zoneList, setZoneList] = useState(zones);
  const [newZone, setNewZone] = useState({ name: '', region: 'Greater Accra', fee: '25', freeOver: '1500', etaDays: '2' });

  const run = async (k: string, fn: () => Promise<Response>, msg: string) => {
    setBusy(k);
    try {
      const res = await fn();
      const j = await res.json().catch(() => ({}));
      toast(res.ok ? msg : j.error ?? 'Save failed', res.ok ? 'ok' : 'err');
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const patchZone = (z: Zone, body: Record<string, unknown>) => run(`zone:${z.id}`, () => fetch('/api/admin/zones', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: z.id, ...body }) }), 'Zone saved');
  const deleteZone = async (z: Zone) => {
    if (!confirm(`Delete zone "${z.name}"? Zones used by orders are deactivated instead.`)) return;
    await run(`zone:${z.id}`, () => fetch('/api/admin/zones', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: z.id }) }), 'Zone removed');
    setZoneList(l => l.filter(x => x.id !== z.id));
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="card space-y-4 p-4 md:p-5 xl:col-span-2">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Business info</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {([['name', 'Business name'], ['tagline', 'Tagline'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['gps', 'Ghana Post GPS'], ['hours', 'Trading hours']] as const).map(([k, l]) => (
            <div key={k}>
              <label className={label}>{l}</label>
              <input className={field} value={biz[k]} onChange={e => setBiz({ ...biz, [k]: e.target.value })} />
            </div>
          ))}
          <div className="md:col-span-3">
            <label className={label}>Physical address</label>
            <input className={field} value={biz.address} onChange={e => setBiz({ ...biz, address: e.target.value })} />
          </div>
        </div>
        <button disabled={!!busy} onClick={() => void run('biz', () => saveSetting('business', biz), 'Business info saved')} className="btn-primary px-5 py-2 text-sm">{busy === 'biz' ? 'Saving…' : 'Save business info'}</button>
      </section>

      <section className="card space-y-4 p-4 md:p-5">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Tax &amp; levy</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>VAT % (inclusive in retail prices)</label>
            <input className={field} inputMode="decimal" value={tax.vatPct} onChange={e => setTax({ ...tax, vatPct: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className={label}>Levy % (added on top)</label>
            <input className={field} inputMode="decimal" value={tax.levyPct} onChange={e => setTax({ ...tax, levyPct: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <button disabled={!!busy} onClick={() => void run('tax', () => saveSetting('tax', tax), 'Tax settings saved')} className="btn-primary w-full py-2 text-sm">{busy === 'tax' ? 'Saving…' : 'Save tax'}</button>
      </section>

      <section className="card space-y-4 p-4 md:p-5">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Referral rewards</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {([['referrerReward', 'Referrer bonus ₵'], ['friendReward', 'Friend bonus ₵'], ['minOrder', 'Min qualifying order ₵'], ['minPayout', 'Min payout ₵'], ['affiliateDefaultPct', 'Affiliate % default']] as const).map(([k, l]) => (
            <div key={k}>
              <label className={label}>{l}</label>
              <input className={field} inputMode="decimal" value={ref[k]} onChange={e => setRef({ ...ref, [k]: parseFloat(e.target.value) || 0 })} />
            </div>
          ))}
        </div>
        <button disabled={!!busy} onClick={() => void run('ref', () => saveSetting('referral', ref), 'Referral config saved')} className="btn-primary w-full py-2 text-sm">{busy === 'ref' ? 'Saving…' : 'Save referrals'}</button>
      </section>

      <section className="card space-y-4 p-4 md:p-5">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Payment methods</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {Object.keys(pay.enabled).sort().map(m => (
            <label key={m} className="flex cursor-pointer items-center justify-between rounded-xl border border-line px-3 py-2 text-xs font-extrabold">
              {m.replaceAll('_', ' ')}
              <input type="checkbox" checked={pay.enabled[m]} onChange={e => setPay({ ...pay, enabled: { ...pay.enabled, [m]: e.target.checked } })} className="h-4 w-4 accent-[#1B1B1D]" />
            </label>
          ))}
        </div>
        <div>
          <label className={label}>QR expiry (minutes)</label>
          <input className={`${field} w-32`} inputMode="numeric" value={pay.qrExpiryMinutes} onChange={e => setPay({ ...pay, qrExpiryMinutes: parseInt(e.target.value) || 5 })} />
        </div>
        <button disabled={!!busy} onClick={() => void run('pay', () => saveSetting('payments', pay), 'Payment toggles saved')} className="btn-primary w-full py-2 text-sm">{busy === 'pay' ? 'Saving…' : 'Save payments'}</button>
      </section>

      <section className="card space-y-4 p-4 md:p-5">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Notification templates</h2>
        {Object.entries(tpl).map(([code, body]) => (
          <div key={code}>
            <label className={label}>{code.replaceAll('_', ' ')}</label>
            <textarea className={`${field} min-h-16`} value={body} onChange={e => setTpl({ ...tpl, [code]: e.target.value })} />
          </div>
        ))}
        <button disabled={!!busy} onClick={() => void run('tpl', () => saveSetting('notificationTemplates', tpl), 'Templates saved')} className="btn-primary w-full py-2 text-sm">{busy === 'tpl' ? 'Saving…' : 'Save templates'}</button>
        <p className="text-[11px] font-semibold text-soft">{'{{tokens}}'} resolve at send time; all sends are logged to the Notification Log in demo mode.</p>
      </section>

      <section className="card space-y-4 p-4 md:p-5 xl:col-span-2">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Delivery zones</h2>
        <div className="space-y-2">
          {zoneList.map(z => (
            <div key={z.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3">
              <input className={`${field} w-full sm:w-48`} defaultValue={z.name} aria-label="Zone name"
                onBlur={e => { if (e.target.value !== z.name) { setZoneList(l => l.map(x => x.id === z.id ? { ...x, name: e.target.value } : x)); void patchZone(z, { name: e.target.value }); } }} />
              <select className={`${field} w-full sm:w-44`} aria-label="Covered region" value={z.regions[0] ?? 'Greater Accra'}
                onChange={e => { setZoneList(l => l.map(x => x.id === z.id ? { ...x, regions: [e.target.value] } : x)); void patchZone(z, { regions: [e.target.value] }); }}>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input className={`${field} w-24`} inputMode="decimal" defaultValue={z.fee} aria-label="Fee"
                onBlur={e => { const v = parseFloat(e.target.value) || 0; if (v !== z.fee) { setZoneList(l => l.map(x => x.id === z.id ? { ...x, fee: v } : x)); void patchZone(z, { fee: v }); } }} />
              <input className={`${field} w-28`} inputMode="decimal" defaultValue={z.freeOver ?? ''} placeholder="Free over ₵" aria-label="Free delivery threshold"
                onBlur={e => { const raw = e.target.value.trim(); const v = raw === '' ? null : parseFloat(raw) || 0; setZoneList(l => l.map(x => x.id === z.id ? { ...x, freeOver: v } : x)); void patchZone(z, { freeOver: v }); }} />
              <label className="flex items-center gap-2 text-xs font-extrabold">
                <input type="checkbox" checked={z.active} onChange={e => { setZoneList(l => l.map(x => x.id === z.id ? { ...x, active: e.target.checked } : x)); void patchZone(z, { active: e.target.checked }); }} className="h-4 w-4 accent-[#1B1B1D]" />
                Active
              </label>
              <button onClick={() => void deleteZone(z)} aria-label={`Delete zone ${z.name}`} className="btn-ghost !p-2 text-danger"><Icon d={ICONS.trash} className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-line p-3">
          <div>
            <label className={label}>New zone name</label>
            <input className={`${field} w-full sm:w-44`} value={newZone.name} onChange={e => setNewZone({ ...newZone, name: e.target.value })} placeholder="Ho / Volta" />
          </div>
          <div>
            <label className={label}>Region</label>
            <select className={field} value={newZone.region} onChange={e => setNewZone({ ...newZone, region: e.target.value })}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Fee ₵</label>
            <input className={`${field} w-20`} inputMode="decimal" value={newZone.fee} onChange={e => setNewZone({ ...newZone, fee: e.target.value })} />
          </div>
          <div>
            <label className={label}>Free over ₵</label>
            <input className={`${field} w-24`} inputMode="decimal" value={newZone.freeOver} onChange={e => setNewZone({ ...newZone, freeOver: e.target.value })} />
          </div>
          <div>
            <label className={label}>ETA days</label>
            <input className={`${field} w-16`} inputMode="numeric" value={newZone.etaDays} onChange={e => setNewZone({ ...newZone, etaDays: e.target.value })} />
          </div>
          <button disabled={!!busy} onClick={() => void run('newzone', async () => {
            const res = await fetch('/api/admin/zones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newZone.name, regions: [newZone.region], fee: parseFloat(newZone.fee) || 0, freeOver: parseFloat(newZone.freeOver) || null, etaDays: parseInt(newZone.etaDays) || 2, active: true }) });
            if (res.ok) { const j = await res.json(); setZoneList(l => [...l, { id: j.id, name: newZone.name, regions: [newZone.region], fee: parseFloat(newZone.fee) || 0, freeOver: parseFloat(newZone.freeOver) || null, etaDays: parseInt(newZone.etaDays) || 2, active: true }]); setNewZone({ name: '', region: 'Greater Accra', fee: '25', freeOver: '1500', etaDays: '2' }); }
            return res;
          }, 'Zone added')} className="btn-gold px-4 py-2 text-sm">Add zone</button>
        </div>
      </section>
    </div>
  );
}
