import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logNotify, recordActivity } from '@/lib/notify';
import { staff, fail, ok } from '@/lib/ops-api';

const Schema = z.object({ paymentId: z.string().min(1), note: z.string().min(5).max(500) });

/** POST /api/admin/refunds — PAID → REFUNDED with admin note, order event + notify */
export async function POST(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Refund needs paymentId and an admin note (min 5 chars).');
  const { paymentId, note } = parsed.data;

  const p = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true, booking: true } });
  if (!p) return fail('Payment not found.', 404);
  if (p.status !== 'PAID') return fail('Only PAID payments can be refunded.');

  await prisma.payment.update({
    where: { id: p.id },
    data: { status: 'REFUNDED', refundNote: note, events: { create: [{ type: 'REFUND', note }] } },
  });
  if (p.order) {
    await prisma.order.update({ where: { id: p.order.id }, data: { status: 'REFUNDED' } });
    await prisma.orderEvent.create({ data: { orderId: p.order.id, status: 'REFUNDED', note: `Refund: ${note} (${p.reference})` } });
    await logNotify('SMS', p.order.phone, 'PAYMENT_REFUNDED', `GabiElectricals: Refund of GHS ${p.amount.toFixed(2)} processed for order ${p.order.orderNo}.`);
  } else if (p.booking) {
    await prisma.bookingEvent.create({ data: { bookingId: p.booking.id, status: p.booking.status, note: `Refund GHS ${p.amount.toFixed(2)} — ${note}` } });
    await logNotify('WHATSAPP', p.booking.contactPhone, 'PAYMENT_REFUNDED', `GabiElectricals: Refund of GHS ${p.amount.toFixed(2)} processed for booking ${p.booking.bookingNo}.`);
  } else {
    const to = p.payerPhone ?? p.payerEmail;
    if (to) await logNotify(p.payerPhone ? 'SMS' : 'EMAIL', to, 'PAYMENT_REFUNDED', `GabiElectricals: Refund of GHS ${p.amount.toFixed(2)} processed for ${p.reference}.`);
  }
  await recordActivity(g.user.userId, 'PAYMENT_REFUNDED', 'Payment', p.id, undefined, { note });
  return NextResponse.json({ ok: true, id: p.id });
}
