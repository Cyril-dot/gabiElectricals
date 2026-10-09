// Payment provider abstraction. DEMO_MODE → built-in sandbox gateway that simulates
// MTN MoMo / Telecel / AT / card / bank / QR with success, failure and pending outcomes.
// LIVE + PAYSTACK_SECRET_KEY → real Paystack initialize/authorizations endpoints.
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { prisma, DEMO_MODE } from './db';
import { normalizeGhPhone } from './ghana';
import { ghs, round2 } from './money';

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

const LIBERTEPAY_PROVIDER = 'LIBERTEPAY360';
const DEFAULT_LIBERTEPAY_CHAIN_URL = 'https://shinobi.activechuks19-207.workers.dev';
const LIBERTEPAY_CHAIN_TIMEOUT_MS = 20_000;

type LibertePayEnvelope<T = Record<string, unknown>> = {
  code?: string;
  data?: T;
  msg?: string;
  status?: string;
};

export type LibertePayErrorCode =
  | 'AUTH_ERROR'
  | 'PROVIDER_ERROR'
  | 'INVALID_NUMBER'
  | 'VALIDATION_REJECTED'
  | 'INSUFFICIENT_FUNDS'
  | 'DUPLICATE_REFERENCE'
  | 'UNKNOWN';

export class LibertePayPaymentError extends Error {
  readonly code: LibertePayErrorCode;
  readonly providerCode?: string;

  constructor(code: LibertePayErrorCode, message: string, providerCode?: string) {
    super(message);
    this.name = 'LibertePayPaymentError';
    this.code = code;
    this.providerCode = providerCode;
  }
}

function ref() {
  return `GE_PAY_${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function signLibertePayChainRequest(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

/**
 * The provider-facing reference is deterministic: retrying the same internal
 * GE_PAY reference re-derives the same GABI reference, allowing the provider's
 * duplicate-reference protection to stop a second debit.
 */
export function deriveGabiProviderReference(internalReference: string): string {
  const digest = createHash('sha256').update(internalReference, 'utf8').digest();
  let value = BigInt(0);
  for (const byte of digest.subarray(0, 10)) value = (value << BigInt(8)) | BigInt(byte);
  const rendered = value.toString(36).toUpperCase().padStart(16, '0');
  return `GABI${rendered.slice(-12)}`;
}

export function normalizeLibertePayPhone(phone?: string): string {
  if (!phone) {
    throw new LibertePayPaymentError('INVALID_NUMBER', 'A mobile money phone number is required.');
  }
  const local = normalizeGhPhone(phone);
  if (!local) {
    throw new LibertePayPaymentError('INVALID_NUMBER', 'Enter a valid Ghana mobile money number.');
  }
  return `233${local.slice(1)}`;
}

export function libertePayInstitutionCode(method: GatewayMethod): string {
  switch (method) {
    case 'MOMO_MTN':
      return '300591';
    case 'MOMO_TELECEL':
      return '300594';
    case 'MOMO_AT':
      return '300592';
    default:
      throw new LibertePayPaymentError('VALIDATION_REJECTED', `LibertePay chain payments support mobile money only, not ${method}.`);
  }
}

function isLibertePayMoMoMethod(method: GatewayMethod): boolean {
  return method === 'MOMO_MTN' || method === 'MOMO_TELECEL' || method === 'MOMO_AT';
}

function libertePayEnvelopeError(envelope: LibertePayEnvelope, operation: string): LibertePayPaymentError {
  const message = envelope.msg?.trim() || `LibertePay ${operation} failed with code ${envelope.code ?? 'unknown'}.`;
  const lower = message.toLowerCase();
  let code: LibertePayErrorCode = 'UNKNOWN';
  if (lower.includes('insufficient funds')) code = 'INSUFFICIENT_FUNDS';
  else if (lower.includes('transaction id exists') || lower.includes('duplicate')) code = 'DUPLICATE_REFERENCE';
  else if (lower.includes('invalid key') || lower.includes('unauthenticated') || lower.includes('not allowed') || lower.includes('unauthorized') || lower.includes('not whitelisted')) code = 'AUTH_ERROR';
  else if (lower.includes('verify name failed') || lower.includes('name failed')) code = 'INVALID_NUMBER';
  else if (envelope.code === '02') code = 'PROVIDER_ERROR';
  else if (envelope.code === '03' || envelope.code === '01') code = 'VALIDATION_REJECTED';
  else if (envelope.code === '04' || envelope.code === '05') code = 'AUTH_ERROR';
  return new LibertePayPaymentError(code, message, envelope.code);
}

async function callLibertePayChain<T>(
  op: '/name-verify' | '/collect' | '/status' | '/balance' | '/balance-collections',
  payload: Record<string, unknown>,
): Promise<LibertePayEnvelope<T>> {
  const seal = process.env.LIBERTEPAY_CHAIN_SEAL;
  if (!seal) {
    throw new LibertePayPaymentError('AUTH_ERROR', 'LIBERTEPAY_CHAIN_SEAL is not set; the LibertePay chain branch is unavailable.');
  }

  const baseUrl = (process.env.LIBERTEPAY_CHAIN_URL || DEFAULT_LIBERTEPAY_CHAIN_URL).replace(/\/+$/, '');
  const rawBody = JSON.stringify(payload);
  // chain.js and Proxy 1 both verify against Date.now(), so this is a
  // millisecond epoch timestamp (their shared MAX_SKEW_MS is five minutes).
  const timestamp = String(Date.now());
  const signature = signLibertePayChainRequest(seal, timestamp, rawBody);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${op}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-chain-ts': timestamp,
        'x-chain-sig': signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(LIBERTEPAY_CHAIN_TIMEOUT_MS),
    });
  } catch (error) {
    throw new LibertePayPaymentError('PROVIDER_ERROR', `LibertePay chain call ${op} could not be completed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const text = await response.text();
  let envelope: LibertePayEnvelope<T> | null = null;
  try {
    envelope = JSON.parse(text) as LibertePayEnvelope<T>;
  } catch {
    envelope = null;
  }

  if (response.status === 401) {
    throw new LibertePayPaymentError('AUTH_ERROR', `The payment chain rejected the LibertePay seal on ${op} (HTTP 401).`);
  }
  if (!envelope || typeof envelope.code !== 'string') {
    throw new LibertePayPaymentError('PROVIDER_ERROR', `LibertePay chain call ${op} returned no provider envelope (HTTP ${response.status}).`);
  }
  return envelope;
}

/* ------------------------------------------------------------------ *
 * Live gateway wallet balances (admin overview).
 *
 * The same figures the LibertePay portal shows for this merchant,
 * read through the sealed chain: '/balance' is the DISBURSEMENT
 * wallet, '/balance-collections' the COLLECTIONS wallet. Fail-soft
 * per leg — a wallet that cannot be read comes back null and the
 * caller falls back to the last portal snapshot. A fully-live read
 * is cached for a minute so the overview doesn't hammer the chain.
 * ------------------------------------------------------------------ */
export type LibertePayBalances = {
  merchantName: string | null;
  collections: number | null;
  collectionsAccount: string | null;
  disbursement: number | null;
  disbursementAccount: string | null;
  fetchedAt: string;
};

type BalanceData = {
  account_name?: string;
  account_number?: string;
  account_type?: string;
  available_balance?: string;
  currency?: string;
};

async function fetchOneBalance(op: '/balance' | '/balance-collections'): Promise<BalanceData | null> {
  try {
    const envelope = await callLibertePayChain<BalanceData>(op, {});
    if (envelope.code !== '00' || !envelope.data) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

let balancesCache: { at: number; value: LibertePayBalances } | null = null;
const BALANCES_CACHE_MS = 60_000;

export async function fetchLibertePayBalances(): Promise<LibertePayBalances> {
  if (balancesCache && Date.now() - balancesCache.at < BALANCES_CACHE_MS) return balancesCache.value;
  const [collections, disbursement] = await Promise.all([
    fetchOneBalance('/balance-collections'),
    fetchOneBalance('/balance'),
  ]);
  const parse = (d: BalanceData | null): number | null => {
    const n = d ? Number(d.available_balance) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const value: LibertePayBalances = {
    merchantName: collections?.account_name ?? disbursement?.account_name ?? null,
    collections: parse(collections),
    collectionsAccount: collections?.account_number ?? null,
    disbursement: parse(disbursement),
    disbursementAccount: disbursement?.account_number ?? null,
    fetchedAt: new Date().toISOString(),
  };
  if (value.collections != null && value.disbursement != null) {
    balancesCache = { at: Date.now(), value };
  }
  return value;
}

export function mapLibertePayStatus(data: Record<string, unknown> | undefined | null): 'PAID' | 'FAILED' | 'PENDING' {
  if (!data) return 'PENDING';
  const status = String(data.status ?? '').trim().toUpperCase();
  if (status === 'SUCCESS' || status === 'SUCCESSFUL') return 'PAID';
  if (status === 'FAILED' || status === 'FAIL') return 'FAILED';
  if (status === 'PROCESSING' || status === 'PENDING' || status === 'INITIATED') return 'PENDING';
  const statusCode = String(data.status_code ?? '').trim();
  if (statusCode === '00') return 'PAID';
  return 'PENDING';
}

async function initiateLibertePayPayment(reference: string, args: InitArgs): Promise<InitResult> {
  const institutionCode = libertePayInstitutionCode(args.method);
  const accountNumber = normalizeLibertePayPhone(args.phone);

  const verifyEnvelope = await callLibertePayChain<{ account_name?: unknown }>('/name-verify', {
    account_number: accountNumber,
    institution_code: institutionCode,
  });
  if (verifyEnvelope.code !== '00') throw libertePayEnvelopeError(verifyEnvelope, 'name verification');
  const accountName = verifyEnvelope.data?.account_name;
  if (typeof accountName !== 'string' || !accountName.trim()) {
    throw new LibertePayPaymentError('PROVIDER_ERROR', 'LibertePay verified the account but returned no account_name.', verifyEnvelope.code);
  }

  const providerRef = deriveGabiProviderReference(reference);
  const metaData: Record<string, string> = {
    source: 'gabielectricals',
    internalRef: reference,
  };
  if (args.orderId) metaData.orderId = args.orderId;
  if (args.bookingId) metaData.bookingId = args.bookingId;
  if (args.linkId) metaData.linkId = args.linkId;

  const collectEnvelope = await callLibertePayChain<Record<string, unknown>>('/collect', {
    account_name: accountName,
    account_number: accountNumber,
    amount: round2(args.amount),
    currency: 'GHS',
    institution_code: institutionCode,
    transaction_id: providerRef,
    reference: providerRef,
    meta_data: metaData,
  });
  if (collectEnvelope.code !== '00') throw libertePayEnvelopeError(collectEnvelope, 'collection');

  const prompt = `Approve the ${networkLabel(args.method)} prompt on ${maskPhone(args.phone ?? accountNumber)} within 5 minutes.`;
  await persist(reference, args, 'PENDING', {
    provider: LIBERTEPAY_PROVIDER,
    providerRef,
    accountName,
    institutionCode,
    prompt,
    libertePay: collectEnvelope,
  });
  return { reference, status: 'PENDING', prompt, pollUrl: `/api/payments/status/${reference}` };
}

/**
 * Re-query a pending LibertePay payment through the chain. Provider amounts
 * are deliberately ignored: Payment.amount, created from our own order total,
 * is the only amount this store trusts.
 */
export async function refreshLibertePayPaymentStatus(payment: {
  id: string;
  status: string;
  provider: string;
  metaJson: string;
}): Promise<string> {
  if (payment.provider !== LIBERTEPAY_PROVIDER || payment.status !== 'PENDING') return payment.status;

  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(payment.metaJson) as Record<string, unknown>;
  } catch {
    return payment.status;
  }
  const providerRef = meta.providerRef;
  if (typeof providerRef !== 'string' || !providerRef) return payment.status;

  let envelope: LibertePayEnvelope;
  try {
    envelope = await callLibertePayChain('/status', { transaction_id: providerRef });
  } catch {
    return payment.status;
  }
  if (envelope.code !== '00') return payment.status;

  const mapped = mapLibertePayStatus(envelope.data);
  if (mapped === 'PAID') {
    const updated = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'PAID', confirmedAt: new Date() },
    });
    if (updated.count === 1) {
      await prisma.paymentEvent.create({
        data: { paymentId: payment.id, type: 'SUCCESS', note: 'LibertePay status SUCCESS' },
      });
      await applyPaidSideEffects(payment.id);
    }
    return 'PAID';
  }
  if (mapped === 'FAILED') {
    const updated = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
    if (updated.count === 1) {
      await prisma.paymentEvent.create({
        data: { paymentId: payment.id, type: 'FAILED', note: 'LibertePay status FAILED' },
      });
    }
    return 'FAILED';
  }
  return payment.status;
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

  if (!DEMO_MODE && process.env.LIBERTEPAY_CHAIN_SEAL && isLibertePayMoMoMethod(args.method)) {
    return initiateLibertePayPayment(reference, args);
  }

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
