import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateCoupon } from '@/lib/coupons';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const Schema = z.object({
  code: z.string().trim().min(3).max(24),
  subtotal: z.number().finite().min(0),
  itemsCategorySlugs: z.array(z.string().max(60)).max(60).default([]),
  isFirstOrder: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: 'Enter a coupon code.' }, { status: 400 });
  const { code, subtotal, itemsCategorySlugs } = parsed.data;

  const session = await getSession();
  let isFirstOrder = parsed.data.isFirstOrder;
  if (isFirstOrder === undefined) {
    if (session) isFirstOrder = (await prisma.order.count({ where: { userId: session.userId } })) === 0;
    else isFirstOrder = true;
  }
  const hasReferral = Boolean((await req.cookies.get('ge_ref')?.value) || session);

  const result = await validateCoupon(code, { subtotal, categorySlugs: itemsCategorySlugs, isFirstOrder, hasReferral });
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason });
  return NextResponse.json({ ok: true, coupon: result.coupon });
}
