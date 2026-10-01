import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getQuoteEstimate, URGENCIES, type UrgencyKey } from '@/lib/booking';

export const dynamic = 'force-dynamic';

/** GET /api/bookings/estimate?service=<slug>&urgency=URGENT — server-authoritative price preview */
export async function GET(req: NextRequest) {
  const service = req.nextUrl.searchParams.get('service');
  const urgency = (req.nextUrl.searchParams.get('urgency') ?? 'STANDARD').toUpperCase() as UrgencyKey;
  if (!service) return NextResponse.json({ error: 'service required' }, { status: 400 });
  if (!URGENCIES.includes(urgency)) return NextResponse.json({ error: 'unknown urgency' }, { status: 400 });
  const svc = await prisma.service.findUnique({ where: { slug: service }, select: { id: true, active: true } });
  if (!svc || !svc.active) return NextResponse.json({ error: 'Unknown service' }, { status: 404 });
  const est = await getQuoteEstimate(svc.id, urgency);
  if (!est) return NextResponse.json({ error: 'Pricing error' }, { status: 500 });
  return NextResponse.json(est);
}
