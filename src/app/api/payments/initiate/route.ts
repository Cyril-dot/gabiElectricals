import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { initiatePayment, type GatewayMethod } from '@/lib/gateway';
import { normalizeGhPhone } from '@/lib/ghana';
import { rateLimit, ipOf } from '@/lib/rate-limit';

const Schema = z.object({
  orderNo: z.string().min(4).max(24),
  method: z.enum(['MOMO_MTN', 'MOMO_TELECEL', 'MOMO_AT', 'CARD', 'BANK_TRANSFER', 'GHIPSS', 'QR', 'MANUAL_TRANSFER']),
  phone: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const rl = rateLimit(`payinit:${ipOf(req)}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` }, { status: 429 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payment request.' }, { status: 400 });
  const { orderNo, method } = parsed.data;

  const order = await prisma.order.findUnique({ where: { orderNo }, include: { payments: true } });
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PARTIALLY_PAID') {
    return NextResponse.json({ error: 'This order is already paid or closed.' }, { status: 409 });
  }
  const paid = order.payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const due = Math.max(0.01, Math.round((order.total - paid) * 100) / 100);
  const phone = parsed.data.phone ? normalizeGhPhone(parsed.data.phone) : null;
  if (method.startsWith('MOMO') && parsed.data.phone && !phone) {
    return NextResponse.json({ error: 'Enter a valid MoMo number (e.g. 024 123 4567).' }, { status: 400 });
  }

  const res = await initiatePayment({ amount: due, email: order.email, phone: phone ?? order.phone, method: method as GatewayMethod, orderId: order.id, meta: { orderNo, payNow: true } });
  return NextResponse.json({ ok: true, reference: res.reference, status: res.status, prompt: res.prompt, qrPayload: res.qrPayload, pollUrl: res.pollUrl, expiresAt: res.expiresAt, amount: due });
}
