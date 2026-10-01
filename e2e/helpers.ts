import { expect } from '@playwright/test';

/** The cookie banner uses visible text buttons, the campaign popup uses aria-labels — clear both before interacting. */
export async function clearOverlays(page: any) {
  for (const name of [/close popup/i, /dismiss/i, /essential only|accept all|decline/i]) {
    const btn = page.getByRole('button', { name }).first();
    if (await btn.isVisible().catch(() => false)) {
      // These CTAs sit on an entrance animation that never settles, so Playwright's stability check would burn the whole timeout; fire the handler directly.
      await btn.evaluate((el: HTMLElement) => el.click()).catch(() => {});
    }
  }
}

/** The page and request fixtures have separate cookie jars, so a signed-in page must log in through its own context. */
export async function loginInBrowser(page: any, email: string, password: string) {
  const r = await page.context().request.post('/api/auth/login', { data: { email, password } });
  expect(r.ok()).toBeTruthy();
}

/** Stock drifts down as the suite orders products, so never hardcode a slug — take one that can actually fill the order. */
export async function stockedSku(request: any, query: string, need = 1): Promise<string> {
  const list = await (await request.get(`/api/search?q=${encodeURIComponent(query)}`)).json();
  const items = Array.isArray(list) ? list : list.results ?? [];
  const item = items.find((p: any) => (p.stock ?? 0) >= need);
  expect(item, `no in-stock product (>=${need}) for "${query}"`).toBeTruthy();
  return item.slug;
}

/** Playwright's set-cookie header is a single joined string, not an array — split it before reusing it. */
export async function cookieFor(request: any, email: string, password: string) {
  const r = await request.post('/api/auth/login', { data: { email, password } });
  expect(r.ok()).toBeTruthy();
  const raw = r.headers()['set-cookie'];
  const list: string[] = Array.isArray(raw) ? raw : String(raw ?? '').split(/\r?\n/);
  const session = list.map(c => c.split(';')[0]).find(c => c.startsWith('ge_session=')) ?? '';
  expect(session).toContain('ge_session=');
  return session;
}
