import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ghs } from '@/lib/money';
import { fetchLibertePayBalances } from '@/lib/gateway';
import { GATEWAY_PORTAL_SNAPSHOT } from '@/lib/gateway-snapshot';
import { Icon, ICONS, StatusBadge, fmtDateTime } from './_ui';
import { SalesChart } from './_Chart';

export const dynamic = 'force-dynamic';

function Kpi({ label, value, sub, href, tone = 'text-ink' }: { label: string; value: string; sub?: string; href: string; tone?: string }) {
  return (
    <Link href={href} className="card group p-4 transition-shadow hover:shadow-pop">
      <p className="text-[11px] font-bold uppercase tracking-wide text-soft">{label}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold md:text-[28px] ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs font-semibold text-soft group-hover:text-blue">{sub}</p>}
    </Link>
  );
}

export default async function AdminOverview() {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const d14 = new Date(now.getTime() - 13 * 86400000);
  d14.setHours(0, 0, 0, 0);

  const [orderCount, bookingCount, deliveredCount, lowStock, pendingApprovals, recentOrders, recentBookings, chartOrders] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: d30 } } }),
    prisma.booking.count({ where: { createdAt: { gte: d30 } } }),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.product.count({ where: { stock: { lte: 5 }, status: 'PUBLISHED' } }),
    prisma.payment.count({ where: { status: 'AWAITING_APPROVAL' } }),
    prisma.order.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } }, items: { select: { qty: true, name: true, image: true } } } }),
    prisma.booking.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { service: { select: { name: true } } } }),
    prisma.order.findMany({
      where: { status: { in: ['PAID', 'DELIVERED', 'OUT_FOR_DELIVERY', 'PROCESSING'] }, updatedAt: { gte: d14 } },
      select: { total: true, updatedAt: true },
    }),
  ]);

  /* Revenue is the money actually collected through the payment
     gateway — read live from the collections wallet (the same
     figure the merchant portal shows), never a sum of the store's
     demo-era payment rows. The last verified portal figure
     (gateway-snapshot.ts) is the silent fallback if the live read
     is unavailable. soldItems feeds the Top products panel. */
  const [balances, soldItems] = await Promise.all([
    fetchLibertePayBalances(),
    prisma.orderItem.findMany({
      where: { order: { status: { in: ['PAID', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED'] } } },
      select: { name: true, image: true, price: true, qty: true, productId: true, orderId: true },
    }),
  ]);

  const gatewayRevenue = balances.collections ?? GATEWAY_PORTAL_SNAPSHOT.collectionsGhs;

  const productMap = new Map<string, { name: string; image: string | null; productId: string | null; units: number; revenue: number; orderIds: Set<string> }>();
  for (const it of soldItems) {
    const key = it.productId ?? it.name;
    const e = productMap.get(key) ?? { name: it.name, image: it.image, productId: it.productId, units: 0, revenue: 0, orderIds: new Set<string>() };
    e.units += it.qty;
    e.revenue += it.price * it.qty;
    e.orderIds.add(it.orderId);
    if (!e.image && it.image) e.image = it.image;
    productMap.set(key, e);
  }
  const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  const aov = deliveredCount > 0
    ? (await prisma.order.aggregate({ where: { status: 'DELIVERED' }, _avg: { total: true } }))._avg.total ?? 0
    : 0;

  const byDay = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(d14.getTime() + i * 86400000);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of chartOrders) {
    const k = o.updatedAt.toISOString().slice(0, 10);
    if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + o.total);
  }
  const chartData = [...byDay.entries()].map(([day, v]) => ({ day: day.slice(5), sales: Math.round(v) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white md:text-3xl">Overview</h1>
          <p className="text-sm font-semibold text-soft">Business pulse for the last 30 days.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products/new" className="btn-primary px-4 py-2 text-sm"><Icon d={ICONS.plus} /> New product</Link>
          <Link href="/admin/orders" className="btn-ghost px-4 py-2 text-sm">Manage orders</Link>
          <Link href="/admin/bookings" className="btn-ghost px-4 py-2 text-sm">Bookings</Link>
          <Link href="/admin/reports" className="btn-ghost px-4 py-2 text-sm">Reports</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Revenue" value={ghs(gatewayRevenue, { cents: false })} sub="Collected via mobile money" href="/admin/reports" tone="text-navy dark:text-white" />
        <Kpi label="Orders · 30d" value={String(orderCount)} sub="All statuses" href="/admin/orders" />
        <Kpi label="Bookings · 30d" value={String(bookingCount)} sub="Service requests" href="/admin/bookings" />
        <Kpi label="Avg order value" value={ghs(aov, { cents: false })} sub={`${deliveredCount} delivered`} href="/admin/reports" />
        <Kpi label="Low stock" value={String(lowStock)} sub="≤ 5 units — restock" href="/admin/products?low=1" tone={lowStock > 0 ? 'text-warning' : 'text-success'} />
        <Kpi label="Transfer approvals" value={String(pendingApprovals)} sub="Awaiting review" href="/admin/payments?status=AWAITING_APPROVAL" tone={pendingApprovals > 0 ? 'text-danger' : 'text-success'} />
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-extrabold text-navy dark:text-white">Top products by revenue</h2>
          <Link href="/admin/products" className="text-xs font-bold text-blue hover:underline">All products →</Link>
        </div>
        <ul className="grid gap-2.5 md:grid-cols-2">
          {topProducts.map((p, i) => (
            <li key={p.productId ?? p.name}>
              <Link href={p.productId ? `/admin/products/${p.productId}` : '/admin/products'} className="flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-blue">
                <span className="w-5 shrink-0 text-center font-display text-sm font-extrabold text-soft">{i + 1}</span>
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-mist font-display text-lg font-extrabold text-navy dark:text-white">{p.name.slice(0, 1)}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-soft">{p.units} sold · {p.orderIds.size} order{p.orderIds.size === 1 ? '' : 's'}</p>
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-mist">
                    <span className="block h-full rounded-full bg-[#22D3EE]" style={{ width: `${Math.max(4, Math.round((p.revenue / (topProducts[0]?.revenue || 1)) * 100))}%` }} />
                  </span>
                </div>
                <span className="shrink-0 font-display text-[15px] font-extrabold text-navy dark:text-white">{ghs(p.revenue)}</span>
              </Link>
            </li>
          ))}
          {topProducts.length === 0 && <li className="text-sm text-soft">No product sales yet.</li>}
        </ul>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="card p-4 xl:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-base font-extrabold text-navy dark:text-white">14-day sales</h2>
            <Link href="/admin/reports" className="text-xs font-bold text-blue hover:underline">Full report →</Link>
          </div>
          <SalesChart data={chartData} />
        </div>

        <div className="card p-4 xl:col-span-2">
          <h2 className="mb-3 font-display text-base font-extrabold text-navy dark:text-white">Latest bookings</h2>
          <ul className="space-y-2.5">
            {recentBookings.map(b => (
              <li key={b.id}>
                <Link href={`/admin/bookings?q=${b.bookingNo}`} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3 transition-colors hover:border-blue">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{b.service.name}</p>
                    <p className="text-xs text-soft">{b.contactName} · {b.city}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              </li>
            ))}
            {recentBookings.length === 0 && <li className="text-sm text-soft">No bookings yet.</li>}
          </ul>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-display text-base font-extrabold text-navy dark:text-white">Recent orders</h2>
          <Link href="/admin/orders" className="text-xs font-bold text-blue hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-y border-line bg-mist text-left text-[11px] font-bold uppercase tracking-wide text-soft">
                <th className="px-4 py-2">Order</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Products</th>
                <th className="px-4 py-2">Total</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Placed</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-mist">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/orders/${o.id}`} className="font-bold text-blue hover:underline">{o.orderNo}</Link>
                  </td>
                  <td className="px-4 py-2.5">{o.user?.name ?? o.email}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex shrink-0 gap-1">
                        {o.items.slice(0, 3).map((it, idx) => it.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={idx} src={it.image} alt="" className="h-8 w-8 rounded-md object-cover" />
                        ) : (
                          <span key={idx} className="flex h-8 w-8 items-center justify-center rounded-md bg-mist text-[10px] font-extrabold text-navy dark:text-white">{it.name.slice(0, 1)}</span>
                        ))}
                      </span>
                      <span className="min-w-0">
                        <span className="block max-w-[230px] truncate font-semibold">
                          {o.items[0]?.name ?? '—'}{o.items[0] && o.items[0].qty > 1 ? ` ×${o.items[0].qty}` : ''}
                        </span>
                        <span className="block text-xs text-soft">
                          {o.items.length > 1
                            ? `+${o.items.length - 1} more product${o.items.length > 2 ? 's' : ''} · ${o.items.reduce((s, i) => s + i.qty, 0)} items`
                            : `${o.items.reduce((s, i) => s + i.qty, 0)} item${o.items.reduce((s, i) => s + i.qty, 0) === 1 ? '' : 's'}`}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-bold">{ghs(o.total)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-soft">{fmtDateTime(o.createdAt)}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-soft">No orders yet — seed demo data to explore.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
