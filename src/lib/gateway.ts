// Payment provider abstraction. DEMO_MODE → built-in sandbox gateway that simulates
// MTN MoMo / Telecel / AT / card / bank / QR with success, failure and pending outcomes.
// LIVE + PAYSTACK_SECRET_KEY → real Paystack initialize/authorizations endpoints.
import { createHash, randomUUID } from 'node:crypto';
import { prisma, DEMO_MODE } from './db';
import { ghs } from './money';

export type GatewayMethod = 'MOMO_MTN' | 'MOMO_TELECEL' | 'MOMO_AT' | 'CARD' | 'BANK_TRANSFER' | 'GHIPSS' | 'QR' | 'MANUAL_TRANSFER' | 'PAY_ON_DELIVERY';

export type InitArgs = {
  amount: number; // GHS
  email: string;
  phone?: string;
  method: GatewayMethod;
  orderId?: string;
  bookingId?: string;
  linkId?: string;
  meta?: Record<string, unknown>;
};
export type InitResult = {
  reference: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'AWAITING_APPROVAL';
  qrPayload?: string;      // otpauth-style URL for QR screens
  authUrl?: string;        // hosted card redirect (live)
  prompt?: string;         // "Approve the MoMo prompt on 024••••1234"
  pollUrl: string;         // where the UI polls for status
  expiresAt?: Date;
};

export const QR_TTL_MS = 15 * 60 * 1000;

function ref() {
  return `GE_PAY_${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function paystackHash(secret: string, data: string) {
  return createHash('sha512').update(secret).update(data).digest('hex');
}

export function verifyPaystackSignature(secret: string, body: string, signature: string): boolean {
  return paystackHash(secret, body) === signature;
}

export function buildQrPayload(link: string, amount: number, reference: string): string {
  // unified Ghana-style QR: URL with amount + reference; scan-to-pay page parses it
  return `${link}${link.includes('?') ? '&' : '?'}ref=${reference}&amount=${amount.toFixed(2)}`;
}

export async function initiatePayment(args: InitArgs): Promise<InitResult> {
  const reference = ref();
  const expiresAt = args.method === 'QR' ? new Date(Date.now() + QR_TTL_MS) : null;

  if (!DEMO_MODE && process.env.PAYSTACK_SECRET_KEY) {
    // real provider path (documented in README) — hosted checkout
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: args.email, amount: Math.round(args.amount * 100), reference,
        metadata: { orderId: args.orderId, bookingId: args.bookingId, method: args.method, ...(args.meta ?? {}) },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/payments/webhook?ctx=${args.orderId ?? args.bookingId ?? ''}`,
      }),
    });
    const j = (await res.json()) as { data?: { authorization_url?: string; access_code?: string } };
    const authUrl = j.data?.authorization_url;
    await persist(reference, args, 'PENDING', { provider: 'PAYSTACK', authUrl });
    return { reference, status: 'PENDING', authUrl, pollUrl: `/api/payments/status/${reference}`, expiresAt: undefined };
  }

  // ── sandbox gateway ──
  let status: InitResult['status'] = 'PENDING';
  let prompt: string | undefined;
  if (args.method.startsWith('MOMO')) {
    prompt = `Approve the ${networkLabel(args.method)} prompt on ${maskPhone(args.phone)} within 5 minutes.`;
  }
  if (args.method === 'CARD') prompt = 'Sandbox card: use 4084 0840 8408 4081, any future expiry, OTP 123456.';
  if (args.method === 'MANUAL_TRANSFER') status = 'AWAITING_APPROVAL';
  if (args.method === 'PAY_ON_DELIVERY') status = 'PENDING';

  const qrPayload = args.method === 'QR'
    ? buildQrPayload(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/scan`, args.amount, reference)
    : undefined;

  await persist(reference, args, status, { provider: 'MOCK', sandbox: true, prompt, qrPayload });
  return { reference, status, qrPayload, prompt, pollUrl: `/api/payments/status/${reference}`, expiresAt: expiresAt ?? undefined };
}

async function persist(reference: string, args: InitArgs, status: string, meta: Record<string, unknown>) {
  await prisma.payment.create({
    data: {
      reference, amount: args.amount, status: status as never, method: args.method as never,
      provider: (meta.provider as string) ?? 'MOCK', orderId: args.orderId, bookingId: args.bookingId,
      linkId: args.linkId, payerPhone: args.phone, payerEmail: args.email,
      metaJson: JSON.stringify({ ...meta, ...args.meta }),
      expiresAt: status === 'PENDING' && args.method === 'QR' ? new Date(Date.now() + QR_TTL_MS) : null,
      events: { create: [{ type: 'INITIATED', note: args.method }] },
    },
  });
}

/**
 * Sandbox "simulate" endpoint used by demo QR/MoMo screens: outcome weighted
 * 70% success, 15% pending, 10% failure, 5% duplicate — mirrors real Ghana rails.
 */
export async function sandboxComplete(reference: string, forced?: 'success' | 'pending' | 'fail'): Promise<string> {
  const p = await prisma.payment.findUnique({ where: { reference } });
  if (!p) return 'NOT_FOUND';
  if (p.status === 'PAID') return 'PAID';
  const roll = forced ?? (rnd01() < 0.7 ? 'success' : rnd01() < 0.5 ? 'pending' : 'fail');
  if (roll === 'success') {
    await prisma.payment.update({
      where: { id: p.id },
      data: { status: 'PAID', confirmedAt: new Date(), events: { create: [{ type: 'SUCCESS', note: 'Sandbox OTP approved' }] } },
    });
    await applyPaidSideEffects(p.id);
    return 'PAID';
  }
  if (roll === 'fail') {
    await prisma.payment.update({ where: { id: p.id }, data: { status: 'FAILED', metaJson: JSON.stringify({ reason: 'Payer declined / insufficient funds' }), events: { create: [{ type: 'FAILED' }] } } });
    return 'FAILED';
  }
  return 'PENDING';
}

const rnd01 = () => Math.random();

export function networkLabel(m: string) {
  return m === 'MOMO_MTN' ? 'MTN MoMo' : m === 'MOMO_TELECEL' ? 'Telecel Cash' : m === 'MOMO_AT' ? 'AT Money' : m;
}
export function maskPhone(phone?: string) {
  if (!phone) return 'your phone';
  return phone.replace(/(\+?\d{2,3})(\d{3})(\d{4})$/, '$1•••$3');
}

/** when a payment flips to PAID, advance its order/booking/link and fire notifications */
export async function applyPaidSideEffects(paymentId: string) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p) return;
  const { logNotify } = await import('./notify');
  if (p.orderId) {
    const o = await prisma.order.findUnique({ where: { id: p.orderId } });
    if (o && o.status === 'PENDING_PAYMENT') {
      const paid = await prisma.payment.aggregate({ where: { orderId: o.id, status: 'PAID' }, _sum: { amount: true } });
      const newStatus = (paid._sum.amount ?? 0) >= o.total - 0.01 ? 'PAID' : 'PARTIALLY_PAID';
      await prisma.order.update({ where: { id: o.id }, data: { status: newStatus as never, invoiceNo: newStatus === 'PAID' ? `INV-${o.orderNo.slice(3)}` : o.invoiceNo } });
      await prisma.orderEvent.create({ data: { orderId: o.id, status: newStatus, note: `Payment ${p.reference}` } });
      await logNotify('SMS', o.phone, 'ORDER_PAID', `GabiElectricals: Payment ${ghs(p.amount)} received for order ${o.orderNo}.`);
      await logNotify('EMAIL', o.email, 'ORDER_PAID', `Payment received for ${o.orderNo}. Invoice ${newStatus === 'PAID' ? 'attached' : 'pending'}.`);
      if (newStatus === 'PAID') {
        const { creditReferralRewards } = await import('./referrals');
        await creditReferralRewards(o.id);
      }
    }
  }
  if (p.bookingId) {
    const b = await prisma.booking.findUnique({ where: { id: p.bookingId } });
    if (b && b.status === 'REQUESTED') {
      await prisma.booking.update({ where: { id: b.id }, data: { status: 'CONFIRMED' } });
      await prisma.bookingEvent.create({ data: { bookingId: b.id, status: 'CONFIRMED', note: 'Deposit/full payment received' } });
      await logNotify('WHATSAPP', b.contactPhone, 'BOOKING_CONFIRMED', `Booking ${b.bookingNo} confirmed — payment received.`);
    }
  }
  if (p.linkId) {
    await prisma.paymentLink.update({ where: { id: p.linkId }, data: { status: 'PAID' } });
  }
}
