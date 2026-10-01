import { prisma } from './db';
import { ghs } from './money';

export type NormalizedCoupon = { type: 'PERCENT' | 'FIXED' | 'FREE_DELIVERY'; value: number; minSpend: number; maxDiscount?: number | null; id: string; code: string };

type Ctx = {
  subtotal: number;
  categorySlugs?: string[]; // category slugs represented in the cart
  isFirstOrder?: boolean;
  hasReferral?: boolean;    // buyer arrived via a referral code
};

/** Full server-side coupon check. Returns a normalized coupon ready for priceOrder, or a reason. */
export async function validateCoupon(code: string, ctx: Ctx): Promise<{ ok: boolean; coupon?: NormalizedCoupon; reason?: string }> {
  const c = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });
  const now = new Date();
  if (!c || !c.active) return { ok: false, reason: 'This code is not valid.' };
  if (c.startsAt && c.startsAt > now) return { ok: false, reason: 'This promo has not started yet.' };
  if (c.endsAt && c.endsAt < now) return { ok: false, reason: 'This promo has expired.' };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { ok: false, reason: 'This promo has been fully claimed.' };
  if (ctx.subtotal < c.minSpend) return { ok: false, reason: `Spend ${ghs(c.minSpend)} or more to use ${c.code}.` };
  if (c.firstOrderOnly && ctx.isFirstOrder === false) return { ok: false, reason: `${c.code} is for your first order only.` };
  if (c.referralOnly && !ctx.hasReferral) return { ok: false, reason: `${c.code} is for friends referred by a GabiElectricals pal.` };

  let catIds: string[] = [];
  try {
    const v = JSON.parse(c.categoryIds);
    if (Array.isArray(v)) catIds = v.map(String);
  } catch { /* ignore */ }
  if (catIds.length) {
    const rows = await prisma.category.findMany({ where: { OR: [{ id: { in: catIds } }, { slug: { in: catIds } }] }, select: { slug: true } });
    const allowed = rows.map(r => r.slug);
    const cart = ctx.categorySlugs ?? [];
    if (!cart.some(s => allowed.includes(s))) return { ok: false, reason: `${c.code} applies only to select categories in this cart.` };
  }
  return { ok: true, coupon: { id: c.id, code: c.code, type: c.type, value: c.value, minSpend: c.minSpend, maxDiscount: c.maxDiscount } };
}
