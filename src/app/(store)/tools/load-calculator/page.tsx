import type { Metadata } from 'next';
import Link from 'next/link';
import { LoadCalculator } from '@/components/LoadCalculator';

export const metadata: Metadata = { title: 'Backup Power & Solar Load Calculator', description: 'Enter the appliances you must keep running — get an honest inverter, battery and solar sizing with product recommendations.' };

export default function LoadCalculatorPage() {
  return (
    <div className="container-x py-12 max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl md:text-4xl mb-2">Backup & solar load calculator</h1>
      <p className="text-soft mb-8 max-w-xl">Tick what must survive an outage, pick your dark hours, and we’ll size the inverter + battery honestly — no overselling. Prefer a human? <Link href="/book?service=solar-install" className="text-blue font-bold underline">Book a free solar survey</Link>.</p>
      <LoadCalculator />
    </div>
  );
}
