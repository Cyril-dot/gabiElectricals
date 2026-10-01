# API reference — GabiElectricals

All endpoints live under `/api/*`, take and return JSON unless noted, and are implemented as
Next.js route handlers in `src/app/api`.

## Conventions

- **Auth**: a signed HS256 JWT in the `ge_session` cookie (`httpOnly`, `SameSite=Lax`, 30 days).
  SameSite plus `X-Frame-Options: DENY` and CSP `form-action 'self'` is the CSRF posture.
  Server components/route handlers use `getSession()` / `requireRole('ADMIN','SUPER_ADMIN')`.
- **Errors**: `{ "error": "human readable message" }` with `400` (validation), `401`, `403`,
  `404`, `409` (state conflict), `422` (schema), `429` (rate limited, includes `retryAfterSec`).
- **Validation**: Zod schemas at the boundary; prices, stock and slot capacity are always recomputed
  server-side from the database, never taken from the client.
- **Rate limits**: in-memory fixed window per IP + route (`src/lib/rate-limit.ts`) — checkout 10/min,
  auth 8/min, staff mutations 10/min.
- **Money**: decimal GHS numbers (`385.5`), formatted for display with `ghs()` → `₵385.50`.
- **Idempotency**: payment references are unique; `/api/payments/sandbox`, `/api/payments/webhook`
  and `/api/payments/proof` no-op once a payment is in a terminal state.

## Public

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness + DB + demo mode (used by Docker healthcheck) |
| GET | `/api/search?q=` | Product suggestions for live search (array, max 12) |
| GET | `/api/zones` | Delivery zones: fee, ETA, free-over threshold |
| GET | `/api/products/categories` | Category tree with counts |
| GET | `/api/slots?service=&from=&days=` | Availability engine (`dates[].slots[]` with capacity/booked/remaining) |
| GET | `/api/bookings/estimate` | Quote estimate for a service + urgency before booking |
| GET | `/api/faq` | FAQ entries (also feeds the chatbot and FAQPage JSON-LD) |
| GET | `/api/popups/active` | Campaigns eligible right now (trigger kind + styling) |
| POST | `/api/popups/view`, `/api/popups/convert` | Impression + lead/conversion capture |
| POST | `/api/coupon/validate` | `{ ok, reason, discount }` for a code and subtotal |
| POST | `/api/newsletter`, `/api/support`, `/api/reviews`, `/api/stockalert`, `/api/compare`, `/api/wishlist` | Lead and engagement forms |
| POST | `/api/track`, `/api/orders/lookup` | Order/booking tracking by number + email/phone |
| POST | `/api/upload` | Image/video upload for bookings and reviews (type + size checked) |

## Auth & account

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create customer (email + password or phone OTP) |
| POST | `/api/auth/login`, `/api/auth/logout` | Session cookie lifecycle |
| POST | `/api/auth/otp` | Phone OTP send/verify (logged, not sent, in Demo Mode) |
| PATCH | `/api/profile` | Name, phone, password change |
| POST/PATCH/DELETE | `/api/addresses` | Saved addresses (Ghana Post GPS validated) |
| GET | `/api/wallet/balance` | Referral credit available at checkout |

## Orders, bookings, quotes

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/checkout` | Server-priced order creation → `{ orderNo, total, payment }` |
| POST | `/api/bookings/create` | Booking with slot lock/validation → `{ bookingNo, quote }` |
| POST | `/api/bookings/[bookingNo]/reschedule` / `cancel` | Rule-checked (cut-off, deposit state) |
| PATCH | `/api/bookings/[bookingNo]/review` | Rating + text after completion |
| POST | `/api/quotes`, `/api/quotes/[id]/send` | Quote builder and customer delivery |
| POST/GET/PATCH | `/api/quotes/[id]/pay` | Accept quote → payment link/QR |

## Payments

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/payments/initiate` | MoMo prompt / card host / QR for an order or booking |
| GET | `/api/payments/status/[reference]` | Poll status: PENDING → PAID / FAILED / EXPIRED / REFUNDED |
| GET | `/api/payments/qr?text=` | PNG data-URL for a payment QR |
| POST | `/api/payments/proof` | Manual transfer receipt upload → admin approval queue |
| POST | `/api/payments/sandbox` | Demo-only outcome switch (`success|pending|failure`) |
| POST | `/api/payments/webhook` | Paystack-style webhook with SHA-512 signature verification |
| POST/GET | `/api/paylinks`, `/api/paylinks/[code]` | Create links; GET returns link + status for `/pay/<code>` |

## Staff (`ADMIN`, `SUPER_ADMIN` unless noted)

`/api/admin/…`: `products` (+ `[id]`, `csv` export, `import`), `orders/[id]` (+ `events`),
`customers/[id]/wallet`, `bookings/[id]`, `blocked-dates`, `slot-capacity`, `quotes/[id]`,
`services`, `payments/[id]/approve`, `refunds`, `paylinks` (also `TECHNICIAN`),
`coupons/[id]`, `flash-sales/[id]`, `bundles/[id]`, `popups/[id]`, `content/[model]/[id]`,
`reviews`, `marketing/{broadcast,leads/[id],recover,export}`, `referrals/{settings,users/[id]}`,
`payouts/[id]`, `affiliate/[id]`, `zones`, `settings`, `reports/export`, `demo`
(reset / clear sample data).

`/api/technician/bookings/[id]` (`TECHNICIAN`) — status advance, notes, photos;
`/api/technician/bookings/[id]/pay` — collect payment via link or QR.

## Examples

```bash
# place an order (guest)
curl -s -X POST localhost:3000/api/checkout -H 'content-type: application/json' -d '{
  "contact": {"name":"Ama","email":"ama@example.com","phone":"0241234567"},
  "fulfilment":"DELIVERY","zoneId":"<id>","payment":{"method":"MOMO_MTN","momoPhone":"0241234567"},
  "items":[{"slug":"folded-cable-2-5mm-single-core-100m-roll","qty":2}]}'

# pay it in the sandbox
curl -s -X POST localhost:3000/api/payments/initiate -H 'content-type: application/json' \
     -d '{"orderNo":"GE-2026-1234","method":"MOMO_MTN","phone":"0241234567"}'
curl -s -X POST localhost:3000/api/payments/sandbox -H 'content-type: application/json' \
     -d '{"reference":"<reference>","outcome":"success"}'
```
