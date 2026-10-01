import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge, fmtDateTime } from '../_ui';
import { OrdersToolbar } from '../_OrdersToolbar';
import { OrderRow } from '../_OrderRow';

export const dynamic = 'force-dynamic';

const STATUSES = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_PAID'] as const;
type OrderStatusValue = (typeof STATUSES)[number];
const PAGE = 15;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch { redirect('/'); }
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const status: OrderStatusValue | undefined = (STATUSES as readonly string[]).includes(sp.status ?? '') ? (sp.status! as OrderStatusValue) : undefined;
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1);

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? {
      OR: [
        { orderNo: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } },
        { user: { name: { contains: q } } },
      ],
    } : {}),
  };

  const [orders, total, counts] = await Promise.all([
    prisma.order.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE, take: PAGE,
      include: {
        user: { select: { name: true } }, items: true,
        payments: { select: { method: true, status: true, amount: true } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const countOf = (s: string) => counts.find(c => c.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white md:text-3xl">Orders</h1>
          <p className="text-sm font-semibold text-soft">{total} order{total === 1 ? '' : 's'} · page {page}/{pages}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-success/15 px-3 py-1.5 text-success">{countOf('PAID') + countOf('DELIVERED') + countOf('OUT_FOR_DELIVERY') + countOf('PROCESSING')} paid-flow</span>
          <span className="rounded-full bg-warning/15 px-3 py-1.5 text-warning">{countOf('PENDING_PAYMENT')} awaiting payment</span>
        </div>
      </div>

      <OrdersToolbar query={q} status={status ?? ''} page={page} pages={pages} />

      <div className="space-y-2">
        {orders.map(o => (
          <OrderRow key={o.id} order={{
            id: o.id, orderNo: o.orderNo, email: o.email, phone: o.phone, name: o.user?.name ?? null,
            status: o.status, total: o.total, createdAt: o.createdAt.toISOString(),
            itemCount: o.items.length,
            items: o.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
            payments: o.payments.map(p => ({ method: p.method, status: p.status, amount: p.amount })),
          }} />
        ))}
        {orders.length === 0 && <div className="card p-8 text-center text-sm font-semibold text-soft">No orders match. <Link className="text-blue underline" href="/admin/orders">Clear filters</Link></div>}
      </div>
    </div>
  );
}
