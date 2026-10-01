import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import BookWizard from './BookWizard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Book a Certified Electrician | GabiElectricals',
  description: 'Book house wiring, fault finding, DB upgrades, solar, CCTV and emergency call-outs online — pick a slot, pay a small deposit, done.',
};

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const [services, settings] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    getSettings(),
  ]);
  return (
    <div className="bg-mist dark:bg-navy min-h-[70vh]">
      <BookWizard
        initialService={service ?? null}
        services={services.map(s => ({ slug: s.slug, name: s.name, base: s.basePrice, dur: s.durationMins, image: s.image, shortDesc: s.shortDesc ?? s.description.slice(0, 110) + '…' }))}
        business={settings.business}
      />
    </div>
  );
}
