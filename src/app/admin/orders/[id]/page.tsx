import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ghs } from '@/lib/money';
import { StatusBadge, Icon, ICONS, fmtDate, fmtDateTime } from '../../_ui';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

export default async function OrderInvoice({ params }: { params: Promise<{ id: string }> }) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch { redirect('/'); }
  const { id } = await params;
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: { include: { product: { select: { sku: true } } } },
        payments: { orderBy: { createdAt: 'asc' } },
        events: { orderBy: { at: 'asc' } },
        zone: true,
      },
    }),
    getSettings(),
  ]);
  if (!order) notFound();

  const paid = order.payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4 print:max-w-none">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/orders" className="btn-ghost px-4 py-2 text-sm">← Orders</Link>
        <div className="flex items-center gap-3">
          <PrintButton />
          <span className="text-xs font-semibold text-soft">PDF: choose “Save as PDF” in the print dialog</span>
        </div>
      </div>

      <div className="card p-6 print:border-0 print:shadow-none md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="font-display text-xl font-extrabold text-navy dark:text-white print:text-black">{settings.business.name}</p>
            <p className="text-xs font-semibold text-soft print:text-gray-600">{settings.business.address}</p>
            <p className="text-xs font-semibold text-soft print:text-gray-600">{settings.business.phone} · {settings.business.email}</p>
            <p className="text-xs font-semibold text-soft print:text-gray-600">Ghana Post GPS: {settings.business.gps}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-extrabold uppercase tracking-wide">Invoice</p>
            <p className="font-mono text-sm font-bold">{order.invoiceNo ?? `INV-${order.orderNo.slice(3)}`}</p>
            <p className="text-xs font-semibold text-soft print:text-gray-600">{order.orderNo} · {fmtDate(order.createdAt)}</p>
            <div className="mt-1"><StatusBadge status={order.status} /></div>
          </div>
        </div>

        <div className="grid gap-4 py-5 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-soft print:text-gray-600">Billed to</p>
            <p className="mt-1 text-sm font-bold">{order.user?.name ?? order.email}</p>
            <p className="text-sm">{order.email}</p>
            <p className="text-sm">{order.phone}</p>
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-soft print:text-gray-600">Delivery</p>
            <p className="mt-1 text-sm font-bold">{order.fulfilment === 'PICKUP' ? 'Store pickup — Osu, Accra' : order.zone?.name ?? 'Delivery'}</p>
            <p className="text-sm">{[order.addrCity, order.addrRegion].filter(Boolean).join(', ')}</p>
            <p className="text-sm">{order.addrLandmark ?? order.addrLine ?? ''}</p>
            {order.addrGps && <p className="text-sm">GPS: {order.addrGps}</p>}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-line text-left text-[11px] font-extrabold uppercase tracking-wide text-soft print:text-gray-600">
              <th className="py-2">Item</th><th className="py-2 text-right">Unit</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(i => (
              <tr key={i.id} className="border-b border-line print:border-gray-200">
                <td className="py-2.5">
                  <p className="font-bold">{i.name}</p>
                  {i.sku && <p className="text-xs text-soft print:text-gray-500">{i.product?.sku ?? i.sku}{i.addOnInstall ? ' · + installation' : ''}</p>}
                </td>
                <td className="py-2.5 text-right">{ghs(i.price)}</td>
                <td className="py-2.5 text-right">{i.qty}</td>
                <td className="py-2.5 text-right font-bold">{ghs(i.price * i.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 max-w-64 space-y-1.5 text-sm">
          <p className="flex justify-between"><span className="text-soft print:text-gray-600">Subtotal</span><span className="font-bold">{ghs(order.subtotal)}</span></p>
          {order.discount > 0 && <p className="flex justify-between text-success"><span>Discount</span><span>−{ghs(order.discount)}</span></p>}
          <p className="flex justify-between"><span className="text-soft print:text-gray-600">Delivery</span><span className="font-bold">{order.deliveryFee > 0 ? ghs(order.deliveryFee) : 'Free'}</span></p>
          <p className="flex justify-between"><span className="text-soft print:text-gray-600">VAT (incl.)</span><span>{ghs(order.vat)}</span></p>
          {order.levy > 0 && <p className="flex justify-between"><span className="text-soft print:text-gray-600">Levy</span><span>{ghs(order.levy)}</span></p>}
          {order.walletUsed > 0 && <p className="flex justify-between text-blue"><span>Wallet credit</span><span>−{ghs(order.walletUsed)}</span></p>}
          <p className="flex justify-between border-t-2 border-navy pt-2 font-display text-base font-extrabold print:border-black"><span>Total</span><span>{ghs(order.total)}</span></p>
          <p className="flex justify-between text-xs"><span className="text-soft print:text-gray-600">Paid so far</span><span className={paid >= order.total - 0.01 ? 'font-bold text-success' : 'font-bold text-warning'}>{ghs(paid)}</span></p>
        </div>

        {order.payments.length > 0 && (
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-soft print:text-gray-600">Payments</p>
            <ul className="mt-2 space-y-1 text-xs font-semibold">
              {order.payments.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="font-mono">{p.reference}</span>
                  <span>{p.method.replaceAll('_', ' ')} · {ghs(p.amount)}</span>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="no-print mt-6 border-t border-line pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-soft"><Icon d={ICONS.orders} /> Order timeline</p>
          <ol className="ml-1 space-y-1.5 border-l-2 border-line pl-4 text-xs">
            {order.events.map(e => (
              <li key={e.id}><span className="font-extrabold">{e.status.replaceAll('_', ' ')}</span> — {e.note ?? ''} <span className="text-soft">{fmtDateTime(e.at)}</span></li>
            ))}
          </ol>
        </div>

        <p className="mt-6 text-center text-[11px] font-semibold text-soft print:text-gray-500">
          {settings.business.name} · VAT-inclusive pricing · Thank you for shopping genuine. Warranty claims: {settings.business.whatsapp} on WhatsApp.
        </p>
      </div>
    </div>
  );
}
