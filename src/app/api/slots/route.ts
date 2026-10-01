import { NextRequest, NextResponse } from 'next/server';
import { getAvailability } from '@/lib/booking';

export const dynamic = 'force-dynamic';

/** GET /api/slots?service=<slug>&from=YYYY-MM-DD&days=14 — free-slot availability engine */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const service = q.get('service');
  if (!service) return NextResponse.json({ error: 'service query param required' }, { status: 400 });
  const from = q.get('from') ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return NextResponse.json({ error: 'from must be YYYY-MM-DD' }, { status: 400 });
  const days = Math.min(Math.max(parseInt(q.get('days') ?? '14', 10) || 14, 1), 60);

  try {
    const all = await getAvailability(service, from, days);
    const demo = process.env.DEMO_MODE !== 'false';
    // only dates with capacity are interesting to the booker, but return blocked info too
    return NextResponse.json({
      service, from, days, demo,
      dates: all,
      available: all.filter(d => !d.blocked && d.totalRemaining > 0).map(d => d.date),
    });
  } catch (e) {
    console.error('slots error', e);
    return NextResponse.json({ error: 'Availability unavailable — try again' }, { status: 500 });
  }
}
