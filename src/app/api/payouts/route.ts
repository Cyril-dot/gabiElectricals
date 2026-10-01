import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { logNotify, recordActivity } from '@/lib/notify';
import { ghs, round2 } from '@/lib/money';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  amount: z.number().positive(),
  momoNumber: z.string().regex(/^(\+?233|0)(24|25|54|55|59|27|26|2\d|3\d)[0-9]{7}$/, 'Enter a valid Ghana MoMo number'),
  network: z.enum(['MTN', 'Telecel', 'AT']),
});

/** POST /api/payouts — request wallet payout to MoMo. Debit happens on admin approval;
 *  this returns the ledger preview (balanceAfter if approved). */
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return NextResponse.json({ error: i ? `${i.path.join('.')}: ${i.message}` : 'Invalid payout request' }, { status: 422 });
  }
  const { amount, momoNumber, network } = parsed.data;
  const settings = await getSettings();
  const min = settings.referral.minPayout;

  const user = await prisma.user.findUnique({ where: { id: s.userId }, select: { walletCredit: true, name: true, email: true, phone: true } });
  if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const pending = await prisma.payoutRequest.aggregate({ where: { userId: s.userId, status: 'PENDING' }, _sum: { amount: true } });
  const available = round2(user.walletCredit - (pending._sum.amount ?? 0));

  if (amount < min) return NextResponse.json({ error: `Minimum payout is ${ghs(min)}` }, { status: 422 });
  if (amount > available) {
    return NextResponse.json({ error: `Amount exceeds available balance (${ghs(available)}, after pending requests)` }, { status: 422 });
  }

  const payout = await prisma.payoutRequest.create({
    data: { userId: s.userId, amount: round2(amount), method: 'MOMO', momoNumber: momoNumber.replace(/\s/g, ''), network, status: 'PENDING' },
  });
  await recordActivity(s.userId, 'PAYOUT_REQUESTED', 'PAYOUT', payout.id, undefined, { amount, network });
  await logNotify('SMS', user.phone ?? momoNumber, 'PAYOUT_REQUESTED', `GabiElectricals: Payout request of GHS ${amount.toFixed(2)} to ${network} ${momoNumber} received. Approval within 2 business days.`, s.userId);
  if (user.email) await logNotify('EMAIL', user.email, 'PAYOUT_REQUESTED', `Payout request ${ghs(amount)} received and is pending approval.`, s.userId);

  return NextResponse.json({
    ok: true, id: payout.id, status: 'PENDING', amount: payout.amount,
    ledgerPreview: { credit: -amount, balanceAfterIfApproved: round2(user.walletCredit - amount) },
    available,
  }, { status: 201 });
}
