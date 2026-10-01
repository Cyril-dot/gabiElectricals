import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logNotify, recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({ cartId: z.string().min(1), message: z.string().max(600).optional() });

/** POST /api/admin/marketing/recover — send abandoned-cart recovery SMS (demo-logged) */
export async function POST(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid request.');
  const cart = await prisma.abandonedCart.findUnique({ where: { id: parsed.data.cartId } });
  if (!cart) return fail('Cart not found.', 404);
  if (!cart.phone) return fail('No phone on this cart — email only.');
  const body = parsed.data.message ?? `GabiElectricals: You left items worth GHS ${cart.value.toFixed(2)} in your cart. Complete your order before stock runs out: ${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/cart`;
  await logNotify('SMS', cart.phone, 'CART_RECOVERY', body);
  await recordActivity(g.user.userId, 'CART_RECOVERY_SENT', 'AbandonedCart', cart.id);
  return NextResponse.json({ ok: true, to: cart.phone });
}
