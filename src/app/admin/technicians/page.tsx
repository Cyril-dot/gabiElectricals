import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';


export const dynamic = 'force-dynamic';

export default async function AdminTechnicians() {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch { redirect('/'); }
  const techs = await prisma.technician.findMany({
    orderBy: { rating: 'desc' },
    include: { user: { select: { name: true, email: true, phone: true } }, _count: { select: { bookings: true } } },
  });
  const parse = (s: string) => { try { return JSON.parse(s) as string[]; } catch { return []; } };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white md:text-3xl">Technicians</h1>
        <p className="text-sm font-semibold text-soft">{techs.length} certified electricians · availability and ratings (edit in the technician lane).</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {techs.map(t => (
          <div key={t.id} className="card space-y-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display font-extrabold text-navy dark:text-white">{t.user.name}</p>
              <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-extrabold text-gold-dark">{t.rating.toFixed(1)}★</span>
            </div>
            <p className="text-xs font-semibold text-soft">{t.user.email} · {t.user.phone}</p>
            <div className="flex flex-wrap gap-1.5">
              {parse(t.specialties).slice(0, 4).map(s => <span key={s} className="rounded-full bg-blue/10 px-2 py-0.5 text-[11px] font-extrabold text-blue">{s}</span>)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {parse(t.regions).map(r => <span key={r} className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-bold text-soft">{r}</span>)}
            </div>
            <p className="text-xs font-bold text-soft">{t.jobsCompleted} jobs done · {t._count.bookings} bookings on file</p>
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${t.available ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>{t.available ? 'Available' : 'Unavailable'}</span>
              <Link href={`/admin/bookings?q=${encodeURIComponent(t.user.name)}`} className="text-xs font-bold text-blue hover:underline">Recent jobs →</Link>
            </div>
          </div>
        ))}
        {techs.length === 0 && <p className="card p-8 text-center text-sm text-soft">No technicians yet — seed demo data or add one from the technician lane.</p>}
      </div>
    </div>
  );
}
