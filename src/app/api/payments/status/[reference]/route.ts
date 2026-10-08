import { NextRequest, NextResponse } from 'next/server';
import { prisma, DEMO_MODE } from '@/lib/db';
import { refreshLibertePayPaymentStatus } from '@/lib/gateway';

export const dynamic = 'force-dynamic';

/** GET /api/payments/status/[reference] — poll gateway payment status (booking/quote/order UIs) */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  const p = await prisma.payment.findUnique({
    where: { reference },
    select: { id: true, reference: true, status: true, amount: true, method: true, provider: true, metaJson: true, bookingId: true, orderId: true, linkId: true, expiresAt: true, confirmedAt: true },
  });
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const { provider, metaJson, ...publicPayment } = p;
  let status = publicPayment.status;
  if (provider === 'LIBERTEPAY360' && status === 'PENDING') {
    status = await refreshLibertePayPaymentStatus({ id: p.id, status, provider, metaJson }) as typeof status;
  }
  // sandbox QR expiry
  if (DEMO_MODE && status === 'PENDING' && publicPayment.expiresAt && publicPayment.expiresAt < new Date()) {
    await prisma.payment.update({ where: { reference }, data: { status: 'EXPIRED' } });
    status = 'EXPIRED';
  }
  const booking = publicPayment.bookingId ? await prisma.booking.findUnique({ where: { id: publicPayment.bookingId }, select: { bookingNo: true, status: true } }) : null;
  return NextResponse.json({ ...publicPayment, status, booking });
}
