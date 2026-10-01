import { prisma } from '@/lib/db';
import { round2 } from '@/lib/money';

export type Range = { from: Date; to: Date };

export function parseRange(sp: Record<string, string | undefined>): Range {
  const day = 86400000;
  const now = new Date();
  const from = sp.from && !Number.isNaN(Date.parse(sp.from)) ? new Date(sp.from) : new Date(now.getTime() - 30 * day);
  const to = sp.to && !Number.isNaN(Date.parse(sp.to)) ? new Date(new Date(sp.to).getTime() + day - 1) : now;
  return { from, to };
}

const PAID_STATUSES = ['PAID', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_PAID'] as const;

export async function salesByDay({ from, to }: Range) {
  const orders = await prisma.order.findMany({
    where: { status: { in: [...PAID_STATUSES] }, updatedAt: { gte: from, lte: to } },
    select: { orderNo: true, total: true, updatedAt: true, status: true },
    orderBy: { updatedAt: 'asc' },
  });
  const byDay = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const k = o.updatedAt.toISOString().slice(0, 10);
    const cur = byDay.get(k) ?? { orders: 0, revenue: 0 };
    byDay.set(k, { orders: cur.orders + 1, revenue: round2(cur.revenue + o.total) });
  }
  return [...byDay.entries()].map(([day, v]) => ({ day, ...v }));
}

export async function profitReport({ from, to }: Range) {
  const items = await prisma.orderItem.findMany({
    where: { order: { status: { in: [...PAID_STATUSES] }, updatedAt: { gte: from, lte: to } } },
    select: { name: true, qty: true, price: true, product: { select: { costPrice: true, sku: true } } },
  });
  let revenue = 0, cost = 0;
  const rows = items.map(i => {
    const r = round2(i.price * i.qty);
    const c = round2((i.product?.costPrice ?? 0) * i.qty);
    revenue += r; cost += c;
    return { sku: i.product?.sku ?? '—', name: i.name, qty: i.qty, revenue: r, cost: c, profit: round2(r - c) };
  });
  return { rows, revenue: round2(revenue), cost: round2(cost), profit: round2(revenue - cost) };
}

export async function servicesReport({ from, to }: Range) {
  const bookings = await prisma.booking.findMany({
    where: { status: { in: ['COMPLETED', 'REVIEWED'] }, updatedAt: { gte: from, lte: to } },
    select: { bookingNo: true, price: true, updatedAt: true, service: { select: { name: true } }, technician: { include: { user: { select: { name: true } } } } },
    orderBy: { updatedAt: 'asc' },
  });
  const total = round2(bookings.reduce((s, b) => s + b.price, 0));
  return { rows: bookings.map(b => ({ bookingNo: b.bookingNo, service: b.service.name, tech: b.technician?.user.name ?? '—', date: b.updatedAt.toISOString().slice(0, 10), price: b.price })), total, count: bookings.length };
}

export async function referralsReport({ from, to }: Range) {
  const [visits, ledger] = await Promise.all([
    prisma.referralVisit.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { referrerId: true, converted: true, createdAt: true } }),
    prisma.ledgerEntry.findMany({
      where: { reason: { in: ['REFERRAL_BONUS', 'ORDER_REWARD'] }, createdAt: { gte: from, lte: to } },
      include: { user: { select: { name: true, referralCode: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  const perUser = new Map<string, { name: string; code: string; visits: number; converted: number; earned: number }>();
  for (const v of visits) {
    const cur = perUser.get(v.referrerId);
    perUser.set(v.referrerId, {
      name: cur?.name ?? '—', code: cur?.code ?? '',
      visits: (cur?.visits ?? 0) + 1, converted: (cur?.converted ?? 0) + (v.converted ? 1 : 0), earned: cur?.earned ?? 0,
    });
  }
  for (const l of ledger) {
    const cur = perUser.get(l.userId);
    const base = cur ?? { name: l.user.name, code: l.user.referralCode, visits: 0, converted: 0, earned: 0 };
    perUser.set(l.userId, { ...base, name: l.user.name, code: l.user.referralCode, earned: round2(base.earned + l.amount) });
  }
  return [...perUser.values()].sort((a, b) => b.earned - a.earned);
}

export function toCsv(head: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v ?? '';
    return /[",\n]/.test(String(s)) ? `"${String(s).replaceAll('"', '""')}"` : String(s);
  };
  return [head.join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` },
  });
}
