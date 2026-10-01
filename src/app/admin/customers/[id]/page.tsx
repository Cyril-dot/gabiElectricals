import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { ghs } from '@/lib/money';
import { StatusBadge, fmtDate, fmtDateTime } from '../../_ui';
import { WalletAdjust } from '../../_WalletAdjust';

export const dynamic = 'force-dynamic';

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch { redirect('/'); }
  const { id } = await params;
  const [user, orders, bookings, ledger, visits, referred] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { addresses: true, referredBy: { select: { name: true, referralCode: true } } } }),
    prisma.order.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 25, include: { _count: { select: { items: true } } } }),
    prisma.booking.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 15, include: { service: { select: { name: true } } } }),
    prisma.ledgerEntry.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.referralVisit.count({ where: { referrerId: id } }),
    prisma.user.count({ where: { referredById: id } }),
  ]);
  if (!user) notFound();

  const converted = await prisma.referralVisit.count({ where: { referrerId: id, converted: true } });
  const earned = ledger.filter(l => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  const lifetime = orders.filter(o => ['PAID', 'DELIVERED', 'OUT_FOR_DELIVERY', 'PROCESSING'].includes(o.status)).reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/customers" className="text-xs font-bold text-blue hover:underline">← Customers</Link>
          <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white md:text-3xl">{user.name}</h1>
          <p className="text-sm font-semibold text-soft">{user.email} · {user.phone ?? 'no phone'} · joined {fmtDate(user.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-extrabold">
          <span className="rounded-full bg-blue/10 px-3 py-1.5 text-blue">Lifetime spend {ghs(lifetime)}</span>
          <span className="rounded-full bg-success/15 px-3 py-1.5 text-success">Wallet {ghs(user.walletCredit)}</span>
          <span className={`rounded-full px-3 py-1.5 ${user.active ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>{user.active ? 'Active' : 'Disabled'}</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 font-display text-sm font-extrabold uppercase tracking-wide text-soft">Orders ({orders.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-line last:border-0 hover:bg-mist">
                      <td className="px-4 py-2.5"><Link href={`/admin/orders/${o.id}`} className="font-mono font-bold text-blue hover:underline">{o.orderNo}</Link></td>
                      <td className="px-4 py-2.5">{o._count.items} items</td>
                      <td className="px-4 py-2.5 font-bold">{ghs(o.total)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-soft">{fmtDate(o.createdAt)}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td className="px-4 py-6 text-center text-soft">No orders yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 font-display text-sm font-extrabold uppercase tracking-wide text-soft">Bookings ({bookings.length})</h2>
            <ul className="divide-y divide-line">
              {bookings.map(b => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-mist">
                  <Link href={`/admin/bookings?q=${b.bookingNo}`} className="font-mono font-bold text-blue hover:underline">{b.bookingNo}</Link>
                  <span className="flex-1 truncate">{b.service.name}</span>
                  <span className="text-xs text-soft">{fmtDate(b.date)}</span>
                  <StatusBadge status={b.status} />
                </li>
              ))}
              {bookings.length === 0 && <li className="px-4 py-6 text-center text-soft text-sm">No bookings yet.</li>}
            </ul>
          </section>

          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 font-display text-sm font-extrabold uppercase tracking-wide text-soft">Wallet ledger</h2>
            <ul className="divide-y divide-line text-sm">
              {ledger.map(l => (
                <li key={l.id} className="flex items-center justify-between gap-2 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{l.reason.replaceAll('_', ' ')}{l.refId ? ` · ${String(l.refId).slice(0, 8)}` : ''}</p>
                    <p className="text-xs text-soft">{fmtDateTime(l.createdAt)}</p>
                  </div>
                  <span className={`font-extrabold ${l.amount > 0 ? 'text-success' : 'text-danger'}`}>{l.amount > 0 ? '+' : ''}{l.amount.toFixed(2)}</span>
                  <span className="text-xs font-bold text-soft">bal {ghs(l.balanceAfter)}</span>
                </li>
              ))}
              {ledger.length === 0 && <li className="px-4 py-6 text-center text-soft">No ledger entries.</li>}
            </ul>
          </section>
        </div>

        <div className="space-y-4">
          <WalletAdjust userId={user.id} balance={user.walletCredit} />

          <section className="card p-4">
            <h2 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wide text-soft">Referral stats</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="font-semibold text-soft">Referral code</dt><dd className="font-mono font-extrabold text-blue">{user.referralCode}</dd></div>
              <div className="flex justify-between"><dt className="font-semibold text-soft">Link visits</dt><dd className="font-bold">{visits}</dd></div>
              <div className="flex justify-between"><dt className="font-semibold text-soft">Converted visits</dt><dd className="font-bold">{converted}</dd></div>
              <div className="flex justify-between"><dt className="font-semibold text-soft">Referred signups</dt><dd className="font-bold">{referred}</dd></div>
              <div className="flex justify-between"><dt className="font-semibold text-soft">Rewards earned</dt><dd className="font-bold text-success">{ghs(earned)}</dd></div>
              {user.referredBy && <div className="flex justify-between"><dt className="font-semibold text-soft">Referred by</dt><dd className="font-bold">{user.referredBy.name}</dd></div>}
              {user.commissionPct != null && <div className="flex justify-between"><dt className="font-semibold text-soft">Affiliate commission</dt><dd className="font-bold">{user.commissionPct}% · {user.tier ?? '—'}</dd></div>}
            </dl>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wide text-soft">Addresses</h2>
            <ul className="space-y-2 text-sm">
              {user.addresses.map(a => (
                <li key={a.id} className="rounded-xl border border-line p-3">
                  <p className="font-bold">{a.label}{a.isDefault && <span className="ml-2 text-[10px] font-extrabold uppercase text-gold-dark">Default</span>}</p>
                  <p className="text-soft">{a.city}, {a.region}</p>
                  <p className="text-xs text-soft">{a.landmark} · GPS {a.gps ?? '—'}</p>
                </li>
              ))}
              {user.addresses.length === 0 && <li className="text-soft">No saved addresses.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
