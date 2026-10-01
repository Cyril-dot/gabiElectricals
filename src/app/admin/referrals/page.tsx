import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { ReferralsBoard } from './board';

export const dynamic = 'force-dynamic';

export default async function AdminReferralsPage() {
  const [users, visits, converted, ledger, payouts, apps, settings] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['CUSTOMER', 'AFFILIATE'] } },
      select: { id: true, name: true, email: true, phone: true, referralCode: true, walletCredit: true, tier: true, commissionPct: true, active: true, role: true, createdAt: true },
      orderBy: { walletCredit: 'desc' },
      take: 300,
    }),
    prisma.referralVisit.groupBy({ by: ['referrerId'], _count: { _all: true } }),
    prisma.referralVisit.groupBy({ by: ['referrerId'], _count: { _all: true }, where: { converted: true } }),
    prisma.ledgerEntry.groupBy({ by: ['userId'], _sum: { amount: true }, where: { amount: { gt: 0 }, reason: { in: ['REFERRAL_BONUS', 'ORDER_REWARD'] } } }),
    prisma.payoutRequest.findMany({ include: { user: { select: { name: true, email: true, walletCredit: true, active: true, referralCode: true } } }, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 60 }),
    prisma.affiliateApplication.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
    getSettings(),
  ]);

  const vc = new Map(visits.map((v) => [v.referrerId, v._count._all]));
  const cc = new Map(converted.map((v) => [v.referrerId, v._count._all]));
  const es = new Map(ledger.map((l) => [l.userId, l._sum.amount ?? 0]));

  const referrers = users
    .map((u) => ({
      id: u.id, name: u.name, email: u.email, phone: u.phone, code: u.referralCode,
      walletCredit: u.walletCredit, tier: u.tier, commissionPct: u.commissionPct, active: u.active, role: u.role,
      visits: vc.get(u.id) ?? 0, conversions: cc.get(u.id) ?? 0, earnings: es.get(u.id) ?? 0,
    }))
    .filter((u) => u.visits > 0 || u.conversions > 0 || u.earnings > 0 || u.walletCredit > 0)
    .sort((a, b) => b.conversions - a.conversions || b.earnings - a.earnings);

  const recentVisits = await prisma.referralVisit.findMany({ orderBy: { createdAt: 'desc' }, take: 40 });
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const convList = recentVisits.map((v) => ({
    code: v.code, referrer: nameById.get(v.referrerId) ?? v.code, fingerprint: v.fingerprint, converted: v.converted, at: v.createdAt.toISOString(),
  }));

  const emailById = new Map(users.map((u) => [u.id, u.email]));
  return (
    <ReferralsBoard
      referrers={referrers}
      leaderboard={referrers.slice(0, 10)}
      conversions={convList}
      payouts={payouts.map((p) => ({ id: p.id, name: p.user.name, email: p.user.email, code: p.user.referralCode, active: p.user.active, wallet: p.user.walletCredit, amount: p.amount, method: p.method, momo: p.momoNumber, network: p.network, status: p.status, note: p.note, createdAt: p.createdAt.toISOString() }))}
      apps={apps.map((a) => ({ id: a.id, name: a.name, phone: a.phone, email: emailById.get(a.userId) ?? '—', audience: a.audience, status: a.status, commissionPct: a.commissionPct, createdAt: a.createdAt.toISOString() }))}
      settings={settings.referral}
    />
  );
}
