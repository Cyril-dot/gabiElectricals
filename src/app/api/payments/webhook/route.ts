import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPaystackSignature } from '@/lib/gateway';

export const dynamic = 'force-dynamic';

/** POST /api/payments/webhook — Paystack async callback. Signature-verified + idempotent. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || '';
  if (!secret) return NextResponse.json({ received: true, note: 'no webhook secret configured' });
  if (!verifyPaystackSignature(secret, raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: { event?: string; data?: { status?: string; reference?: string; amount?: number } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }

  const ref = event.data?.reference;
  if (!ref) return NextResponse.json({ received: true });

  if (event.event === 'charge.success' || event.data?.status === 'success') {
    const payment = await prisma.payment.findUnique({ where: { reference: ref } });
    if (payment && payment.status !== 'PAID') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', confirmedAt: new Date(), events: { create: [{ type: 'WEBHOOK', note: 'Paystack charge.success' }] } },
      });
      const { applyPaidSideEffects } = await import('@/lib/gateway');
      await applyPaidSideEffects(payment.id);
    }
  }
  if (event.event === 'charge.failed') {
    const payment = await prisma.payment.findUnique({ where: { reference: ref } });
    if (payment && payment.status === 'PENDING') {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', events: { create: [{ type: 'WEBHOOK', note: 'Paystack charge.failed' }] } } });
    }
  }
  return NextResponse.json({ received: true });
}
