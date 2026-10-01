# ⚡ GabiElectricals

**Premium Power. Trusted Safety. Done Right.**

A complete, working Next.js commerce + booking platform for GabiElectricals — a Ghana-based business selling premium electrical products online and booking certified electrical services. Ships in **Demo Mode**: rich Ghana-market sample data with a sandbox payment gateway that simulates the full money flow end-to-end.

---

## Quick start (2 minutes)

```bash
# 1. install
npm install

# 2. environment
cp .env.example .env          # defaults already work for demo

# 3. database (SQLite — zero external services)
npm run db:push               # creates prisma/dev.db + tables
npm run db:seed               # 13 categories · 70+ products · 12 services · 30+ customers
                              # · 40+ orders · 25+ bookings · payments in every status
# 4. run
npm run dev                   # http://localhost:3000
```

### Demo logins (all on `/login`)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@gabielectricals.com` | `GabiAdmin2026!` |
| Admin (Ops) | `ops@gabielectricals.com` | `Demo1234!` |
| Technician | `kwame-mensah@gabielectricals.com` | `Demo1234!` |
| Customer | `kofiowusu0@gmail.com` | `Demo1234!` |
| Affiliate | `ama-serwaa3@gmail.com` | `Demo1234!` |

Surfaces: customer site `/` · admin `/admin` · technician app `/technician` · hosted payment links `/pay/<code>` · QR scan-to-pay `/scan`.

**Live review URL while the tunnel is running:** `https://inspiration-nails-drives-convertible.trycloudflare.com` (all three surfaces above, seeded demo data, sandbox payments). It is an ephemeral Cloudflare quick tunnel to this machine — see *Deploy → Public URL without a hosting account*.

---

## How Demo Mode works

`DEMO_MODE=true` (in `.env`) means:

- **Payments** run through a built-in sandbox gateway (`src/lib/gateway.ts`) that simulates MTN MoMo, Telecel Cash, AT Money, card, bank/GhIPSS, QR (15-min expiry + regenerate) and pay-on-delivery with realistic success / pending / failure outcomes (≈70/15/15 split; deterministic outcomes available for tests via `sandboxComplete(ref, 'success')`). **No card data is ever stored.**
- **SMS / Email / WhatsApp** are never sent — every message is written to **Admin → Notification Log** using your real templates.
- A small **Demo ribbon** shows in `/admin` only. Customers never see it.
- Admin → Settings has **Reset demo data** (re-seed) and **Clear all sample data** (clean wipe) buttons so you can go live from an empty, honest database.

## Going live — checklist

1. **Database** — `npm run db:provider:pg` flips the `prisma/schema.prisma` datasource to `postgresql` and writes a placeholder URL into `.env`; put your real `DATABASE_URL` there (Neon/Supabase/RDS all work), then `npx prisma generate && npx prisma db push && npm run db:seed`. Verified: the Prisma client generates and the whole app type-checks and builds against the Postgres client — **`next build` needs a reachable database**, because the storefront pages render dynamically from it. Revert with `npm run db:provider:sqlite`. One Postgres caveat: `contains` is case-insensitive on SQLite but case-sensitive on Postgres, so add `mode: 'insensitive'` to the four `contains` filters in `src/app/api/search/route.ts` (valid once the Postgres client is generated).
2. **Payments** — get Paystack Live keys → `.env`: `PAYSTACK_SECRET_KEY=sk_live_…`, `PAYSTACK_PUBLIC_KEY=pk_live_…`, set `DEMO_MODE=false`. Webhooks: point Paystack at `/api/payments/webhook` (signature verification with SHA-512 hash is implemented). For Hubtel/Flutterwave, add an adapter next to the Paystack branch in `src/lib/gateway.ts`.
3. **SMS/WhatsApp** — `SMS_PROVIDER=hubtel|arkesel|twilio` + API keys; WhatsApp Business tokens. Wired in `src/lib/notify.ts`.
4. **Email** — `RESEND_API_KEY` (or swap `sendEmail()` for SMTP). Verify your sending domain.
5. **Clear sample data** — Admin → Settings → *Clear all sample data*.
6. **Real content** — replace business phone/email/address in Admin → Settings; add your real products (bulk CSV import supported) and photos (see `IMAGE_CREDITS.md`).
7. **Domain & analytics** — set `NEXT_PUBLIC_SITE_URL`, `GA4_MEASUREMENT_ID`, `META_PIXEL_ID`.
8. **Security** — change `SESSION_SECRET` to 32+ random bytes; set strong admin passwords; consider enabling admin 2FA (TOTP field ready on the User model).
9. Run `npm run build && npm start` behind Node 22 + a reverse proxy, or use the Docker images below.

## Deploy

```bash
docker compose up --build web           # demo stack: SQLite volume + auto-seed on first boot
docker compose --profile live up --build web db   # Postgres-backed live profile
# or any Node host:
npm ci && npx prisma generate && npm run build && npm start
```

Vercel: `npm run db:provider:pg` and commit, import the repo → set `DATABASE_URL` (Postgres) plus the other env vars → `npx prisma db push` in a one-off before the first build (the build renders pages from the database, so it fails if the URL is unreachable) → deploy. A SQLite `file:` URL is ephemeral there, so Postgres is the only live option. VPS: `docker-compose.yml` included with healthcheck (`/api/health`). Backups: `pg_dump` daily + object storage for `public/uploads`; cron examples in `docs/DEPLOYMENT.md`.

### Public URL without a hosting account

If hosting credentials are unavailable, a Cloudflare quick tunnel exposes the running build on a real HTTPS URL in one command — no signup, no payment method:

```bash
curl -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
./cloudflared.exe tunnel --url http://127.0.0.1:3100 --no-autoupdate   # prints https://<random>.trycloudflare.com
```

Build and start with `NEXT_PUBLIC_SITE_URL` set to that hostname — canonical tags, `sitemap.xml`, structured data, payment links and referral links are rendered from it:

```bash
NEXT_PUBLIC_SITE_URL=https://<random>.trycloudflare.com npm run build
NEXT_PUBLIC_SITE_URL=https://<random>.trycloudflare.com npm start -- -p 3100
```

The URL only lives while that process runs and changes on every restart, so treat it as a review/demo link, not production. `docs/DEPLOYMENT.md` §4 has the same steps for macOS/Linux.

## Project map

```
prisma/            schema, seed scripts, seed-data modules (catalog & content)
src/lib/           db, auth (JWT cookies), gateway (payments), pricing (VAT/levy/
                   coupons/zones/wallet), notify, settings, cart-store, money
src/components/    design-system components (ProductCard, Header, PopupHost, …)
src/app/(store)/   storefront: home, shop, product, cart, checkout, order, track,
                   services, book, refer, deals, blog, faq, about, contact, legal
src/app/admin/     dashboard: products, orders, bookings, payments+links+QR,
                   customers, technicians, referrals/payouts, promotions, popup
                   builder, content, marketing, settings, reports, notification log
src/app/technician/ mobile-first job app
src/app/pay/       hosted no-login payment page (QR + MoMo + card sandbox)
docs/              ADMIN_GUIDE.md, API.md, DEPLOYMENT.md, going-live notes
tests/             unit tests (node --test + tsx, no extra deps) — pricing, money,
                   phone/QR rules
e2e/               Playwright flows (shop→cart→checkout, payments, refunds,
                   bookings, referrals, admin/technician screens)

```

## Scripts

| Command | What |
|---|---|
| `npm run dev` / `build` / `start` | app lifecycle |
| `npm run db:push` / `db:seed` / `db:reset` | schema / seed / wipe+reseed |
| `npm run db:provider:pg` / `db:provider:sqlite` | flip the datasource between live (Postgres) and demo (SQLite) |
| `npm run db:dump` | export `prisma/dump.sql` (DDL + all rows) for a portable SQL dump |
| `npm test` | unit tests, then the full Playwright suite |
| `npm run test:unit` | `node --import tsx --test tests/unit.test.ts` (no app needed) |
| `npm run test:e2e` | Playwright only — start the app first (`npm run dev`, or `npm run build && npm start`) against a seeded DB |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |

## Documentation

- `docs/ADMIN_GUIDE.md` — walkthrough: add a product, set a promo, build a pop-up, generate a payment link + QR, approve a referral payout.
- `docs/API.md` — every route, auth, error envelope, rate limits, curl examples.
- `docs/DEPLOYMENT.md` — Docker, VPS/nginx, PaaS, env vars, backups.

## Key product features

- **Shop**: genuine-only premium catalog, serial-verified positioning, live margins in admin, bulk CSV price import, flash sales w/ countdown, bundles, wishlist, compare, recently viewed, back-in-stock alerts, add-installation upsell, WhatsApp ask-prefilled.
- **Booking**: availability engine w/ slot capacity + blocked dates, urgency surcharges (Standard/Urgent/Emergency), photo uploads, deposit/full/pay-after/quote modes, booking QR + .ics, full status lifecycle w/ notifications, ratings, technician dispatch, quote → accept → pay link.
- **Payments GH**: MoMo prompt flow, card hosted, GhIPSS/bank, dynamic QR w/ expiry + regeneration + live “waiting for payment” polling, payment links for any order/booking/quote/custom amount (also from technician app), refunds, partial payments, manual transfer with proof + admin approval, reconciliation view.
- **Referrals**: `/r/CODE` links + QR, cookie attribution, fraud rules (no self-referral, one reward/new customer, min order), wallet ledger, MoMo payouts w/ approval + minimum, affiliate tiers with custom commission, leaderboard.
- **Marketing**: coupon engine (percent/fixed/free-ship, min spend, limits, category/product scoped, first-order/referral-only, schedules), pop-up builder (welcome/exit/timed/scroll/cart/seasonal + targeting/frequency/priority + lead capture CSV), announcement bar, abandoned-cart log + recovery template, newsletter, broadcast templates.
- **Trust & legal**: Ghana Data Protection Act privacy policy, terms, refund/warranty policy, VAT (15%, inclusive) + levy config, cookie notice, WCAG-AA basics, security headers, rate limits, audit/activity logs.

## Assumptions made (demo build)

- Phone/email/address/GPS use realistic sample values, editable in Admin → Settings.
- VAT treated as inclusive of displayed retail prices (GH standard); levy configured separately in Settings.
- Product photography: clean original SVG line-art per category glyph until real licensed photos are dropped in (see `IMAGE_CREDITS.md`) — per mission rule “SVG instead of a wrong image”.
- Google OAuth and websockets use polling fallbacks in demo (3s poll on payment status).

## Known limitations

- Sandbox gateway obviously doesn’t move real money; live mode requires the checklist above.
- PWA install works; offline fallback covers static shell, not DB-driven pages.
- `npm run lint` still reports 40 ESLint errors + 49 warnings: mostly `@typescript-eslint/no-explicit-any` in admin editors, React 19 compiler rules (`set-state-in-effect`, `purity`, `use-memo`) and `<img>`/unused-var advisories. None affect runtime, the type-check or CI (which builds and tests, and does not gate on lint); they are listed as follow-up cleanup rather than defects.
- Payment status uses 3s polling instead of websockets, so a sandbox payment lands up to ~3s after the gateway “confirms”.
- The review URL is an anonymous Cloudflare quick tunnel: it dies with the process and gets a new random hostname on every restart. Pin `NEXT_PUBLIC_SITE_URL` at build time again whenever the host changes, or structured data and payment/referral links will carry a stale host.
- `ipOf()` in `src/lib/rate-limit.ts` trusts `x-forwarded-for` so the e2e projects can hold separate buckets. That header is client-supplied, so in front of a proxy that does not overwrite it, a client could spoof IPs to relax a limiter. Set the proxy to strip/replace `x-forwarded-for` (Caddy, Nginx and Cloudflare do this by default) or switch the key to `cf-connecting-ip`.
