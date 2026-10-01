import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { LogoutButton } from './logout-button';

export const dynamic = 'force-dynamic';

export default async function TechnicianLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/login');
  if (s.role !== 'TECHNICIAN') redirect(s.role === 'ADMIN' || s.role === 'SUPER_ADMIN' ? '/admin' : '/login');
  return (
    <div className="min-h-dvh bg-mist pb-24 dark:bg-navy">
      <nav className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur dark:bg-navy/90">
        <div className="container-x flex h-14 items-center justify-between">
          <Link href="/technician" className="font-display text-lg font-extrabold text-navy dark:text-white">Gabi<span className="text-blue">Tech</span></Link>
          <div className="flex gap-4 text-sm font-bold text-soft">
            <Link href="/technician" className="text-navy dark:text-white">Jobs</Link>
            <Link href="/technician/history" className="hover:text-blue">History</Link>
          </div>
        </div>
      </nav>
      <main className="container-x max-w-lg py-5">{children}</main>
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white dark:bg-navy-700">
        <div className="mx-auto flex max-w-lg justify-around py-2 text-[11px] font-bold">
          <Link href="/technician" className="text-blue">Today</Link>
          <Link href="/technician/history" className="text-soft">History</Link>
          <LogoutButton label="Sign out" />
        </div>
      </footer>
    </div>
  );
}
