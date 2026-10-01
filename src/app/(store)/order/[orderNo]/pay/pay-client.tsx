'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { networkLabel } from '@/lib/gateway';
import { ghs } from '@/lib/money';
import { useToast } from '@/components/Toast';

const CHOICES = ['MOMO_MTN', 'MOMO_TELECEL', 'MOMO_AT', 'CARD', 'BANK_TRANSFER', 'GHIPSS', 'QR', 'MANUAL_TRANSFER'] as const;
type Choice = (typeof CHOICES)[number];

const ICONS: Record<Choice, string> = {
  MOMO_MTN: '📱', MOMO_TELECEL: '📲', MOMO_AT: '📳', CARD: '💳',
  BANK_TRANSFER: '🏦', GHIPSS: '🇬🇭', QR: '▣', MANUAL_TRANSFER: '🧾',
};

type Init = { reference: string; status: string; prompt?: string; qrPayload?: string; expiresAt?: string; amount: number };

export function PaySandbox({ orderNo, due, email, phone, qrExpiryMinutes }: {
  orderNo: string; due: number; email: string; phone: string; qrExpiryMinutes: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [method, setMethod] = useState<Choice>('MOMO_MTN');
  const [momo, setMomo] = useState(phone || '');
  const [init, setInit] = useState<Init | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [leftSecs, setLeftSecs] = useState<number | null>(null);
  const [pollStatus, setPollStatus] = useState('');
  const doneRef = useRef(false);

  useEffect(() => {
    if (!init?.qrPayload) return;
    QRCode.toDataURL(init.qrPayload, { margin: 1, width: 220 }).then(setQrDataUrl).catch(() => {});
  }, [init?.qrPayload]);

  // countdown for QR
  useEffect(() => {
    if (!init?.expiresAt) return;
    const tick = () => setLeftSecs(Math.max(0, Math.floor((new Date(init.expiresAt!).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [init?.expiresAt]);

  // poll payment status
  useEffect(() => {
    if (!init || doneRef.current) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status/${init.reference}`);
        const j = await res.json();
        setPollStatus(j.status);
        if (j.status === 'PAID' && !doneRef.current) {
          doneRef.current = true;
          clearInterval(t);
          toast('Payment confirmed — power moving! ⚡');
          router.push(`/order/${orderNo}?ref=${init.reference}`);
          router.refresh();
        }
      } catch { /* keep polling */ }
    }, 4000);
    return () => clearInterval(t);
  }, [init, orderNo, router, toast]);

  const call = async (url: string, body: object) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? 'Request failed');
    return j;
  };

  const start = async () => {
    setBusy(true); setErr(''); setInit(null); doneRef.current = false;
    try {
      const j: Init = await call('/api/payments/initiate', { orderNo, method, phone: momo || undefined });
      setInit(j);
      setPollStatus(j.status);
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Failed'); }
    finally { setBusy(false); }
  };

  const simulate = async (outcome: 'success' | 'pending' | 'fail') => {
    if (!init) return;
    setBusy(true);
    try {
      const j = await call('/api/payments/sandbox', { reference: init.reference, outcome });
      const result = j.result ?? j.status;
      setPollStatus(result);
      if (result === 'PAID' && !doneRef.current) {
        doneRef.current = true;
        toast('Payment approved!');
        router.push(`/order/${orderNo}?ref=${init.reference}`);
        router.refresh();
      } else if (j.status === 'FAILED') {
        toast('Sandbox declined the payment.', 'err');
      } else {
        toast('Still pending — the payer has not approved yet.', 'info');
      }
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Failed'); }
    finally { setBusy(false); }
  };

  const isMomo = method.startsWith('MOMO');

  return (
    <div>
      {!init ? (
        <form onSubmit={e => { e.preventDefault(); start(); }} className="space-y-5">
          <fieldset>
            <legend className="text-[13px] font-bold mb-2">Choose how to pay {ghs(due)}</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Payment method">
              {CHOICES.map(m => (
                <button type="button" key={m} role="radio" aria-checked={method === m} onClick={() => setMethod(m)}
                  className={`rounded-xl border-2 p-3 text-center transition-colors min-h-[64px] ${method === m ? 'border-blue bg-blue/5' : 'border-line hover:border-blue/40'}`}>
                  <span className="block text-xl" aria-hidden>{ICONS[m]}</span>
                  <span className="block text-[11.5px] font-bold mt-1">{m === 'MANUAL_TRANSFER' ? 'Manual (proof)' : networkLabel(m)}</span>
                </button>
              ))}
            </div>
          </fieldset>
          {isMomo && (
            <div>
              <label htmlFor="momo-num" className="text-[13px] font-bold block mb-1">Mobile money number</label>
              <input id="momo-num" type="tel" value={momo} onChange={e => setMomo(e.target.value)} placeholder="024 123 4567"
                className="w-full border border-line rounded-xl px-3.5 py-3 text-sm bg-white dark:bg-navy outline-none focus:border-blue min-h-[44px]" />
              <p className="text-[11.5px] text-soft mt-1">A prompt will be sent — approve with your PIN.</p>
            </div>
          )}
          {method === 'MANUAL_TRANSFER' && (
            <div className="bg-mist dark:bg-navy-700 rounded-xl p-4 text-[13px]">
              <p className="font-bold mb-1">Transfer to our merchant account:</p>
              <p>Ecobank — <span className="font-mono">GE-9081-ACCT</span> · CalBank — <span className="font-mono">GE-1122-ACCT</span><br />Then attach your receipt on the next step — we approve within 30 minutes in business hours.</p>
            </div>
          )}
          {err && <p role="alert" className="text-sm font-semibold text-danger">{err}</p>}
          <button disabled={busy || due <= 0} className="btn-primary w-full !py-3.5 min-h-[48px]">{busy ? 'Starting…' : `Continue to ${networkLabel(method) === method ? method : networkLabel(method)} →`}</button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="bg-mist dark:bg-navy-700 rounded-xl p-4 text-sm">
            <p className="font-bold">Reference: <span className="font-mono">{init.reference}</span></p>
            {init.prompt && <p className="mt-1">📲 {init.prompt}</p>}
            {method === 'CARD' && <p className="mt-1">💳 Sandbox: 4084 0840 8408 4081 · any future expiry · OTP 123456.</p>}
            {method === 'QR' && leftSecs !== null && <p className="mt-1">⏳ QR expires in {Math.floor(leftSecs / 60)}:{String(leftSecs % 60).padStart(2, '0')} ({qrExpiryMinutes}-minute window).</p>}
            {init.qrPayload && (
              <div className="flex flex-col items-center mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt={`Scan-to-pay QR for order ${orderNo}`} className="w-52 h-52 rounded-xl bg-white p-2 border border-line" />
                <p className="text-[12px] text-soft mt-2">Pay {({ MOMO_MTN: 'MTN MoMo', MOMO_TELECEL: 'Telecel Cash', MOMO_AT: 'AT Money' } as Record<string, string>)[method] ?? 'any banking app'} “Scan to pay” with this code.</p>
              </div>
            )}
            <p className="mt-2 font-semibold" aria-live="polite">Status: <span className={`font-black ${pollStatus === 'PAID' ? 'text-success' : pollStatus === 'FAILED' ? 'text-danger' : 'text-warning'}`}>{pollStatus}</span> — waiting for confirmation…</p>
          </div>

          <div className="card p-4 border-dashed">
            <p className="text-[12.5px] font-bold text-soft uppercase tracking-wide mb-2">Demo sandbox — simulate the {method.startsWith('MOMO') ? 'payer' : 'bank'}</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => simulate('success')} disabled={busy} className="btn-primary !py-2.5 text-[13px] min-h-[44px]">✅ Approve</button>
              <button onClick={() => simulate('pending')} disabled={busy} className="btn-ghost !py-2.5 text-[13px] min-h-[44px]">⏳ Stay pending</button>
              <button onClick={() => simulate('fail')} disabled={busy} className="btn-ghost !py-2.5 text-[13px] text-danger border-danger/40 min-h-[44px]">✕ Decline</button>
            </div>
            <p className="text-[11px] text-soft mt-2">Simulated outcomes also fire the real webhook path (status polling + OrderEvents + SMS/email logging).</p>
          </div>
          <a href={`/order/${orderNo}`} className="block text-center text-sm font-bold text-blue hover:underline">I&apos;ll finish this payment later →</a>
        </div>
      )}
    </div>
  );
}
