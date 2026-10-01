import { test, expect } from '@playwright/test';
import { clearOverlays, stockedSku } from './helpers';

test.describe('shop → cart → checkout', () => {
  test('browse the catalogue and add a product to the cart', async ({ page }) => {
    await page.goto('/shop');
    await clearOverlays(page);
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
    await page.locator('a[href^="/product/"]').first().click();
    await page.waitForURL('**/product/**');
    await clearOverlays(page);
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await expect(page.getByText(/added/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('cart shows the line item and subtotal', async ({ page, request }) => {
    const p = await (await request.get('/api/search?q=solar')).json();
    const item = p[0];
    expect(item).toBeTruthy();
    await page.goto('/');
    await page.evaluate((line) => {
      localStorage.setItem('ge-cart', JSON.stringify({ state: { items: [line], open: false }, version: 0 }));
    }, { slug: item.slug, name: item.name, price: item.price, image: item.image ?? '/icon.svg', qty: 2, stock: item.stock ?? 20 });
    await page.goto('/cart');
    await clearOverlays(page);
    // The header cart drawer is mounted on every page and links to the same slug, so scope to the cart table.
    await expect(page.locator(`table a[href="/product/${item.slug}"]`)).toBeVisible();
    await expect(page.getByText(/subtotal/i).first()).toBeVisible();
  });

  test('checkout page renders contact, delivery and payment steps', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('ge-cart', JSON.stringify({
        state: { items: [{ slug: 'folded-cable-2-5mm-single-core-100m-roll', name: 'Folded Cable 2.5mm', price: 385, image: '/icon.svg', qty: 1, stock: 40 }], open: false }, version: 0,
      }));
    });
    await page.goto('/checkout');
    await clearOverlays(page);
    await expect(page.getByLabel(/full name|name/i).first()).toBeVisible();
    await expect(page.getByLabel(/phone/i).first()).toBeVisible();
    await expect(page.getByText(/MoMo|MTN/i).first()).toBeVisible();
  });

  test('order tracking finds a real order', async ({ page, request }) => {
    const zones = await (await request.get('/api/zones')).json();
    const slug = await stockedSku(request, 'cable', 1);
    const co = await request.post('/api/checkout', {
      data: {
        contact: { name: 'E2E Tracker', email: 'e2e-track@example.com', phone: '0249997766' },
        fulfilment: 'PICKUP',
        payment: { method: 'PAY_ON_DELIVERY' },
        items: [{ slug, qty: 1 }],
      },
    });
    expect(co.ok()).toBeTruthy();
    const { orderNo } = await co.json();

    await page.goto('/track');
    await clearOverlays(page);
    await page.getByLabel(/order number/i).fill(orderNo);
    const email = page.getByLabel(/email/i).first();
    if (await email.isVisible().catch(() => false)) await email.fill('e2e-track@example.com');
    await page.getByRole('button', { name: /track|find/i }).click();
    await expect(page.getByText(new RegExp(orderNo)).first()).toBeVisible({ timeout: 10000 });
    expect(zones.length).toBeGreaterThan(0);
  });

  test('service catalogue and booking form render', async ({ page }) => {
    await page.goto('/services');
    await clearOverlays(page);
    await expect(page.locator('a[href^="/services/"]').first()).toBeVisible();
    await page.locator('a[href^="/services/"]').first().click();
    await page.waitForURL('**/services/**');
    await clearOverlays(page);
    await expect(page.getByRole('button', { name: /book|schedule|get a quote/i }).or(page.getByRole('link', { name: /book|schedule|get a quote/i })).first()).toBeVisible();
  });
});
