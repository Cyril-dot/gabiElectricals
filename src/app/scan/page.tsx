import type { Metadata } from 'next';
import { prisma, DEMO_MODE } from '@/lib/db';
import { ghs } from '@/lib/money';
import { networkLabel } from '@/lib/gateway';
import { ScanPayClient } from './scan-client';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Scan & Pay — GabiElectricals', robots: { index: false } };

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ ref?: string; amount?: string }> }) {
  const { ref } = await searchParams;
  const payment = ref ? await prisma.payment.findUnique({ where: { reference: ref } }) : null;

  return (
    <div className="min-h-dvh bg-mist dark:bg-navy flex flex-col">
      <header className="bg-white dark:bg-[#0E2140] border-b border-line dark:border-white/10">
        <div className="container-x py-4 flex items-center justify-between">
          <Logo />
          <span className="text-xs font-bold text-soft">Scan-to-Pay</span>
        </div>
      </header>
      <main className="flex-1 py-8">
        <div className="mx-auto w-full max-w-md px-4">
          {!payment ? (
            <div className="card p-8 text-center">
              <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-volt/15 text-navy dark:text-volt"><Icon name="qr_code" size={32} /></span>
              <h1 className="font-display font-extrabold text-xl text-navy dark:text-white mb-1">QR not recognised</h1>
              <p className="text-soft text-sm">Ask the GabiElectricals agent to regenerate the payment QR (codes expire after 15 minutes for your safety).</p>
            </div>
          ) : (
            <ScanPayClient
              demo={DEMO_MODE}
              payment={{
                reference: payment.reference,
                amount: ghs(payment.amount),
                status: payment.status,
                method: networkLabel(payment.method),
                expiresAt: payment.expiresAt?.toISOString() ?? null,
                label: (safeMeta(payment.metaJson).linkLabel as string) ?? (safeMeta(payment.metaJson).orderNo as string) ?? 'GabiElectricals payment',
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function safeMeta(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}
