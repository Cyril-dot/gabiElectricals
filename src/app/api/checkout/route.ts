import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession, REF_COOKIE } from '@/lib/auth';
import { priceOrder } from '@/lib/pricing';
import { ghs, round2 } from '@/lib/money';
import { getSettings } from '@/lib/settings';
import { validateCoupon } from '@/lib/coupons';
import { initiatePayment, type GatewayMethod } from '@/lib/gateway';
import { logNotify, recordActivity, trackEvent } from '@/lib/notify';
import { normalizeGhPhone } from '@/lib/ghana';
import { rateLimit, ipOf } from '@/lib/rate-limit';

const Methods = ['MOMO_MTN', 'MOMO_TELECEL', 'MOMO_AT', 'CARD', 'BANK_TRANSFER', 'GHIPSS', 'QR', 'PAY_ON_DELIVERY', 'MANUAL_TRANSFER'] as const;

const Schema = z.object({
  contact: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    phone: z.string().trim().min(9),
  }),
  fulfilment: z.enum(['DELIVERY', 'PICKUP']),
  address: z.object({
    region: z.string().trim().min(2).max(40),
    city: z.string().trim().min(1).max(40),
    line: z.string().trim().max(120).optional(),
    landmark: z.string().trim().max(140).optional(),
    gps: z.string().trim().max(16).optional(),
  }).optional(),
  zoneId: z.string().max(40).optional(),
  payment: z.object({
    method: z.enum(Methods),
    momoPhone: z.string().trim().optional(),
  }),
  items: z.array(z.object({
    slug: z.string().min(1).max(120),
    qty: z.number().int().min(1).max(30),
    install: z.boolean().optional(),
  })).min(1, 'Your cart is empty.'),
  couponCode: z.string().trim().max(24).optional(),
  walletUse: z.number().min(0).optional(),
  referralCode: z.string().trim().max(24).optional(),
  giftNote: z.string().trim().max(200).optional(),
});

async function genOrderNo(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const n = `GE-2026-${String(5000 + Math.floor(Math.random() * 4999))}`;
    const exists = await prisma.order.findUnique({ where: { orderNo: n }, select: { id: true } });
    if (!exists) return n;
  }
  return `GE-2026-${Date.now().toString().slice(-6)}`;
}

export async function POST(req: NextRequest) {
  const ip = ipOf(req);
  const rl = rateLimit(`checkout:${ip}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` }, { status: 429 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please check the checkout details.', issues: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }, { status: 400 });
  }
  const body = parsed.data;
  const settings = await getSettings();

  // payment method must be enabled in Settings
  if (!settings.payments.enabled[body.payment.method]) {
    return NextResponse.json({ error: 'That payment method is currently disabled.' }, { status: 400 });
  }
  const email = body.contact.email.toLowerCase();
  const phone = normalizeGhPhone(body.contact.phone);
  if (!phone) return NextResponse.json({ error: 'Enter a valid Ghana mobile number, e.g. 024 123 4567.' }, { status: 400 });
  if (body.payment.method.startsWith('MOMO')) {
    const p = body.payment.momoPhone ? normalizeGhPhone(body.payment.momoPhone) : phone;
    if (!p) return NextResponse.json({ error: 'Enter the MoMo number to receive the payment prompt.' }, { status: 400 });
  }
  if (body.fulfilment === 'DELIVERY' && !body.address) {
    return NextResponse.json({ error: 'A delivery address is required.' }, { status: 400 });
  }

  const session = await getSession();

  // ── price server-side from DB prices — never trust the client ──
  const slugs = body.items.map(i => i.slug);
  const prods = await prisma.product.findMany({
    where: { slug: { in: slugs }, status: 'PUBLISHED' },
    include: { category: { select: { slug: true } } },
  });
  const bySlug = new Map(prods.map(p => [p.slug, p]));
  const lines = [];
  const orderItems: { productId: string; name: string; image?: string; sku?: string; price: number; qty: number; addOnInstall: boolean }[] = [];
  for (const item of body.items) {
    const p = bySlug.get(item.slug);
    if (!p) return NextResponse.json({ error: `Item no longer available: ${item.slug}` }, { status: 409 });
    if (p.stock < item.qty) return NextResponse.json({ error: `Only ${p.stock} left of "${p.name}".` }, { status: 409 });
    const imgs: string[] = (() => { try { const v = JSON.parse(p.images); return Array.isArray(v) ? v : []; } catch { return []; } })();
    lines.push({ price: p.price, qty: item.qty, install: !!item.install });
    orderItems.push({ productId: p.id, name: p.name, image: imgs[0], sku: p.sku, price: p.price, qty: item.qty, addOnInstall: !!item.install });
  }

  const zone = body.fulfilment === 'DELIVERY' && body.zoneId
    ? await prisma.deliveryZone.findUnique({ where: { id: body.zoneId } })
    : null;
  if (body.fulfilment === 'DELIVERY' && !zone) {
    return NextResponse.json({ error: 'Choose a delivery zone for your area.' }, { status: 400 });
  }

  const gross0 = lines.reduce((s, l) => s + l.price * l.qty * (l.install ? 1.1 : 1), 0);
  const catSlugs = prods.map(p => p.category.slug);
  const refCookie = req.cookies.get(REF_COOKIE)?.value;
  const referralCode = (body.referralCode || refCookie || '').toUpperCase() || null;

  let coupon = null;
  let couponId: string | null = null;
  if (body.couponCode) {
    const isFirstOrder = session
      ? (await prisma.order.count({ where: { userId: session.userId } })) === 0
      : (await prisma.order.count({ where: { email } })) === 0;
    const res = await validateCoupon(body.couponCode, { subtotal: round2(gross0), categorySlugs: catSlugs, isFirstOrder, hasReferral: !!referralCode });
    if (!res.ok || !res.coupon) return NextResponse.json({ error: res.reason ?? 'Coupon not valid.' }, { status: 400 });
    coupon = { type: res.coupon.type, value: res.coupon.value, minSpend: res.coupon.minSpend, maxDiscount: res.coupon.maxDiscount };
    couponId = res.coupon.id;
  }

  const user = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { walletCredit: true } }) : null;
  const pricing = priceOrder({
    lines,
    coupon,
    zoneFee: zone?.fee ?? 0,
    freeOver: zone?.freeOver ?? undefined,
    fulfilment: body.fulfilment,
    vatPct: settings.tax.vatPct,
    levyPct: settings.tax.levyPct,
    walletAvailable: user?.walletCredit ?? 0,
    walletUse: body.walletUse ?? 0,
  });

  const orderNo = await genOrderNo();
  const isPOD = body.payment.method === 'PAY_ON_DELIVERY';
  const freeOrder = pricing.total <= 0.005;
  const initialStatus = isPOD || freeOrder ? 'PAID' : 'PENDING_PAYMENT';

  const order = await prisma.$transaction(async tx => {
    const o = await tx.order.create({
      data: {
        orderNo, userId: session?.userId ?? null, email, phone: normalizeGhPhone(body.contact.phone)!,
        status: initialStatus as never,
        subtotal: pricing.subtotal, discount: pricing.discount, deliveryFee: pricing.deliveryFee,
        vat: pricing.vatPortion, levy: pricing.levy, total: pricing.total, walletUsed: pricing.walletUsed,
        couponId, zoneId: zone?.id ?? null, fulfilment: body.fulfilment,
        addrRegion: body.address?.region, addrCity: body.address?.city, addrLandmark: body.address?.landmark,
        addrGps: body.address?.gps, addrLine: body.address?.line,
        referralCode, giftNote: body.giftNote,
        invoiceNo: initialStatus === 'PAID' ? `INV-${orderNo.slice(3)}` : null,
        items: { create: orderItems },
        events: { create: [
          { status: 'PENDING_PAYMENT', note: 'Order placed' },
          ...(initialStatus === 'PAID' ? [{ status: 'PAID', note: isPOD ? 'Payment on delivery scheduled' : 'Covered by wallet credit' }] : []),
        ] },
      },
      include: { items: true },
    });
    for (const item of body.items) {
      const p = bySlug.get(item.slug)!;
      await tx.product.update({ where: { id: p.id }, data: { stock: { decrement: item.qty }, soldCount: { increment: item.qty } } });
    }
    if (couponId) await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
    if (pricing.walletUsed > 0 && session && user) {
      const updated = await tx.user.update({ where: { id: session.userId }, data: { walletCredit: { decrement: pricing.walletUsed } } });
      await tx.ledgerEntry.create({ data: { userId: session.userId, amount: -pricing.walletUsed, reason: 'CHECKOUT_USE', refType: 'ORDER', refId: o.id, balanceAfter: updated.walletCredit } });
    }
    return o;
  });

  let paymentRef: string | undefined;
  let prompt: string | undefined;
  if (initialStatus === 'PENDING_PAYMENT') {
    const momoPhone = body.payment.momoPhone ? normalizeGhPhone(body.payment.momoPhone) ?? undefined : undefined;
    const res = await initiatePayment({
      amount: pricing.total, email, phone: momoPhone ?? phone,
      method: body.payment.method as GatewayMethod, orderId: order.id,
      meta: { orderNo },
    });
    paymentRef = res.reference;
    prompt = res.prompt;
  }

  await logNotify('SMS', phone, 'ORDER_RECEIVED', `GabiElectricals: Order ${orderNo} received (${ghs(pricing.total)}). ${initialStatus === 'PAID' ? 'We will dispatch shortly.' : 'Complete payment to confirm.'}`);
  await logNotify('EMAIL', email, 'ORDER_RECEIVED', `Thank you! Order ${orderNo} is confirmed. Track it any time at /track with your order number.`);
  await recordActivity(session?.userId ?? null, 'ORDER_PLACED', 'Order', order.id, ip, { orderNo, total: pricing.total, method: body.payment.method });
  await trackEvent('ORDER', { orderNo, method: body.payment.method, items: orderItems.length }, pricing.total);

  return NextResponse.json({ ok: true, orderNo, ref: paymentRef, status: initialStatus, prompt, total: pricing.total });
}
