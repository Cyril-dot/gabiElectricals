'use client';
import { useEffect, useRef, useState } from 'react';

type Pay = { reference: string; amount: string; status: string; method: string; expiresAt: string | null; label: string };

export function ScanPayClient({ payment, demo }: { payment: Pay; demo: boolean }) {
  const [status, setStatus] = useState(payment.status);
  const [secs, setSecs] = useState(() => (payment.expiresAt ? Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - Date.now()) / 1000)) : 0));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (status !== 'PENDING') return;
    timer.current = setInterval(async () => {
      const r = await fetch(`/api/payments/status/${payment.reference}`);
      if (!r.ok) return;
      const j = await r.json();
      if (j.status !== status) setStatus(j.status);
    }, 3000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [status, payment.reference]);

  async function approve() {
    await fetch('/api/payments/sandbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: payment.reference, outcome: 'success' }),
    });
    setStatus('PENDING'); // poll will pick up PAID
  }

  const done = status === 'PAID';
  return (
    <div className="card p-6 sm:p-8 text-center">
      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${done ? 'bg-success/15' : status === 'FAILED' || status === 'EXPIRED' ? 'bg-danger/10' : 'bg-blue/10'}`}>
        <span className="text-3xl">{done ? '✅' : status === 'FAILED' ? '❌' : status === 'EXPIRED' ? '⌛' : '⚡'}</span>
      </div>
      <h1 className="font-display font-extrabold text-2xl text-navy dark:text-white">{payment.amount}</h1>
      <p className="text-soft text-sm mt-1">to <b>GabiElectricals Ltd</b> · {payment.label}</p>
      <p className="text-xs text-soft mt-1 font-mono">{payment.reference}</p>

      {status === 'PENDING' && !done && (
        <>
          <div className="bg-mist dark:bg-white/5 rounded-xl p-4 mt-5 mb-4">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-navy dark:text-white">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse" /> Waiting for payment…
            </div>
            {secs > 0 && <p className="text-xs text-soft mt-2">QR expires in {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</p>}
            <p className="text-xs text-soft mt-2">Pay via {payment.method}, then keep this screen open — it updates itself.</p>
          </div>
          {demo && (
            <div className="border border-dashed border-warning/60 bg-warning/5 rounded-xl p-4">
              <p className="text-xs font-black uppercase tracking-wide text-warning mb-2">Sandbox — simulate payer phone</p>
              <button onClick={approve} className="btn-primary !py-2 text-sm w-full">Tap “Approve” on the MoMo prompt</button>
            </div>
          )}
        </>
      )}
      {done && (
        <div className="mt-5 bg-success/10 rounded-xl p-4">
          <p className="font-bold text-success">Payment confirmed ⚡</p>
          <p className="text-sm text-soft mt-1">The merchant screen updates automatically. Receipt sent if an email was provided.</p>
        </div>
      )}
      {(status === 'FAILED' || status === 'EXPIRED') && (
        <div className="mt-5 bg-danger/10 rounded-xl p-4">
          <p className="font-bold text-danger">{status === 'EXPIRED' ? 'This QR has expired' : 'Payment failed'}</p>
          <p className="text-sm text-soft mt-1">Ask the agent to regenerate a fresh QR and scan again.</p>
        </div>
      )}
    </div>
  );
}
