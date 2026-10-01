import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { ghs } from '@/lib/money';
import CopyButton from '../CopyButton';
import { Icon } from '@/components/Icon';
import PayoutForm from './PayoutForm';

export const dynamic = 'force-dynamic';

export default async function AccountReferrals() {
  const s = await getSession();
  if (!s) redirect('/login?next=/account/referrals');

  const [user, settings, visits, conversions, referredOrders, ledger, payouts] = await Promise.all([
    prisma.user.findUnique({ where: { id: s.userId }, select: { name: true, referralCode: true, walletCredit: true, email: true, phone: true } }),
    getSettings(),
    prisma.referralVisit.count({ where: { referrerId: s.userId } }),
    prisma.referralVisit.count({ where: { referrerId: s.userId, converted: true } }),
    prisma.order.count({ where: { referralCode: (await prisma.user.findUnique({ where: { id: s.userId }, select: { referralCode: true } }))?.referralCode ?? '__none__', status: { in: ['PAID', 'DELIVERED'] } } }),
    prisma.ledgerEntry.findMany({ where: { userId: s.userId, reason: 'REFERRAL_BONUS' }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.payoutRequest.findMany({ where: { userId: s.userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  if (!user) redirect('/login?next=/account/referrals');

  const earnings = await prisma.ledgerEntry.aggregate({ where: { userId: s.userId, reason: 'REFERRAL_BONUS' }, _sum: { amount: true } });
  const pendingPayouts = payouts.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0);
  const available = Math.max(0, user.walletCredit - pendingPayouts);

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const link = `${site}/r/${user.referralCode}`;
  const shareText = `Hey! It's ${user.name.split(' ')[0]} 👋\n\nI found a place in Ghana that sells *genuine* electricals — pure copper cables, real breakers, same-day Accra delivery — AND their electricians are certified.\n\nUse my link and we BOTH get ${ghs(settings.referral.friendReward)} off / credit:\n${link}`;
  const qr = await QRCode.toDataURL(link, { width: 200, margin: 2, color: { dark: '#062E33', light: '#FFFFFF' } });

  return (
    <section aria-label="Referrals and wallet" className="space-y-5">
      <h2 className="font-display font-extrabold text-xl">Referrals &amp; Wallet</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Link visits', v: visits, s: 'people opened your link' },
          { l: 'Converted', v: conversions, s: 'signed up via you' },
          { l: 'Paid referrals', v: referredOrders, s: 'orders that used your code' },
          { l: 'Total earned', v: ghs(earnings._sum.amount ?? 0, { cents: false }), s: 'lifetime bonuses' },
        ].map(k => (
          <div key={k.l} className="card p-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-soft">{k.l}</p>
            <p className="font-display text-2xl font-extrabold mt-1">{k.v}</p>
            <p className="text-[11px] text-soft mt-0.5">{k.s}</p>
          </div>
        ))}
      </div>

      {/* Wallet balance */}
      <div className="card p-5 flex flex-wrap items-center gap-3 justify-between bg-navy border-navy text-white">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-gold">Available to withdraw</p>
          <p className="font-display text-3xl font-extrabold mt-1">{ghs(available)}</p>
          <p className="text-[11.5px] text-white/60 mt-0.5">Wallet balance {ghs(user.walletCredit)} · {pendingPayouts ? `${ghs(pendingPayouts)} pending payout` : `min payout ${ghs(settings.referral.minPayout, { cents: false })}`}</p>
        </div>
        <p className="text-[12px] text-white/70 max-w-[260px]">Credit works at checkout or withdraws to MoMo once above {ghs(settings.referral.minPayout)}.</p>
      </div>

      {/* Share */}
      <div className="card p-5">
        <h3 className="font-bold text-[14.5px] mb-3">Your referral link</h3>
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <code className="flex-1 min-w-0 truncate rounded-lg bg-mist dark:bg-navy-700 border border-line px-3 py-2.5 text-[13px]">{link}</code>
              <CopyButton text={link} label="Copy" />
            </div>
            <p className="text-[12px] text-soft mt-2">Code: <b>{user.referralCode}</b> — friends get {ghs(settings.referral.friendReward)} off; you get {ghs(settings.referral.referrerReward)} when they pay.</p>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer"
              className="btn-gold mt-3 px-4 py-2 text-[13px] inline-flex"><Icon name="chat" size={14} className="inline" /> Share on WhatsApp</a>
          </div>
          <figure className="text-center shrink-0 mx-auto md:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR code for referral link ${link}`} className="w-[140px] rounded-xl border border-line bg-white p-1.5" />
            <figcaption className="text-[10.5px] text-soft mt-1">Snap &amp; share the QR</figcaption>
          </figure>
        </div>
      </div>

      {/* Payout */}
      <PayoutForm available={available} minPayout={settings.referral.minPayout} defaultPhone={user.phone ?? ''} pending={pendingPayouts} balance={user.walletCredit} />

      {/* History */}
      {payouts.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-[14.5px] mb-3">Payout history</h3>
          <ul className="divide-y divide-line text-[13px]">
            {payouts.map(p => (
              <li key={p.id} className="py-2 flex items-center justify-between gap-2">
                <span className="text-soft">{new Date(p.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })} · {p.network} {p.momoNumber.slice(-6).padStart(p.momoNumber.length - 6, '•')}</span>
                <span className="flex items-center gap-2">
                  <b>{ghs(p.amount)}</b>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${p.status === 'PAID' ? 'bg-success/10 text-success' : p.status === 'REJECTED' ? 'bg-danger/10 text-danger' : 'bg-warning/15 text-warning'}`}>{p.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ledger.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-[14.5px] mb-3">Recent wallet entries</h3>
          <ul className="divide-y divide-line text-[13px]">
            {ledger.map(l => (
              <li key={l.id} className="py-2 flex justify-between gap-2">
                <span className="text-soft">{new Date(l.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })} · {l.reason.replace(/_/g, ' ')}</span>
                <b className={l.amount >= 0 ? 'text-success' : 'text-danger'}>{l.amount >= 0 ? '+' : ''}{ghs(l.amount)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
