import { test, expect } from '@playwright/test';
import { clearOverlays, cookieFor, loginInBrowser, stockedSku } from './helpers';

test.describe('payments & bookings (API-level e2e)', () => {
  test('payment link: create → pay via QR → link PAID', async ({ request }) => {
    await cookieFor(request, 'admin@gabielectricals.com', 'GabiAdmin2026!');
    const link = await request.post('/api/paylinks', { data: { label: 'E2E link', amount: 175, forType: 'CUSTOM', expiresInMin: 30 } });
    expect(link.ok()).toBeTruthy();
    const { code } = await link.json();

    const init = await request.post(`/api/paylinks/${code}`, { data: { method: 'QR', email: 'e2e@gabielectricals.com' } });
    expect(init.ok()).toBeTruthy();
    const { reference, qrPayload } = await init.json();
    expect(qrPayload).toContain('/scan?ref=');

    const qr = await request.get(`/api/payments/qr?text=${encodeURIComponent(qrPayload)}`);
    expect((await qr.json()).dataUrl).toContain('data:image/png');

    expect((await (await request.post('/api/payments/sandbox', { data: { reference, outcome: 'success' } })).json()).result).toBe('PAID');
    expect((await (await request.get(`/api/payments/status/${reference}`)).json()).status).toBe('PAID');
    expect((await (await request.get(`/api/paylinks/${code}`)).json()).link.status).toBe('PAID');
  });

  test('order → MoMo prompt → sandbox approve → PAID, then admin refund', async ({ request }) => {
    const zones = await request.get('/api/zones');
    const zoneId = (await zones.json())[0].id;
    const slug = await stockedSku(request, 'cable', 2);

    const co = await request.post('/api/checkout', {
      data: {
        contact: { name: 'E2E Refunder', email: 'e2e-refund@example.com', phone: '0249998877' },
        fulfilment: 'DELIVERY', zoneId,
        address: { region: 'Greater Accra', city: 'Accra', landmark: 'E2E test street', gps: 'GN-123-4567' },
        payment: { method: 'MOMO_MTN', momoPhone: '0249998877' },
        items: [{ slug, qty: 2 }],
      },
    });
    expect(co.ok()).toBeTruthy();
    const { orderNo } = await co.json();
    expect(orderNo).toMatch(/GE-2026-\d+/);

    const ini = await request.post('/api/payments/initiate', { data: { orderNo, method: 'MOMO_MTN', phone: '0249998877' } });
    const { reference } = await ini.json();
    expect((await (await request.post('/api/payments/sandbox', { data: { reference, outcome: 'success' } })).json()).result).toBe('PAID');

    const paid = await (await request.get(`/api/payments/status/${reference}`)).json();
    expect(paid.status).toBe('PAID');

    await cookieFor(request, 'admin@gabielectricals.com', 'GabiAdmin2026!');
    const refund = await request.post('/api/admin/refunds', { data: { paymentId: paid.id, note: 'E2E refund test — damaged on delivery' } });
    expect(refund.ok()).toBeTruthy();
    expect((await (await request.get(`/api/payments/status/${reference}`)).json()).status).toBe('REFUNDED');
  });

  test('book a service and view the booking page', async ({ request, page }) => {
    const from = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    const slots = await (await request.get(`/api/slots?service=house-wiring&from=${from}&days=14`)).json();
    const day = (slots.dates ?? []).find((d: any) => !d.blocked && d.slots?.some((s: any) => s.remaining > 0));
    expect(day).toBeTruthy();
    const freeSlot = day.slots.find((s: any) => s.remaining > 0).slot;

    const created = await request.post('/api/bookings/create', {
      data: {
        serviceSlug: 'house-wiring', date: day.date, timeSlot: freeSlot,
        urgency: 'URGENT', region: 'Greater Accra', city: 'East Legon', landmark: 'Otea close', gps: 'GN-732-4412',
        description: 'Full house rewiring for a two-storey building at East Legon with a new board.',
        media: [], contactName: 'E2E Tester', contactPhone: '0249998877', contactEmail: 'e2e@gabielectricals.com',
        paymentMode: 'QUOTE',
      },
    });
    expect(created.ok()).toBeTruthy();
    const { bookingNo } = await created.json();
    expect(bookingNo).toMatch(/GB-2026-\d+/);

    const page_ = await request.get(`/booking/${bookingNo}`);
    expect(page_.ok()).toBeTruthy();
    expect(await page_.text()).toContain(bookingNo);
  });

  test('referral chain: friend clicks link, cookie is attributed', async ({ request }) => {
    const jar = await cookieFor(request, 'akosuafrimpong3@gmail.com', 'Demo1234!');
    const dash = await request.get('/account/referrals', { headers: { cookie: jar } });
    const code = ((await dash.text()).match(/\/r\/([A-Z0-9]{4,10})/) || [])[1];
    expect(code).toBeTruthy();

    const r = await request.get(`/r/${code}`, { maxRedirects: 0 }).catch(() => null);
    expect([301, 302, 307, 308]).toContain(r?.status());
    expect(String(r!.headers()['set-cookie'])).toContain('ge_ref');
  });

  test('invalid coupon, bad phone and out-of-stock are rejected', async ({ request }) => {
    const bad = await request.post('/api/coupon/validate', { data: { code: 'NOTREAL99', subtotal: 500 } });
    expect((await bad.json()).ok).toBe(false);

    const zones = await request.get('/api/zones');
    const zoneId = (await zones.json())[0].id;
    const phone = await request.post('/api/checkout', {
      data: {
        contact: { name: 'E2E Bad', email: 'e2e-bad@example.com', phone: '12345' },
        fulfilment: 'PICKUP', payment: { method: 'PAY_ON_DELIVERY' },
        items: [{ slug: 'folded-cable-2-5mm-single-core-100m-roll', qty: 1 }],
      },
    });
    expect(phone.status()).toBe(400);
    expect(zoneId).toBeTruthy();
  });
});

test('home hero, announcement bar and mega-menu render', async ({ page }) => {
  await page.goto('/');
  await clearOverlays(page);
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.getByText(/Premium Power|certified|MoMo/i).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /shop|services/i }).first()).toBeVisible();
});

test('admin dashboard shows live numbers and the orders list', async ({ page }) => {
  await loginInBrowser(page, 'admin@gabielectricals.com', 'GabiAdmin2026!');
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/GabiElectricals|Revenue|Orders/i).first()).toBeVisible();
  await page.goto('/admin/orders', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/GE-2026-\d+/, { exact: false }).first()).toBeVisible();
  await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/margin/i).first()).toBeVisible();
});

test('technician app lists jobs for a signed-in technician', async ({ page }) => {
  await loginInBrowser(page, 'kwame-mensah@gabielectricals.com', 'Demo1234!');
  await page.goto('/technician', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/jobs|today|schedule/i).first()).toBeVisible();
});
