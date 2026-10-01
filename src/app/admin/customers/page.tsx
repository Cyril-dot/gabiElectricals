import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ghs } from '@/lib/money';
import { Icon, ICONS, fmtDate } from '../_ui';

export const dynamic = 'force-dynamic';

const PAGE = 20;

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch { redirect('/'); }
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1);

  const where = q ? {
    role: 'CUSTOMER' as const,
    OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }],
  } : { role: 'CUSTOMER' as const };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE, take: PAGE,
      include: { _count: { select: { orders: true, bookings: true } } },
    }),
    prisma.user.count({ where }),
  ]);
  const spend = await prisma.order.groupBy({
    by: ['userId'],
    where: { userId: { in: users.map(u => u.id) }, status: { in: ['PAID', 'DELIVERED', 'OUT_FOR_DELIVERY', 'PROCESSING'] } },
    _sum: { total: true },
  });
  const spendOf = (id: string) => spend.find(s => s.userId === id)?._sum.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white md:text-3xl">Customers</h1>
        <p className="text-sm font-semibold text-soft">{total} customer{total === 1 ? '' : 's'} · page {page}/{pages}</p>
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <form className="relative min-w-[200px] flex-1" action="/admin/customers">
          <Icon d={ICONS.search} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
          <input name="q" defaultValue={q} placeholder="Search name, email or phone…" aria-label="Search customers"
            className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-blue dark:bg-navy" />
        </form>
        {pages > 1 && (
          <span className="flex items-center gap-1 text-xs font-bold text-soft">
            <Link href={`/admin/customers?q=${encodeURIComponent(q)}&page=${page - 1}`} className="btn-ghost px-2 py-1">‹</Link>
            {page}/{pages}
            <Link href={`/admin/customers?q=${encodeURIComponent(q)}&page=${Math.min(pages, page + 1)}`} className="btn-ghost px-2 py-1">›</Link>
          </span>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line bg-mist text-left text-[11px] font-bold uppercase tracking-wide text-soft">
                <th className="px-4 py-2.5">Customer</th><th className="px-4 py-2.5">Phone</th><th className="px-4 py-2.5 text-right">Orders</th>
                <th className="px-4 py-2.5 text-right">Bookings</th><th className="px-4 py-2.5 text-right">Lifetime spend</th>
                <th className="px-4 py-2.5 text-right">Wallet</th><th className="px-4 py-2.5">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-mist">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/customers/${u.id}`} className="font-bold text-blue hover:underline">{u.name}</Link>
                    <p className="text-xs text-soft">{u.email}</p>
                  </td>
                  <td className="px-4 py-2.5">{u.phone ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right font-bold">{u._count.orders}</td>
                  <td className="px-4 py-2.5 text-right">{u._count.bookings}</td>
                  <td className="px-4 py-2.5 text-right font-bold">{ghs(spendOf(u.id))}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${u.walletCredit > 0 ? 'text-success' : 'text-soft'}`}>{ghs(u.walletCredit)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-soft">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-soft">No customers found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
