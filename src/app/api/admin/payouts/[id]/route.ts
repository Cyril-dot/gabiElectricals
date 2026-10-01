import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logNotify, recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  note: z.string().max(300).optional(),
});

/** POST /api/admin/payouts/[id] — approve → PAID + wallet debit ledger + notify; reject → REJECTED (wallet untouched = clawback of future payout) */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid payout decision.');
  const { action, note } = parsed.data;
  if (action === 'REJECT' && (!note || note.trim().length < 5)) return fail('Rejection requires a reason (min 5 chars).');

  const payout = await prisma.payoutRequest.findUnique({ where: { id }, include: { user: true } });
  if (!payout) return fail('Payout not found.', 404);
  if (payout.status !== 'PENDING') return fail('Payout already processed.');

  if (action === 'APPROVE') {
    const newBalance = Math.max(0, payout.user.walletCredit - payout.amount);
    await prisma.payoutRequest.update({ where: { id }, data: { status: 'PAID', note: note ?? null, processedBy: g.user.userId } });
    await prisma.user.update({ where: { id: payout.userId }, data: { walletCredit: newBalance } });
    await prisma.ledgerEntry.create({ data: { userId: payout.userId, amount: -payout.amount, reason: 'PAYOUT', refType: 'PAYOUT', refId: payout.id, balanceAfter: newBalance } });
    await logNotify('WHATSAPP', payout.momoNumber, 'PAYOUT_PAID', `GabiElectricals: GHS ${payout.amount.toFixed(2)} referral payout sent to your ${payout.network} MoMo ${payout.momoNumber}. Wallet balance GHS ${newBalance.toFixed(2)}.`);
    await recordActivity(g.user.userId, 'PAYOUT_APPROVED', 'PayoutRequest', id);
  } else {
    await prisma.payoutRequest.update({ where: { id }, data: { status: 'REJECTED', note: note ?? 'Rejected', processedBy: g.user.userId } });
    // clawback: remove credited bonus for suspicious attribution
    if (note?.toLowerCase().includes('clawback') || note?.toLowerCase().includes('fraud')) {
      const credited = await prisma.ledgerEntry.findMany({ where: { userId: payout.userId, amount: { gt: 0 }, reason: { in: ['REFERRAL_BONUS', 'ORDER_REWARD'] } }, orderBy: { createdAt: 'desc' }, take: 50 });
      const total = credited.reduce((a, e) => a + e.amount, 0);
      if (total > 0) {
        const newBal = Math.max(0, payout.user.walletCredit - total);
        await prisma.user.update({ where: { id: payout.userId }, data: { walletCredit: newBal } });
        await prisma.ledgerEntry.create({ data: { userId: payout.userId, amount: -total, reason: 'ADMIN_ADJUST', refType: 'PAYOUT', refId: payout.id, balanceAfter: newBal } });
      }
    }
    await logNotify('SMS', payout.user.phone ?? payout.momoNumber, 'PAYOUT_REJECTED', `GabiElectricals: Your GHS ${payout.amount.toFixed(2)} payout request was not approved. Reason: ${note}`);
    await recordActivity(g.user.userId, 'PAYOUT_REJECTED', 'PayoutRequest', id, undefined, { note });
  }
  return NextResponse.json({ ok: true, id, status: action === 'APPROVE' ? 'PAID' : 'REJECTED' });
}
