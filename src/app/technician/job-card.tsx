'use client';
import { useRef, useState } from 'react';
import { Badge, CopyButton, QrBox, api, bookTone, inputCls, waShare } from '@/components/ops/ui';
import { ghs } from '@/lib/money';

type Job = {
  id: string; bookingNo: string; timeSlot: string; status: string; urgency: string; serviceName: string;
  contactName: string; contactPhone: string; city: string; region: string; landmark: string | null; gps: string | null;
  description: string; price: number; depositDue: number; paymentMode: string; media: string[]; date: string;
};
const FLOW = ['REQUESTED', 'CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'];
const NEXT_LABEL: Record<string, string> = { CONFIRMED: 'Confirm job', ASSIGNED: 'Accept job', ON_THE_WAY: "I'm on the way", IN_PROGRESS: 'Start work', COMPLETED: 'Complete job' };

export function JobCard({ job }: { job: Job }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState(String(Math.max(job.depositDue, 50) || '150'));
  const [pay, setPay] = useState<{ url: string; code: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState(job.media);

  const idx = FLOW.indexOf(job.status);
  const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
  const addr = [job.city, job.landmark, job.gps].filter(Boolean).join(' ');
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr || `${job.contactName} ${job.city} ${job.region}`)}`;

  async function call(action: 'status' | 'note' | 'media', body: object = {}) {
    setBusy(true); setErr(null); setOk(null);
    try {
      const r = await api<{ status?: string }>(`/api/technician/bookings/${job.id}`, { method: 'PATCH', body: JSON.stringify({ action, ...body }) });
      setOk(r.status ? `Status → ${r.status}` : action === 'media' ? 'Photo attached' : 'Note saved');
      if (r.status) setTimeout(() => location.reload(), 900);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  async function capture() {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await up.json();
      if (!up.ok) throw new Error(j.error ?? 'Upload failed');
      setMedia((m) => [...m, j.path]);
      await call('media', { path: j.path });
    } catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed'); setBusy(false); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  }

  return (
    <article className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-mist px-4 py-2.5 dark:bg-navy-700">
        <p className="font-mono text-xs font-extrabold text-navy dark:text-white">{job.bookingNo} · {new Date(job.date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}</p>
        <div className="flex gap-1.5">
          {job.urgency !== 'STANDARD' && <Badge tone="danger">{job.urgency}</Badge>}
          <Badge tone={bookTone[job.status] ?? 'soft'}>{job.status.replace('_', ' ')}</Badge>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <p className="font-display text-base font-extrabold text-navy dark:text-white">{job.serviceName} <span className="ml-1 text-sm font-bold text-blue">{job.timeSlot}</span></p>
        <p className="text-sm"><span className="font-bold">{job.contactName}</span> · <a className="text-blue underline" href={`tel:${job.contactPhone}`}>{job.contactPhone}</a></p>
        <p className="text-xs text-soft">{job.region} · {addr || job.city}</p>
        {job.gps && <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-block rounded-lg bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">GPS {job.gps} — open Maps</a>}
        <p className="rounded-lg bg-mist p-2.5 text-xs leading-relaxed text-soft dark:bg-navy-700">{job.description.slice(0, 300)}</p>
        {media.length > 0 && <div className="flex gap-2">{media.slice(-4).map((m) => <a key={m} href={m} target="_blank" rel="noreferrer"><img src={m} alt="job photo" className="h-12 w-12 rounded-lg border border-line object-cover" /></a>)}</div>}
        <p className="text-[11px] font-bold text-soft">Quote {ghs(job.price)} · {job.paymentMode === 'AFTER' ? 'collect after work' : job.paymentMode === 'FULL' ? 'paid in full' : `deposit due ${ghs(job.depositDue)}`}</p>

        {err && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{err}</p>}
        {ok && <p className="rounded-lg bg-success/10 px-3 py-2 text-xs font-bold text-success">{ok}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          {next && (
            <button disabled={busy} onClick={() => call('status')} className={`${next === 'COMPLETED' ? 'btn-gold' : 'btn-primary'} flex-1 px-3 py-2.5 text-sm`}>
              {busy && next === 'COMPLETED' ? 'Saving…' : NEXT_LABEL[next]}
            </button>
          )}
          {(job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') && (
            <button disabled={busy} onClick={() => setOpen(!open)} className="btn-ghost px-3 py-2.5 text-sm">{open ? 'Hide tools' : 'Photos & payment'}</button>
          )}
        </div>

        {open && (
          <div className="mt-2 space-y-3 rounded-xl border border-line p-3">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-soft">Before/after photos</p>
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="block w-full text-xs" />
                <button disabled={busy} onClick={capture} className="btn-primary shrink-0 px-3 py-1.5 text-xs">Attach</button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-soft">Site note (appends with timestamp)</p>
              <div className="flex gap-2">
                <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. DB needs RCBO on ring 2" />
                <button disabled={busy || note.length < 3} onClick={() => { call('note', { note }); setNote(''); }} className="btn-ghost shrink-0 px-3 py-1.5 text-xs">Save</button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-soft">Collect payment</p>
              {!pay ? (
                <div className="flex gap-2">
                  <input className={inputCls} type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <button disabled={busy} className="btn-gold shrink-0 px-3 py-1.5 text-xs" onClick={async () => {
                    setBusy(true); setErr(null);
                    try { const r = await api<{ url: string; code: string }>(`/api/technician/bookings/${job.id}/pay`, { method: 'POST', body: JSON.stringify({ amount: Number(amount) }) }); setPay(r); }
                    catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
                    finally { setBusy(false); }
                  }}>Create link</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <QrBox url={pay.url} />
                  <p className="break-all font-mono text-xs font-bold text-blue">{pay.url}</p>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton text={pay.url} label="Copy link" />
                    <button className="px-3 py-1.5 text-xs font-bold text-white" style={{ background: '#12B76A', borderRadius: 10 }} onClick={() => waShare(`GabiElectricals — pay for job ${job.bookingNo} (${ghs(Number(amount))}): ${pay.url}`)}>Send on WhatsApp</button>
                    <a href={`sms:${job.contactPhone}?body=${encodeURIComponent(`Pay ${job.bookingNo}: ${pay.url}`)}`} className="btn-ghost px-3 py-1.5 text-xs">SMS</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
