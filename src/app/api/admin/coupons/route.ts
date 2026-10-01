import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

export const CouponSchema = z.object({
  code: z.string().trim().min(3).max(24).transform((s) => s.toUpperCase()),
  type: z.enum(['PERCENT', 'FIXED', 'FREE_DELIVERY']),
  value: z.number().min(0).max(100000),
  minSpend: z.number().min(0).default(0),
  maxDiscount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.number().int().min(1).max(50).default(1),
  firstOrderOnly: z.boolean().default(false),
  referralOnly: z.boolean().default(false),
  categoryIds: z.array(z.string()).default([]),
  productIds: z.array(z.string()).default([]),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

const dt = (v?: string | null) => (v ? new Date(v) : null);

/** POST /api/admin/coupons — create coupon */
export async function POST(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const parsed = CouponSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid coupon.');
  const d = parsed.data;
  if (d.type === 'PERCENT' && (d.value < 1 || d.value > 100)) return fail('Percent coupons must be 1–100.');
  const exists = await prisma.coupon.findUnique({ where: { code: d.code } });
  if (exists) return fail('That code already exists.', 409);
  const c = await prisma.coupon.create({
    data: {
      code: d.code, type: d.type, value: d.value, minSpend: d.minSpend, maxDiscount: d.maxDiscount ?? null,
      usageLimit: d.usageLimit ?? null, perCustomerLimit: d.perCustomerLimit, firstOrderOnly: d.firstOrderOnly,
      referralOnly: d.referralOnly, categoryIds: JSON.stringify(d.categoryIds), productIds: JSON.stringify(d.productIds),
      startsAt: dt(d.startsAt), endsAt: dt(d.endsAt), active: d.active,
    },
  });
  await recordActivity(g.user.userId, 'COUPON_CREATED', 'Coupon', c.id);
  return NextResponse.json({ ok: true, id: c.id, code: c.code }, { status: 201 });
}
