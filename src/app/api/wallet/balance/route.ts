import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { round2 } from '@/lib/money';

export const dynamic = 'force-dynamic';

/** GET /api/wallet/balance — auth only. Available credit for checkout + payout minimum. */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: s.userId }, select: { walletCredit: true } }),
    getSettings(),
  ]);
  if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  return NextResponse.json({ available: round2(user.walletCredit), minPayout: settings.referral.minPayout });
}
