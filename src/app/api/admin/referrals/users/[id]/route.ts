import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({ active: z.boolean() });

/** PATCH /api/admin/referrals/users/[id] — disable abuser: isActive off (referrals stop attributing to an inactive account) */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid payload.');
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return fail('User not found.', 404);
  if (u.role === 'SUPER_ADMIN') return fail('Cannot disable the founder account.');
  await prisma.user.update({ where: { id }, data: { active: parsed.data.active } });
  if (!parsed.data.active) await prisma.session.deleteMany({ where: { userId: id } });
  await recordActivity(g.user.userId, parsed.data.active ? 'REFERRER_REENABLED' : 'REFERRER_DISABLED', 'User', id);
  return NextResponse.json({ ok: true, active: parsed.data.active });
}
