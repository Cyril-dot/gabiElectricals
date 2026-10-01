'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/Toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  const post = async (body: object) => {
    const res = await fetch('/api/auth/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? 'Something went wrong.');
    return j;
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const j = await post({ action: 'send', email, purpose: 'RESET' });
      setSentTo(j.sentTo);
      if (j.demoCode) setDemoCode(j.demoCode);
      setStep(2);
      toast(`Reset code sent to ${j.sentTo}`, 'info');
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Failed'); }
    finally { setBusy(false); }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (pw !== pw2) { setErr('The two passwords do not match.'); return; }
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      await post({ action: 'reset', email, code, password: pw });
      toast('Password reset — please sign in.');
      router.push('/login');
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="container-x py-12 md:py-16 grid place-items-center">
      <div className="card w-full max-w-md p-6 md:p-8">
        <h1 className="font-display text-2xl font-extrabold mb-1">Reset your password</h1>
        <p className="text-sm text-soft mb-5">We will send a one-time code to your phone by SMS (or email if no number on file).</p>

        {step === 1 ? (
          <form onSubmit={sendCode} className="grid gap-4">
            <div>
              <label htmlFor="email" className="text-[13px] font-bold mb-1 block">Account email</label>
              <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"
                className="w-full border border-line rounded-xl px-3.5 py-3 text-sm bg-mist/50 dark:bg-navy-700 outline-none focus:border-blue"
                placeholder="you@example.com" />
            </div>
            {err && <p role="alert" className="text-sm font-semibold text-danger bg-danger/10 rounded-lg px-3 py-2">{err}</p>}
            <button disabled={busy} className="btn-primary w-full !py-3.5 min-h-[44px]">{busy ? 'Sending…' : 'Send reset code'}</button>
          </form>
        ) : (
          <form onSubmit={reset} className="grid gap-4">
            <div>
              <label htmlFor="code" className="text-[13px] font-bold mb-1 block">Code sent to {sentTo}</label>
              <input id="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value)}
                className="w-full border border-line rounded-xl px-3.5 py-3 text-sm tracking-[0.4em] font-bold text-center bg-mist/50 dark:bg-navy-700 outline-none focus:border-blue"
                placeholder="000000" />
              {demoCode && <p className="text-xs text-success mt-1.5 font-semibold">Demo: your reset code is {demoCode}.</p>}
            </div>
            <div>
              <label htmlFor="npw" className="text-[13px] font-bold mb-1 block">New password</label>
              <input id="npw" type="password" required minLength={8} value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password"
                className="w-full border border-line rounded-xl px-3.5 py-3 text-sm bg-mist/50 dark:bg-navy-700 outline-none focus:border-blue" />
            </div>
            <div>
              <label htmlFor="npw2" className="text-[13px] font-bold mb-1 block">Confirm new password</label>
              <input id="npw2" type="password" required value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password"
                className="w-full border border-line rounded-xl px-3.5 py-3 text-sm bg-mist/50 dark:bg-navy-700 outline-none focus:border-blue" />
            </div>
            {err && <p role="alert" className="text-sm font-semibold text-danger bg-danger/10 rounded-lg px-3 py-2">{err}</p>}
            <button disabled={busy} className="btn-primary w-full !py-3.5 min-h-[44px]">{busy ? 'Resetting…' : 'Set new password'}</button>
            <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-blue hover:underline">Use a different email</button>
          </form>
        )}

        <p className="text-sm text-soft mt-5 text-center">
          Remembered it? <Link href="/login" className="font-bold text-blue hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
