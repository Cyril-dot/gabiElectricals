'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ghs } from '@/lib/money';

export default function PayPanel({ reference, bookingNo, amount }: { reference: string; bookingNo: string; amount: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED'>('PENDING');
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState('Complete the payment prompt on your phone to confirm this booking.');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/payments/status/${reference}`);
        if (!r.ok) return;
        const j = await r.json();
        if (!alive) return;
        setStatus(j.status);
        if (j.status === 'PAID') { setPrompt('Payment confirmed — booking is now CONFIRMED.'); router.refresh(); }
        if (['FAILED', 'EXPIRED'].includes(j.status)) { setPrompt('Payment did not complete. You can retry from the booking page.'); }
      } catch { /* transient */ }
    };
    poll();
    timer.current = setInterval(poll, 4000);
    return () => { alive = false; if (timer.current) clearInterval(timer.current); };
  }, [reference, router]);

  async function simulate(outcome: 'success' | 'pending' | 'fail') {
    setBusy(true);
    try {
      await fetch('/api/payments/sandbox', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, outcome }),
      });
      setTimeout(() => { setBusy(false); router.refresh(); }, 400);
    } catch { setBusy(false); }
  }

  return (
    <div className="border-t border-line p-5 md:p-7 bg-blue/5" role="region" aria-label="Payment status">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="flex-1">
          <p className="font-display font-extrabold text-[15px]">
            {status === 'PAID' ? '✅ Payment received' : status === 'PENDING' ? `Awaiting payment of ${ghs(amount)}` : `⚠️ Payment ${status.toLowerCase()}`}
          </p>
          <p className="text-[12.5px] text-soft mt-1">{prompt}</p>
          <p className="text-[11px] text-soft/80 mt-1 font-mono">Ref: {reference}</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0" aria-label="Sandbox payment simulation (demo mode)">
          <p className="text-[10.5px] font-black uppercase tracking-wide text-soft">Demo gateway — simulate:</p>
          <div className="flex gap-2">
            <button onClick={() => simulate('success')} disabled={busy || status === 'PAID'} className="btn-gold px-3.5 py-2 text-[12px]">✓ Approve (simulate)</button>
            <button onClick={() => simulate('fail')} disabled={busy || status === 'PAID'} className="btn-ghost px-3.5 py-2 text-[12px]">Decline</button>
          </div>
          {status !== 'PAID' && (
            <a href={`/booking/${bookingNo}`} className="text-[11.5px] text-blue font-bold underline">Payment not working? Re-choose method</a>
          )}
        </div>
      </div>
    </div>
  );
}
