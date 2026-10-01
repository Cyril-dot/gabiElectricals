'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

type Props = { initial: { name: string; email: string; phone: string }; memberSince: string; role: string };

export default function ProfileForm({ initial }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [pw, setPw] = useState({ old: '', next: '', confirm: '' });
  const [busyA, setBusyA] = useState(false);
  const [busyB, setBusyB] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  async function saveDetails() {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = 'Name too short';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Invalid email';
    if (f.phone.trim() && !/^(\+?233|0)(24|25|54|55|59|27|26|2\d|3\d)[0-9]{7}$/.test(f.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid Ghana phone or leave blank';
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusyA(true);
    try {
      const r = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() || undefined }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast(j.error ?? 'Could not save', 'err'); return; }
      toast('Profile updated ✓', 'ok'); router.refresh();
    } catch { toast('Network error', 'err'); } finally { setBusyA(false); }
  }

  async function changePassword() {
    if (pw.next !== pw.confirm) { setErrs({ confirm: 'Passwords do not match' }); return; }
    if (pw.next.length < 8) { setErrs({ next: 'New password must be at least 8 characters' }); return; }
    if (!pw.old) { setErrs({ old: 'Enter your current password' }); return; }
    setErrs({});
    setBusyB(true);
    try {
      const r = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword: pw.old, newPassword: pw.next }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast(j.error ?? 'Could not change password', 'err'); return; }
      toast('Password changed 🔒', 'ok');
      setPw({ old: '', next: '', confirm: '' });
    } catch { toast('Network error', 'err'); } finally { setBusyB(false); }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <h3 className="font-bold text-[14.5px]">Details</h3>
        <div>
          <label htmlFor="pf-name" className="block text-[11.5px] font-bold mb-1">Full name</label>
          <input id="pf-name" value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} autoComplete="name"
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]" />
          {errs.name && <p role="alert" className="text-danger text-[12px] font-bold mt-1">{errs.name}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pf-email" className="block text-[11.5px] font-bold mb-1">Email</label>
            <input id="pf-email" type="email" value={f.email} onChange={e => setF(x => ({ ...x, email: e.target.value }))} autoComplete="email"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]" />
            {errs.email && <p role="alert" className="text-danger text-[12px] font-bold mt-1">{errs.email}</p>}
          </div>
          <div>
            <label htmlFor="pf-phone" className="block text-[11.5px] font-bold mb-1">Phone (Ghana)</label>
            <input id="pf-phone" type="tel" value={f.phone} onChange={e => setF(x => ({ ...x, phone: e.target.value }))} placeholder="024 123 4567" autoComplete="tel"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]" />
            {errs.phone && <p role="alert" className="text-danger text-[12px] font-bold mt-1">{errs.phone}</p>}
          </div>
        </div>
        <button onClick={saveDetails} disabled={busyA} className="btn-primary px-5 py-2.5 text-[13.5px]">{busyA ? 'Saving…' : 'Save details'}</button>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-bold text-[14.5px]">Change password</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="pf-old" className="block text-[11.5px] font-bold mb-1">Current</label>
            <input id="pf-old" type="password" value={pw.old} onChange={e => setPw(x => ({ ...x, old: e.target.value }))} autoComplete="current-password"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]" />
            {errs.old && <p role="alert" className="text-danger text-[12px] font-bold mt-1">{errs.old}</p>}
          </div>
          <div>
            <label htmlFor="pf-new" className="block text-[11.5px] font-bold mb-1">New (min 8)</label>
            <input id="pf-new" type="password" value={pw.next} onChange={e => setPw(x => ({ ...x, next: e.target.value }))} autoComplete="new-password"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]" />
            {errs.next && <p role="alert" className="text-danger text-[12px] font-bold mt-1">{errs.next}</p>}
          </div>
          <div>
            <label htmlFor="pf-confirm" className="block text-[11.5px] font-bold mb-1">Confirm</label>
            <input id="pf-confirm" type="password" value={pw.confirm} onChange={e => setPw(x => ({ ...x, confirm: e.target.value }))} autoComplete="new-password"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]" />
            {errs.confirm && <p role="alert" className="text-danger text-[12px] font-bold mt-1">{errs.confirm}</p>}
          </div>
        </div>
        <button onClick={changePassword} disabled={busyB || !pw.old || !pw.next} className="btn-ghost px-5 py-2.5 text-[13.5px]">{busyB ? 'Updating…' : 'Update password'}</button>
      </div>
    </div>
  );
}
