# Admin walkthrough — GabiElectricals

Sign in at `/login` with `admin@gabielectricals.com` / `GabiAdmin2026!`, then open `/admin`.
Everything below is live in Demo Mode; the sandbox gateway and the Notification Log replace real
gateways and message providers.

## 1. Add a product with images

1. `/admin/products` → **New product**.
2. Fill in name, SKU, brand, category, then the three price fields: **cost**, **selling**,
   **compare-at**. The margin badge updates as you type — a selling price below cost shows red.
3. Stock, warranty months, and the toggles **Featured / Best seller / New**.
4. **Specs builder**: add `key → value` rows (Conductor, Length, Cable size…); they render as the
   spec table on the product page and feed the structured data (`Product` schema).
5. **Images**: drag files into the uploader (or paste a URL). The first image is the card image.
   Uploads land in `public/uploads/` and are listed in `/admin/content` → Image library.
6. **SEO** tab: slug, meta title, meta description. Leave blank and the defaults are generated from
   the name and description.
7. Set status **PUBLISHED** and save. The product appears in `/shop`, in search suggestions and in
   the category listing immediately (no rebuild).

Bulk options: **Export CSV** downloads the catalog; **Import CSV** accepts the same columns
(`slug` is the upsert key) so a price list from a supplier can be applied in one pass.
**Bulk markup** applies a percentage change to a whole category or brand, with a preview count
before it is committed.

## 2. Set a promo (coupon / flash sale / bundle)

`/admin/promotions` has four tabs.

- **Coupons** → New coupon. Type `PERCENT`, `FIXED` or `FREE_DELIVERY`; set value, minimum spend,
  total usage limit, per-customer limit, schedule, and optional scopes (categories, brands,
  products, first-order-only, referral-only). Copy the code field into a customer's order to test.
  Validate it without checking out: `/deals` lists live coupons, and `POST /api/coupon/validate`
  returns the same reason text the cart shows.
- **Flash sales** → pick a published product, sale price, qty limit and start/end. A countdown band
  appears on the product page and a **Deals** tile lights up while the window is open.
- **Bundles** → "frequently booked together" groups; the bundle price is applied in the cart drawer.
- **Free delivery threshold** lives with the zones (`/admin/settings` → Delivery zones, `freeOver`).

## 3. Create a pop-up

`/admin/promotions/popups` → New pop-up.

1. **Kind** decides the trigger: `WELCOME` (on arrival), `TIMED` (after `delaySec`),
   `SCROLL` (after `scrollPct` of the page), `EXIT` (pointer leaving through the top of the window,
   armed 10 s after load), `SEASONAL`, `CART`.
2. Headline, body, button label/href, colours, optional coupon code (copied to the clipboard on
   claim) and optional WhatsApp button / lead-capture email field.
3. **Targeting**: pages, `NEW` / `RETURNING` / `ALL` visitors, device. **Frequency**: `SESSION`
   (6 h), `DAY`, `WEEK`, `ONCE`. **Priority** breaks ties — only one campaign is offered per
   browser session, and a dismissal is remembered per campaign.
4. Save and mark **Active**. Open the site in a second browser (or a private window) to see it.
   Impressions and conversions are counted on the card; leads export from
   `/admin/marketing` → Leads → CSV.

The announcement bar and hero slides are edited in `/admin/content`.

## 4. Generate a payment link and QR

1. `/admin/payments` → **Payment links** tab → New link: label, amount, what it is for
   (order / booking / quote / custom), expiry minutes.
2. Copy the URL (`/pay/<code>`) or share it to WhatsApp/SMS from the card.
3. The hosted page shows a dynamic QR (`/scan?ref=…`). Scanning or opening it starts the sandbox
   payment; the page polls `/api/payments/status/<reference>` and flips to a receipt when it turns
   PAID. Expired links regenerate with one click (new reference, same amount).
4. To simulate outcomes in Demo Mode use the sandbox controls on the payment row:
   success / pending / failure, or approve a manual-transfer proof from the **Awaiting approval**
   filter. Technicians can raise the same kind of link from `/technician` → a job → **Collect payment**.

Invoices (`/order/<no>/invoice`) and booking confirmations carry their own QR and payment link.

## 5. Approve a referral payout

1. `/admin/referrals` → **Payouts** tab lists every withdrawal request with the MoMo number,
   network and amount.
2. Check the wallet maths first: the customer's balance and the minimum payout come from
   `/admin/referrals` → Settings (reward per referral, minimum, commission tiers).
3. **Approve** writes a ledger entry, marks the request PAID and logs the SMS/email that would have
   gone out; **Reject** returns the credit to the wallet with the reason in the note.
4. Abusers: the referrers table shows self-referral and duplicate-device flags — **Disable** stops
   further accrual without deleting history.

## 6. Other daily routes

| Screen | Use |
|---|---|
| `/admin/orders` | Status changes, packing notes, invoice reprint, refunds (partial or full) |
| `/admin/bookings` | Calendar + list, assign technician, block dates, change slot capacity |
| `/admin/quotes` | Line items → send quote → customer accepts and pays via link |
| `/admin/customers` | Search, wallet adjustment, order history, addresses |
| `/admin/reports` | Sales, profit, services and referral exports (CSV) |
| `/admin/settings` | Business info, VAT/levy, zones, payment toggles, notification templates, staff and roles, activity log |
| `/admin/notifications` | Every SMS/email/WhatsApp the app would have sent, with status |
