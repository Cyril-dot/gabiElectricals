import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { ghs } from '@/lib/money';
import { OrderTimeline } from '@/components/OrderTimeline';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ orderNo: string }> }): Promise<Metadata> {
  const { orderNo } = await params;
  return { title: `Order ${orderNo} — GabiElectricals` };
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting payment', cls: 'bg-warning/15 text-warning' },
  PARTIALLY_PAID: { label: 'Partially paid', cls: 'bg-warning/15 text-warning' },
  PAID: { label: 'Paid', cls: 'bg-success/15 text-success' },
  PROCESSING: { label: 'Processing', cls: 'bg-blue/10 text-blue' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', cls: 'bg-blue/10 text-blue' },
  DELIVERED: { label: 'Delivered', cls: 'bg-success/15 text-success' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-danger/10 text-danger' },
  REFUNDED: { label: 'Refunded', cls: 'bg-danger/10 text-danger' },
};

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderNo: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orderNo } = await params;
  const sp = await searchParams;
  const order = await prisma.order.findUnique({
    where: { orderNo: orderNo.toUpperCase() },
    include: {
      items: true, events: { orderBy: { at: 'asc' } }, zone: true,
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!order) notFound();
  const session = await getSession();
  const settings = await getSettings();
  const unpaid = order.status === 'PENDING_PAYMENT' || order.status === 'PARTIALLY_PAID';
  const payRef = typeof sp.ref === 'string' ? sp.ref : '';
  const linkedPayment = payRef ? order.payments.find(p => p.reference === payRef) : order.payments[0];
  const badge = STATUS_BADGE[order.status] ?? { label: order.status, cls: 'bg-mist text-soft' };

  return (
    <div className="container-x py-6 md:py-10 max-w-4xl">
      <div className="card p-6 md:p-8 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-bold text-soft uppercase tracking-widest mb-1">Order confirmation</p>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold">{order.orderNo}</h1>
            <p className="text-sm text-soft mt-1.5">Placed {new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {ghs(order.total)} {order.status === 'PAID' ? 'paid' : 'due'}</p>
          </div>
          <span className={`text-[12.5px] font-black rounded-full px-3.5 py-2 ${badge.cls}`}>{badge.label}</span>
        </div>

        {unpaid ? (
          <div className="mt-5 bg-warning/10 border border-warning/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">Complete payment of <strong>{ghs(order.total)}</strong> to lock in delivery — we hold your stock for 15 minutes on QR.</p>
            <Link href={`/order/${order.orderNo}/pay`} className="btn-primary !px-5 !py-2.5 text-sm min-h-[44px]">💰 Pay now</Link>
          </div>
        ) : (
          <div className="mt-5 bg-success/10 border border-success/30 rounded-xl p-4">
            <p className="text-sm font-semibold text-success">✓ {order.status === 'DELIVERED' ? 'Delivered — thank you for choosing genuine.' : order.fulfilment === 'PICKUP' ? 'Confirmed — collect at ' + settings.business.address : 'Confirmed and paid — packing soon.'}</p>
          </div>
        )}
        {payRef && linkedPayment && (
          <p className="text-[12.5px] text-soft mt-3">Payment reference: <span className="font-mono font-bold text-ink dark:text-white">{linkedPayment.reference}</span> · {linkedPayment.status}</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-5 items-start">
        <section className="card p-5" aria-label="Order progress">
          <h2 className="font-display text-lg font-extrabold mb-4">Progress</h2>
          <OrderTimeline status={order.status} events={order.events} />
          <div className="flex flex-wrap gap-2 mt-5">
            <Link href={`/order/${order.orderNo}/invoice`} className="btn-ghost !px-4 !py-2.5 text-sm">🧾 Download invoice</Link>
            <Link href={`/track?orderNo=${order.orderNo}`} className="btn-ghost !px-4 !py-2.5 text-sm">📍 Track this order</Link>
          </div>
        </section>

        <section className="card p-5" aria-label="Items and totals">
          <h2 className="font-display text-lg font-extrabold mb-3">What you ordered</h2>
          <ul className="space-y-2.5 text-sm">
            {order.items.map(it => (
              <li key={it.id} className="flex gap-3 items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.image ?? '/icon.svg'} alt={it.name} width={48} height={36} className="w-12 h-9 object-contain bg-mist dark:bg-navy-700 rounded-md p-0.5 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="font-bold block truncate">{it.name}</span>
                  <span className="text-[12px] text-soft">{it.qty} × {ghs(it.price)}{it.addOnInstall && <span className="text-blue font-bold"> · + installation</span>}</span>
                </span>
                <span className="font-extrabold whitespace-nowrap">{ghs(it.price * it.qty * (it.addOnInstall ? 1.1 : 1))}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 text-sm border-t border-line pt-3">
            <div className="flex justify-between"><dt className="text-soft">Subtotal</dt><dd>{ghs(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd>−{ghs(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-soft">Delivery</dt><dd>{order.deliveryFee === 0 ? 'FREE' : ghs(order.deliveryFee)}{order.zone ? ` · ${order.zone.name}` : ''}</dd></div>
            {order.levy > 0 && <div className="flex justify-between"><dt className="text-soft">Levy</dt><dd>{ghs(order.levy)}</dd></div>}
            {order.walletUsed > 0 && <div className="flex justify-between text-gold-dark"><dt>Referral credit</dt><dd>−{ghs(order.walletUsed)}</dd></div>}
            <div className="flex justify-between font-extrabold text-base pt-1"><dt>Total</dt><dd>{ghs(order.total)}</dd></div>
            <div className="flex justify-between text-[12px] text-soft"><dt>Incl. VAT</dt><dd>{ghs(order.vat)}</dd></div>
          </dl>
          {(order.addrCity || order.fulfilment === 'PICKUP') && (
            <p className="text-[12.5px] text-soft mt-3">
              {order.fulfilment === 'PICKUP' ? `Pickup: ${settings.business.address}` : `Delivering to ${order.addrCity}${order.addrRegion ? `, ${order.addrRegion}` : ''}${order.addrLandmark ? ` — landmark: ${order.addrLandmark}` : ''}`}
            </p>
          )}
        </section>
      </div>

      <div className="card p-5 mt-5 text-center">
        <p className="text-sm font-bold mb-1">Need a hand with installation or warranty?</p>
        <p className="text-[13px] text-soft mb-3">Call {settings.business.phone} or WhatsApp us — a certified tech answers, not a call centre. Open {settings.business.hours}.</p>
        <Link href="/contact" className="btn-ghost !px-5 !py-2.5 text-sm">Contact support</Link>
      </div>
    </div>
  );
}
