import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

export const PopupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.enum(['WELCOME', 'EXIT', 'TIMED', 'SCROLL', 'CART', 'SEASONAL', 'BOOKING']),
  headline: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(600),
  image: z.string().max(300).optional(),
  buttonLabel: z.string().max(40).default('Claim Offer'),
  buttonHref: z.string().max(300).optional(),
  couponCode: z.string().max(24).optional(),
  whatsappBtn: z.boolean().default(false),
  captureLead: z.boolean().default(false),
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#0B1B3A'),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#FFFFFF'),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#FFB020'),
  targeting: z.object({ pages: z.array(z.string()).default([]), visitor: z.enum(['ALL', 'NEW', 'RETURNING']).default('ALL'), device: z.enum(['ALL', 'MOBILE', 'DESKTOP']).default('ALL'), delaySec: z.number().int().min(0).max(600).optional(), scrollPct: z.number().int().min(1).max(100).optional() }).default({ pages: [], visitor: 'ALL', device: 'ALL' }),
  frequency: z.enum(['SESSION', 'DAY', 'WEEK', 'ONCE']).default('SESSION'),
  priority: z.number().int().min(0).max(99).default(0),
  active: z.boolean().default(false),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
});

/** POST /api/admin/popups — create popup campaign */
export async function POST(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const parsed = PopupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid popup.');
  const { targeting, startsAt, endsAt, image, buttonHref, couponCode, ...rest } = parsed.data;
  const p = await prisma.popup.create({
    data: {
      ...rest,
      image: image || null, buttonHref: buttonHref || null, couponCode: couponCode || null,
      targetingJson: JSON.stringify(targeting),
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });
  await recordActivity(g.user.userId, 'POPUP_CREATED', 'Popup', p.id);
  return NextResponse.json({ ok: true, id: p.id }, { status: 201 });
}
