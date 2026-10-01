'use client';
import { useRouter } from 'next/navigation';

export function LogoutButton({ label = 'Sign out' }: { label?: string }) {
  const r = useRouter();
  return (
    <button className="text-soft hover:text-danger" onClick={async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      r.push('/login');
    }}>{label}</button>
  );
}
