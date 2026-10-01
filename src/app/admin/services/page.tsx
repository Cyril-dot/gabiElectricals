import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ServicesBoard } from './board';

export const dynamic = 'force-dynamic';

export default async function AdminServices() {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch { redirect('/'); }
  const rows = await prisma.service.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { bookings: true } } } });
  const j = <T,>(s: string, d: T): T => { try { return JSON.parse(s) as T; } catch { return d; } };
  const services = rows.map((s) => ({
    id: s.id, slug: s.slug, name: s.name, description: s.description, shortDesc: s.shortDesc,
    basePrice: s.basePrice, depositPct: s.depositPct, durationMins: s.durationMins, image: s.image,
    includes: j<string[]>(s.includes, []), urgency: j<Record<string, number>>(s.urgencyJson, {}),
    active: s.active, sortOrder: s.sortOrder, bookings: s._count.bookings,
  }));
  return <ServicesBoard services={services} />;
}
