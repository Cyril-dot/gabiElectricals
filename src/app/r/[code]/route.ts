import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';
import { REF_COOKIE } from '@/lib/auth';

/** Referral short link: record the visit, plant the 30-day attribution cookie, send them to the shop floor. */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const upper = decodeURIComponent(code).toUpperCase();
  const home = new URL('/', req.url);

  const referrer = upper ? await prisma.user.findUnique({ where: { referralCode: upper }, select: { id: true } }) : null;
  if (!referrer) return NextResponse.redirect(home);

  const ua = req.headers.get('user-agent') ?? '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local';
  const fingerprint = createHash('sha256').update(`${ua}|${ip}`).digest('hex').slice(0, 16);
  await prisma.referralVisit.create({ data: { code: upper, referrerId: referrer.id, fingerprint } });
  await prisma.analyticsEvent.create({ data: { type: 'REFERRAL_CLICK', payload: JSON.stringify({ code: upper }) } });

  const res = NextResponse.redirect(home);
  res.cookies.set(REF_COOKIE, upper, {
    path: '/', maxAge: 30 * 86400, sameSite: 'lax', httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
