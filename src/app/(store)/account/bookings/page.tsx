import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ghs } from '@/lib/money';

export const dynamic = 'force-dynamic';

const BADGE: Record<string, string> = {
  REQUESTED: 'bg-warning/15 text-warning', CONFIRMED: 'bg-success/10 text-success', ASSIGNED: 'bg-blue/10 text-blue',
  ON_THE_WAY: 'bg-blue/10 text-blue', IN_PROGRESS: 'bg-gold/20 text-gold-dark', COMPLETED: 'bg-navy/10 text-navy dark:text-white',
  CANCELLED: 'bg-danger/10 text-danger', REVIEWED: 'bg-success/10 text-success',
};

export default async function AccountBookings() {
  const s = await getSession();
  if (!s) redirect('/login?next=/account/bookings');
  const bookings = await prisma.booking.findMany({
    where: { userId: s.userId }, orderBy: { createdAt: 'desc' }, take: 50,
    include: { service: { select: { name: true, slug: true } } },
  });

  return (
    <section aria-label="Service bookings" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display font-extrabold text-xl">Bookings <span className="text-soft font-semibold text-[14px]">({bookings.length})</span></h2>
        <Link href="/book" className="btn-gold px-4 py-2 text-[13px]">+ New booking</Link>
      </div>
      {bookings.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl" aria-hidden="true">🗓️</p>
          <p className="font-bold mt-2">No bookings yet</p>
          <p className="text-[13px] text-soft mt-1">Certified electricians, from ₵250 — fault finding, wiring, solar and more.</p>
          <Link href="/services" className="btn-primary mt-4 px-5 py-2.5 text-[13.5px] inline-flex">Browse services</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map(b => {
            const active = ['REQUESTED', 'CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS'].includes(b.status);
            const canManage = ['REQUESTED', 'CONFIRMED'].includes(b.status);
            return (
              <li key={b.id} className="card p-4">
                <div className="flex flex-wrap gap-2 justify-between items-start">
                  <div className="min-w-0">
                    <Link href={`/booking/${b.bookingNo}`} className="font-extrabold text-[14.5px] hover:text-blue">{b.service.name}</Link>
                    <p className="text-[11.5px] text-soft mt-0.5">{b.bookingNo} · {b.date.toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short' })} · {b.timeSlot} · {b.city}</p>
                  </div>
                  <span className={`text-[10.5px] font-black px-2 py-1 rounded-md shrink-0 ${BADGE[b.status]}`}>{b.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-line flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] text-soft">
                    {b.paymentMode === 'QUOTE' ? 'Quote requested' : b.paymentMode === 'AFTER' ? 'Pay after service' : `Total ${ghs(b.price)} · deposit ${ghs(b.depositDue)}`}
                    {b.rating ? ` · you rated ${b.rating}★` : ''}
                  </span>
                  <span className="flex gap-2">
                    {b.status === 'COMPLETED' && <Link href={`/booking/${b.bookingNo}`} className="btn-gold px-3 py-1.5 text-[12px]">Rate job ⭐</Link>}
                    {canManage && <Link href={`/booking/${b.bookingNo}`} className="btn-ghost px-3 py-1.5 text-[12px]">Reschedule / cancel</Link>}
                    <Link href={`/booking/${b.bookingNo}`} className="btn-primary px-3 py-1.5 text-[12px]">{active ? 'Track →' : 'Details →'}</Link>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
