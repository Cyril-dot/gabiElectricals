import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { ghs } from '@/lib/money';
import CopyButton from './CopyButton';

export const dynamic = 'force-dynamic';

const ORDER_BADGE: Record<string, string> = {
  PENDING_PAYMENT: 'bg-warning/15 text-warning', PAID: 'bg-success/10 text-success', PROCESSING: 'bg-blue/10 text-blue',
  OUT_FOR_DELIVERY: 'bg-blue/10 text-blue', DELIVERED: 'bg-navy/10 text-navy dark:text-white', CANCELLED: 'bg-danger/10 text-danger',
  REFUNDED: 'bg-soft/10 text-soft', PARTIALLY_PAID: 'bg-warning/15 text-warning',
};
const BOOK_BADGE: Record<string, string> = {
  REQUESTED: 'bg-warning/15 text-warning', CONFIRMED: 'bg-success/10 text-success', ASSIGNED: 'bg-blue/10 text-blue',
  ON_THE_WAY: 'bg-blue/10 text-blue', IN_PROGRESS: 'bg-gold/20 text-gold-dark', COMPLETED: 'bg-navy/10 text-navy dark:text-white',
  CANCELLED: 'bg-danger/10 text-danger', REVIEWED: 'bg-success/10 text-success',
};

export default async function AccountOverview() {
  const s = await getSession();
  if (!s) redirect('/login?next=/account');

  const [orders, bookings, user, settings, pendingPayouts] = await Promise.all([
    prisma.order.findMany({ where: { userId: s.userId }, orderBy: { createdAt: 'desc' }, take: 4, include: { items: true } }),
    prisma.booking.findMany({ where: { userId: s.userId }, orderBy: { createdAt: 'desc' }, take: 3, include: { service: { select: { name: true } } } }),
    prisma.user.findUnique({ where: { id: s.userId }, select: { walletCredit: true, referralCode: true, name: true, email: true, phone: true } }),
    getSettings(),
    prisma.payoutRequest.count({ where: { userId: s.userId, status: 'PENDING' } }),
  ]);
  if (!user) redirect('/login?next=/account');

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const refLink = `${site}/r/${user.referralCode}`;

  return (
    <div className="space-y-5">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/account/orders" className="card p-4 hover:border-blue transition-colors">
          <p className="text-[11px] font-black uppercase tracking-wide text-soft">Orders</p>
          <p className="font-display text-2xl font-extrabold mt-1">{orders.length ? `${orders.length}+` : '0'}</p>
          <p className="text-[11.5px] text-soft mt-0.5">recent: {orders[0]?.orderNo ?? 'none yet'}</p>
        </Link>
        <Link href="/account/bookings" className="card p-4 hover:border-blue transition-colors">
          <p className="text-[11px] font-black uppercase tracking-wide text-soft">Bookings</p>
          <p className="font-display text-2xl font-extrabold mt-1">{bookings.length ? `${bookings.length}+` : '0'}</p>
          <p className="text-[11.5px] text-soft mt-0.5">{bookings[0]?.service.name ?? 'no services yet'}</p>
        </Link>
        <Link href="/account/referrals" className="card p-4 hover:border-blue transition-colors">
          <p className="text-[11px] font-black uppercase tracking-wide text-soft">Wallet credit</p>
          <p className="font-display text-2xl font-extrabold mt-1 text-gold-dark">{ghs(user.walletCredit)}</p>
          <p className="text-[11.5px] text-soft mt-0.5">{pendingPayouts ? `${pendingPayouts} payout pending` : `min payout ${ghs(settings.referral.minPayout, { cents: false })}`}</p>
        </Link>
        <Link href="/account/referrals" className="card p-4 hover:border-blue transition-colors">
          <p className="text-[11px] font-black uppercase tracking-wide text-soft">Referral code</p>
          <p className="font-display text-2xl font-extrabold mt-1 text-blue">{user.referralCode}</p>
          <p className="text-[11.5px] text-soft mt-0.5">earn {ghs(settings.referral.referrerReward)}/friend</p>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Recent orders */}
        <section aria-labelledby="ro-h" className="card p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 id="ro-h" className="font-display font-extrabold">Recent orders</h2>
            <Link href="/account/orders" className="text-[12.5px] font-bold text-blue hover:underline">All orders →</Link>
          </div>
          {orders.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl" aria-hidden="true">📦</p>
              <p className="text-[13px] text-soft mt-2">No orders yet.</p>
              <Link href="/shop" className="btn-primary mt-3 px-4 py-2 text-[13px] inline-flex">Shop the catalog</Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {orders.map(o => (
                <li key={o.id} className="py-2.5 flex items-center gap-3">
                  <span className="flex -space-x-3 shrink-0" aria-hidden="true">
                    {o.items.slice(0, 2).map(it => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={it.id} src={it.image ?? '/icon.svg'} alt="" className="h-9 w-9 rounded-lg border border-line bg-mist object-contain" />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link href={`/order/${o.orderNo}`} className="block font-bold text-[13.5px] hover:text-blue">{o.orderNo}</Link>
                    <span className="block text-[11.5px] text-soft">{o.items.length} item{o.items.length !== 1 ? 's' : ''} · {new Date(o.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className={`block text-[10.5px] font-black px-1.5 py-0.5 rounded-md ${ORDER_BADGE[o.status] ?? 'bg-mist text-soft'}`}>{o.status.replace(/_/g, ' ')}</span>
                    <span className="block font-extrabold text-[13px] mt-1">{ghs(o.total)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent bookings */}
        <section aria-labelledby="rb-h" className="card p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 id="rb-h" className="font-display font-extrabold">Recent bookings</h2>
            <Link href="/account/bookings" className="text-[12.5px] font-bold text-blue hover:underline">All bookings →</Link>
          </div>
          {bookings.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl" aria-hidden="true">🗓️</p>
              <p className="text-[13px] text-soft mt-2">No service bookings yet.</p>
              <Link href="/book" className="btn-gold mt-3 px-4 py-2 text-[13px] inline-flex">Book an electrician</Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {bookings.map(b => (
                <li key={b.id} className="py-2.5 flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <Link href={`/booking/${b.bookingNo}`} className="block font-bold text-[13.5px] hover:text-blue">{b.service.name}</Link>
                    <span className="block text-[11.5px] text-soft">{b.bookingNo} · {b.date.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })} · {b.timeSlot}</span>
                  </span>
                  <span className={`text-[10.5px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${BOOK_BADGE[b.status]}`}>{b.status.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Referral quick copy */}
      <section aria-labelledby="rr-h" className="card p-5 bg-navy text-white border-navy">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 id="rr-h" className="font-display font-extrabold">Invite friends, earn wallet credit</h2>
            <p className="text-[12.5px] text-white/70 mt-0.5">{ghs(settings.referral.friendReward)} off for them · {ghs(settings.referral.referrerReward)} for you when they pay.</p>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <code className="truncate bg-white/10 rounded-lg px-3 py-2 text-[12.5px]">{refLink}</code>
            <CopyButton text={refLink} label="Copy" dark />
            <Link href="/account/referrals" className="btn-gold px-4 py-2 text-[13px] shrink-0">Open →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
