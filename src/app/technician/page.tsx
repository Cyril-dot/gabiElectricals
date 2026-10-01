import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { JobCard } from './job-card';

export const dynamic = 'force-dynamic';

export default async function TechnicianHome() {
  const s = await getSession();
  if (!s || s.role !== 'TECHNICIAN') redirect('/login');
  const tech = await prisma.technician.findUnique({ where: { userId: s.userId } });
  if (!tech) redirect('/login');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todays, completedTotal, rated, upcoming] = await Promise.all([
    prisma.booking.findMany({
      where: { technicianId: tech.id, date: { gte: today, lt: tomorrow } },
      include: { service: { select: { name: true } } },
      orderBy: { timeSlot: 'asc' },
    }),
    prisma.booking.count({ where: { technicianId: tech.id, status: { in: ['COMPLETED', 'REVIEWED'] } } }),
    prisma.booking.aggregate({ where: { technicianId: tech.id, rating: { not: null } }, _avg: { rating: true } }),
    prisma.booking.findMany({
      where: { technicianId: tech.id, date: { gte: tomorrow }, status: { notIn: ['COMPLETED', 'REVIEWED', 'CANCELLED'] } },
      include: { service: { select: { name: true } } },
      orderBy: { date: 'asc' },
      take: 5,
    }),
  ]);

  const ser = (b: (typeof todays)[number]) => ({
    id: b.id, bookingNo: b.bookingNo, timeSlot: b.timeSlot, status: b.status, urgency: b.urgency,
    serviceName: b.service.name, contactName: b.contactName, contactPhone: b.contactPhone,
    city: b.city, region: b.region, landmark: b.landmark, gps: b.gps, description: b.description,
    price: b.price, depositDue: b.depositDue, paymentMode: b.paymentMode,
    media: safeArr(b.media), date: b.date.toISOString(),
  });

  return (
    <div className="space-y-4">
      <header className="card bg-navy p-4 text-white dark:bg-navy-700">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Field technician</p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="font-display text-xl font-extrabold">{s.name}</h1>
          <span className="rounded-full bg-gold px-3 py-1 text-sm font-extrabold text-navy">★ {(rated._avg.rating ?? tech.rating).toFixed(1)}</span>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Today', String(todays.length)], ['Completed', String(completedTotal)], ['Avg rating', (rated._avg.rating ?? tech.rating).toFixed(1)]].map(([l, v]) => (
          <div key={l} className="card p-3"><p className="font-display text-xl font-extrabold text-blue">{v}</p><p className="text-[10px] font-bold uppercase tracking-wide text-soft">{l}</p></div>
        ))}
      </div>

      <h2 className="font-display px-1 pt-2 text-lg font-bold text-navy dark:text-white">Today&rsquo;s jobs</h2>
      {todays.map((b) => <JobCard key={b.id} job={ser(b)} />)}
      {todays.length === 0 && (
        <div className="card p-6 text-center text-sm text-soft">
          No jobs scheduled for today{upcoming.length > 0 ? ' — next up:' : '.'}
          {upcoming.length > 0 && (
            <ul className="mt-3 space-y-2 text-left">
              {upcoming.map((b) => (
                <li key={b.id} className="rounded-xl border border-line p-3 text-sm"><JobCard job={ser(b)} /></li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function safeArr(json: string): string[] {
  try { const a = JSON.parse(json); return Array.isArray(a) ? a.map(String) : []; } catch { return []; }
}
