// MojoPay gateway tests — all MojoPay HTTP is stubbed (no live calls) and
// the Prisma delegates touched by the settle path are replaced with fakes,
// so nothing here reaches a real database either.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOJOPAY_PROVIDER,
  MojoPayPaymentError,
  createMojoPayCollection,
  extractMojoPayStatus,
  isMojoPayDuplicateError,
  mapMojoPayStatus,
  mojoPayAmount,
  mojoPayConfigured,
  mojoPayProviderCode,
  normalizeMojoPayPhone,
  resetMojoPayTokenCache,
} from '../src/lib/mojopay';
import { deriveGabiProviderReference, refreshMojoPayPaymentStatus, selectOnlineProvider } from '../src/lib/gateway';
import { prisma } from '../src/lib/db';

/* ---------------- fetch stub ---------------- */

type FetchCall = { url: string; method: string; headers: Record<string, string>; body: unknown };
type FetchHandler = (call: FetchCall) => { status: number; body: unknown };

const realFetch = globalThis.fetch;
let fetchCalls: FetchCall[] = [];
let fetchHandler: FetchHandler = () => ({ status: 200, body: {} });

function installFetchStub(handler: FetchHandler) {
  fetchHandler = handler;
  fetchCalls = [];
  globalThis.fetch = (async (input: unknown, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    const call: FetchCall = {
      url: String(input),
      method: init?.method ?? 'GET',
      headers: init?.headers ?? {},
      body: init?.body ? JSON.parse(init.body) : undefined,
    };
    fetchCalls.push(call);
    const { status, body } = fetchHandler(call);
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
}

const callsTo = (suffix: string) => fetchCalls.filter((c) => c.url.endsWith(suffix));

const ENV_KEYS = ['MOJOPAY_CLIENT_ID', 'MOJOPAY_CLIENT_SECRET', 'MOJOPAY_BASE_URL'] as const;
let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  process.env.MOJOPAY_CLIENT_ID = 'test-client-id';
  process.env.MOJOPAY_CLIENT_SECRET = 'test-client-secret';
  delete process.env.MOJOPAY_BASE_URL;
  resetMojoPayTokenCache();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  resetMojoPayTokenCache();
});

/* ---------------- provider selection ---------------- */

test('provider selection: DEMO_MODE always wins (sandbox), even with every credential set', () => {
  assert.equal(
    selectOnlineProvider({ demoMode: true, method: 'MOMO_MTN', mojoPay: true, libertePay: true, paystack: true }),
    null,
  );
});

test('provider selection: live MoMo routes to MojoPay when its credentials are set', () => {
  assert.equal(selectOnlineProvider({ demoMode: false, method: 'MOMO_MTN', mojoPay: true, libertePay: false, paystack: false }), MOJOPAY_PROVIDER);
  assert.equal(selectOnlineProvider({ demoMode: false, method: 'MOMO_TELECEL', mojoPay: true, libertePay: false, paystack: false }), MOJOPAY_PROVIDER);
  assert.equal(selectOnlineProvider({ demoMode: false, method: 'MOMO_AT', mojoPay: true, libertePay: false, paystack: false }), MOJOPAY_PROVIDER);
  // MojoPay wins over the LibertePay chain and Paystack for MoMo.
  assert.equal(selectOnlineProvider({ demoMode: false, method: 'MOMO_MTN', mojoPay: true, libertePay: true, paystack: true }), MOJOPAY_PROVIDER);
});

test('provider selection: without MojoPay credentials the previous routing is unchanged', () => {
  assert.equal(selectOnlineProvider({ demoMode: false, method: 'MOMO_MTN', mojoPay: false, libertePay: true, paystack: false }), 'LIBERTEPAY360');
  assert.equal(selectOnlineProvider({ demoMode: false, method: 'CARD', mojoPay: false, libertePay: false, paystack: true }), 'PAYSTACK');
  assert.equal(selectOnlineProvider({ demoMode: false, method: 'MOMO_MTN', mojoPay: false, libertePay: false, paystack: false }), null);
});

test('provider selection: MojoPay is MoMo-only — other methods do not route to it', () => {
  assert.equal(selectOnlineProvider({ demoMode: false, method: 'CARD', mojoPay: true, libertePay: false, paystack: false }), null);
  assert.equal(selectOnlineProvider({ demoMode: false, method: 'QR', mojoPay: true, libertePay: false, paystack: false }), null);
  assert.equal(selectOnlineProvider({ demoMode: false, method: 'MANUAL_TRANSFER', mojoPay: true, libertePay: false, paystack: false }), null);
});

test('mojoPayConfigured requires both credentials', () => {
  const envOf = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
  assert.equal(mojoPayConfigured(envOf({ MOJOPAY_CLIENT_ID: 'a', MOJOPAY_CLIENT_SECRET: 'b' })), true);
  assert.equal(mojoPayConfigured(envOf({ MOJOPAY_CLIENT_ID: 'a' })), false);
  assert.equal(mojoPayConfigured(envOf({ MOJOPAY_CLIENT_SECRET: 'b' })), false);
  assert.equal(mojoPayConfigured(envOf({})), false);
});

/* ---------------- mapping helpers ---------------- */

test('network mapping: MTN / Telecel→VODAFONE / AT, non-MoMo rejected', () => {
  assert.equal(mojoPayProviderCode('MOMO_MTN'), 'MTN');
  assert.equal(mojoPayProviderCode('MOMO_TELECEL'), 'VODAFONE');
  assert.equal(mojoPayProviderCode('MOMO_AT'), 'AIRTELTIGO');
  assert.throws(
    () => mojoPayProviderCode('CARD'),
    (e: unknown) => e instanceof MojoPayPaymentError && e.code === 'VALIDATION_REJECTED',
  );
});

test('phone normalization: local numbers become canonical 233… MSISDN', () => {
  assert.equal(normalizeMojoPayPhone('0241234567'), '233241234567');
  assert.equal(normalizeMojoPayPhone('+233241234567'), '233241234567');
  assert.equal(normalizeMojoPayPhone('054 123 4567'), '233541234567');
  assert.throws(
    () => normalizeMojoPayPhone(undefined),
    (e: unknown) => e instanceof MojoPayPaymentError && e.code === 'INVALID_NUMBER',
  );
  assert.throws(
    () => normalizeMojoPayPhone('12345'),
    (e: unknown) => e instanceof MojoPayPaymentError && e.code === 'INVALID_NUMBER',
  );
});

test('amount rendering: decimal string with two places', () => {
  assert.equal(mojoPayAmount(10), '10.00');
  assert.equal(mojoPayAmount(25.5), '25.50');
  assert.equal(mojoPayAmount(0.1 + 0.2), '0.30');
});

test('status mapping is conservative: only explicit success settles PAID', () => {
  assert.equal(mapMojoPayStatus('SUCCEEDED'), 'PAID');
  assert.equal(mapMojoPayStatus('successful'), 'PAID');
  assert.equal(mapMojoPayStatus('SUCCESS'), 'PAID');
  assert.equal(mapMojoPayStatus('completed'), 'PAID');
  assert.equal(mapMojoPayStatus('FAILED'), 'FAILED');
  assert.equal(mapMojoPayStatus('Rejected'), 'FAILED');
  assert.equal(mapMojoPayStatus('cancelled'), 'FAILED');
  assert.equal(mapMojoPayStatus('PROCESSING'), 'PENDING');
  assert.equal(mapMojoPayStatus('pending'), 'PENDING');
  assert.equal(mapMojoPayStatus('QUEUED'), 'PENDING');
  assert.equal(mapMojoPayStatus('INITIATED'), 'PENDING');
  assert.equal(mapMojoPayStatus('some-future-status'), 'PENDING');
  assert.equal(mapMojoPayStatus(''), 'PENDING');
  assert.equal(mapMojoPayStatus(null), 'PENDING');
  assert.equal(mapMojoPayStatus(undefined), 'PENDING');
});

test('status extraction finds the status wherever MojoPay nests it', () => {
  assert.equal(extractMojoPayStatus({ status: 'SUCCEEDED' }), 'SUCCEEDED');
  assert.equal(extractMojoPayStatus({ data: { status: 'FAILED' } }), 'FAILED');
  assert.equal(extractMojoPayStatus({ transaction: { status: 'PROCESSING' } }), 'PROCESSING');
  assert.equal(extractMojoPayStatus({}), null);
  assert.equal(extractMojoPayStatus(null), null);
  assert.equal(extractMojoPayStatus('SUCCEEDED'), null);
});

/* ---------------- token + collection HTTP ---------------- */

const COLLECTION_INPUT = {
  amount: 25.5,
  mobile: '233241234567',
  providerCode: 'VODAFONE' as const,
  merchantReference: 'GABIABCDEFGH1234',
  description: 'GabiElectricals payment',
};

function okHandler(token = 'tok-1') {
  return (call: FetchCall) => {
    if (call.url.endsWith('/oauth/token')) return { status: 200, body: { access_token: token, expires_in: 1200 } };
    if (call.url.endsWith('/collections')) return { status: 200, body: { status: 'PROCESSING', merchant_reference: COLLECTION_INPUT.merchantReference } };
    return { status: 404, body: {} };
  };
}

test('collection create: OAuth token fetched once and cached across calls', async () => {
  installFetchStub(okHandler());
  const first = await createMojoPayCollection(COLLECTION_INPUT);
  const second = await createMojoPayCollection(COLLECTION_INPUT);
  assert.equal(first.outcome, 'created');
  assert.equal(second.outcome, 'created');
  assert.equal(callsTo('/oauth/token').length, 1);
  assert.equal(callsTo('/collections').length, 2);
  for (const c of callsTo('/collections')) {
    assert.equal(c.headers.Authorization, 'Bearer tok-1');
  }
  // wire shape: direct MoMo push with the deterministic reference
  const body = callsTo('/collections')[0].body as Record<string, unknown>;
  assert.equal(body.amount, '25.50');
  assert.equal(body.currency, 'GHS');
  assert.equal(body.payment_rail, 'mobile_money');
  assert.equal(body.mobile, '233241234567');
  assert.equal(body.provider, 'VODAFONE');
  assert.equal(body.merchant_reference, 'GABIABCDEFGH1234');
  // token request is the client-credentials grant
  const tokenBody = callsTo('/oauth/token')[0].body as Record<string, unknown>;
  assert.equal(tokenBody.grant_type, 'client_credentials');
  assert.equal(tokenBody.client_id, 'test-client-id');
});

test('collection create: a 401 refreshes the token once and retries', async () => {
  let tokenNo = 0;
  let collectionNo = 0;
  installFetchStub((call) => {
    if (call.url.endsWith('/oauth/token')) {
      tokenNo += 1;
      return { status: 200, body: { access_token: `tok-${tokenNo}`, expires_in: 1200 } };
    }
    if (call.url.endsWith('/collections')) {
      collectionNo += 1;
      if (collectionNo === 1) return { status: 401, body: { message: 'token expired' } };
      return { status: 200, body: { status: 'PROCESSING' } };
    }
    return { status: 404, body: {} };
  });
  const res = await createMojoPayCollection(COLLECTION_INPUT);
  assert.equal(res.outcome, 'created');
  assert.equal(tokenNo, 2);
  assert.equal(collectionNo, 2);
  assert.equal(callsTo('/collections')[1].headers.Authorization, 'Bearer tok-2');
});

test('collection create: a near-expiry token is not reused', async () => {
  installFetchStub((call) => {
    if (call.url.endsWith('/oauth/token')) return { status: 200, body: { access_token: 'tok-short', expires_in: 30 } };
    if (call.url.endsWith('/collections')) return { status: 200, body: { status: 'PROCESSING' } };
    return { status: 404, body: {} };
  });
  await createMojoPayCollection(COLLECTION_INPUT);
  await createMojoPayCollection(COLLECTION_INPUT);
  assert.equal(callsTo('/oauth/token').length, 2);
});

test('duplicate merchant_reference falls through as already-initiated, never an error', async () => {
  installFetchStub((call) => {
    if (call.url.endsWith('/oauth/token')) return { status: 200, body: { access_token: 'tok-1', expires_in: 1200 } };
    if (call.url.endsWith('/collections')) return { status: 409, body: { message: 'duplicate merchant_reference' } };
    return { status: 404, body: {} };
  });
  const res = await createMojoPayCollection(COLLECTION_INPUT);
  assert.equal(res.outcome, 'duplicate');

  installFetchStub((call) => {
    if (call.url.endsWith('/oauth/token')) return { status: 200, body: { access_token: 'tok-1', expires_in: 1200 } };
    if (call.url.endsWith('/collections')) return { status: 400, body: { error: { code: 'duplicate_reference', message: 'merchant_reference already exists' } } };
    return { status: 404, body: {} };
  });
  const res2 = await createMojoPayCollection(COLLECTION_INPUT);
  assert.equal(res2.outcome, 'duplicate');

  assert.equal(isMojoPayDuplicateError(409, {}), true);
  assert.equal(isMojoPayDuplicateError(400, { message: 'Invalid mobile number' }), false);
});

test('collection create: a genuine rejection throws a typed error', async () => {
  installFetchStub((call) => {
    if (call.url.endsWith('/oauth/token')) return { status: 200, body: { access_token: 'tok-1', expires_in: 1200 } };
    if (call.url.endsWith('/collections')) return { status: 400, body: { message: 'Invalid mobile number' } };
    return { status: 404, body: {} };
  });
  await assert.rejects(
    () => createMojoPayCollection(COLLECTION_INPUT),
    (e: unknown) => e instanceof MojoPayPaymentError && e.code === 'PROVIDER_ERROR' && /Invalid mobile number/.test(e.message),
  );
});

/* ---------------- settle: exactly-once on repeated verify ---------------- */

type PrismaStubs = { events: number; sideEffectLookups: number; updates: number; restore: () => void };

function stubPrismaForSettle(): PrismaStubs {
  const state = { status: 'PENDING' };
  const counters = { events: 0, sideEffectLookups: 0, updates: 0 };
  const payment = prisma.payment as unknown as Record<string, unknown>;
  const paymentEvent = prisma.paymentEvent as unknown as Record<string, unknown>;
  const origUpdateMany = payment.updateMany;
  const origFindUnique = payment.findUnique;
  const origEventCreate = paymentEvent.create;
  // Atomic gate fake: only the caller that flips PENDING → next wins.
  payment.updateMany = async (args: { where: { status: string }; data: { status: string } }) => {
    counters.updates += 1;
    if (state.status !== args.where.status) return { count: 0 };
    state.status = args.data.status;
    return { count: 1 };
  };
  payment.findUnique = async () => {
    counters.sideEffectLookups += 1;
    return null; // applyPaidSideEffects: no payment row visible → returns early
  };
  paymentEvent.create = async () => {
    counters.events += 1;
    return {};
  };
  return {
    get events() { return counters.events; },
    get sideEffectLookups() { return counters.sideEffectLookups; },
    get updates() { return counters.updates; },
    restore() {
      payment.updateMany = origUpdateMany;
      payment.findUnique = origFindUnique;
      paymentEvent.create = origEventCreate;
    },
  };
}

const paymentSnapshot = () => ({
  id: 'pay_test_1',
  status: 'PENDING',
  provider: MOJOPAY_PROVIDER,
  metaJson: JSON.stringify({ provider: MOJOPAY_PROVIDER, providerRef: deriveGabiProviderReference('GE_PAY_TEST1') }),
});

function verifyHandler(status: string) {
  return (call: FetchCall) => {
    if (call.url.endsWith('/oauth/token')) return { status: 200, body: { access_token: 'tok-1', expires_in: 1200 } };
    if (call.url.includes('/transactions/verify/')) return { status: 200, body: { status } };
    return { status: 404, body: {} };
  };
}

test('settle: repeated SUCCEEDED verifies fulfil exactly once', async () => {
  const stubs = stubPrismaForSettle();
  try {
    installFetchStub(verifyHandler('SUCCEEDED'));
    const first = await refreshMojoPayPaymentStatus(paymentSnapshot());
    const second = await refreshMojoPayPaymentStatus(paymentSnapshot()); // stale snapshot, racing poll
    assert.equal(first, 'PAID');
    assert.equal(second, 'PAID');
    assert.equal(stubs.events, 1, 'exactly one SUCCESS event');
    assert.equal(stubs.sideEffectLookups, 1, 'paid side effects ran exactly once');
  } finally {
    stubs.restore();
  }
});

test('settle: FAILED verifies settle FAILED once and never fulfil', async () => {
  const stubs = stubPrismaForSettle();
  try {
    installFetchStub(verifyHandler('FAILED'));
    const first = await refreshMojoPayPaymentStatus(paymentSnapshot());
    const second = await refreshMojoPayPaymentStatus(paymentSnapshot());
    assert.equal(first, 'FAILED');
    assert.equal(second, 'FAILED');
    assert.equal(stubs.events, 1);
    assert.equal(stubs.sideEffectLookups, 0);
  } finally {
    stubs.restore();
  }
});

test('settle: a still-processing verify changes nothing', async () => {
  const stubs = stubPrismaForSettle();
  try {
    installFetchStub(verifyHandler('PROCESSING'));
    const res = await refreshMojoPayPaymentStatus(paymentSnapshot());
    assert.equal(res, 'PENDING');
    assert.equal(stubs.updates, 0);
    assert.equal(stubs.events, 0);
  } finally {
    stubs.restore();
  }
});

test('settle: non-MojoPay or non-pending payments are never re-verified', async () => {
  installFetchStub(verifyHandler('SUCCEEDED'));
  const other = await refreshMojoPayPaymentStatus({ ...paymentSnapshot(), provider: 'LIBERTEPAY360' });
  assert.equal(other, 'PENDING');
  const done = await refreshMojoPayPaymentStatus({ ...paymentSnapshot(), status: 'PAID' });
  assert.equal(done, 'PAID');
  assert.equal(fetchCalls.filter((c) => c.url.includes('/transactions/verify/')).length, 0);
});
