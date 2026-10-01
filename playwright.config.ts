import { defineConfig, devices } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
// Locally reuse the installed Chrome; on CI use Playwright's own Chromium build.
const channel = process.env.CI ? undefined : 'chrome';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 8_000 },
  retries: 1,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: BASE, trace: 'on-first-retry' },
  // API rate limiters key off the client IP, so each project gets its own address and a fast suite can't trip the demo limits.
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': '10.7.1.11' } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel, extraHTTPHeaders: { 'x-forwarded-for': '10.7.2.22' } } },
  ],
});
