import type { Metadata } from 'next';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { Logo } from '@/components/Logo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Business QR — GabiElectricals' };

/** /qr — static business QR for in-person payments (walk-in counter). */
export default async function BusinessQrPage() {
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host') ?? 'localhost:3000'}`;

  let link = await prisma.paymentLink.findUnique({ where: { code: 'GABI' } });
  if (!link) {
    link = await prisma.paymentLink.create({
      data: { code: 'GABI', label: 'GabiElectricals — Counter Payment', description: 'Enter the amount at the counter and pay by MoMo, card or bank.', amount: 0, forType: 'CUSTOM' },
    });
  }

  const url = `${origin}/pay/${link.code}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 640, margin: 2, color: { dark: '#062E33', light: '#FFFFFF' } });

  return (
    <div className="min-h-dvh bg-mist dark:bg-navy flex flex-col">
      <header className="bg-white dark:bg-[#0E2140] border-b border-line dark:border-white/10">
        <div className="container-x py-4 flex items-center justify-between">
          <Logo />
          <span className="text-xs font-bold text-soft">Scan at counter</span>
        </div>
      </header>
      <main className="flex-1 grid place-items-center py-10 px-4">
        <div className="card p-8 text-center max-w-sm w-full">
          <h1 className="font-display font-extrabold text-2xl text-navy dark:text-white">Pay at the counter</h1>
          <p className="text-soft text-sm mt-1 mb-6">Point any MoMo, bank or QR app at the code. Enter the amount, approve, done.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="GabiElectricals static business payment QR code" className="mx-auto w-64 h-64 rounded-2xl border border-line" />
          <p className="font-mono text-xs text-soft mt-4 break-all">{url}</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-soft font-bold uppercase tracking-wide">
            MTN MoMo · Telecel Cash · AT Money · Visa · Mastercard · GhIPSS
          </div>
        </div>
      </main>
    </div>
  );
}
