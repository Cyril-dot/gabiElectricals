import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { PaymentFlow } from './payment-flow';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Secure Payment — GabiElectricals', robots: { index: false } };

export default async function PayLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const link = await prisma.paymentLink.findUnique({
    where: { code: code.toUpperCase() },
    include: { payments: { where: { status: 'PAID' }, select: { amount: true } } },
  });

  return (
    <div className="min-h-dvh bg-mist dark:bg-navy flex flex-col">
      <header className="bg-white dark:bg-navy-800 border-b border-line dark:border-white/10">
        <div className="container-x py-4 flex items-center justify-between">
          <Logo />
          <span className="text-xs font-bold text-soft flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-success"><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><rect x="4" y="11" width="16" height="10" rx="2" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2"/></svg>
            Secure checkout
          </span>
        </div>
      </header>
      <main className="flex-1 py-8">
        <div className="mx-auto w-full max-w-lg px-4">
          {!link ? (
            <div className="card p-8 text-center">
              <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-volt/15 text-navy dark:text-volt"><Icon name="link" size={32} /></span>
              <h1 className="font-display font-extrabold text-xl text-navy dark:text-white mb-1">Link not found</h1>
              <p className="text-soft text-sm mb-5">This payment link is invalid or was removed. Ask your GabiElectricals agent for a fresh link.</p>
              <Link href="/shop" className="btn-primary">Back to shop</Link>
            </div>
          ) : (
            <PaymentFlow
              link={{
                code: link.code,
                label: link.label,
                description: link.description,
                amount: link.amount,
                flexible: link.amount === 0,
                status: link.expiresAt && link.expiresAt < new Date() && link.status === 'ACTIVE' ? 'EXPIRED' : link.status,
                paid: link.payments.reduce((s, p) => s + p.amount, 0),
                expiresAt: link.expiresAt?.toISOString() ?? null,
              }}
            />
          )}
        </div>
      </main>
      <footer className="text-center text-xs text-soft py-6">
        GabiElectricals · Premium Power. Trusted Safety. Done Right. · <Link href="/support" className="underline">Need help?</Link>
      </footer>
    </div>
  );
}
