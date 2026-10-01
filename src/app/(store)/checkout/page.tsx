import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { REGIONS } from '@/lib/ghana';
import { CheckoutClient } from './checkout-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Secure Checkout — GabiElectricals',
  description: 'Pay with MTN MoMo, Telecel Cash, AT Money, card, GhIPSS or on delivery.',
};

export default async function CheckoutPage() {
  const [session, settings] = await Promise.all([getSession(), getSettings()]);
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true, phone: true, walletCredit: true, addresses: true } }) : null;
  const enabled = Object.entries(settings.payments.enabled).filter(([, v]) => v).map(([k]) => k);
  return (
    <div className="container-x py-6 md:py-10">
      <h1 className="font-display text-2xl md:text-3xl font-extrabold mb-1">Checkout</h1>
      <p className="text-sm text-soft mb-6">🔒 Secure · totals verified server-side · no surprises after you pay.</p>
      <CheckoutClient
        enabledMethods={enabled}
        regions={REGIONS}
        tax={{ vatPct: settings.tax.vatPct, levyPct: settings.tax.levyPct }}
        me={user ? { name: user.name, email: user.email, phone: user.phone ?? '', walletCredit: user.walletCredit, addresses: user.addresses.map(a => ({ id: a.id, label: a.label, region: a.region, city: a.city, landmark: a.landmark ?? '', gps: a.gps ?? '', phone: a.phone, isDefault: a.isDefault })) } : null}
        shopAddress={settings.business.address}
      />
    </div>
  );
}
