import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { CartClient } from './cart-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Your Cart — GabiElectricals', description: 'Review your basket, apply a coupon and estimate delivery.' };

export default async function CartPage() {
  const [session, settings] = await Promise.all([getSession(), getSettings()]);
  const credit = session ? (await prisma.user.findUnique({ where: { id: session.userId }, select: { walletCredit: true } }))?.walletCredit ?? 0 : 0;
  return (
    <div className="container-x py-6 md:py-10">
      <h1 className="font-display text-2xl md:text-3xl font-extrabold mb-1">Your cart</h1>
      <p className="text-sm text-soft mb-6">Prices include VAT. Delivery and coupons applied below — nothing hidden at checkout.</p>
      <CartClient tax={{ vatPct: settings.tax.vatPct, levyPct: settings.tax.levyPct }} walletCredit={credit} signedIn={!!session} />
    </div>
  );
}
