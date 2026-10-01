'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useToast } from '@/components/Toast';

function RegisterForm() {
  const router = useRouter();
  const toast = useToast();
  const sp = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (f.password.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, referralCode: sp.get('ref') || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? 'Registration failed.');
      toast(`Akwaaba, ${j.name.split(' ')[0]}! ₵20 starter credit added to your wallet.`);
      router.push('/shop');
      router.refresh();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const field = (id: string, label: string, type: string, placeholder: string, autoComplete: string, hint?: string) => (
    <div>
      <label htmlFor={id} className="text-[13px] font-bold mb-1 block">{label}</label>
      <input id={id} type={type} required autoComplete={autoComplete} placeholder={placeholder}
        value={f[id as keyof typeof f] as string} onChange={e => setF({ ...f, [id]: e.target.value })}
        className="w-full border border-line rounded-xl px-3.5 py-3 text-sm bg-mist/50 dark:bg-navy-700 outline-none focus:border-blue" />
      {hint && <p className="text-[11.5px] text-soft mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="container-x py-12 md:py-16 grid place-items-center">
      <div className="card w-full max-w-md p-6 md:p-8">
        <h1 className="font-display text-2xl font-extrabold mb-1">Create your account</h1>
        <p className="text-sm text-soft mb-5">Faster checkout, order tracking, and ₵20 referral credit when you join through a friend.</p>
        <form onSubmit={submit} className="grid gap-4">
          {field('name', 'Full name', 'text', 'Kofi Owusu', 'name')}
          {field('email', 'Email address', 'email', 'you@example.com', 'email')}
          {field('phone', 'Mobile number (optional)', 'tel', '024 123 4567', 'tel', 'For delivery SMS and MoMo prompts.')}
          {field('password', 'Password', 'password', 'At least 8 characters', 'new-password', 'Mix letters, numbers and a symbol.')}
          {err && <p role="alert" className="text-sm font-semibold text-danger bg-danger/10 rounded-lg px-3 py-2">{err}</p>}
          <button disabled={busy} className="btn-primary w-full !py-3.5 text-[15px] min-h-[44px]">
            {busy ? 'Creating account…' : 'Create account'}
          </button>
          <p className="text-[12px] text-soft">By joining you agree to our fair-use terms. We never sell your data — power tips only.</p>
        </form>
        <p className="text-sm text-soft mt-5 text-center">
          Already registered? <Link href="/login" className="font-bold text-blue hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={null}><RegisterForm /></Suspense>;
}
