// GabiElectricals demo seeder — deterministic sample data for the Ghana market.
// Run: npm run db:seed   (idempotent: wipes & rebuilds demo tables)
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import bcrypt from 'bcryptjs';
import { CATEGORIES, BRANDS, PRODUCTS } from './seed-data/products';
import { SERVICES, TECHNICIANS, CUSTOMERS, REGIONS_CITIES, COUPONS, POPUPS, HERO_SLIDES, TESTIMONIALS, FAQS, BLOG_POSTS } from './seed-data/content';

const prisma = new PrismaClient();
const DAY = 86400000;
const now = Date.now();

// deterministic RNG
let _s = 20260930;
const rnd = () => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const IMG_DIR = 'public/images/products';
const GLYPHS: Record<string, string> = {
  cable: 'M20 60 Q20 30 50 30 L150 30 M20 75 Q20 45 50 45 L150 45',
  socket: 'M60 55 a6 6 0 1 0 0 .1 M140 55 a6 6 0 1 0 0 .1 M100 30 a70 70 0 1 0 0 140 a70 70 0 1 0 0-140',
  breaker: 'M60 30 h80 v90 h-80 z M100 30 v90 M75 55 h15 M110 55 h15 M75 85 h15 M110 85 h15',
  bulb: 'M100 30 a40 40 0 1 0 0 80 M85 110 h30 M88 122 h24 M90 134 h20 z',
  solar: 'M40 110 L70 50 L160 50 L130 110 z M55 80 L85 80 M75 50 L55 110',
  battery: 'M40 60 h100 v70 h-100 z M60 45 h25 v15 M110 45 h25 v15 M55 95 h70',
  gen: 'M40 60 h90 v60 h-90 z M130 75 h25 v30 h-25 M60 120 a10 10 0 1 0 0 .1 M110 120 a10 10 0 1 0 0 .1',
  tool: 'M50 130 L110 70 M100 60 a15 15 0 1 0 0 .1 M115 45 l25 25 -15 15 -25-25 z',
  fan: 'M100 100 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M100 92 c-25 -35 10 -60 0 -60 M108 100 c35 -25 60 10 60 0 M100 108 c25 35 -10 60 0 60 M92 100 c-35 25 -60 -10 -60 0',
  plug: 'M75 45 v30 M125 45 v30 M60 75 h80 v25 a40 40 0 0 1 -80 0 z',
  cam: 'M40 60 h80 v45 h-80 z M120 70 l30 -15 v50 l-30 -15 M60 105 v20 M90 130 h30',
  wifi: 'M100 125 a6 6 0 1 0 0 .1 M70 105 a45 45 0 0 1 60 0 M50 82 a75 75 0 0 1 100 0 M30 60 a105 105 0 0 1 140 0',
  meter: 'M55 35 h90 v125 h-90 z M70 55 h60 v40 h-60 z M70 110 h15 M95 110 h15 M120 110 h10 M70 128 h60',
};
function productSvg(name: string, icon: string, variant: number): string {
  const bg = variant === 0 ? ['#0B1B3A', '#123063'] : ['#0A2A6B', '#0A5CFF'];
  const glyph = GLYPHS[icon] || GLYPHS.bulb;
  const label = name.replace(/—.*$/, '').trim().slice(0, 46);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 200 150" role="img" aria-label="${label}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient></defs>
<rect width="200" height="150" fill="url(#g)"/>
<g stroke="#FFB020" stroke-width="0.6" opacity="0.25" fill="none"><path d="M0 15 H40 V35 H80"/><path d="M200 130 H160 V110 H120"/><circle cx="40" cy="35" r="1.6" fill="#FFB020"/><circle cx="160" cy="110" r="1.6" fill="#FFB020"/></g>
<g transform="translate(0,5)" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"><path d="${glyph}"/></g>
<text x="100" y="143" text-anchor="middle" font-family="Manrope,Arial" font-size="6.5" fill="#FFB020">${label.slice(0, 60)}</text>
<text x="6" y="12" font-family="Manrope,Arial" font-weight="700" font-size="7" fill="#FFF">Gabi<tspan fill="#FFB020">Electricals</tspan></text>
</svg>`;
}

async function main() {
  // single-run lock (two concurrent seeds would race on unique columns)
  try { writeFileSync('prisma/.seed.lock', String(process.pid), { flag: 'wx' }); }
  catch { console.error('✖ Another seed is already running (prisma/.seed.lock). Waiting is fine — it self-removes on exit.'); process.exit(3); }
  console.log('▶ Seeding GabiElectricals demo data…');
  // wipe order matters (FKs)
  for (const m of [prisma.analyticsEvent, prisma.abandonedCart, prisma.supportTicket, prisma.warrantyRegistration, prisma.stockAlert, prisma.compareItem, prisma.wishlistItem, prisma.cartLine, prisma.referralVisit, prisma.payoutRequest, prisma.affiliateApplication, prisma.ledgerEntry, prisma.activityLog, prisma.notificationLog, prisma.uploadedFile, prisma.subscription, prisma.lead, prisma.popup, prisma.bundleItem, prisma.bundle, prisma.flashSale, prisma.coupon, prisma.paymentEvent, prisma.payment, prisma.paymentLink, prisma.quote, prisma.bookingEvent, prisma.booking, prisma.technician, prisma.blockedDate, prisma.slotCapacity, prisma.review, prisma.orderEvent, prisma.orderItem, prisma.order, prisma.deliveryZone, prisma.address, prisma.session, prisma.seoMeta, prisma.heroSlide, prisma.announcementBar, prisma.testimonial, prisma.faq, prisma.blogPost, prisma.setting, prisma.service, prisma.product, prisma.brand, prisma.category, prisma.user] as { deleteMany: (args?: never) => Promise<unknown> }[]) {
    await m.deleteMany();
  }
  rmSync(IMG_DIR, { recursive: true, force: true });
  mkdirSync(IMG_DIR, { recursive: true });
  mkdirSync('public/images/hero', { recursive: true });

  // ── categories / brands ──
  const catIds: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const r = await prisma.category.create({ data: { slug: c.slug, name: c.name, description: c.desc, icon: c.icon, sortOrder: c.order } });
    catIds[c.slug] = r.id;
  }
  const brandIds: Record<string, string> = {};
  for (const b of BRANDS) {
    const r = await prisma.brand.create({ data: { slug: slugify(b), name: b } });
    brandIds[b] = r.id;
  }

  // ── products + generated images ──
  const prodIds: Record<string, string> = {};
  for (const p of PRODUCTS) {
    const slug = slugify(p.n);
    const cat = CATEGORIES.find(c => c.slug === p.c)!;
    const imgs: string[] = [];
    for (let v = 0; v < 3; v++) {
      const f = `${slug}-${v + 1}.svg`;
      writeFileSync(`${IMG_DIR}/${f}`, productSvg(p.n, cat.icon, v));
      imgs.push(`/images/products/${f}`);
    }
    const r = await prisma.product.create({
      data: {
        slug, name: p.n, sku: `GE-${p.c.slice(0, 3).toUpperCase()}-${String(Object.keys(prodIds).length + 1001)}`,
        description: p.d, shortDesc: p.d.split('.')[0] + '.',
        categoryId: catIds[p.c], brandId: brandIds[p.b],
        price: p.p, costPrice: p.cost, compareAtPrice: p.cmp ?? null,
        stock: p.s, warrantyMonths: p.w,
        badges: JSON.stringify(p.badge ?? ['100% Genuine']),
        images: JSON.stringify(imgs),
        specs: JSON.stringify(p.sp), tags: JSON.stringify(p.tg ?? []),
        featured: !!p.feat, bestSeller: !!p.best, isNew: !!p.new,
        metaTitle: `${p.n} Ghana | GabiElectricals`,
        metaDescription: p.d.slice(0, 155),
      },
    });
    prodIds[slug] = r.id;
  }
  console.log(`  ✓ ${Object.keys(prodIds).length} products, images generated`);

  // ── hero images (generated brand art; see IMAGE_CREDITS.md) ──
  const heros = [
    ['hero-wiring', GLYPHS.cable, 'Certified wiring, genuine cable'],
    ['hero-solar', GLYPHS.solar, 'Solar & backup power done right'],
    ['hero-technician', GLYPHS.tool, 'NIET-certified electricians'],
  ] as const;
  for (const [name, g, cap] of heros) {
    writeFileSync(`public/images/hero/${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 160 90"><defs><linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1B3A"/><stop offset="1" stop-color="#0A5CFF"/></linearGradient></defs><rect width="160" height="90" fill="url(#h)"/><g transform="translate(30,10) scale(0.5)" fill="none" stroke="#FFB020" stroke-width="3" opacity="0.9"><path d="${g}"/></g><text x="80" y="82" text-anchor="middle" font-family="Manrope,Arial" font-size="5" fill="#fff">${cap}</text></svg>`);
    writeFileSync(`public/images/hero/${name}.webp.svg`, ''); // path compat shim unused
  }
  // rewrite hero slide image paths to svg (webp is phase-7 upgrade when live photos are fetched)
  const slidesFixed = HERO_SLIDES.map(h => ({ ...h, image: h.image.replace('.webp', '.svg') }));
  for (const [i, h] of slidesFixed.entries()) {
    await prisma.heroSlide.create({ data: { headline: h.headline, sub: h.sub, ctaLabel: h.cta, ctaHref: h.href, cta2Label: h.cta2 ?? null, cta2Href: h.href2 ?? null, image: h.image, badge: h.badge ?? null, sortOrder: i } });
  }

  // ── users ──
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  const mk = (name: string, email: string, role: any, phone?: string, extra: any = {}) =>
    prisma.user.create({ data: { name, email, role, phone, passwordHash: hash('Demo1234!'), referralCode: (name.split(' ')[0] + int(10, 99)).toUpperCase(), ...extra } });

  const superAdmin = await mk('Gabi Asante (Founder)', process.env.ADMIN_EMAIL || 'admin@gabielectricals.com', 'SUPER_ADMIN', '+233241000111');
  await prisma.user.update({ where: { id: superAdmin.id }, data: { passwordHash: hash(process.env.ADMIN_PASSWORD || 'GabiAdmin2026!') } });
  const opsAdmin = await mk('Efua Larbi (Ops)', 'ops@gabielectricals.com', 'ADMIN', '+233241000112');
  const techUsers = [];
  for (const t of TECHNICIANS) {
    const u = await mk(t.name, `${slugify(t.name)}@gabielectricals.com`, 'TECHNICIAN', `+2332${int(40000000, 49999999)}`);
    const rec = await prisma.technician.create({
      data: { userId: u.id, bio: t.bio, specialties: JSON.stringify(t.spec), regions: JSON.stringify(t.regions), rating: 4.4 + rnd() * 0.6, jobsCompleted: int(40, 320), avatar: null },
    });
    techUsers.push({ u, t, techId: rec.id });
  }
  const custs: { u: Awaited<ReturnType<typeof mk>>; name: string; region: string; city: string }[] = [];
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const name = CUSTOMERS[i];
    const region = pick(Object.keys(REGIONS_CITIES));
    const city = pick(REGIONS_CITIES[region]);
    const u = await mk(name, `${slugify(name).replace(/[^a-z]/g, '')}${i}@gmail.com`, i === 3 ? 'AFFILIATE' : 'CUSTOMER', `+233${pick(['24', '20', '54', '55', '27'])}${int(10000000, 99999999)}`, { walletCredit: i < 12 ? int(0, 60) : 0, tier: i === 3 ? 'GOLD' : null, commissionPct: i === 3 ? 7.5 : null });
    custs.push({ u, name, region, city });
    await prisma.address.create({ data: { userId: u.id, label: 'Home', region, city, landmark: pick(['Near Shoprite', 'Opposite the mosque', 'Behind Total filling station', 'Blue gate, last street', 'Above Melcom, block C', 'By the trotro stop']), gps: `G${pick(['A', 'N', 'S', 'W'])}${pick(['-', 'T'])}-${int(100, 999)}-${int(1000, 9999)}`, phone: u.phone!, isDefault: true } });
  }
  // referral chain: last 10 customers referred by earlier ones
  for (let i = 0; i < 10; i++) {
    const ref = custs[int(0, 14)];
    const me = custs[20 + i];
    await prisma.user.update({ where: { id: me.u.id }, data: { referredById: ref.u.id } });
    await prisma.referralVisit.create({ data: { code: ref.u.referralCode, referrerId: ref.u.id, fingerprint: `fp${int(1000, 9999)}`, converted: true } });
    await prisma.ledgerEntry.create({ data: { userId: ref.u.id, amount: 20, reason: 'REFERRAL_BONUS', refType: 'REFERRAL', refId: me.u.id, balanceAfter: 20 * (i + 1) } });
  }
  await prisma.payoutRequest.createMany({ data: [1, 4, 9].map(i => ({ userId: custs[i].u.id, amount: int(100, 240), method: 'MOMO', momoNumber: custs[i].u.phone!, network: pick(['MTN', 'Telecel']), status: pick(['PENDING', 'PENDING', 'APPROVED', 'PAID']) })) });
  await prisma.affiliateApplication.create({ data: { userId: custs[3].u.id, name: custs[3].name, phone: custs[3].u.phone!, audience: '42k YouTube subscribers — Accra home DIY', status: 'APPROVED', commissionPct: 7.5 } });
  console.log(`  ✓ ${custs.length + techUsers.length + 2} users`);

  // ── zones ──
  const zones = [
    { name: 'Greater Accra Core', regions: JSON.stringify(['Greater Accra']), fee: 25, freeOver: 1500, etaDays: 1 },
    { name: 'Accra Outskirts', regions: JSON.stringify(['Greater Accra']), fee: 40, freeOver: 2000, etaDays: 1 },
    { name: 'Kumasi', regions: JSON.stringify(['Ashanti']), fee: 45, freeOver: 2500, etaDays: 2 },
    { name: 'Takoradi', regions: JSON.stringify(['Western']), fee: 50, freeOver: 2500, etaDays: 2 },
    { name: 'Tamale', regions: JSON.stringify(['Northern']), fee: 60, freeOver: 3000, etaDays: 3 },
    { name: 'Cape Coast / Central', regions: JSON.stringify(['Central']), fee: 50, freeOver: 2500, etaDays: 2 },
  ];
  const zoneRecs: Record<string, string> = {};
  for (const z of zones) zoneRecs[z.name] = (await prisma.deliveryZone.create({ data: z })).id;

  // ── orders + payments ──
  const allProdSlugs = Object.keys(prodIds);
  const statusPlan = [
    ...Array(6).fill('PENDING_PAYMENT'), ...Array(5).fill('PAID'), ...Array(6).fill('PROCESSING'),
    ...Array(5).fill('OUT_FOR_DELIVERY'), ...Array(12).fill('DELIVERED'), ...Array(3).fill('CANCELLED'),
    ...Array(2).fill('REFUNDED'), 'PARTIALLY_PAID',
  ];
  const methods = ['MOMO_MTN', 'MOMO_MTN', 'MOMO_TELECEL', 'MOMO_AT', 'CARD', 'QR', 'BANK_TRANSFER', 'GHIPSS', 'PAY_ON_DELIVERY', 'MANUAL_TRANSFER', 'WALLET'] as const;
  const orders = [];
  for (let i = 0; i < statusPlan.length; i++) {
    const status = statusPlan[i];
    const cust = pick(custs);
    const nItems = int(1, 4);
    const items: any[] = [];
    let subtotal = 0;
    for (let k = 0; k < nItems; k++) {
      const pslug = pick(allProdSlugs);
      const p = PRODUCTS.find(x => slugify(x.n) === pslug)!;
      const qty = int(1, 3);
      subtotal += p.p * qty;
      items.push({ productId: prodIds[pslug], name: p.n, image: `/images/products/${pslug}-1.svg`, sku: `GE-${pslug.slice(0, 3).toUpperCase()}`, price: p.p, qty });
    }
    const zone = pick(zones);
    const vat = +(subtotal * (15 / 115)).toFixed(2); // prices VAT-inclusive @15%
    const discount = i % 5 === 0 ? +(subtotal * 0.1).toFixed(2) : 0;
    const fee = subtotal >= (zone.freeOver ?? 0) ? 0 : zone.fee;
    const total = +(subtotal - discount + fee).toFixed(2);
    const created = new Date(now - int(1, 75) * DAY);
    const o = await prisma.order.create({
      data: {
        orderNo: `GE-2026-${String(1001 + i)}`, userId: cust.u.id, email: cust.u.email, phone: cust.u.phone!,
        status, subtotal, discount, vat, deliveryFee: fee, total,
        couponId: discount > 0 ? null : null,
        zoneId: zoneRecs[zone.name], fulfilment: i % 9 === 0 ? 'PICKUP' : 'DELIVERY',
        addrRegion: cust.region, addrCity: cust.city, addrLandmark: pick(['Near the petrol station', 'Green kiosk corner', 'Opposite church', 'Last blue gate']),
        addrGps: `G${pick(['A', 'N', 'S'])}${pick(['-', 'T'])}-${int(100, 999)}-${int(1000, 9999)}`,
        addrLine: `${int(1, 88)} ${pick(['Palm', 'Cedar', 'Owu', 'Bawaleshie', 'Ofankor', 'Achimota'])} Street`,
        referralCode: i % 7 === 0 ? pick(custs).u.referralCode : null,
        invoiceNo: ['DELIVERED', 'OUT_FOR_DELIVERY', 'PROCESSING', 'PARTIALLY_PAID'].includes(status) ? `INV-2026-${1001 + i}` : null,
        createdAt: created, items: { create: items },
      },
    });
    const flow = ['PENDING_PAYMENT', 'CANCELLED'];
    if (!flow.includes(status)) {
      const pstatus = status === 'PENDING_PAYMENT' ? 'PENDING' : status === 'REFUNDED' ? 'REFUNDED' : status === 'PARTIALLY_PAID' ? 'PARTIALLY_PAID' : status === 'CANCELLED' ? 'FAILED' : 'PAID';
      await prisma.payment.create({
        data: {
          reference: `GE_PAY_${o.orderNo.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`,
          amount: status === 'PARTIALLY_PAID' ? +(total * 0.5).toFixed(2) : total, status: pstatus as any,
          method: pick(methods) as any, provider: 'MOCK', orderId: o.id,
          payerPhone: cust.u.phone, payerEmail: cust.u.email,
          confirmedAt: pstatus === 'PAID' ? new Date(+created + DAY) : null,
          refundNote: status === 'REFUNDED' ? 'Customer returned unopened item — full refund to MoMo' : null,
          expiresAt: status === 'PENDING_PAYMENT' ? new Date(now + 15 * 60000) : null,
          events: { create: [{ type: 'INITIATED', at: created }, ...(pstatus === 'PAID' ? [{ type: 'SUCCESS', note: 'OTP approved by payer', at: new Date(+created + DAY) }] : [])] },
        },
      });
    }
    const hist = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const upto = status === 'CANCELLED' ? 1 : status === 'REFUNDED' ? 2 : hist.indexOf(status);
    for (let h = 0; h <= Math.max(upto, 0); h++) {
      await prisma.orderEvent.create({ data: { orderId: o.id, status: hist[h], at: new Date(+created + h * 0.7 * DAY) } });
    }
    if (status === 'CANCELLED' || status === 'REFUNDED') {
      await prisma.orderEvent.create({ data: { orderId: o.id, status, at: new Date(+created + 2 * DAY), note: status === 'CANCELLED' ? 'Customer cancelled before dispatch' : 'Refund processed' } });
    }
    orders.push(o);
  }
  // extra payment rows to show every status incl. FAILED / EXPIRED / AWAITING_APPROVAL
  await prisma.payment.createMany({ data: [
    { reference: 'GE_PAY_FAIL01', amount: 240, status: 'FAILED', method: 'MOMO_MTN', provider: 'MOCK', payerPhone: '+233240000001', metaJson: '{"reason":"Payer declined approval prompt"}' },
    { reference: 'GE_PAY_FAIL02', amount: 1180, status: 'FAILED', method: 'CARD', provider: 'MOCK', metaJson: '{"reason":"Insufficient funds"}' },
    { reference: 'GE_PAY_EXP01', amount: 565, status: 'EXPIRED', method: 'QR', provider: 'MOCK', expiresAt: new Date(now - 2 * DAY), metaJson: '{"reason":"QR 15-min window elapsed"}' },
    { reference: 'GE_PAY_APP01', amount: 3850, status: 'AWAITING_APPROVAL', method: 'MANUAL_TRANSFER', provider: 'MOCK', payerEmail: 'niiayi@gmail.com', proofImage: '/images/uploads/transfer-proof-sample.svg', metaJson: '{"bank":"Ecobank","acct":"GE-9081"}' },
  ] });
  console.log(`  ✓ ${orders.length} orders + payments in every status`);

  // ── services / bookings / quotes ──
  const svcIds: Record<string, string> = {};
  for (const [i, s] of SERVICES.entries()) {
    const r = await prisma.service.create({
      data: { slug: s.slug, name: s.name, description: s.desc, shortDesc: s.desc.slice(0, 110) + '…', basePrice: s.base, depositPct: 30, durationMins: s.dur, image: `/images/hero/hero-technician.svg`, includes: JSON.stringify(s.includes), urgencyJson: JSON.stringify({ STANDARD: 0, URGENT: Math.round(s.base * 0.15), EMERGENCY: Math.round(s.base * 0.4) }), sortOrder: i },
    });
    svcIds[s.slug] = r.id;
  }
  const slots = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];
  const bStatus = [
    ...Array(4).fill('REQUESTED'), ...Array(4).fill('CONFIRMED'), ...Array(4).fill('ASSIGNED'),
    ...Array(2).fill('ON_THE_WAY'), ...Array(3).fill('IN_PROGRESS'), ...Array(6).fill('COMPLETED'),
    ...Array(2).fill('CANCELLED'), ...Array(3).fill('REVIEWED'),
  ];
  for (let i = 0; i < bStatus.length; i++) {
    const st = bStatus[i];
    const svc = pick(SERVICES);
    const cust = pick(custs);
    const date = new Date(now + int(-20, 14) * DAY); date.setHours(0, 0, 0, 0);
    const urg = pick(['STANDARD', 'STANDARD', 'URGENT', 'EMERGENCY'] as const);
    const price = svc.base * (1 + (urg === 'URGENT' ? 0.15 : urg === 'EMERGENCY' ? 0.4 : 0));
    const tech = pick(techUsers);
    const b = await prisma.booking.create({
      data: {
        bookingNo: `GB-2026-${String(2001 + i)}`, userId: cust.u.id, serviceId: svcIds[svc.slug],
        technicianId: ['ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED'].includes(st) ? tech.techId : null,
        date, timeSlot: pick(slots), status: st as any, urgency: urg,
        region: cust.region, city: cust.city, landmark: pick(['Red gate beside pharmacy', 'Opposite community school', 'After the fuel station, left']),
        gps: `G${pick(['A', 'N'])}-1${int(10, 99)}-${int(1000, 9999)}`,
        description: pick(['Two bedroom sockets sparking when kettle is on.', 'Full rewire of 3-bed self-build, ground + first.', 'Install 8-camera CCTV for the compound with phone viewing.', 'Board keeps tripping at night — need RCBO upgrade.', 'Solar quote for fridge + TVs + fans backup.', 'New prepaid meter relocated to the gate house.']),
        contactName: cust.name, contactPhone: cust.u.phone!, contactEmail: cust.u.email,
        paymentMode: pick(['DEPOSIT', 'DEPOSIT', 'FULL', 'AFTER', 'QUOTE'] as const),
        price: +price.toFixed(2), depositDue: +(price * 0.3).toFixed(2),
        rating: st === 'REVIEWED' ? int(4, 5) : null,
        review: st === 'REVIEWED' ? pick(['Fast, tidy, explained everything. Worth it.', 'Fixed what two other guys missed. Certified job.', 'On time, protected floors, left clean.']) : null,
        cancelReason: st === 'CANCELLED' ? 'Customer rescheduled — rain' : null,
        createdAt: new Date(now - int(1, 30) * DAY),
      },
    });
    const chain = ['REQUESTED', 'CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED'];
    const upto = st === 'CANCELLED' ? 0 : chain.indexOf(st);
    for (let h = 0; h <= Math.max(upto, 0); h++) {
      await prisma.bookingEvent.create({ data: { bookingId: b.id, status: chain[h], note: h === 0 ? `Slot ${b.timeSlot} · ${cust.city}` : null, at: new Date(+b.date - (12 - h) * DAY) } });
    }
    if (['CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED'].includes(st)) {
      const due = b.paymentMode === 'FULL' ? b.price : b.depositDue;
      await prisma.payment.create({ data: { reference: `GE_PAY_B${2001 + i}`, amount: due, status: 'PAID', method: pick(['MOMO_MTN', 'QR', 'CARD'] as const) as any, provider: 'MOCK', bookingId: b.id, payerPhone: b.contactPhone, confirmedAt: new Date(+b.date - 5 * DAY) } });
    }
  }
  for (let i = 0; i < 4; i++) {
    const svc = pick(SERVICES); const cust = pick(custs);
    await prisma.quote.create({
      data: {
        quoteNo: `GQ-2026-${3001 + i}`, customerName: cust.name, customerPhone: cust.u.phone!, customerEmail: cust.u.email,
        description: `${svc.name} — surveyed ${(i + 1) * 45}m², 14 circuits`, itemsJson: JSON.stringify([{ label: svc.name, qty: 1, amount: svc.base }, { label: 'Materials allowance', qty: 1, amount: Math.round(svc.base * 0.6) }]),
        amount: Math.round(svc.base * 1.6), status: (['DRAFT', 'SENT', 'ACCEPTED', 'PAID'] as const)[i],
        validUntil: new Date(now + (7 + i * 3) * DAY),
      },
    });
  }
  await prisma.slotCapacity.createMany({ data: [0, 1, 2, 3, 4, 5, 6].map(d => ({ dayOfWeek: d, capacity: d === 0 ? 2 : 4, slotsJson: JSON.stringify(d === 0 ? slots.slice(0, 3) : slots) })) });
  await prisma.blockedDate.createMany({ data: [{ date: new Date(now + 6 * DAY), reason: 'Eid celebration — no call-outs' }, { date: new Date(now + 13 * DAY), reason: 'Team training' }] });
  console.log(`  ✓ 12 services, ${bStatus.length} bookings, quotes`);

  // ── reviews on products ──
  const reviewTexts = [
    ['Real copper, verified', 'Scratched the insulation — bright copper throughout. ECG load holds steady.'],
    ['Delivered same-day to Tema', 'Ordered at 10am, on my site by 3pm. Packaging sealed and genuine.'],
    ['Premium but fair', 'Costs more than the roadside stall and I sleep better. Warranty card included.'],
    ['Perfect fit', 'Exactly as described, finishes my renovation properly.'],
    ['Solid quality', 'Third time ordering from GabiElectricals. Never a dud yet.'],
    ['Good, minor delay', 'Item excellent; delivery slipped a day to Kumasi, comms were honest.'],
    ['Certified properly', 'Technician tested and issued a certificate. Board is finally safe.'],
  ];
  let revCount = 0;
  for (const pslug of allProdSlugs) {
    if (rnd() > 0.55) continue;
    const n = int(1, 3);
    for (let k = 0; k < n; k++) {
      const [title, body] = pick(reviewTexts);
      const rating = int(4, 5);
      const cust = pick(custs);
      await prisma.review.create({ data: { productId: prodIds[pslug], userId: cust.u.id, rating, title, body, verified: rnd() > 0.3, orderId: rnd() > 0.5 ? pick(orders).id : null } });
      revCount++;
    }
  }
  for (const pslug of allProdSlugs) {
    const rv = await prisma.review.aggregate({ where: { productId: prodIds[pslug] }, _avg: { rating: true }, _count: true });
    if (rv._count) await prisma.product.update({ where: { id: prodIds[pslug] }, data: { rating: +(rv._avg.rating ?? 5).toFixed(2), reviewCount: rv._count } });
  }
  console.log(`  ✓ ${revCount} reviews`);

  // ── marketing: coupons, flash sales, bundles, popups ──
  const couponRecs: Record<string, string> = {};
  for (const c of COUPONS) {
    const r = await prisma.coupon.create({ data: { code: c.code, type: c.type as any, value: c.value, minSpend: c.minSpend, firstOrderOnly: !!c.firstOrderOnly, referralOnly: !!c.referralOnly, usageLimit: c.usageLimit ?? null, usedCount: int(3, 80), categoryIds: JSON.stringify(c.cat ? [catIds[c.cat]] : []) } });
    couponRecs[c.code] = r.id;
  }
  await prisma.coupon.create({ data: { code: 'POWER50', type: 'FIXED', value: 50, minSpend: 500 } });
  const flashProds = ['solar-home-kit-1-2kva-panel-inverter-batteries', 'fluke-117-digital-multimeter-electrician-s-standard'].filter(Boolean);
  for (const pslug of allProdSlugs.sort(() => rnd() - 0.5).slice(0, 8)) {
    const p = PRODUCTS.find(x => slugify(x.n) === pslug)!;
    await prisma.flashSale.create({ data: { name: '48-Hour Power Flash Sale', productId: prodIds[pslug], salePrice: +(p.p * 0.85).toFixed(2), qtyLimit: 15, sold: int(0, 9), startsAt: new Date(now - DAY), endsAt: new Date(now + 2 * DAY) } });
  }
  await prisma.bundle.create({
    data: { name: 'New-Build Circuit Starter Bundle', slug: 'new-build-starter', description: 'Two 100m rolls of Folded 2.5mm, an 8-way Schneider board and a full Acti9 MCB set — priced under buying apart.', price: 2650, compareAt: 3090, items: { create: [
      { productId: prodIds[slugify('Folded Cable 2.5mm² Single Core — 100m Roll')], qty: 2 },
      { productId: prodIds[slugify('Schneider 8-Way TP&N Consumer Unit — Surface')], qty: 1 },
    ] } },
  });
  await prisma.bundle.create({ data: { name: 'Dumsor Emergency Kit', slug: 'dumsor-kit', description: 'Emergency bulbs, UPS, surge blocks and a power bank kit — blackout-ready in one box.', price: 1450, compareAt: 1720, items: { create: [{ productId: prodIds[slugify('Emergency LED Bulb 12W — 3hr Runtime')], qty: 4 }, { productId: prodIds[slugify('UPS 650VA Line-Interactive — AVR Built-in')], qty: 1 }] } } });
  for (const p of POPUPS) {
    await prisma.popup.create({
      data: {
        name: p.name, kind: p.kind, headline: p.headline, body: p.body, buttonLabel: p.button,
        buttonHref: (p as any).href ?? null, couponCode: (p as any).coupon ?? null, whatsappBtn: !!(p as any).whatsapp, captureLead: p.kind === 'WELCOME',
        bgColor: p.bg, textColor: (p as any).text ?? '#FFFFFF', accentColor: (p as any).accent ?? '#FFB020',
        targetingJson: JSON.stringify({ pages: 'ALL', visitor: 'ALL', device: 'ALL', delaySec: p.kind === 'TIMED' ? p.target : 0, scrollPct: p.kind === 'SCROLL' ? p.target : 0 }),
        frequency: p.freq, priority: p.priority, active: p.active, impressions: int(200, 3000), conversions: int(10, 220),
      },
    });
  }
  await prisma.announcementBar.create({ data: { text: '⚡ Same-day delivery in Accra on orders before 2PM · Use code POWER50 for ₵50 off ₵500+', href: '/deals' } });
  console.log('  ✓ coupons, flash sales, bundles, popups');

  // ── content ──
  for (const f of FAQS) await prisma.faq.create({ data: { question: f.q, answer: f.a, category: f.cat, context: rnd() > 0.5 ? 'PUBLIC' : 'CHATBOT' } });
  for (const t of TESTIMONIALS) await prisma.testimonial.create({ data: t });
  for (const b of BLOG_POSTS) {
    await prisma.blogPost.create({
      data: { slug: b.slug, title: b.title, excerpt: b.excerpt, tags: JSON.stringify(b.tags), publishedAt: new Date(now - int(3, 120) * DAY), views: int(40, 2400), content: `## Why this matters in Ghana\n\n${b.excerpt}\n\nGhana’s grid, weather and market realities change the textbook answer. Our certified team has executed hundreds of installs across Accra, Tema, Kumasi and Takoradi — this guide condenses what we actually see on site.\n\n## The practical checklist\n\n1. **Start with loads, not products.** Measure what must survive an outage before choosing inverter or battery size.\n2. **Buy genuine only.** Counterfeits are the #1 fire contributor we find on inspection.\n3. **Protect circuits properly.** One RCBO per zone; fuse-wire era is over.\n4. **Test before energising.** Insulation resistance and polarity, documented.\n\n> Need a hand? Book a certified GabiElectricals technician — same-day slots across Greater Accra.\n\n## Bottom line\n\nPremium parts plus certified workmanship is cheaper than one fire, one burnt compressor, or one rewired ceiling. That is the whole GabiElectricals thesis.` },
    });
  }
  console.log('  ✓ faqs, testimonials, blog');

  // ── settings, notifications, activity, misc ──
  const settings: Record<string, any> = {
    business: { name: 'GabiElectricals', tagline: 'Premium Power. Trusted Safety. Done Right.', phone: '+233 24 100 2030', whatsapp: '+233 24 100 2030', email: 'hello@gabielectricals.com', address: 'Ghana House, 44 Liberation Link, Osu, Accra', gps: 'DG-123-4567', hours: 'Mon–Sat 7:00–18:00 · Emergency 24/7' },
    tax: { vatPct: 15, vatInclusive: true, levyPct: 2.5, appliesToServices: true },
    referral: { referrerReward: 20, friendReward: 20, minOrder: 150, minPayout: 100, affiliateDefaultPct: 5 },
    payments: { enabled: { MOMO_MTN: true, MOMO_TELECEL: true, MOMO_AT: true, CARD: true, BANK_TRANSFER: true, GHIPSS: true, QR: true, PAY_ON_DELIVERY: true, MANUAL_TRANSFER: true }, qrExpiryMinutes: 15 },
    loyalty: { pointsEnabled: false, giftCardsEnabled: false },
    notifyTemplates: {
      ORDER_PAID: { sms: 'GabiElectricals: Payment of GHS {{amount}} received for order {{orderNo}}. Track: {{link}}', email_subject: 'Payment received — order {{orderNo}}' },
      BOOKING_CONFIRMED: { sms: 'GabiElectricals: Booking {{bookingNo}} confirmed for {{date}} {{slot}}. Tech assigned within 24h.', email_subject: 'Your booking is confirmed' },
      TECH_ASSIGNED: { sms: 'GabiElectricals: {{techName}} (rated {{rating}}) is your technician for {{bookingNo}}.', email_subject: 'Technician assigned' },
    },
  };
  for (const [k, v] of Object.entries(settings)) await prisma.setting.create({ data: { key: k, valueJson: JSON.stringify(v) } });

  const notifSamples = [
    ['SMS', '+23324xxxx210', 'ORDER_PAID', 'GabiElectricals: Payment of GHS 1,240.00 received for order GE-2026-1003.'],
    ['EMAIL', 'kofi.owusu@gmail.com', 'BOOKING_CONFIRMED', 'Your booking GB-2026-2004 for House Wiring is confirmed for Tue 09:00-11:00.'],
    ['WHATSAPP', '+23320xxxx877', 'TECH_ASSIGNED', 'Kwame Mensah (4.9★) is on the way to Spintex. ETA 25 min.'],
    ['SMS', '+23355xxxx102', 'DELIVERED', 'GabiElectricals: Order GE-2026-1009 delivered. Rate us: {{link}}'],
    ['EMAIL', 'ops@gabielectricals.com', 'LOW_STOCK', 'Low stock: Folded Cable 1.5mm² — 6 rolls left (alert at 10).'],
  ];
  for (let i = 0; i < 24; i++) {
    const [ch, to, tpl, body] = pick(notifSamples);
    await prisma.notificationLog.create({ data: { channel: ch, to: to + String(int(10, 99)), template: tpl, body, status: 'LOGGED', userId: rnd() > 0.5 ? pick(custs).u.id : null, createdAt: new Date(now - int(0, 40) * DAY) } });
  }
  for (const [act, ent] of [['LOGIN', 'USER'], ['PRODUCT_CREATED', 'PRODUCT'], ['COUPON_CREATED', 'COUPON'], ['PAYMENT_REFUNDED', 'PAYMENT'], ['POPUP_PUBLISHED', 'POPUP'], ['PAYOUT_APPROVED', 'PAYOUT'], ['BOOKING_ASSIGNED', 'BOOKING'], ['SETTING_UPDATED', 'TAX']] as const) {
    await prisma.activityLog.create({ data: { userId: rnd() > 0.5 ? superAdmin.id : opsAdmin.id, action: act, entity: ent, entityId: `demo-${int(1000, 9999)}`, ip: '196.61.3x.xx', createdAt: new Date(now - int(0, 14) * DAY) } });
  }
  await prisma.lead.createMany({ data: Array.from({ length: 14 }, (_, i) => ({ email: `lead${i}@gmail.com`, phone: `+2332${int(40000000, 49999999)}`, name: pick(CUSTOMERS), source: i % 3 === 0 ? 'POPUP' : i % 3 === 1 ? 'WHOLESALE' : 'QUOTE' })) });
  await prisma.subscription.createMany({ data: Array.from({ length: 22 }, (_, i) => ({ email: `sub${i}${int(10, 99)}@gmail.com` })) });
  await prisma.abandonedCart.createMany({ data: Array.from({ length: 6 }, () => { const p = pick(allProdSlugs); return { email: pick(custs).u.email, phone: pick(custs).u.phone!, itemsJson: JSON.stringify([{ name: PRODUCTS.find(x => slugify(x.n) === p)!.n, qty: 1 }]), value: PRODUCTS.find(x => slugify(x.n) === p)!.p, recovered: rnd() > 0.6 }; }) });
  await prisma.supportTicket.createMany({ data: [
    { name: 'Ama Serwaa', email: 'ama@gmail.com', subject: 'Invoice PDF for GE-2026-1012', message: 'My facility manager needs the VAT invoice.', status: 'ANSWERED', reply: 'Attached — re-sent to your email.' },
    { name: 'Ernest Addo', email: 'ernest@gmail.com', subject: 'Warranty claim — stabilizer', message: 'Servo unit died in month 9 of 12.', status: 'OPEN' },
  ] });
  await prisma.warrantyRegistration.createMany({ data: [
    { name: 'Nadia Issah', phone: '+23327xxxx211', product: 'Growatt 5kVA Hybrid Inverter', serial: 'GW-5K-88213', purchased: new Date(now - 40 * DAY) },
    { name: 'Prince Amoako', phone: '+23354xxxx110', product: 'Hikvision 4-Cam DVR Kit', serial: 'HK-4C-70211', purchased: new Date(now - 12 * DAY) },
  ] });
  await prisma.paymentLink.createMany({ data: [
    { code: 'INV2026001', label: 'Owusu rewire — final balance', amount: 3200, forType: 'CUSTOM', status: 'ACTIVE', createdBy: superAdmin.id, expiresAt: new Date(now + 5 * DAY) },
    { code: 'DEP2026002', label: 'Booking GB-2026-2005 deposit', amount: 450, forType: 'BOOKING', status: 'ACTIVE', createdBy: techUsers[0].u.id },
    { code: 'QR2026003', label: 'In-person counter sale', amount: 0, forType: 'CUSTOM', status: 'PAID', createdBy: opsAdmin.id },
  ] });
  await prisma.uploadedFile.create({ data: { path: '/images/uploads/transfer-proof-sample.svg', name: 'ecobank-transfer-receipt.svg', mime: 'image/svg+xml', size: 4800, kind: 'PROOF' } });
  mkdirSync('public/images/uploads', { recursive: true });
  console.log('  ✓ settings, notification log, activity log, leads, links');

  // analytics events (funnel demo)
  for (let i = 0; i < 60; i++) {
    const type = pick(['PAGE_VIEW', 'PAGE_VIEW', 'ADD_TO_CART', 'CHECKOUT_START', 'ORDER', 'QR_SHOW', 'COUPON_USE', 'POPUP_VIEW', 'POPUP_CONVERT', 'REFERRAL_CLICK', 'BOOKING'] as const);
    await prisma.analyticsEvent.create({ data: { type, value: type === 'ORDER' ? int(120, 4000) : null, sessionId: `sess-${int(100, 999)}`, createdAt: new Date(now - int(0, 30) * DAY) } });
  }
  console.log('✔ Seed complete — demo logins:');
  console.log('  ADMIN      admin@gabielectricals.com / GabiAdmin2026!');
  console.log('  ADMIN 2    ops@gabielectricals.com / Demo1234!');
  console.log(`  TECH       ${slugify(TECHNICIANS[0].name)}@gabielectricals.com / Demo1234!`);
  console.log(`  CUSTOMER   ${slugify(CUSTOMERS[0]).replace(/[^a-z]/g, '')}0@gmail.com / Demo1234!`);
  console.log(`  AFFILIATE  ${slugify(CUSTOMERS[3]).replace(/[^a-z]/g, '')}3@gmail.com / Demo1234!`);
}

main().then(() => { rmSync('prisma/.seed.lock', { force: true }); return prisma.$disconnect(); }).catch(async (e) => { console.error(e); rmSync('prisma/.seed.lock', { force: true }); await prisma.$disconnect(); process.exit(1); });
