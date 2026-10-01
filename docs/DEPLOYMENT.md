# Deployment guide — GabiElectricals

## 1. Docker (recommended, one command)

```bash
docker compose up --build web        # http://localhost:3000
```

The image is multi-stage (`node:22-slim`): `deps` → `build` (prisma generate + next build) → `run`
(`next start`, `.next`, `public`, `prisma`, `node_modules` only). On first boot the container runs
`prisma db push` and seeds the demo catalog once, guarded by `/app/data/.seeded`.

| Volume | Holds |
|---|---|
| `gbidata` | `/app/data` — the SQLite database (demo default) |
| `gbiuploads` | `/app/public/uploads` — images/proofs uploaded through the admin |
| `pgdata` | `/var/lib/…` — Postgres data (live profile) |

Health: `HEALTHCHECK` polls `/api/health` every 30 s; it reports DB reachability and `DEMO_MODE`.

```bash
docker compose logs -f web
docker compose exec web npx prisma db push          # after a schema change
docker compose down && docker volume rm gabielectricals_gbidata   # reset demo data
```

## 2. Live mode with Postgres

```bash
docker compose --profile live up -d db
npm run db:provider:pg          # rewrites the datasource in prisma/schema.prisma + .env placeholder
# datasource db { provider = "postgresql" }
docker compose up -d --build web
docker compose exec -e DATABASE_URL=postgresql://gabi:gabi@db:5432/gabielectricals web \
  npx prisma db push --skip-generate
```

Two things to know before the first Postgres build (both verified locally):
`next build` renders the storefront from the database, so `DATABASE_URL` must be reachable
**during the build**, not just at runtime; and Postgres `contains` is case-sensitive, so add
`mode: 'insensitive'` to the four filters in `src/app/api/search/route.ts`.

Then in Admin → Settings use **Clear all sample data** before taking real orders.

## 3. Bare metal / VPS

```bash
node -v                      # v22+
npm ci
cp .env.example .env         # set SESSION_SECRET, NEXT_PUBLIC_SITE_URL, DATABASE_URL
npx prisma generate && npx prisma db push && npx tsx prisma/seed.ts
npm run build && npm start   # or: pm2 start npm --name gabi -- start
```

Reverse proxy (nginx) minimum:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;   # secure cookies depend on this
  client_max_body_size 12m;                      # booking photos / transfer proofs
}
```

Certbot/Let's Encrypt for TLS. The app sets HSTS, CSP, `X-Frame-Options: DENY` and
`Referrer-Policy` itself (`next.config.ts`).

## 4. PaaS

- **Vercel** (exact steps, verified up to account activation):

  ```bash
  npm run db:provider:pg                      # datasource → postgresql
  npx vercel project add gabielectricals      # project names must be lowercase
  npx vercel link --yes
  # add a Postgres store (Marketplace → Vercel Postgres/Neon/Prisma Postgres), then:
  npx vercel env add DATABASE_URL production
  npx vercel env add SESSION_SECRET production       # 32+ random bytes
  npx vercel env add NEXT_PUBLIC_SITE_URL production # https://<your-domain>
  npx vercel env add DEMO_MODE production            # "true" for the sandbox gateway
  npx prisma db push && npx tsx prisma/seed.ts       # run against the prod URL from your PC
  npx vercel --prod
  ```

  The Prisma generator already carries `binaryTargets = ["native", "rhel-openssl-3.0.x"]`, so a
  Windows/Linux mismatch can't strand the serverless runtime. A hosted Postgres is mandatory —
  the serverless filesystem is read-only, so `file:./dev.db` cannot persist there. Remember the
  `mode: 'insensitive'` change to `src/app/api/search/route.ts` noted above.

- **Render / Railway / Fly.io**: use `Dockerfile` directly, attach a persistent volume (or Postgres
  add-on) and set `DATABASE_URL`; health check path `/api/health`.

- **Review link with no hosting account** (Cloudflare quick tunnel — used to ship this build; the
  whole Playwright suite passes against it over HTTPS):

  ```bash
  # 1. get the binary (macOS: cloudflared-darwin-arm64.tgz, Linux: cloudflared-linux-amd64)
  curl -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
  # 2. build + start the production server, baking the future host into metadata and links
  NEXT_PUBLIC_SITE_URL=https://<tunnel-host> npm run build
  NEXT_PUBLIC_SITE_URL=https://<tunnel-host> npm start -- -p 3100
  # 3. open the tunnel, then re-run steps 1–2 with the printed hostname
  ./cloudflared.exe tunnel --url http://127.0.0.1:3100 --no-autoupdate
  ```

  Quick tunnels are anonymous, so the hostname is random and only resolves while `cloudflared` and
  the Node server are alive. Everything the app renders from `NEXT_PUBLIC_SITE_URL` (canonical/OG
  tags, `sitemap.xml`, JSON-LD, `/pay/<code>` links, referral links, MoMo webhook `callback_url`)
  therefore has to be built with the tunnel host set; a stable host or real deployment should pin it
  permanently. The tunnel forwards every public request to your machine, so stop it with
  <kbd>Ctrl</kbd>+<kbd>C</kbd> when the review is finished.

## 5. Environment variables

See `.env.example`. The ones that change behaviour:

| Var | Effect |
|---|---|
| `DEMO_MODE` | `true` = sandbox gateway + logged notifications; `false` = live providers |
| `DATABASE_URL` | SQLite path (`file:./dev.db`) or Postgres URL |
| `SESSION_SECRET` | JWT signing key — 32+ random bytes in production |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL: sitemap, OG tags, payment/referral links, QR payloads |
| `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` | Live cards + MoMo via Paystack (`/api/payments/webhook`) |
| `SMS_PROVIDER` + keys | `hubtel` / `arkesel` / `twilio` for real SMS |
| `RESEND_API_KEY` | Real email |
| `GA4_MEASUREMENT_ID` / `META_PIXEL_ID` | Tag loading (kept out of the CSP until set) |

## 6. Backups

```bash
# SQLite
sqlite3 /app/data/prod.db ".backup '/backups/gabi-$(date +%F).db'"
# Postgres
pg_dump "$DATABASE_URL" | gzip > /backups/gabi-$(date +%F).sql.gz
# Uploads (images, transfer proofs, booking media)
rsync -a /app/public/uploads/ /backups/uploads/
```

Cron nightly, keep 30 days, copy off-box. `prisma/dump.sql` (`npm run db:dump`) is a portable
text dump of the demo data — useful to re-seed a fresh install with the same sample content.

## 7. CI

`.github/workflows/ci.yml` runs on every push/PR: `npm ci` → generate + push schema → seed →
`tsc --noEmit` → `next build` → start the app → Playwright suite (chromium). Add your own deploy
step after it (e.g. `docker build` + `docker push`, or `vercel --prod`).
