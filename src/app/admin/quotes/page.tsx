import { prisma } from '@/lib/db';
import { DEMO_MODE } from '@/lib/db';
import { QuotesBoard } from './board';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ id?: string }> };

export default async function AdminQuotesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [quotes, links] = await Promise.all([
    prisma.quote.findMany({ include: { booking: { select: { bookingNo: true, status: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.paymentLink.findMany({ where: { forType: 'QUOTE' } }),
  ]);
  const linkByQuote = new Map(links.map((l) => [l.forId, l]));
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? (DEMO_MODE ? 'http://localhost:3000' : '');

  return (
    <QuotesBoard
      quotes={quotes.map((q) => ({
        id: q.id, quoteNo: q.quoteNo, customerName: q.customerName, customerPhone: q.customerPhone, customerEmail: q.customerEmail,
        description: q.description, amount: q.amount, status: q.status, bookingNo: q.booking?.bookingNo ?? null,
        createdAt: q.createdAt.toISOString(), validUntil: q.validUntil?.toISOString() ?? null,
        items: safeItems(q.itemsJson),
        payUrl: linkByQuote.get(q.id) ? `${base}/pay/${linkByQuote.get(q.id)!.code}` : null,
      }))}
      activeId={sp.id ?? null}
    />
  );
}

function safeItems(json: string): { label: string; qty: number; amount: number }[] {
  try {
    const a = JSON.parse(json);
    return Array.isArray(a) ? a.map((x: Record<string, unknown>) => ({ label: String(x.label ?? ''), qty: Number(x.qty) || 1, amount: Number(x.amount) || 0 })) : [];
  } catch { return []; }
}
