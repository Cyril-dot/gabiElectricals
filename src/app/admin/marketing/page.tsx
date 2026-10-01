import { prisma } from '@/lib/db';
import { MarketingBoard } from './board';

export const dynamic = 'force-dynamic';

export default async function AdminMarketingPage() {
  const [subs, leads, carts] = await Promise.all([
    prisma.subscription.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.abandonedCart.findMany({ orderBy: { updatedAt: 'desc' }, take: 100 }),
  ]);
  const leadStatus = (m: string) => { try { return (JSON.parse(m).status as string) ?? 'NEW'; } catch { return 'NEW'; } };
  return (
    <MarketingBoard
      subs={subs.map((s) => ({ id: s.id, email: s.email, active: s.active, createdAt: s.createdAt.toISOString() }))}
      leads={leads.map((l) => ({ id: l.id, email: l.email, phone: l.phone, name: l.name, source: l.source, status: leadStatus(l.metaJson), createdAt: l.createdAt.toISOString() }))}
      carts={carts.map((c) => ({ id: c.id, email: c.email, phone: c.phone, value: c.value, recovered: c.recovered, items: c.itemsJson.slice(0, 160), createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() }))}
    />
  );
}
