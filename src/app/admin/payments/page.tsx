import { prisma } from '@/lib/db';
import { PaymentBoard } from './board';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AdminPaymentsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = sp.status;
  const method = sp.method;
  // The transactions list is the LibertePay list by default (the store's
  // 360Pay payments, each carrying its LibertePay GABI reference); ?src=all
  // shows every provider's payments like the old board did.
  const src = sp.src === 'all' ? 'all' : 'libertepay';
  const q = (sp.q ?? '').trim();
  const from = sp.from ? new Date(`${sp.from}T00:00:00`) : undefined;
  const to = sp.to ? new Date(`${sp.to}T23:59:59`) : undefined;

  const where: Record<string, unknown> = {};
  if (src === 'libertepay') where.provider = 'LIBERTEPAY360';
  if (status) where.status = status;
  if (method) where.method = method;
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  if (q) where.OR = [
    { reference: { contains: q } },
    { payerPhone: { contains: q } },
  ];

  const include = {
    order: { select: { orderNo: true, user: { select: { name: true } } } },
    booking: { select: { bookingNo: true, contactName: true } },
    link: { select: { label: true, code: true } },
    events: { orderBy: { at: 'desc' as const }, take: 20 },
  };

  const [payments, awaiting, links, counts, lpPaid, lpPending] = await Promise.all([
    prisma.payment.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      take: 120,
    }),
    prisma.payment.findMany({
      where: { status: 'AWAITING_APPROVAL' },
      include,
      orderBy: { createdAt: 'asc' },
      take: 20,
    }),
    prisma.paymentLink.findMany({ include: { payments: { select: { status: true } } }, orderBy: { createdAt: 'desc' }, take: 40 }),
    prisma.payment.groupBy({ by: ['status'], where: src === 'libertepay' ? { provider: 'LIBERTEPAY360' } : {}, _count: { _all: true } }),
    prisma.payment.aggregate({ where: { provider: 'LIBERTEPAY360', status: 'PAID' }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.payment.count({ where: { provider: 'LIBERTEPAY360', status: 'PENDING' } }),
  ]);

  const ser = (p: (typeof payments)[number]) => {
    // LibertePay payments keep the gateway's own reference and the verified
    // account name in metaJson (written by src/lib/gateway.ts at collect).
    let providerRef: string | null = null;
    let payerName: string | null = null;
    try {
      const meta = JSON.parse(p.metaJson || '{}') as Record<string, unknown>;
      if (typeof meta.providerRef === 'string') providerRef = meta.providerRef;
      if (typeof meta.accountName === 'string' && meta.accountName.trim()) payerName = meta.accountName.trim();
    } catch { /* metaJson is best-effort */ }
    if (!payerName) payerName = p.order?.user?.name ?? p.booking?.contactName ?? null;
    return {
      id: p.id, reference: p.reference, amount: p.amount, status: p.status, method: p.method, provider: p.provider,
      providerRef, payerName,
      payerPhone: p.payerPhone, payerEmail: p.payerEmail, refundNote: p.refundNote, proofImage: p.proofImage,
      createdAt: p.createdAt.toISOString(), confirmedAt: p.confirmedAt?.toISOString() ?? null, expiresAt: p.expiresAt?.toISOString() ?? null,
      orderNo: p.order?.orderNo ?? null, bookingNo: p.booking?.bookingNo ?? null, linkLabel: p.link?.label ?? null, linkCode: p.link?.code ?? null,
      orderId: p.orderId, bookingId: p.bookingId, linkId: p.linkId,
      events: (p.events ?? []).map((e) => ({ type: e.type, note: e.note, at: e.at.toISOString() })),
    };
  };

  const linksData = links.map((l) => ({
    id: l.id, code: l.code, label: l.label, amount: l.amount, forType: l.forType, status: l.status,
    createdAt: l.createdAt.toISOString(), expiresAt: l.expiresAt?.toISOString() ?? null,
    paid: l.payments.some((p) => p.status === 'PAID'),
  }));

  return (
    <PaymentBoard
      payments={payments.map(ser)}
      awaiting={awaiting.map((p) => ({ ...ser(p), events: [] }))}
      links={linksData}
      counts={Object.fromEntries(counts.map((c) => [c.status, c._count._all]))}
      filters={{ status: status ?? '', method: method ?? '', q, from: sp.from ?? '', to: sp.to ?? '', src }}
      summary={{ paidCount: lpPaid._count._all, paidTotal: lpPaid._sum.amount ?? 0, pendingCount: lpPending }}
    />
  );
}
