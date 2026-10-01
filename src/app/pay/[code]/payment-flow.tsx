'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ghs } from '@/lib/money';
import { Icon } from '@/components/Icon';

type LinkInfo = {
  code: string; label: string; description: string | null; amount: number; flexible: boolean;
  status: string; paid: number; expiresAt: string | null;
};
type Init = {
  reference: string; status: string; prompt?: string; qrPayload?: string;
  pollUrl: string; expiresAt?: string; amount: number;
};

const METHODS = [
  { id: 'MOMO_MTN', name: 'MTN MoMo', kind: 'dot' as const, color: '#FFCC00', hint: 'Prompt sent to your phone' },
  { id: 'MOMO_TELECEL', name: 'Telecel Cash', kind: 'dot' as const, color: '#E4002B', hint: 'Prompt sent to your phone' },
  { id: 'MOMO_AT', name: 'AT Money', kind: 'dot' as const, color: '#00A651', hint: 'Prompt sent to your phone' },
  { id: 'CARD', name: 'Visa / Mastercard', kind: 'icon' as const, icon: 'credit_card', hint: 'Sandbox hosted card' },
  { id: 'QR', name: 'Scan & Pay (QR)', kind: 'icon' as const, icon: 'qr_code', hint: 'QR expires in 15 min' },
  { id: 'BANK_TRANSFER', name: 'Bank transfer / GhIPSS', kind: 'icon' as const, icon: 'account_balance', hint: 'Instant bank rails' },
  { id: 'MANUAL_TRANSFER', name: 'Manual transfer + proof', kind: 'icon' as const, icon: 'receipt_long', hint: 'Approved by our team' },
] as const;

export function PaymentFlow({ link }: { link: LinkInfo }) {
  const [step, setStep] = useState<'choose' | 'details' | 'paying' | 'done' | 'failed' | 'awaiting'>('choose');
  const [method, setMethod] = useState<(typeof METHODS)[number]['id']>('MOMO_MTN');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [init, setInit] = useState<Init | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [qrImg, setQrImg] = useState('');
  const [secsLeft, setSecsLeft] = useState(0);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const balance = link.flexible ? 0 : Math.max(0, link.amount - link.paid);
  const shown = link.flexible ? (parseFloat(customAmount || '0') || 0) : balance;

  const stopPolling = () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; };
  useEffect(() => stopPolling, []);

  const poll = useCallback((reference: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/payments/status/${reference}`);
        if (!r.ok) return;
        const j = await r.json();
        if (j.status === 'PAID') { stopPolling(); setStep('done'); }
        if (j.status === 'FAILED') { stopPolling(); setStep('failed'); }
        if (j.status === 'EXPIRED') { stopPolling(); setStep('failed'); setError('QR expired — regenerate and try again.'); }
        if (j.status === 'AWAITING_APPROVAL') { stopPolling(); setStep('awaiting'); }
      } catch { /* keep polling */ }
    }, 2500);
  }, []);

  async function start() {
    setBusy(true); setError('');
    try {
      const body: Record<string, unknown> = { method, phone: phone || undefined, email: email || undefined };
      if (link.flexible) body.amount = parseFloat(customAmount);
      const r = await fetch(`/api/paylinks/${link.code}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) { setError(j.error ?? 'Something went wrong.'); setBusy(false); return; }
      setInit(j as Init);
      if ((j as Init).status === 'AWAITING_APPROVAL') { setStep('awaiting'); setBusy(false); return; }
      setStep('paying');
      poll(j.reference);
      if (method === 'QR' && (j as Init).qrPayload) {
        const q = await fetch(`/api/payments/qr?text=${encodeURIComponent((j as Init).qrPayload!)}`);
        const qj = await q.json();
        setQrImg(qj.dataUrl ?? '');
        const ttl = j.expiresAt ? Math.max(0, Math.floor((new Date(j.expiresAt).getTime() - Date.now()) / 1000)) : 900;
        setSecsLeft(ttl);
      }
    } catch {
      setError('Network error — check your connection and retry.');
    }
    setBusy(false);
  }

  useEffect(() => {
    if (secsLeft <= 0) return;
    const t = setInterval(() => setSecsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secsLeft, init?.reference]);

  async function simulate(outcome: 'success' | 'pending' | 'fail') {
    if (!init) return;
    await fetch('/api/payments/sandbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: init.reference, outcome }) });
  }

  async function uploadProof() {
    if (!proofFile || !init) { setError('Attach a screenshot or photo of your transfer receipt.'); return; }
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', proofFile);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      const upj = await up.json();
      if (!up.ok) { setError(upj.error ?? 'Upload failed.'); setBusy(false); return; }
      const r = await fetch('/api/payments/proof', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: init.reference, proofPath: upj.path ?? upj.url }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error ?? 'Could not submit proof.'); setBusy(false); return; }
      setStep('awaiting');
    } catch { setError('Network error.'); }
    setBusy(false);
  }

  if (link.status !== 'ACTIVE') {
    return (
      <div className="card p-8 text-center">
        <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-danger/10 text-danger"><Icon name="block" size={32} /></span>
        <h1 className="font-display font-extrabold text-xl text-navy dark:text-white mb-1">Link {link.status.toLowerCase()}</h1>
        <p className="text-soft text-sm">This payment link is {link.status === 'PAID' ? 'already paid in full' : 'no longer active'}. {link.label}</p>
      </div>
    );
  }
  if (step === 'done') {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-success/15 flex items-center justify-center mb-4">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="text-success"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1 className="font-display font-extrabold text-2xl text-navy dark:text-white inline-flex items-center gap-2 justify-center">Payment received <Icon name="bolt" size={22} /></h1>
        <p className="text-soft mt-1 mb-4">{ghs(init?.amount ?? shown)} · {link.label}</p>
        <dl className="text-sm bg-mist dark:bg-white/5 rounded-xl p-4 text-left space-y-2 mb-5">
          <div className="flex justify-between"><dt className="text-soft">Reference</dt><dd className="font-mono font-bold text-navy dark:text-white">{init?.reference}</dd></div>
          <div className="flex justify-between"><dt className="text-soft">Paid via</dt><dd className="font-bold text-navy dark:text-white">{METHODS.find(m => m.id === method)?.name}</dd></div>
          <div className="flex justify-between"><dt className="text-soft">Date</dt><dd className="font-bold text-navy dark:text-white">{new Date().toLocaleString('en-GH')}</dd></div>
        </dl>
        <a className="btn-gold w-full" href={'https://wa.me/233241002030?text=' + encodeURIComponent('Payment ' + (init?.reference ?? '') + ' (' + ghs(init?.amount ?? shown) + ') sent to GabiElectricals — ' + link.label)} target="_blank" rel="noreferrer">Send receipt to WhatsApp</a>
      </div>
    );
  }
  if (step === 'awaiting') {
    return (
      <div className="card p-8 text-center">
        <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-volt/15 text-navy dark:text-volt"><Icon name="receipt_long" size={32} /></span>
        <h1 className="font-display font-extrabold text-xl text-navy dark:text-white">Proof submitted — awaiting approval</h1>
        <p className="text-soft text-sm mt-2 mb-4">Our team will verify the transfer against reference <span className="font-mono font-bold">{init?.reference}</span> and confirm shortly (usually under 30 minutes, 8am–8pm).</p>
        <p className="text-xs text-soft">Transfer to: <b>GabiElectricals Ltd · GCB Bank · Accra Main · Acc. 1020304050</b> — put the reference in the note.</p>
      </div>
    );
  }
  if (step === 'paying' && init) {
    const isQr = method === 'QR';
    return (
      <div className="card p-6 sm:p-8">
        <h1 className="font-display font-extrabold text-xl text-navy dark:text-white mb-1">Waiting for payment…</h1>
        <p className="text-soft text-sm mb-5">{ghs(init.amount)} · {link.label} · Ref <span className="font-mono">{init.reference}</span></p>

        {isQr && (
          <div className="text-center mb-5">
            {qrImg ? <img src={qrImg} alt={'Payment QR for ' + link.label} className="mx-auto w-56 h-56 rounded-xl border border-line" /> : <div className="skeleton h-56 w-56 mx-auto rounded-xl" />}
            <p className="mt-3 text-sm font-bold text-navy dark:text-white">
              {secsLeft > 0 ? `Expires in ${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, '0')}` : 'Expired'}
            </p>
            {secsLeft === 0 && <button onClick={() => { setQrImg(''); start(); }} className="btn-primary mt-2 !py-2 text-sm">Regenerate QR</button>}
            <p className="text-xs text-soft mt-2">Open any MoMo / bank app, scan, and approve.</p>
          </div>
        )}
        {!isQr && (
          <div className="bg-mist dark:bg-white/5 rounded-xl p-4 mb-5 text-center">
            <div className="animate-pulse mb-2 flex justify-center text-soft"><Icon name={method.startsWith('MOMO') ? 'smartphone' : method === 'CARD' ? 'credit_card' : 'account_balance'} size={30} /></div>
            <p className="text-sm font-semibold text-navy dark:text-white">{init.prompt ?? 'Complete the prompt to finish payment.'}</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-soft mb-5">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse" /> Live status: PENDING — checking every few seconds…
        </div>

        <div className="border border-dashed border-warning/60 bg-warning/5 rounded-xl p-4 mb-4">
            <p className="text-xs font-black uppercase tracking-wide text-warning mb-2">Sandbox gateway (demo)</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => simulate('success')} className="btn-primary !py-2 text-sm">Approve &amp; pay</button>
              <button onClick={() => simulate('pending')} className="btn-ghost !py-2 text-sm">Stay pending</button>
            <button onClick={() => simulate('fail')} className="btn-ghost !py-2 text-sm">Decline</button>
          </div>
        </div>
        <button onClick={() => { stopPolling(); setStep('choose'); }} className="text-xs text-soft underline">Cancel and change method</button>
      </div>
    );
  }
  if (step === 'failed') {
    return (
      <div className="card p-8 text-center">
        <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-danger/10 text-danger"><Icon name="close" size={32} /></span>
        <h1 className="font-display font-extrabold text-xl text-navy dark:text-white mb-1">Payment did not go through</h1>
        <p className="text-soft text-sm mb-5">{error || 'You declined the prompt or the network timed out. No money was moved — try again.'}</p>
        <button onClick={() => { setError(''); setStep('choose'); }} className="btn-primary">Try another method</button>
      </div>
    );
  }

  // choose / details
  return (
    <div className="card overflow-hidden">
      <div className="bg-navy text-white px-6 py-5">
        <p className="text-xs uppercase tracking-widest text-white/60 font-bold">GabiElectricals payment</p>
        <h1 className="font-display font-extrabold text-lg mt-1">{link.label}</h1>
        {link.description && <p className="text-sm text-white/70 mt-1">{link.description}</p>}
        <p className="font-display font-extrabold text-3xl mt-3 text-gold">
          {link.flexible ? (customAmount ? ghs(parseFloat(customAmount) || 0) : 'Enter amount') : ghs(balance)}
        </p>
        {link.paid > 0 && !link.flexible && <p className="text-xs text-white/60 mt-1">{ghs(link.paid)} already received on this link.</p>}
      </div>
      <div className="p-6">
        {error && step === 'details' && <p className="text-sm text-danger font-semibold mb-3">{error}</p>}
        {step === 'choose' ? (
          <>
            <h2 className="text-sm font-black uppercase tracking-wide text-soft mb-3">Choose a payment method</h2>
            <div className="grid grid-cols-1 gap-2 mb-4">
              {METHODS.map(m => (
                <button key={m.id} onClick={() => { setMethod(m.id); setStep('details'); }}
                  className="flex items-center gap-3 rounded-xl border border-line dark:border-white/10 p-3.5 text-left hover:border-blue transition-colors">
                  {m.kind === 'dot' ? (
                    <span className="h-8 w-8 shrink-0 rounded-full border border-line" style={{ background: m.color }} aria-hidden="true" />
                  ) : (
                    <span className="w-8 grid place-items-center text-soft" aria-hidden="true"><Icon name={m.icon} size={22} /></span>
                  )}
                  <span className="flex-1">
                    <span className="block font-bold text-navy dark:text-white text-sm">{m.name}</span>
                    <span className="block text-xs text-soft">{m.hint}</span>
                  </span>
                  <span className="text-soft">›</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-sm font-black uppercase tracking-wide text-soft mb-3">{METHODS.find(m => m.id === method)?.name}</h2>
            <div className="space-y-3 mb-4">
              {link.flexible && (
                <label className="block text-sm font-bold text-navy dark:text-white">Amount (GHS)
                  <input value={customAmount} onChange={e => setCustomAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="e.g. 250"
                    className="mt-1 w-full rounded-xl border border-line dark:border-white/15 bg-white dark:bg-white/5 px-4 py-3 text-navy dark:text-white" />
                </label>
              )}
              {(method.startsWith('MOMO') || method === 'CARD') && (
                <label className="block text-sm font-bold text-navy dark:text-white">MoMo / account phone
                  <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="024 123 4567"
                    className="mt-1 w-full rounded-xl border border-line dark:border-white/15 bg-white dark:bg-white/5 px-4 py-3 text-navy dark:text-white" />
                </label>
              )}
              <label className="block text-sm font-bold text-navy dark:text-white">Email for receipt <span className="text-soft font-normal">(optional)</span>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border border-line dark:border-white/15 bg-white dark:bg-white/5 px-4 py-3 text-navy dark:text-white" />
              </label>
              {method === 'MANUAL_TRANSFER' && (
                <div className="bg-mist dark:bg-white/5 rounded-xl p-4 text-sm text-navy dark:text-white">
                  <p className="font-bold mb-1">Transfer to:</p>
                  <p className="text-soft">GabiElectricals Ltd · GCB Bank · Accra Main · Acc. 1020304050</p>
                  <label className="block mt-3 font-bold">Upload transfer proof (PNG/JPG)
                    <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
                  </label>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('choose')} className="btn-ghost !px-4">Back</button>
              <button
                onClick={() => {
                  if (link.flexible && !(parseFloat(customAmount) > 0)) { setError('Enter an amount of at least ₵1.'); return; }
                  if (method.startsWith('MOMO') && !/^(\+?233|0)[2-59]\d{7}$/.test(phone.replace(/\s/g, ''))) { setError('Enter a valid Ghana phone number.'); return; }
                  start();
                }}
                disabled={busy}
                className="btn-primary flex-1"
              >
                {busy ? 'Starting…' : method === 'QR' ? 'Show payment QR' : `Pay ${shown ? ghs(shown) : ''}`}
              </button>
            </div>
          </>
        )}
        <p className="text-[11px] text-soft mt-4 inline-flex items-center gap-1"><Icon name="lock" size={12} />No card data is stored. Secured with 256-bit encryption. VAT invoice issued automatically.</p>
      </div>
    </div>
  );
}
