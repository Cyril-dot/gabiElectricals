import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { parseRange, salesByDay, profitReport, servicesReport, referralsReport, toCsv, csvResponse } from '@/app/admin/_reports';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const u = new URL(req.url);
  const type = u.searchParams.get('type') ?? 'sales';
  const range = parseRange({ from: u.searchParams.get('from') ?? undefined, to: u.searchParams.get('to') ?? undefined });
  const stamp = `${range.from.toISOString().slice(0, 10)}_${range.to.toISOString().slice(0, 10)}`;

  if (type === 'sales') {
    const rows = await salesByDay(range);
    return csvResponse(`gabi-sales-${stamp}.csv`, toCsv(['day', 'orders', 'revenue_ghs'], rows.map(r => [r.day, r.orders, r.revenue])));
  }
  if (type === 'profit') {
    const { rows } = await profitReport(range);
    return csvResponse(`gabi-profit-${stamp}.csv`, toCsv(['sku', 'item', 'qty', 'revenue_ghs', 'cost_ghs', 'profit_ghs'], rows.map(r => [r.sku, r.name, r.qty, r.revenue, r.cost, r.profit])));
  }
  if (type === 'services') {
    const { rows } = await servicesReport(range);
    return csvResponse(`gabi-services-${stamp}.csv`, toCsv(['bookingNo', 'service', 'technician', 'completed', 'price_ghs'], rows.map(r => [r.bookingNo, r.service, r.tech, r.date, r.price])));
  }
  if (type === 'referrals') {
    const rows = await referralsReport(range);
    return csvResponse(`gabi-referrals-${stamp}.csv`, toCsv(['referrer', 'code', 'visits', 'converted', 'earned_ghs'], rows.map(r => [r.name, r.code, r.visits, r.converted, r.earned])));
  }
  return NextResponse.json({ error: 'type must be sales|profit|services|referrals' }, { status: 400 });
}
