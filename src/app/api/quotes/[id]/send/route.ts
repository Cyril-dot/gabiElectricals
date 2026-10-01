import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { logNotify, recordActivity } from '@/lib/notify';

export const dynamic = 'force-dynamic';

async function findQuote(idOrNo: string) {
  const byNo = idOrNo.startsWith('GQ-')
    ? await prisma.quote.findUnique({ where: { quoteNo: idOrNo } })
    : null;
  return byNo ?? (await prisma.quote.findUnique({ where: { id: idOrNo } }).catch(() => null));
}

/** POST /api/quotes/[id]/send — staff sends quote to customer (SMS + EMAIL notify, DRAFT→SENT) */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'); }
  catch { return NextResponse.json({ error: 'Staff login required' }, { status: 401 }); }

  const { id } = await ctx.params;
  const quote = await findQuote(id);
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  if (quote.status !== 'DRAFT' && quote.status !== 'SENT') {
    return NextResponse.json({ error: `Cannot re-send a ${quote.status.toLowerCase()} quote` }, { status: 409 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const link = `${site}/quote/${quote.quoteNo}`;
  const updated = await prisma.quote.update({ where: { id: quote.id }, data: { status: 'SENT' } });

  const msg = `GabiElectricals: Your quote ${quote.quoteNo} for ${quote.amount.toFixed(2)} GHS is ready. View & accept: ${link}`;
  await logNotify('SMS', quote.customerPhone, 'QUOTE_SENT', msg);
  if (quote.customerEmail) await logNotify('EMAIL', quote.customerEmail, 'QUOTE_SENT', `Your quote ${quote.quoteNo} (${quote.amount.toFixed(2)} GHS) is ready to accept: ${link}`);
  await recordActivity(null, 'QUOTE_SENT', 'QUOTE', quote.id, req.headers.get('x-forwarded-for') ?? undefined);

  return NextResponse.json({ ok: true, quoteNo: updated.quoteNo, status: updated.status, link });
}
