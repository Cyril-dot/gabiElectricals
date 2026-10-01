'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ email: '', password: '', code: '' });
  const [otpSentTo, setOtpSentTo] = useState('');
  const [demoCode, setDemoCode] = useState('');

  const post = async (url: string, body: object) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? 'Something went wrong.');
    return j;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (mode === 'password') {
        const j = await post('/api/auth/login', { email: f.email, password: f.password });
        toast(`Akwaaba, ${j.name.split(' ')[0]}! You are signed in.`);
      } else if (!demoCodeStep()) {
        const j = await post('/api/auth/otp', { action: 'send', email: f.email, purpose: 'LOGIN' });
        setOtpSentTo(j.sentTo);
        if (j.demoCode) setDemoCode(j.demoCode);
        toast(`Code sent to ${j.sentTo}`, 'info');
        setBusy(false);
        return;
      } else {
        await post('/api/auth/otp', { action: 'verify', email: f.email, code: f.code, purpose: 'LOGIN' });
        toast('Signed in — welcome back!');
      }
      router.push('/');
      router.refresh();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };
  const demoCodeStep = () => !!otpSentTo;

  return (
    <div className="container-x py-12 md:py-16 grid place-items-center">
      <div className="card w-full max-w-md p-6 md:p-8">
        <h1 className="font-display text-2xl font-extrabold mb-1">Sign in to GabiElectricals</h1>
        <p className="text-sm text-soft mb-5">Track orders, save carts and unlock referral credit.</p>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-mist dark:bg-navy-700 mb-5" role="tablist" aria-label="Sign-in method">
          {(['password', 'otp'] as const).map(m => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErr(''); }}
              className={`py-2 rounded-lg text-sm font-bold transition-colors ${mode === m ? 'bg-white dark:bg-navy shadow-soft text-navy dark:text-white' : 'text-soft'}`}>
              {m === 'password' ? 'Password' : 'SMS code'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <div>
            <label htmlFor="email" className="text-[13px] font-bold mb-1 block">Email address</label>
            <input id="email" type="email" required autoComplete="email" value={f.email}
              onChange={e => setF({ ...f, email: e.target.value })}
              className="w-full border border-line rounded-xl px-3.5 py-3 text-sm bg-mist/50 dark:bg-navy-700 outline-none focus:border-blue"
              placeholder="you@example.com" />
          </div>

          {mode === 'password' && (
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label htmlFor="pw" className="text-[13px] font-bold">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-blue hover:underline">Forgot?</Link>
              </div>
              <input id="pw" type="password" required autoComplete="current-password" value={f.password}
                onChange={e => setF({ ...f, password: e.target.value })}
                className="w-full border border-line rounded-xl px-3.5 py-3 text-sm bg-mist/50 dark:bg-navy-700 outline-none focus:border-blue"
                placeholder="••••••••" />
            </div>
          )}

          {mode === 'otp' && demoCodeStep() && (
            <div>
              <label htmlFor="code" className="text-[13px] font-bold mb-1 block">6-digit code sent to {otpSentTo}</label>
              <input id="code" inputMode="numeric" pattern="\d{6}" required maxLength={6} value={f.code}
                onChange={e => setF({ ...f, code: e.target.value })}
                className="w-full border border-line rounded-xl px-3.5 py-3 text-sm tracking-[0.4em] font-bold text-center bg-mist/50 dark:bg-navy-700 outline-none focus:border-blue"
                placeholder="000000" />
              {demoCode && (
                <p className="text-xs text-success mt-1.5 font-semibold">Demo: your code is {demoCode} (SMS is simulated via the Notification Log).</p>
              )}
            </div>
          )}

          {err && <p role="alert" className="text-sm font-semibold text-danger bg-danger/10 rounded-lg px-3 py-2">{err}</p>}

          <button disabled={busy} className="btn-primary w-full !py-3.5 text-[15px] min-h-[44px]">
            {busy ? 'One moment…' : mode === 'password' ? 'Sign in' : demoCodeStep() ? 'Verify & sign in' : 'Send me a code'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5 text-xs text-soft font-bold">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <button type="button" disabled title="Google sign-in activates in live mode (Phase 7)" onClick={() => toast('Google sign-in is a live-mode feature — use email for the demo.', 'info')}
          className="btn-ghost w-full !py-3 text-sm relative group">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.8l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A10 10 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.2-1.3.4-2V7.1H2a10 10 0 0 0 0 9.8l3.7-2.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.2 1.6l3.1-3.1A10 10 0 0 0 2 7.1L5.7 10c.9-2.6 3.4-4.6 6.3-4.6z"/></svg>
          Continue with Google
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:block bg-navy text-white text-[11px] px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-pop">
            Available in live mode — email sign-in works in the demo
          </span>
        </button>

        <p className="text-sm text-soft mt-5 text-center">
          New to GabiElectricals? <Link href="/register" className="font-bold text-blue hover:underline">Create an account</Link>
        </p>
        <p className="text-[11.5px] text-soft mt-3 text-center">Demo logins: see the console output of <code className="bg-mist dark:bg-navy-700 px-1 rounded">npm run db:seed</code> — e.g. kofiowusu0@gmail.com / Demo1234!</p>
      </div>
    </div>
  );
}
