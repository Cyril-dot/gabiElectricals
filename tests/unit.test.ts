import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ghs, parseGhs, round2 } from '../src/lib/money';
import { normalizeGhPhone, toE164, GHGPS_RE, jsonArr, waDigits } from '../src/lib/ghana';
import { priceOrder, margin } from '../src/lib/pricing';

test('currency formats as ₵1,250.00', () => {
  assert.equal(ghs(1250), '₵1,250.00');
  assert.equal(ghs(1250, { cents: false }), '₵1,250');
  assert.equal(ghs(0.5), '₵0.50');
  assert.equal(parseGhs('₵1,250.00'), 1250);
  assert.equal(parseGhs('not money'), null);
  assert.equal(parseGhs('-5'), null);
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(1.234), 1.23);
});

test('Ghana mobile numbers normalize to 0XXXXXXXXX', () => {
  assert.equal(normalizeGhPhone('024 123 4567'), '0241234567');
  assert.equal(normalizeGhPhone('+233241234567'), '0241234567');
  assert.equal(normalizeGhPhone('00233541234567'), '0541234567');
  assert.equal(normalizeGhPhone('233241234567'), '0241234567');
  assert.equal(normalizeGhPhone('12345'), null);
  assert.equal(normalizeGhPhone('0123456789'), null); // landline prefix not accepted for MoMo/SMS
  assert.equal(toE164('0241234567'), '+233241234567');
  assert.equal(waDigits('024 100 2030'), '241002030');
});

test('Ghana Post GPS and JSON array helpers', () => {
  assert.ok(GHGPS_RE.test('GN-732-4412'));
  assert.ok(!GHGPS_RE.test('GN7324412'));
  assert.deepEqual(jsonArr('["a","b"]'), ['a', 'b']);
  assert.deepEqual(jsonArr(null), []);
  assert.deepEqual(jsonArr('not json'), []);
  assert.deepEqual(jsonArr('{"a":1}'), []);
});

test('prices a delivery order: install add-on, VAT inclusive, levy on top', () => {
  const r = priceOrder({
    lines: [{ price: 385, qty: 2 }, { price: 120, qty: 1, install: true }],
    installFeePct: 10, zoneFee: 25, freeOver: 2000, fulfilment: 'DELIVERY', vatPct: 15, levyPct: 2.5,
  });
  assert.equal(r.subtotal, 902); // 770 + 120 with a 10% install add-on
  assert.equal(r.discount, 0);
  assert.equal(r.deliveryFee, 25);
  assert.equal(r.vatPortion, round2(902 - 902 / 1.15));
  assert.equal(r.levy, 22.55);
  assert.equal(r.total, round2(902 + 25 + 22.55));
});

test('pickup never pays a delivery fee and freeOver waives it', () => {
  assert.equal(priceOrder({ lines: [{ price: 100, qty: 1 }], zoneFee: 30, fulfilment: 'PICKUP' }).deliveryFee, 0);
  assert.equal(priceOrder({ lines: [{ price: 900, qty: 2 }], zoneFee: 30, freeOver: 1500, fulfilment: 'DELIVERY' }).deliveryFee, 0);
  assert.equal(priceOrder({ lines: [{ price: 900, qty: 1 }], zoneFee: 30, freeOver: 1500, fulfilment: 'DELIVERY' }).deliveryFee, 30);
});

test('coupons: percent is capped, fixed cannot go below zero, free-delivery kills the fee', () => {
  const pct = priceOrder({ lines: [{ price: 1000, qty: 1 }], coupon: { type: 'PERCENT', value: 20, minSpend: 500, maxDiscount: 100 } });
  assert.equal(pct.discount, 100);
  const belowMin = priceOrder({ lines: [{ price: 100, qty: 1 }], coupon: { type: 'PERCENT', value: 20, minSpend: 500 } });
  assert.equal(belowMin.discount, 0);
  const fixed = priceOrder({ lines: [{ price: 50, qty: 1 }], coupon: { type: 'FIXED', value: 500, minSpend: 0 } });
  assert.equal(fixed.discount, 50);
  assert.equal(fixed.total, 0);
  const ship = priceOrder({ lines: [{ price: 300, qty: 1 }], zoneFee: 30, coupon: { type: 'FREE_DELIVERY', value: 0, minSpend: 0 } });
  assert.equal(ship.deliveryFee, 0);
});

test('wallet credit is capped by balance and by the payable amount', () => {
  const r = priceOrder({ lines: [{ price: 200, qty: 1 }], walletAvailable: 50, walletUse: 500, vatPct: 0 });
  assert.equal(r.walletUsed, 50);
  assert.equal(r.total, 150);
  const zero = priceOrder({ lines: [{ price: 40, qty: 1 }], walletAvailable: 100, walletUse: 100, vatPct: 0 });
  assert.equal(zero.walletUsed, 40);
  assert.equal(zero.total, 0);
});

test('margin and compare-at strike-through maths', () => {
  assert.deepEqual(margin(400, 500), { gross: 100, pct: 20, strikePct: 0 });
  assert.equal(margin(400, 500, 625).strikePct, 20);
  assert.deepEqual(margin(100, 0), { gross: -100, pct: 0, strikePct: 0 });
});
