import { prisma } from './db';
import { getSettings } from './settings';
import { logNotify } from './notify';
import { ghs, round2 } from './money';

/**
 * Referral attribution on a fully-paid order:
 * no self-referral, minimum order value, one reward pair per referred customer.
 */
export async function creditReferralRewards(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !order.referralCode || !order.userId) return;
  const settings = await getSettings();
  if (order.total < settings.referral.minOrder) return;

  const referrer = await prisma.user.findFirst({ where: { referralCode: order.referralCode, active: true } });
  if (!referrer || referrer.id === order.userId) return; // no self-referral

  const already = await prisma.ledgerEntry.findFirst({ where: { refType: 'REFERRAL', refId: order.userId } });
  if (already) return; // one reward per new customer, ever

  const isAffiliate = referrer.role === 'AFFILIATE';
  const referrerReward = round2(isAffiliate ? (referrer.commissionPct ?? settings.referral.affiliateDefaultPct) / 100 * order.subtotal : settings.referral.referrerReward);
  const friendReward = round2(settings.referral.friendReward);

  const r = await prisma.user.update({ where: { id: referrer.id }, data: { walletCredit: { increment: referrerReward } }, select: { walletCredit: true, name: true, phone: true, email: true } });
  await prisma.ledgerEntry.create({ data: { userId: referrer.id, amount: referrerReward, reason: isAffiliate ? 'ORDER_REWARD' : 'REFERRAL_BONUS', refType: 'REFERRAL', refId: order.userId, balanceAfter: r.walletCredit } });

  const f = await prisma.user.update({ where: { id: order.userId }, data: { walletCredit: { increment: friendReward } }, select: { walletCredit: true, email: true, phone: true } });
  await prisma.ledgerEntry.create({ data: { userId: order.userId, amount: friendReward, reason: 'REFERRAL_BONUS', refType: 'REFERRAL', refId: order.userId, balanceAfter: f.walletCredit } });

  if (r.phone) await logNotify('WHATSAPP', r.phone, 'REFERRAL_EARNED', `GabiElectricals: ${r.name}, your referral used order ${order.orderNo}. ${ghs(referrerReward)} credited — wallet now ${ghs(r.walletCredit)}.`);
  await logNotify('EMAIL', f.email, 'REFERRAL_FRIEND_CREDIT', `Welcome! ${ghs(friendReward)} referral credit added to your wallet for your first order.`);
}
