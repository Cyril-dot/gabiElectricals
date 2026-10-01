'use client';
import { useEffect, useRef, useState } from 'react';
import { ghs } from '@/lib/money';
import { useToast } from '@/components/Toast';
import { Icon } from '@/components/Icon';

const METHODS = [
  { key: 'MOMO_MTN', label: 'MTN MoMo' }, { key: 'MOMO_TELECEL', label: 'Telecel Cash' }, { key: 'MOMO_AT', label: 'AT Money' },
  { key: 'QR', label: 'Scan QR' }, { key: 'CARD', label: 'Card' },
];

type Props = { quoteNo: string; id: string; status: string; amount: number; phone: string; email: string | null };

export default function QuoteActions(p: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState('MOMO_MTN');
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const [payStatus, setPayStatus] = useState<string>('PENDING');
  const [prompt, setPrompt] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [remaining, setRemaining] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const paid = p.status === 'PAID';
  const canAct = ['SENT', 'ACCEPTED', 'DRAFT'].includes(p.status);

  useEffect(() => {
    if (!ref) return;
    const poll = async () => {
      try {
        const r = await fetch(`/api/quotes/${p.id}/pay?ref=${ref}`);
        if (!r.ok) return;
        const j = await r.json();
        setPayStatus(j.status ?? j.quoteStatus);
        if (j.quoteStatus === 'PAID' || j.status === 'PAID') {
          toast('Quote paid — work scheduling started', 'ok');
          setTimeout(() => window.location.reload(), 1200);
        }
        if (['FAILED', 'EXPIRED'].includes(j.status)) toast(`Payment ${String(j.status).toLowerCase()} — you can retry`, 'err');
      } catch { /* transient */ }
    };
    poll();
    timer.current = setInterval(poll, 4000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [ref, p.id, toast]);

  async function acceptAndPay() {
    setBusy(true);
    try {
      const r = await fetch(`/api/quotes/${p.id}/pay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const j = await r.json();
      if (!r.ok) { toast(j.error ?? 'Could not start payment', 'err'); return; }
      setRef(j.reference); setPrompt(j.prompt ?? null); setOpen(false);
      toast(`Payment started — ${j.reference}`, 'ok');
    } catch { toast('Network error', 'err'); }
    finally { setBusy(false); }
  }

  async function simulate(outcome: 'success' | 'fail') {
    setBusy(true);
    try {
      await fetch('/api/payments/sandbox', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref, outcome }),
      });
      const r = await fetch(`/api/quotes/${p.id}/pay?ref=${ref}`);
      const j = await r.json();
      setPayStatus(j.status ?? 'PENDING');
      if (j.quoteStatus === 'PAID') { toast('Quote paid! Reloading…', 'ok'); setTimeout(() => window.location.reload(), 900); }
      else if (j.status === 'PENDING') toast('Awaiting MoMo approval…', 'info');
      else toast('Payment declined in sandbox — retry', 'err');
    } finally { setBusy(false); }
  }

  async function decline() {
    setBusy(true);
    try {
      const r = await fetch(`/api/quotes/${p.id}/pay`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline', reason: declineReason || undefined }),
      });
      const j = await r.json();
      if (!r.ok) { toast(j.error ?? 'Could not decline', 'err'); return; }
      toast('Quote declined — thanks for telling us', 'info');
      setShowDecline(false);
      setTimeout(() => window.location.reload(), 800);
    } catch { toast('Network error', 'err'); }
    finally { setBusy(false); }
  }

  if (paid) {
    return (
      <div className="mt-5 rounded-xl bg-success/10 border border-success/30 p-4 text-success font-bold text-[14px] inline-flex items-center gap-1.5">
        <Icon name="check_circle" size={18} /> This quote has been paid ({ghs(p.amount)}). GabiElectricals will contact you to schedule.
      </div>
    );
  }
  if (p.status === 'DECLINED') {
    return <div className="mt-5 rounded-xl bg-danger/10 border border-danger/30 p-4 text-danger font-bold text-[14px]">This quote was declined. Call us for other options.</div>;
  }
  if (p.status === 'EXPIRED') {
    return (
      <div className="mt-5 rounded-xl bg-danger/10 border border-danger/30 p-4 text-danger font-bold text-[14px] inline-flex items-center gap-1.5 flex-wrap">
        <Icon name="schedule" size={17} /> This quote expired. <button onClick={() => setShowDecline(true)} className="underline">Ask for a refresh</button>
        {showDecline && <p className="text-ink text-[12.5px] font-normal mt-2 w-full">Reply to the SMS or call our line — we will re-issue with current pricing, no obligation.</p>}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {ref ? (
        <div className="rounded-xl border border-blue/30 bg-blue/5 p-4" role="status">
          <p className="font-bold text-[14px] inline-flex items-center gap-1.5">
            {payStatus === 'PAID' ? <><Icon name="check_circle" size={17} className="text-success" /> Paid</>
              : payStatus === 'PENDING' ? <><Icon name="schedule" size={17} className="text-blue" /> Awaiting payment of {ghs(p.amount)}</>
              : <><Icon name="warning" size={17} className="text-danger" /> Payment {payStatus.toLowerCase()}</>}
          </p>
          {prompt && <p className="text-[12.5px] text-soft mt-1">{prompt}</p>}
          <p className="text-[11px] text-soft/80 font-mono mt-1">Ref {ref} · polling every 4s</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => simulate('success')} disabled={busy} className="btn-gold px-4 py-2 text-[12.5px] inline-flex items-center gap-1.5"><Icon name="check" size={14} /> Simulate approval (demo)</button>
            <button onClick={() => simulate('fail')} disabled={busy} className="btn-ghost px-4 py-2 text-[12.5px]">Simulate decline</button>
            {payStatus !== 'PENDING' && <button onClick={() => { setRef(null); }} className="btn-primary px-4 py-2 text-[12.5px]">Retry payment</button>}
          </div>
        </div>
      ) : canAct ? (
        <>
          <fieldset>
            <legend className="text-[12px] font-bold mb-2">Pay {ghs(p.amount)} to accept &amp; schedule:</legend>
            <div className="flex flex-wrap gap-2">
              {METHODS.map(m => (
                <button key={m.key} type="button" aria-pressed={method === m.key} onClick={() => setMethod(m.key)}
                  className={`rounded-xl border px-3 py-1.5 text-[12.5px] font-bold ${method === m.key ? 'bg-blue text-white border-blue' : 'bg-white border-line hover:border-blue'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={acceptAndPay} disabled={busy} className="btn-primary px-6 py-3 text-[14px]">
              {busy ? 'Starting payment…' : `Accept & Pay ${ghs(p.amount)}`}
            </button>
            <button onClick={() => setShowDecline(s => !s)} className="btn-ghost px-5 py-3 text-[13px] text-soft">Not now — decline</button>
          </div>
          {showDecline && (
            <div className="rounded-xl border border-line p-4 bg-white">
              <label htmlFor="dl" className="block text-[12.5px] font-bold mb-1">Why declining? (optional)</label>
              <textarea id="dl" rows={2} value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Too expensive, went with someone else…"
                className="w-full rounded-lg border border-line px-3 py-2 text-[13px]" />
              <button onClick={decline} disabled={busy} className="btn mt-2 px-4 py-2 text-[13px] bg-danger text-white rounded-[10px] font-bold">Confirm decline</button>
            </div>
          )}
        </>
      ) : (
        <p className="text-[13px] text-soft">Status: <b>{p.status}</b> — awaiting our team. This page updates itself.</p>
      )}
    </div>
  );
}
