import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { Badge } from '@/components/ops/ui';
import { ghs } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function TechnicianHistory() {
  const s = await getSession();
  if (!s || s.role !== 'TECHNICIAN') redirect('/login');
  const tech = await prisma.technician.findUnique({ where: { userId: s.userId } });
  if (!tech) redirect('/login');

  const [jobs, settings] = await Promise.all([
    prisma.booking.findMany({
      where: { technicianId: tech.id, status: { in: ['COMPLETED', 'REVIEWED', 'CANCELLED'] } },
      include: { service: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 60,
    }),
    getSettings(),
  ]);
  const payments = await prisma.payment.groupBy({ by: ['bookingId'], _sum: { amount: true }, where: { status: 'PAID', bookingId: { in: jobs.map((j) => j.id) } } });
  const collected = new Map(payments.map((p) => [p.bookingId, p._sum.amount ?? 0]));
  const commissionPct = (settings as unknown as { technician?: { commissionPct?: number } }).technician?.commissionPct ?? 10;

  const done = jobs.filter((j) => j.status !== 'CANCELLED');
  const totalCollected = done.reduce((a, j) => a + (collected.get(j.id) ?? j.price), 0);
  const avg = done.filter((j) => j.rating).reduce((a, j) => a + (j.rating ?? 0), 0) / Math.max(1, done.filter((j) => j.rating).length);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-blue">Field technician</p>
        <h1 className="font-display text-xl font-extrabold text-navy dark:text-white">Job history & earnings</h1>
      </header>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Jobs done', String(done.length)], ['Collected', ghs(totalCollected, { cents: false })], [`Est. commission (${commissionPct}%)`, ghs(totalCollected * commissionPct / 100, { cents: false })]].map(([l, v]) => (
          <div key={l} className="card p-3"><p className="font-display text-lg font-extrabold text-blue">{v}</p><p className="text-[9px] font-bold uppercase tracking-wide text-soft">{l}</p></div>
        ))}
      </div>
      {done.length > 0 && <p className="px-1 text-xs text-soft">Average customer rating on your completed jobs: <span className="font-bold text-gold-dark dark:text-gold">★ {avg.toFixed(1)}</span> · commission estimate uses PAID payments per job ({commissionPct}% default, override via Setting key &quot;technician&quot;).</p>}
      <div className="space-y-2">
        {jobs.map((j) => {
          const got = collected.get(j.id) ?? j.price;
          return (
            <div key={j.id} className="card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-navy dark:text-white">{j.bookingNo} · {j.service.name}</p>
                <Badge tone={j.status === 'CANCELLED' ? 'danger' : 'success'}>{j.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-soft">{new Date(j.date).toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {j.timeSlot} · {j.contactName}</p>
              {j.status !== 'CANCELLED' && (
                <p className="mt-1 text-xs"><span className="font-bold text-blue">{ghs(got)}</span> collected · commission est. <span className="font-bold text-success">{ghs(got * commissionPct / 100)}</span>{j.rating ? <span className="ml-2 text-gold-dark dark:text-gold">★ {j.rating}/5 {j.review ? `“${j.review}”` : ''}</span> : <span className="ml-2 text-soft">no rating</span>}</p>
              )}
            </div>
          );
        })}
        {jobs.length === 0 && <div className="card p-6 text-center text-sm text-soft">No finished jobs yet — complete some today.</div>}
      </div>
    </div>
  );
}
