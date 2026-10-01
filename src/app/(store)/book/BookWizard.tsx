'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { Icon } from '@/components/Icon';
import { ghs } from '@/lib/money';

type Svc = { slug: string; name: string; base: number; dur: number; image: string | null; shortDesc: string };
type Biz = { name: string; phone: string; whatsapp: string; hours: string };
type SlotDay = {
  date: string; weekday: number; blocked: boolean; blockedReason?: string;
  slots: { slot: string; capacity: number; booked: number; remaining: number }[];
  totalRemaining: number;
};
type Estimate = { base: number; surcharge: number; total: number; deposit: number; depositPct: number; serviceName: string };

const STEPS = ['Service', 'Date & slot', 'Address', 'Urgency', 'Contact', 'Payment'] as const;
const REGIONS: Record<string, string[]> = {
  'Greater Accra': ['Accra', 'Tema', 'Spintex', 'East Legon', 'Madina', 'Adenta', 'Achimota', 'Kasoa', 'Lashon', 'Amanfrom'],
  Ashanti: ['Kumasi', 'Ejisu', 'Obuasi', 'Onyaso'],
  Western: ['Takoradi', 'Sekondi', 'Axim', 'Tarkwa'],
  Northern: ['Tamale', 'Yendi', 'Savelugu'],
  Central: ['Cape Coast', 'Winneba', 'Mankessim', 'Swedru'],
  Eastern: ['Koforidua', 'Nkawkaw', 'Suhum', 'Aburi'],
  Volta: ['Ho', 'Keta', 'Aflao', 'Hohoe'],
  'Upper East': ['Bolgatanga', 'Bawku', 'Navrongo'],
  'Upper West': ['Wa', 'Tumu'],
  Bono: ['Sunyani', 'Techiman', 'Dormaa Ahenkro'],
  'Bono East': ['Kpong', 'Nkorsu'],
  Ahafo: ['Goaso', 'Bechem'],
  Savannah: ['Damongo', 'Salaga'],
  'North East': ['Nalerigu', 'Walewale'],
  'Western North': ['Sefwi Wiawso', 'Bibiani'],
  'Oti': ['Dambai', 'Jasikan'],
};
const URGS = [
  { key: 'STANDARD', title: 'Standard', blurb: 'Next open appointment — best value', icon: '🗓️' },
  { key: 'URGENT', title: 'Urgent', blurb: 'Priority routing, same/next day where possible', icon: '🕐' },
  { key: 'EMERGENCY', title: 'Emergency', blurb: 'Top of the queue incl. nights — we roll fast', icon: '🚨' },
] as const;
const PAY_MODES = [
  { key: 'DEPOSIT', title: 'Deposit (30%)', blurb: 'Lock the slot now, balance after the job' },
  { key: 'FULL', title: 'Pay in full', blurb: 'Settle everything up-front' },
  { key: 'AFTER', title: 'Pay after service', blurb: 'No upfront — card on file, pay on completion' },
  { key: 'QUOTE', title: 'Request a quote', blurb: 'Big job? We survey and send a fixed written quote' },
] as const;
const PAY_METHODS = [
  { key: 'MOMO_MTN', label: 'MTN MoMo' }, { key: 'MOMO_TELECEL', label: 'Telecel Cash' }, { key: 'MOMO_AT', label: 'AT Money' },
  { key: 'QR', label: 'GhQR / Scan to pay' }, { key: 'CARD', label: 'Visa / Mastercard' },
] as const;

const GH_PHONE = /^(\+?233|0)(24|25|54|55|59|27|26|2\d|3\d)[0-9]{7}$/;
const GPS_HINT = /^[A-Z]{2}-?\d{1,4}-?\d{1,5}$/i;

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WD[dt.getDay()]} ${d} ${MON[m - 1]}`;
}

export default function BookWizard({ initialService, services, business }: { initialService: string | null; services: Svc[]; business: Biz }) {
  const router = useRouter();
  const toast = useToast();
  const sp = useSearchParams();
  const [step, setStep] = useState(0);

  const [serviceSlug, setServiceSlug] = useState<string | null>(initialService && services.some(s => s.slug === initialService) ? initialService : initialService);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [days, setDays] = useState<SlotDay[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsErr, setSlotsErr] = useState<string | null>(null);

  const [region, setRegion] = useState('Greater Accra');
  const [city, setCity] = useState('Accra');
  const [landmark, setLandmark] = useState('');
  const [gps, setGps] = useState('');
  const [desc, setDesc] = useState('');
  const [media, setMedia] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [urgency, setUrgency] = useState<'STANDARD' | 'URGENT' | 'EMERGENCY'>('STANDARD');
  const [est, setEst] = useState<Estimate | null>(null);
  const [estLoading, setEstLoading] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [payMode, setPayMode] = useState<'DEPOSIT' | 'FULL' | 'AFTER' | 'QUOTE'>('DEPOSIT');
  const [payMethod, setPayMethod] = useState<string>('MOMO_MTN');
  const [submitting, setSubmitting] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const svc = useMemo(() => services.find(s => s.slug === serviceSlug) ?? null, [services, serviceSlug]);

  // ── availability fetch ──
  const from = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const loadSlots = useCallback(async () => {
    if (!serviceSlug) return;
    setSlotsLoading(true); setSlotsErr(null);
    try {
      const r = await fetch(`/api/slots?service=${serviceSlug}&from=${from}&days=14`);
      if (!r.ok) throw new Error();
      const j = await r.json();
      setDays(j.dates as SlotDay[]);
    } catch { setSlotsErr('Could not load availability. Check your connection and retry.'); setDays(null); }
    finally { setSlotsLoading(false); }
  }, [serviceSlug, from]);
  useEffect(() => { if (step === 1) loadSlots(); }, [step, loadSlots]);

  // ── estimate fetch (server-side price authority) ──
  const loadEst = useCallback(async () => {
    if (!serviceSlug) return;
    setEstLoading(true);
    try {
      const r = await fetch(`/api/bookings/estimate?service=${serviceSlug}&urgency=${urgency}`);
      if (r.ok) setEst(await r.json()); else setEst(null);
    } catch { setEst(null); } finally { setEstLoading(false); }
  }, [serviceSlug, urgency]);
  useEffect(() => { loadEst(); }, [loadEst]);

  function err(k: string, msg: string | null) { setErrs(e => { const n = { ...e }; if (msg) n[k] = msg; else delete n[k]; return n; }); }

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 0 && !serviceSlug) e.step = 'Choose a service to continue';
    if (step === 1 && (!date || !slot)) e.step = 'Pick a date and time slot';
    if (step === 2) {
      if (!city.trim()) e.city = 'City/town is required';
      if (desc.trim().length < 10) e.desc = 'Describe the job in at least 10 characters';
      if (gps.trim() && !GPS_HINT.test(gps.trim())) e.gps = 'Use Ghana Post GPS format, e.g. GA-123-4567';
    }
    if (step === 4) {
      if (name.trim().length < 2) e.name = 'Enter your full name';
      if (!GH_PHONE.test(phone.replace(/\s/g, ''))) e.phone = 'Enter a valid Ghana number (024…, 054…, +232…)';
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email or leave it blank';
    }
    setErrs(e);
    if (Object.keys(e).length) { toast(Object.values(e)[0], 'err'); return false; }
    return true;
  }

  async function onSubmit() {
    if (!validateStep() || !serviceSlug || !date || !slot) return;
    setSubmitting(true);
    try {
      const r = await fetch('/api/bookings/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceSlug, date, timeSlot: slot, urgency, region, city: city.trim(),
          landmark: landmark.trim() || undefined, gps: gps.trim() || undefined,
          description: desc.trim(), media,
          contactName: name.trim(), contactPhone: phone.replace(/\s/g, ''), contactEmail: email.trim() || undefined,
          paymentMode: payMode,
          payMethod: payMode === 'DEPOSIT' || payMode === 'FULL' ? payMethod : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) { toast(j.error ?? 'Something went wrong — try again', 'err'); setSubmitting(false); return; }
      router.push(j.redirect ?? `/booking/${j.bookingNo}`);
    } catch {
      toast('Network error — your booking was not submitted. Try again.', 'err');
      setSubmitting(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const okTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'];
    setUploading(true);
    for (const f of Array.from(files).slice(0, 8 - media.length)) {
      if (f.size > 20 * 1024 * 1024) { toast(`${f.name}: over 20MB — skipped`, 'err'); continue; }
      if (!okTypes.includes(f.type)) { toast(`${f.name}: unsupported type — skipped`, 'err'); continue; }
      try {
        const fd = new FormData(); fd.append('file', f);
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        const j = await r.json();
        if (r.ok) setMedia(m => [...m, j.path]); else toast(j.error ?? 'Upload failed', 'err');
      } catch { toast(`Could not upload ${f.name}`, 'err'); }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  const activeDates = (days ?? []).filter(d => !d.blocked && d.totalRemaining > 0);

  return (
    <div className="container-x py-6 md:py-10 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue">Book a service</p>
        <h1 className="font-display text-2xl md:text-4xl font-extrabold mt-1">
          {svc ? svc.name : 'Certified electricians, on your schedule'}
        </h1>
        <p className="text-[13.5px] text-soft mt-1.5">
          {business.hours} · Call {business.phone} anytime · Warranty on every job
        </p>
      </div>

      {/* Progress */}
      <nav aria-label="Booking progress" className="mb-6 overflow-x-auto">
        <ol className="flex gap-1.5 min-w-[560px]">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <button type="button" aria-current={i === step ? 'step' : undefined}
                disabled={i > step || !serviceSlug}
                onClick={() => { if (i < step) setStep(i); }}
                className={`w-full rounded-lg px-2 py-2 text-[11px] md:text-[12px] font-bold border transition-colors ${
                  i === step ? 'bg-navy text-white border-navy' :
                  i < step ? 'bg-success/10 text-success border-success/30' :
                  'bg-white text-soft border-line'}`}>
                <span aria-hidden="true" className="mr-1">{i < step ? '✓' : i + 1}</span>{s}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="card p-4 md:p-6" aria-live="polite">
        {/* ── STEP 1: service ── */}
        {step === 0 && (
          <fieldset>
            <legend className="font-display font-extrabold text-lg mb-3">What do you need done?</legend>
            <div className="grid sm:grid-cols-2 gap-3">
              {services.map(s => (
                <label key={s.slug} className={`card p-3.5 flex gap-3 cursor-pointer hover:border-blue transition-colors ${serviceSlug === s.slug ? 'border-blue ring-2 ring-blue/25' : ''}`}>
                  <input type="radio" name="service" value={s.slug} checked={serviceSlug === s.slug}
                    onChange={() => { setServiceSlug(s.slug); setDate(null); setSlot(null); }} className="mt-1 accent-blue" />
                  <span className="min-w-0">
                    <span className="block font-bold text-[13.5px] leading-snug">{s.name}</span>
                    <span className="block text-[12px] text-soft mt-0.5 line-clamp-2">{s.shortDesc}</span>
                    <span className="block text-[12px] font-extrabold text-gold-dark mt-1">From {ghs(s.base, { cents: false })} · ~{Math.max(1, Math.round(s.dur / 60))}h</span>
                  </span>
                </label>
              ))}
            </div>
            {errs.step && <p role="alert" className="text-danger text-[13px] font-bold mt-3">{errs.step}</p>}
          </fieldset>
        )}

        {/* ── STEP 2: date + slot ── */}
        {step === 1 && (
          <div>
            <h2 className="font-display font-extrabold text-lg mb-1">Pick a date &amp; time window</h2>
            <p className="text-[13px] text-soft mb-4">Showing 14 days for {svc?.name}. Slots fill up fast in Accra — morning windows go first.</p>
            {slotsLoading && (
              <div className="space-y-3" aria-busy="true" aria-label="Loading availability">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex gap-2">
                    <div className="skeleton h-16 w-28" /><div className="skeleton h-16 flex-1" />
                  </div>
                ))}
              </div>
            )}
            {slotsErr && (
              <div className="text-center py-8">
                <p role="alert" className="text-danger font-bold text-[14px]">{slotsErr}</p>
                <button onClick={loadSlots} className="btn-ghost mt-3 px-4 py-2 text-[13px]">Retry</button>
              </div>
            )}
            {!slotsLoading && !slotsErr && days && (
              <>
                {activeDates.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-3xl mb-2" aria-hidden="true">😔</p>
                    <p className="font-bold">No open slots in the next 14 days</p>
                    <p className="text-[13px] text-soft mt-1">Need help sooner? Emergency call-out is 24/7.</p>
                    <div className="mt-4 flex justify-center gap-2 flex-wrap">
                      <button onClick={loadSlots} className="btn-ghost px-4 py-2 text-[13px]">Refresh</button>
                      <Link href="/book?service=emergency-callout" className="btn-gold px-4 py-2 text-[13px]">Emergency call-out</Link>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-[190px_1fr] gap-4">
                    <div className="flex md:flex-col gap-2 overflow-x-auto pb-1 md:pb-0" role="listbox" aria-label="Available dates">
                      {days.filter(d => !d.blocked).map(d => (
                        <button key={d.date} role="option" aria-selected={date === d.date} disabled={d.totalRemaining === 0}
                          onClick={() => { setDate(d.date); setSlot(null); }}
                          className={`shrink-0 md:w-full text-left rounded-xl border px-3 py-2 text-[12.5px] font-bold transition-colors ${
                            date === d.date ? 'bg-blue text-white border-blue' : d.totalRemaining === 0 ? 'bg-mist text-soft/60 border-line cursor-not-allowed' : 'bg-white border-line hover:border-blue'}`}>
                          {fmtDate(d.date)}
                          <span className={`block text-[10.5px] font-semibold ${date === d.date ? 'text-white/80' : 'text-soft'}`}>
                            {d.totalRemaining > 0 ? `${d.totalRemaining} slots left` : 'Full'}
                          </span>
                        </button>
                      ))}
                      {days.filter(d => d.blocked).map(d => (
                        <div key={d.date} className="shrink-0 md:w-full rounded-xl border border-dashed border-line px-3 py-2 text-[12px] text-soft/70" title={d.blockedReason}>
                          {fmtDate(d.date)}<span className="block text-[10px]">Closed — {d.blockedReason ?? 'unavailable'}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      {!date ? <p className="text-[13.5px] text-soft italic py-6">← Select a date to see time windows</p> : (
                        <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Time slots">
                          {days.find(d => d.date === date)?.slots.map(sl => (
                            <button key={sl.slot} disabled={sl.remaining === 0} aria-pressed={slot === sl.slot}
                              onClick={() => setSlot(sl.slot)}
                              className={`rounded-xl border px-3 py-3 text-center transition-colors ${
                                slot === sl.slot ? 'bg-navy text-white border-navy' : sl.remaining === 0 ? 'bg-mist text-soft/60 border-line line-through cursor-not-allowed' : 'bg-white border-line hover:border-blue'}`}>
                              <span className="block font-bold text-[13.5px]">{sl.slot}</span>
                              <span className={`block text-[11px] font-semibold mt-0.5 ${slot === sl.slot ? 'text-white/75' : sl.remaining <= 1 ? 'text-danger' : 'text-success'}`}>
                                {sl.remaining === 0 ? 'Fully booked' : `${sl.remaining} of ${sl.capacity} left`}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {errs.step && step === 1 && <p role="alert" className="text-danger text-[13px] font-bold mt-3">{errs.step}</p>}
          </div>
        )}

        {/* ── STEP 3: address ── */}
        {step === 2 && (
          <div>
            <h2 className="font-display font-extrabold text-lg mb-4">Where is the job?</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="region" className="block text-[12.5px] font-bold mb-1">Region <span className="text-danger">*</span></label>
                <select id="region" value={region} onChange={e => { setRegion(e.target.value); setCity(REGIONS[e.target.value]?.[0] ?? ''); }}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] focus:border-blue">
                  {Object.keys(REGIONS).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="city" className="block text-[12.5px] font-bold mb-1">City / Town <span className="text-danger">*</span></label>
                <input id="city" list="cities" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Spintex"
                  className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]" />
                <datalist id="cities">{(REGIONS[region] ?? []).map(c => <option key={c} value={c} />)}</datalist>
                {errs.city && <p role="alert" className="text-danger text-[12px] font-bold mt-1">{errs.city}</p>}
              </div>
              <div>
                <label htmlFor="landmark" className="block text-[12.5px] font-bold mb-1">Nearest landmark</label>
                <input id="landmark" value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="e.g. Red gate beside pharmacy"
                  className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]" />
              </div>
              <div>
                <label htmlFor="gps" className="block text-[12.5px] font-bold mb-1">Ghana Post GPS <span className="text-soft font-normal">(optional)</span></label>
                <input id="gps" value={gps} onChange={e => setGps(e.target.value)} placeholder="GA-123-4567" aria-describedby="gps-help"
                  className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] uppercase" />
                <p id="gps-help" className="text-[11px] text-soft mt-1">Find it on the Ghana Post GPS app — helps the tech arrive fast.</p>
                {errs.gps && <p role="alert" className="text-danger text-[12px] font-bold mt-1">{errs.gps}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="desc" className="block text-[12.5px] font-bold mb-1">Describe the job <span className="text-danger">*</span></label>
                <textarea id="desc" rows={4} value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="e.g. Two bedroom sockets spark when the kettle is on, board trips at night…"
                  className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]" />
                {errs.desc && <p role="alert" className="text-danger text-[12px] font-bold mt-1">{errs.desc}</p>}
              </div>
              <div className="sm:col-span-2">
                <span className="block text-[12.5px] font-bold mb-1">Photos / videos <span className="text-soft font-normal">(optional — huge help)</span></span>
                <div className="flex flex-wrap gap-2 items-center">
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || media.length >= 8}
                    className="btn-ghost px-4 py-2 text-[13px]">{uploading ? 'Uploading…' : '+ Add media'} (≤ 20MB)</button>
                  <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                    className="sr-only" aria-label="Upload photos or videos of the job" onChange={e => handleFiles(e.target.files)} />
                </div>
                {media.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="Uploaded media">
                    {media.map(m => (
                      <li key={m} className="relative group">
                        {/\.(mp4|mov|webm)$/i.test(m)
                          ? <span className="flex h-16 w-24 items-center justify-center rounded-lg bg-navy text-white text-[11px] font-bold">🎞 video</span>
                          :   <img src={m} alt="Uploaded job photo" className="h-16 w-24 rounded-lg object-cover border border-line" />}
                        <button type="button" aria-label="Remove upload" onClick={() => setMedia(x => x.filter(p => p !== m))}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-danger text-white text-[10px] font-black opacity-90">×</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: urgency ── */}
        {step === 3 && (
          <div>
            <h2 className="font-display font-extrabold text-lg mb-1">How urgent is it?</h2>
            <p className="text-[13px] text-soft mb-4">Surcharge is fixed per job and shown here — final price always confirmed on-screen before you pay.</p>
            <fieldset className="space-y-3">
              <legend className="sr-only">Urgency level</legend>
              {URGS.map(u => (
                <label key={u.key} className={`card flex items-center gap-3 p-4 cursor-pointer transition-colors ${urgency === u.key ? 'border-blue ring-2 ring-blue/25' : 'hover:border-blue/50'}`}>
                  <input type="radio" name="urgency" value={u.key} checked={urgency === u.key} onChange={() => setUrgency(u.key)} className="accent-blue" />
                  <span aria-hidden="true" className="text-2xl">{u.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-[14.5px]">{u.title}</span>
                    <span className="block text-[12.5px] text-soft">{u.blurb}</span>
                  </span>
                  <span className="text-right shrink-0">
                    {estLoading && !est ? <span className="skeleton inline-block h-4 w-16" /> : est ? (
                      u.key === 'STANDARD'
                        ? <span className="text-success text-[13px] font-black">No fee</span>
                        : <>
                          <span className="block text-[13px] font-black text-danger">+{ghs(est.surcharge)}</span>
                          <span className="block text-[11px] text-soft">+{Math.round((est.surcharge / est.base) * 100)}%</span>
                        </>
                    ) : <span className="text-soft text-[12px]">—</span>}
                  </span>
                </label>
              ))}
            </fieldset>
            {est && !estLoading && (
              <div className="mt-4 rounded-xl bg-navy text-white p-4 text-[13.5px]">
                <div className="flex justify-between"><span>{est.serviceName} base</span><b>{ghs(est.base)}</b></div>
                <div className="flex justify-between mt-1"><span>Urgency: {URGS.find(u => u.key === urgency)?.title}</span><b>{est.surcharge ? '+' : ''}{ghs(est.surcharge)}</b></div>
                <div className="border-t border-white/20 mt-2 pt-2 flex justify-between font-extrabold text-gold text-[15px]"><span>Job total</span><span>{ghs(est.total)}</span></div>
                <div className="flex justify-between text-[12px] text-white/70 mt-1"><span>Deposit to book ({est.depositPct}%)</span><span>{ghs(est.deposit)}</span></div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: contact ── */}
        {step === 4 && (
          <div>
            <h2 className="font-display font-extrabold text-lg mb-4">Your contact details</h2>
            <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
              <div className="sm:col-span-2">
                <label htmlFor="cname" className="block text-[12.5px] font-bold mb-1">Full name <span className="text-danger">*</span></label>
                <input id="cname" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Kofi Owusu"
                  className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]" />
                {errs.name && <p role="alert" className="text-danger text-[12px] font-bold mt-1">{errs.name}</p>}
              </div>
              <div>
                <label htmlFor="cphone" className="block text-[12.5px] font-bold mb-1">Phone (Ghana) <span className="text-danger">*</span></label>
                <input id="cphone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="024 123 4567"
                  aria-describedby="phone-help" className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]" />
                <p id="phone-help" className="text-[11px] text-soft mt-1">MTN/Telecel/AT numbers: 024, 025, 054, 055, 059, 020, 027…</p>
                {errs.phone && <p role="alert" className="text-danger text-[12px] font-bold mt-1">{errs.phone}</p>}
              </div>
              <div>
                <label htmlFor="cemail" className="block text-[12.5px] font-bold mb-1">Email <span className="text-soft font-normal">(optional)</span></label>
                <input id="cemail" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]" />
                {errs.email && <p role="alert" className="text-danger text-[12px] font-bold mt-1">{errs.email}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 6: payment ── */}
        {step === 5 && (
          <div>
            <h2 className="font-display font-extrabold text-lg mb-4">How would you like to pay?</h2>
            <fieldset className="grid sm:grid-cols-2 gap-3 mb-5">
              <legend className="sr-only">Payment mode</legend>
              {PAY_MODES.map(pm => (
                <label key={pm.key} className={`card p-4 flex gap-3 cursor-pointer transition-colors ${payMode === pm.key ? 'border-blue ring-2 ring-blue/25' : 'hover:border-blue/50'}`}>
                  <input type="radio" name="paymode" checked={payMode === pm.key} onChange={() => setPayMode(pm.key)} className="mt-1 accent-blue" />
                  <span>
                    <span className="block font-bold text-[14px]">{pm.title}</span>
                    <span className="block text-[12px] text-soft mt-0.5">{pm.blurb}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            {(payMode === 'DEPOSIT' || payMode === 'FULL') && (
              <fieldset className="mb-5">
                <legend className="text-[12.5px] font-bold mb-2">Choose a method</legend>
                <div className="flex flex-wrap gap-2">
                  {PAY_METHODS.map(m => (
                    <button key={m.key} type="button" aria-pressed={payMethod === m.key} onClick={() => setPayMethod(m.key)}
                      className={`rounded-xl border px-3.5 py-2 text-[13px] font-bold transition-colors ${payMethod === m.key ? 'bg-blue text-white border-blue' : 'bg-white border-line hover:border-blue'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {est && (
              <div className="rounded-xl bg-mist dark:bg-navy-700 border border-line p-4 text-[13.5px] space-y-1.5">
                <p className="font-display font-extrabold text-[14px]">Price summary <span className="text-[10.5px] font-semibold text-soft normal-case">(calculated on our servers)</span></p>
                <div className="flex justify-between"><span className="text-soft">{est.serviceName}</span><span>{ghs(est.base)}</span></div>
                <div className="flex justify-between"><span className="text-soft">{urgency !== 'STANDARD' ? `${URGS.find(u => u.key === urgency)?.title} surcharge` : 'Standard scheduling'}</span><span>{est.surcharge ? '+ ' + ghs(est.surcharge) : '—'}</span></div>
                <div className="flex justify-between font-extrabold text-[15px] pt-1 border-t border-line"><span>Total job price</span><span>{ghs(est.total)}</span></div>
                <div className="flex justify-between"><span className="text-soft">Due now ({payMode === 'FULL' ? 'full' : payMode === 'DEPOSIT' ? `${est.depositPct}% deposit` : payMode === 'AFTER' ? 'nothing today' : 'quote first'})</span>
                  <b className="text-gold-dark">{payMode === 'DEPOSIT' ? ghs(est.deposit) : payMode === 'FULL' ? ghs(est.total) : ghs(0)}</b></div>
                <div className="flex justify-between text-[12px] text-soft"><span>When</span><span>{date && fmtDate(date)} · {slot}</span></div>
                <div className="flex justify-between text-[12px] text-soft"><span>Where</span><span>{city}, {region}</span></div>
              </div>
            )}
            {estLoading && <div className="skeleton h-24 w-full mt-3" aria-label="Loading price" />}
            <p className="text-[11.5px] text-soft mt-3">
              By booking you agree to our service terms. Free reschedule up to 24h before — deposits transfer to the new date.
            </p>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex justify-between gap-3 mt-6 pt-4 border-t border-line">
          {step > 0
            ? <button type="button" onClick={() => setStep(s => s - 1)} className="btn-ghost px-5 py-2.5 text-[14px]">← Back</button>
            : <Link href="/services" className="btn-ghost px-5 py-2.5 text-[14px]">Browse services</Link>}
          {step < 5
            ? <button type="button" onClick={() => { if (validateStep()) setStep(s => s + 1); }} className="btn-primary px-6 py-2.5 text-[14px] link-nudge">Continue <Icon name="arrow_forward" size={17} /></button>
            : <button type="button" onClick={onSubmit} disabled={submitting || !est}
                className="btn-gold px-6 py-3 text-[15px] min-w-[180px]">
                {submitting ? 'Creating booking…' : urgency === 'EMERGENCY' ? '🚨 Confirm emergency booking' : 'Confirm booking'}
              </button>}
        </div>
      </div>

      {/* Trust strip */}
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-soft">
        <span className="inline-flex items-center gap-1"><Icon name="check_circle" size={14} className="text-success" /> Certified techs</span><span className="inline-flex items-center gap-1"><Icon name="check_circle" size={14} className="text-success" /> Warranty included</span><span className="inline-flex items-center gap-1"><Icon name="check_circle" size={14} className="text-success" /> No hidden charges</span>
      </div>
    </div>
  );
}
