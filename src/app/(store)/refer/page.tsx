import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { ghs } from '@/lib/money';
import { ReferShare } from '@/components/ReferShare';
import { AffiliateForm } from '@/components/AffiliateForm';

export const metadata: Metadata = { title: 'Refer & Earn — ₵20 wallet credit per friend', description: 'Share your GabiElectricals link: friends save ₵20, you earn ₵20 wallet credit. Electricians & influencers can join the affiliate tier.' };

export default async function ReferPage() {
  const [user, ref] = await Promise.all([getCurrentUser(), getSettings().then(s => s.referral)]);
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  let link = `${SITE}/r/YOURCODE`;
  let qr = '';
  let stats = null;
  if (user) {
    link = `${SITE}/r/${user.referralCode}`;
    qr = await QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: '#062E33', light: '#FFFFFF' } }).catch(() => '');
    const [visits, ledger, wallet] = await Promise.all([
      prisma.referralVisit.count({ where: { referrerId: user.id } }),
      prisma.ledgerEntry.aggregate({ where: { userId: user.id, reason: 'REFERRAL_BONUS' }, _sum: { amount: true } }),
      prisma.ledgerEntry.aggregate({ where: { userId: user.id, reason: 'ORDER_REWARD' }, _count: true }),
    ]);
    stats = { visits, earned: ledger._sum.amount ?? 0, converted: wallet._count };
  }
  return (
    <div className="container-x py-14">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <p className="text-gold font-black text-xs tracking-[0.3em] uppercase mb-3">⚡ Refer & Earn</p>
        <h1 className="font-display font-extrabold text-4xl md:text-5xl leading-tight mb-4">Give {ghs(ref.friendReward, { cents: false })}, get {ghs(ref.referrerReward, { cents: false })} — every single time.</h1>
        <p className="text-soft text-lg">Friends who order through your link save {ghs(ref.friendReward)} on checkout. You earn {ghs(ref.referrerReward)} wallet credit as soon as their order ships. Credit never expires and withdraws to MoMo.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
        <div className="lg:col-span-3 card p-6 md:p-8">
          <h2 className="font-display font-extrabold text-xl mb-4">Your link</h2>
          {user ? (
            <>
              <ReferShare link={link} />
              <div className="grid grid-cols-3 gap-3 mt-6 text-center">
                <div><p className="font-display font-extrabold text-2xl text-blue">{stats?.visits ?? 0}</p><p className="text-[11.5px] text-soft font-semibold">link clicks</p></div>
                <div><p className="font-display font-extrabold text-2xl text-blue">{stats?.converted ?? 0}</p><p className="text-[11.5px] text-soft font-semibold">friends ordered</p></div>
                <div><p className="font-display font-extrabold text-2xl text-success">{ghs(stats?.earned ?? 0)}</p><p className="text-[11.5px] text-soft font-semibold">earned</p></div>
              </div>
              <p className="text-xs text-soft mt-5">Rules keep it fair: no self-referral, one reward per new customer, minimum first order {ghs(ref.minOrder)}. Wallet balance {ghs(user.walletCredit)} — <a className="font-bold text-blue underline" href="/account/referrals">withdraw to MoMo above {ghs(ref.minPayout)}</a>.</p>
            </>
          ) : (
            <>
              <p className="text-soft mb-4">Sign in (or create an account — takes 20 seconds) to get your personal link, QR code and live earnings.</p>
              <div className="flex gap-3 flex-wrap">
                <a href="/login?next=/refer" className="btn-primary !px-5 !py-3">Sign in to get my link</a>
                <a href="/register?next=/refer" className="btn-ghost !px-5 !py-3">Create account</a>
              </div>
              <div className="mt-6 rounded-xl bg-mist dark:bg-navy-700 p-4 text-sm text-soft">Example: Kofi shares <code className="font-mono font-bold text-ink dark:text-white">gabielectricals.com/r/KOFI42</code> with his church group. 9 friends order cable and breakers → Kofi banks ₵180 wallet credit and 9 households sleep safer.</div>
            </>
          )}
        </div>
        <div className="lg:col-span-2 card p-6 flex flex-col items-center justify-center gap-3">
          <h2 className="font-display font-extrabold text-lg self-start">Scan-to-share QR</h2>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`QR code for referral link ${link}`} className="w-44 h-44 rounded-xl border border-line" />
          ) : (
            <div className="w-44 h-44 rounded-xl skeleton" aria-hidden="true" />
          )}
          <p className="text-[12.5px] text-soft text-center self-start">Print it for your shop window or chop bar — every scan is a tracked visit.</p>
        </div>
      </div>

      <section className="max-w-5xl mx-auto mt-12 grid md:grid-cols-3 gap-4" aria-label="How it works">
        {[['1. Share your link', 'WhatsApp, SMS or word of mouth — the link carries your code.'], ['2. Friend saves ₵20', 'They get ₵20 off their first order of ₵150+ automatically at checkout.'], ['3. You both win', 'You earn ₵20 wallet credit per shipped order. Affiliates earn cash commission instead.']].map(([t, b]) => (
          <div key={t as string} className="card p-5">
            <p className="font-extrabold mb-1.5">{t}</p>
            <p className="text-[13.5px] text-soft leading-relaxed">{b}</p>
          </div>
        ))}
      </section>

      <section className="max-w-5xl mx-auto mt-14 rounded-2xl bg-gradient-to-r from-navy to-navy-600 text-white p-8 md:p-10 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="font-display font-extrabold text-2xl mb-2">Are you an electrician, contractor or content creator?</h2>
          <p className="text-white/75 text-sm leading-relaxed mb-4">Join the affiliate tier: custom commission on every delivered order you send our way (default {ref.affiliateDefaultPct}%, top partners negotiate higher), monthly MoMo payouts, and priority stock on flash deals.</p>
          <ul className="text-sm space-y-1.5 text-white/85">
            <li>✓ Real-time conversion dashboard</li>
            <li>✓ Co-branded QR + landing link</li>
            <li>✓ No cap on earnings</li>
          </ul>
        </div>
        <AffiliateForm loggedIn={!!user} />
      </section>
    </div>
  );
}
