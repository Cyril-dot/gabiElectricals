import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DEMO_MODE } from '@/lib/db';
import { AdminShell } from './_Shell';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin — GabiElectricals',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/login?next=/admin');
  if (s.role === 'TECHNICIAN') redirect('/technician');
  if (s.role !== 'ADMIN' && s.role !== 'SUPER_ADMIN') redirect('/');

  return (
    <AdminShell user={{ name: s.name, role: s.role }} demoMode={DEMO_MODE}>
      {children}
    </AdminShell>
  );
}
