import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** GET /api/admin/marketing/export?kind=subscribers|leads|carts — CSV download */
export async function GET(req: NextRequest) {
  const session = await requireRole('ADMIN', 'SUPER_ADMIN').catch(() => null);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const kind = req.nextUrl.searchParams.get('kind') ?? 'subscribers';

  let head: string[] = [];
  let rows: unknown[][] = [];
  if (kind === 'subscribers') {
    const data = await prisma.subscription.findMany({ orderBy: { createdAt: 'desc' }, take: 5000 });
    head = ['email', 'active', 'joined'];
    rows = data.map((s) => [s.email, s.active, s.createdAt.toISOString()]);
  } else if (kind === 'leads') {
    const data = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 5000 });
    head = ['name', 'email', 'phone', 'source', 'status', 'created'];
    rows = data.map((l) => {
      let st = 'NEW';
      try { st = (JSON.parse(l.metaJson).status as string) ?? 'NEW'; } catch { /* default */ }
      return [l.name, l.email, l.phone, l.source, st, l.createdAt.toISOString()];
    });
  } else if (kind === 'carts') {
    const data = await prisma.abandonedCart.findMany({ orderBy: { updatedAt: 'desc' }, take: 2000 });
    head = ['email', 'phone', 'valueGhs', 'recovered', 'itemsJson', 'updated'];
    rows = data.map((c) => [c.email, c.phone, c.value, c.recovered, c.itemsJson, c.updatedAt.toISOString()]);
  } else {
    return NextResponse.json({ error: 'Unknown export kind' }, { status: 400 });
  }

  const body = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gabi-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
