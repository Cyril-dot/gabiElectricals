import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';
import { PopupSchema } from '../route';

const Patch = PopupSchema.partial();

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid popup update.');
  const { targeting, startsAt, endsAt, image, buttonHref, couponCode, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (targeting !== undefined) data.targetingJson = JSON.stringify(targeting);
  if (image !== undefined) data.image = image || null;
  if (buttonHref !== undefined) data.buttonHref = buttonHref || null;
  if (couponCode !== undefined) data.couponCode = couponCode || null;
  if (startsAt !== undefined) data.startsAt = startsAt ? new Date(startsAt) : null;
  if (endsAt !== undefined) data.endsAt = endsAt ? new Date(endsAt) : null;
  const p = await prisma.popup.update({ where: { id }, data: data as never }).catch(() => null);
  if (!p) return fail('Popup not found.', 404);
  await recordActivity(g.user.userId, 'POPUP_UPDATED', 'Popup', id);
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  await prisma.popup.delete({ where: { id } }).catch(() => null);
  await recordActivity(g.user.userId, 'POPUP_DELETED', 'Popup', id);
  return NextResponse.json({ ok: true });
}
