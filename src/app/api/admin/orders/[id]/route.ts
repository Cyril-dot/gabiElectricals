import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { recordActivity } from '@/lib/notify';
import { applyPaidSideEffects } from '@/lib/gateway';
import { rateLimit, ipOf } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['PROCESSING', 'CANCELLED'],
  PARTIALLY_PAID: ['CANCELLED'],
  PAID: ['PROCESSING', 'REFUNDED', 'CANCELLED'],
  PROCESSING: ['OUT_FOR_DELIVERY', 'CANCELLED', 'REFUNDED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};
export { TRANSITIONS };

async function guard(req: Request, bucket: string) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch {
    return { res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }
  const ip = ipOf(req);
  const rl = rateLimit(`admin:order:${bucket}:${ip}`, 40, 60_000);
  if (!rl.ok) return { res: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) } as const;
  return { ip } as const;
}

const PatchSchema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'PAID', 'PARTIALLY_PAID', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await guard(req, 'status');
  if (g.res) return g.res;

  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid status or note' }, { status: 400 });
  const { status, note } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (status === order.status) return NextResponse.json({ ok: true, unchanged: true });
  if (status === 'PAID' || status === 'PARTIALLY_PAID' || status === 'PENDING_PAYMENT') {
    return NextResponse.json({ error: 'PAID is set by recorded payments — use “Mark paid (cash)”. Payment reversal must go through refunds.' }, { status: 400 });
  }
  if (!(TRANSITIONS[order.status] ?? []).includes(status)) {
    return NextResponse.json({ error: `Cannot move ${order.status.replaceAll('_', ' ')} → ${status.replaceAll('_', ' ')}` }, { status: 400 });
  }
  if ((status === 'CANCELLED' || status === 'REFUNDED') && !note) {
    return NextResponse.json({ error: 'A note is required when cancelling or refunding' }, { status: 400 });
  }

  const refundPayment = status === 'REFUNDED';
  const result = await prisma.$transaction(async tx => {
    const u = await tx.order.update({ where: { id }, data: { status } });
    await tx.orderEvent.create({ data: { orderId: id, status, note: note ?? (refundPayment ? 'Refunded from admin' : 'Status updated by admin') } });
    if (refundPayment) {
      await tx.payment.updateMany({ where: { orderId: id, status: 'PAID' }, data: { status: 'REFUNDED', refundNote: note ?? 'Admin refund' } });
    }
    if (status === 'CANCELLED') {
      await tx.payment.updateMany({ where: { orderId: id, status: { in: ['PENDING', 'AWAITING_APPROVAL'] } }, data: { status: 'EXPIRED' } });
    }
    return u;
  });
  await recordActivity(null, refundPayment ? 'ORDER_REFUNDED' : 'ORDER_STATUS_CHANGED', 'ORDER', id, g.ip, { from: order.status, to: status, note });
  return NextResponse.json({ ok: true, order: result });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await guard(req, 'cash');
  if (g.res) return g.res;

  const order = await prisma.order.findUnique({ where: { id }, include: { payments: true } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status === 'DELIVERED' || order.status === 'REFUNDED' || order.status === 'CANCELLED') {
    return NextResponse.json({ error: `Cannot record cash on a ${order.status} order` }, { status: 400 });
  }

  const reference = `GE_CASH_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const payment = await prisma.payment.create({
    data: {
      reference, amount: Math.max(0, order.total - (order.payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0))),
      status: 'PAID', method: 'CASH', provider: 'MOCK', orderId: order.id,
      payerPhone: order.phone, payerEmail: order.email,
      metaJson: JSON.stringify({ note: 'Cash collected — marked paid by admin', ip: g.ip }),
      confirmedAt: new Date(),
      events: { create: [{ type: 'SUCCESS', note: 'Admin cash mark-paid' }] },
    },
  });
  await applyPaidSideEffects(payment.id);
  if (order.status === 'PARTIALLY_PAID') {
    await prisma.order.update({ where: { id }, data: { status: 'PAID', invoiceNo: order.invoiceNo ?? `INV-${order.orderNo.slice(3)}` } });
    await prisma.orderEvent.create({ data: { orderId: id, status: 'PAID', note: `Cash payment ${reference}` } });
  }
  await recordActivity(null, 'ORDER_MARKED_PAID_CASH', 'ORDER', id, g.ip, { reference, amount: payment.amount });
  return NextResponse.json({ ok: true, paymentId: payment.id, reference });
}
