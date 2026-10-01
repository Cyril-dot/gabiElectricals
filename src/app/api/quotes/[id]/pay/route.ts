import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { initiatePayment, type GatewayMethod } from '@/lib/gateway';
import { logNotify, recordActivity } from '@/lib/notify';
import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

async function findQuote(idOrNo: string) {
  const byNo = idOrNo.startsWith('GQ-') ? await prisma.quote.findUnique({ where: { quoteNo: idOrNo } }) : null;
  return byNo ?? (await prisma.quote.findUnique({ where: { id: idOrNo } }).catch(() => null));
}

async function customerMatches(q: { customerPhone: string; customerEmail: string | null }, phone?: string, email?: string) {
  const s = await getSession();
  if (s && ['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(s.role)) return true;
  const clean = (x: string) => x.replace(/\s/g, '');
  if (phone && clean(phone).endsWith(clean(q.customerPhone).slice(-7))) return true;
  if (email && q.customerEmail && email.toLowerCase() === q.customerEmail.toLowerCase()) return true;
  return false;
}

/** POST /api/quotes/[id]/pay — accept & pay: verify, create PaymentLink + initiatePayment.
 *  PATCH — {action:'accept'|'decline'} without paying (accept) or reject (decline). */
const PaySchema = z.object({
  method: z.enum(['MOMO_MTN', 'MOMO_TELECEL', 'MOMO_AT', 'CARD', 'BANK_TRANSFER', 'GHIPSS', 'QR', 'MANUAL_TRANSFER']).default('MOMO_MTN'),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const quote = await findQuote(id);
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

  if (quote.status === 'PAID') return NextResponse.json({ error: 'Quote already paid' }, { status: 409 });
  if (['DECLINED', 'EXPIRED'].includes(quote.status)) return NextResponse.json({ error: `This quote is ${quote.status.toLowerCase()}` }, { status: 409 });
  if (quote.validUntil && quote.validUntil < new Date()) {
    await prisma.quote.update({ where: { id: quote.id }, data: { status: 'EXPIRED' } });
    return NextResponse.json({ error: 'This quote has expired — ask us for a fresh one' }, { status: 410 });
  }

  const parsed = PaySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payment request' }, { status: 422 });
  const { method, phone, email } = parsed.data;

  if (!(await customerMatches(quote, phone, email))) {
    return NextResponse.json({ error: 'Phone or email does not match this quote' }, { status: 403 });
  }

  const link = await prisma.paymentLink.create({
    data: {
      code: `Q${randomBytes(4).toString('hex').toUpperCase()}`,
      label: `Quote ${quote.quoteNo} — ${quote.description.slice(0, 40)}`,
      amount: quote.amount, forType: 'QUOTE', forId: quote.id,
      description: quote.description,
      createdBy: (await getSession())?.userId ?? null,
      expiresAt: quote.validUntil ?? null,
    },
  });

  const pay = await initiatePayment({
    amount: quote.amount,
    email: email || quote.customerEmail || `quote-${quote.quoteNo}@gabielectricals.local`,
    phone: phone || quote.customerPhone,
    method: method as GatewayMethod,
    linkId: link.id,
    meta: { quoteNo: quote.quoteNo },
  });

  if (quote.status !== 'ACCEPTED') {
    await prisma.quote.update({ where: { id: quote.id }, data: { status: 'ACCEPTED' } });
    await logNotify('SMS', quote.customerPhone, 'QUOTE_ACCEPTED', `GabiElectricals: Quote ${quote.quoteNo} accepted — completing payment of ${quote.amount.toFixed(2)} GHS.`, undefined);
  }
  await recordActivity((await getSession())?.userId ?? null, 'QUOTE_PAYMENT_INITIATED', 'QUOTE', quote.id, undefined, { reference: pay.reference, method });

  return NextResponse.json({ ok: true, reference: pay.reference, qrPayload: pay.qrPayload, prompt: pay.prompt, pollUrl: pay.pollUrl, amount: quote.amount, quoteNo: quote.quoteNo, linkCode: link.code }, { status: 201 });
}

const PatchSchema = z.object({ action: z.enum(['accept', 'decline']), phone: z.string().optional(), email: z.string().optional(), reason: z.string().max(300).optional() });

/** GET /api/quotes/[id]/pay?ref=GE_PAY_x — poll payment; when PAID, mark quote PAID + log notify (payment side effects) */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ref = req.nextUrl.searchParams.get('ref');
  const quote = await findQuote(id);
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  if (!ref) return NextResponse.json({ status: quote.status });

  const payment = await prisma.payment.findUnique({ where: { reference: ref } });
  if (!payment) return NextResponse.json({ error: 'payment not found' }, { status: 404 });

  if (payment.status === 'PAID' && quote.status !== 'PAID') {
    await prisma.quote.update({ where: { id: quote.id }, data: { status: 'PAID' } });
    if (payment.linkId) await prisma.paymentLink.update({ where: { id: payment.linkId }, data: { status: 'PAID' } });
    await logNotify('SMS', quote.customerPhone, 'QUOTE_PAID', `GabiElectricals: Payment of ${quote.amount.toFixed(2)} GHS received for quote ${quote.quoteNo}. Our team will begin scheduling — thank you!`);
    if (quote.customerEmail) await logNotify('EMAIL', quote.customerEmail, 'QUOTE_PAID', `Quote ${quote.quoteNo} is paid. Receipt included; work scheduling starts now.`);
    await recordActivity(null, 'QUOTE_PAID', 'QUOTE', quote.id, undefined, { reference: ref });
    return NextResponse.json({ status: 'PAID', quoteStatus: 'PAID', reference: ref });
  }
  return NextResponse.json({ status: payment.status, quoteStatus: quote.status, reference: ref });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const quote = await findQuote(id);
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 422 });
  const { action, phone, email, reason } = parsed.data;
  if (!(await customerMatches(quote, phone, email))) return NextResponse.json({ error: 'Not authorized for this quote' }, { status: 403 });
  if (['PAID', 'DECLINED', 'EXPIRED'].includes(quote.status)) return NextResponse.json({ error: `Quote is already ${quote.status.toLowerCase()}` }, { status: 409 });

  const status = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
  await prisma.quote.update({ where: { id: quote.id }, data: { status } });
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  await logNotify('SMS', quote.customerPhone, 'QUOTE_UPDATED',
    action === 'accept'
      ? `GabiElectricals: Quote ${quote.quoteNo} marked accepted. Pay here: ${site}/quote/${quote.quoteNo}`
      : `GabiElectricals: Quote ${quote.quoteNo} declined — thanks for letting us know. Call us anytime for other options.`, undefined);
  await recordActivity((await getSession())?.userId ?? null, action === 'accept' ? 'QUOTE_ACCEPTED' : 'QUOTE_DECLINED', 'QUOTE', quote.id, undefined, { reason });
  return NextResponse.json({ ok: true, status });
}
