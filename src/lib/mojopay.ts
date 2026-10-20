// MojoPay provider client (omni.mojo-pay.com) — direct MoMo push collections
// for the SAME merchant account as this store (Tuguu Gabriel Ventures).
//
// Proven live 2026-10-19 on this account: OAuth2 client-credentials token
// (POST /v1/oauth/token, ~1200s TTL), POST /v1/collections direct push,
// GET /v1/transactions/verify/{merchant_reference} for status. The account's
// collection fee mode is on_top (the customer prompt carries MojoPay's fee;
// the store receives the full amount) — that is account-level config, never
// a per-request field.
//
// Credentials come ONLY from env (MOJOPAY_CLIENT_ID / MOJOPAY_CLIENT_SECRET).
// This module is transport + pure mapping helpers; persistence and order
// settlement live in src/lib/gateway.ts, mirroring the LibertePay branch.
import { randomUUID } from 'node:crypto';
import { normalizeGhPhone } from './ghana';
import { round2 } from './money';

export const MOJOPAY_PROVIDER = 'MOJOPAY';

const DEFAULT_MOJOPAY_BASE_URL = 'https://omni.mojo-pay.com/v1';
const MOJOPAY_TIMEOUT_MS = 20_000;
const TOKEN_REFRESH_MARGIN_MS = 60_000;

export type MojoPayErrorCode =
  | 'AUTH_ERROR'
  | 'PROVIDER_ERROR'
  | 'INVALID_NUMBER'
  | 'VALIDATION_REJECTED'
  | 'DUPLICATE_REFERENCE'
  | 'UNKNOWN';

export class MojoPayPaymentError extends Error {
  readonly code: MojoPayErrorCode;
  readonly providerCode?: string;

  constructor(code: MojoPayErrorCode, message: string, providerCode?: string) {
    super(message);
    this.name = 'MojoPayPaymentError';
    this.code = code;
    this.providerCode = providerCode;
  }
}

export function mojoPayConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.MOJOPAY_CLIENT_ID && env.MOJOPAY_CLIENT_SECRET);
}

export function isMojoPayMoMoMethod(method: string): boolean {
  return method === 'MOMO_MTN' || method === 'MOMO_TELECEL' || method === 'MOMO_AT';
}

/** Store method → MojoPay provider code (their Telecel code is VODAFONE). */
export function mojoPayProviderCode(method: string): 'MTN' | 'VODAFONE' | 'AIRTELTIGO' {
  switch (method) {
    case 'MOMO_MTN':
      return 'MTN';
    case 'MOMO_TELECEL':
      return 'VODAFONE';
    case 'MOMO_AT':
      return 'AIRTELTIGO';
    default:
      throw new MojoPayPaymentError('VALIDATION_REJECTED', `MojoPay payments support mobile money only, not ${method}.`);
  }
}

/** Local 0… number → canonical 233… MSISDN MojoPay takes. */
export function normalizeMojoPayPhone(phone?: string): string {
  if (!phone) {
    throw new MojoPayPaymentError('INVALID_NUMBER', 'A mobile money phone number is required.');
  }
  const local = normalizeGhPhone(phone);
  if (!local) {
    throw new MojoPayPaymentError('INVALID_NUMBER', 'Enter a valid Ghana mobile money number.');
  }
  return `233${local.slice(1)}`;
}

/** MojoPay amounts are decimal strings in major units ("10.00"). */
export function mojoPayAmount(amount: number): string {
  return round2(amount).toFixed(2);
}

/**
 * Conservative status mapping — ONLY an explicit success status settles PAID,
 * only an explicit failure status settles FAILED; everything else (including
 * unrecognised values) stays PENDING so polling keeps watching.
 */
export function mapMojoPayStatus(raw: unknown): 'PAID' | 'FAILED' | 'PENDING' {
  const status = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (status === 'succeeded' || status === 'successful' || status === 'success' || status === 'completed') return 'PAID';
  if (
    status === 'failed' || status === 'failure' || status === 'rejected' ||
    status === 'declined' || status === 'cancelled' || status === 'canceled'
  ) return 'FAILED';
  return 'PENDING';
}

/** Pull the status string out of a MojoPay payload, wherever it nests. */
export function extractMojoPayStatus(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  for (const candidate of [root, root.data, root.transaction, root.collection]) {
    if (candidate && typeof candidate === 'object') {
      const s = (candidate as Record<string, unknown>).status;
      if (typeof s === 'string' && s.trim()) return s;
    }
  }
  return null;
}

export function mojoPayErrorInfo(payload: unknown): { code?: string; message: string } {
  if (payload && typeof payload === 'object') {
    const b = payload as Record<string, unknown>;
    const err = b.error;
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;
      return {
        code: typeof e.code === 'string' ? e.code : undefined,
        message: typeof e.message === 'string' ? e.message : 'MojoPay request failed',
      };
    }
    if (typeof b.message === 'string') {
      return { code: typeof b.code === 'string' ? b.code : undefined, message: b.message };
    }
  }
  return { message: 'MojoPay request failed' };
}

/** A repeat POST with the same merchant_reference is a dedupe hit, not an error. */
export function isMojoPayDuplicateError(httpStatus: number, payload: unknown): boolean {
  if (httpStatus === 409) return true;
  const { code, message } = mojoPayErrorInfo(payload);
  const text = `${code ?? ''} ${message}`.toLowerCase();
  return text.includes('duplicate') || text.includes('already exists') || text.includes('already been used');
}

/* ------------------------------------------------------------------ *
 * OAuth token + API transport. The token is cached in-module and
 * refreshed on expiry (with a safety margin) or after a 401.
 * ------------------------------------------------------------------ */
let tokenCache: { token: string; expiresAtMs: number } | null = null;

export function resetMojoPayTokenCache(): void {
  tokenCache = null;
}

function mojoPayBaseUrl(): string {
  return (process.env.MOJOPAY_BASE_URL || DEFAULT_MOJOPAY_BASE_URL).replace(/\/+$/, '');
}

async function mojoPayRaw(
  method: 'GET' | 'POST',
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: unknown }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(MOJOPAY_TIMEOUT_MS),
    });
  } catch (error) {
    throw new MojoPayPaymentError('PROVIDER_ERROR', `MojoPay call ${method} ${url} could not be completed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

export async function getMojoPayAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && tokenCache && Date.now() < tokenCache.expiresAtMs - TOKEN_REFRESH_MARGIN_MS) {
    return tokenCache.token;
  }
  const clientId = process.env.MOJOPAY_CLIENT_ID;
  const clientSecret = process.env.MOJOPAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new MojoPayPaymentError('AUTH_ERROR', 'MOJOPAY_CLIENT_ID / MOJOPAY_CLIENT_SECRET are not set; the MojoPay branch is unavailable.');
  }
  const res = await mojoPayRaw('POST', `${mojoPayBaseUrl()}/oauth/token`, {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const body = (res.json ?? {}) as Record<string, unknown>;
  const token = typeof body.access_token === 'string' ? body.access_token : null;
  if (res.status < 200 || res.status >= 300 || !token) {
    throw new MojoPayPaymentError('AUTH_ERROR', `MojoPay OAuth failed (HTTP ${res.status}): ${mojoPayErrorInfo(res.json).message}`);
  }
  const expiresInSec = typeof body.expires_in === 'number' && body.expires_in > 0 ? body.expires_in : 1200;
  tokenCache = { token, expiresAtMs: Date.now() + expiresInSec * 1000 };
  return token;
}

async function mojoPayRequest(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: unknown }> {
  const token = await getMojoPayAccessToken();
  const res = await mojoPayRaw(method, `${mojoPayBaseUrl()}${path}`, body, {
    Authorization: `Bearer ${token}`,
    ...headers,
  });
  if (res.status === 401) {
    // Cached token rejected (revoked / clock skew): refresh once and retry.
    tokenCache = null;
    const fresh = await getMojoPayAccessToken(true);
    return mojoPayRaw(method, `${mojoPayBaseUrl()}${path}`, body, {
      Authorization: `Bearer ${fresh}`,
      ...headers,
    });
  }
  return res;
}

export type CreateMojoPayCollectionInput = {
  amount: number; // GHS
  mobile: string; // canonical 233…
  providerCode: 'MTN' | 'VODAFONE' | 'AIRTELTIGO';
  merchantReference: string;
  description: string;
};

export type CreateMojoPayCollectionResult =
  | { outcome: 'created'; payload: unknown }
  | { outcome: 'duplicate'; payload: unknown };

/**
 * POST /v1/collections — direct MoMo push. A duplicate merchant_reference
 * comes back as outcome 'duplicate' (the original prompt is already out;
 * status polling settles it) instead of throwing.
 */
export async function createMojoPayCollection(input: CreateMojoPayCollectionInput): Promise<CreateMojoPayCollectionResult> {
  const res = await mojoPayRequest(
    'POST',
    '/collections',
    {
      amount: mojoPayAmount(input.amount),
      currency: 'GHS',
      merchant_reference: input.merchantReference,
      payment_rail: 'mobile_money',
      mobile: input.mobile,
      provider: input.providerCode,
      description: input.description,
    },
    // MojoPay wants a fresh Idempotency-Key per money POST; the deterministic
    // merchant_reference is the dedupe anchor.
    { 'Idempotency-Key': randomUUID() },
  );
  if (res.status >= 200 && res.status < 300) {
    return { outcome: 'created', payload: res.json };
  }
  if (isMojoPayDuplicateError(res.status, res.json)) {
    return { outcome: 'duplicate', payload: res.json };
  }
  const info = mojoPayErrorInfo(res.json);
  throw new MojoPayPaymentError(
    res.status === 401 || res.status === 403 ? 'AUTH_ERROR' : 'PROVIDER_ERROR',
    `MojoPay collection rejected (HTTP ${res.status}): ${info.message}`,
    info.code,
  );
}

/**
 * GET /v1/transactions/verify/{merchant_reference}. A 404 means MojoPay has
 * no such transaction (yet) — returned, not thrown, so the caller can treat
 * it as still-pending. Transport failures throw MojoPayPaymentError.
 */
export async function verifyMojoPayCollection(merchantReference: string): Promise<{ status: number; payload: unknown }> {
  const res = await mojoPayRequest('GET', `/transactions/verify/${encodeURIComponent(merchantReference)}`);
  return { status: res.status, payload: res.json };
}
