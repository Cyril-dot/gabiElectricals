import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ghs } from '@/lib/money';

export const dynamic = 'force-dynamic';

const BADGE: Record<string, string> = {
  PENDING_PAYMENT: 'bg-warning/15 text-warning', PAID: 'bg-success/10 text-success', PROCESSING: 'bg-blue/10 text-blue',
  OUT_FOR_DELIVERY: 'bg-blue/10 text-blue', DELIVERED: 'bg-navy/10 text-navy dark:text-white', CANCELLED: 'bg-danger/10 text-danger',
  REFUNDED: 'bg-soft/10 text-soft', PARTIALLY_PAID: 'bg-warning/15 text-warning',
};

export default async function AccountOrders() {
  const s = await getSession();
  if (!s) redirect('/login?next=/account/orders');
  const orders = await prisma.order.findMany({
    where: { userId: s.userId }, orderBy: { createdAt: 'desc' },
    include: { items: { select: { id: true, name: true, image: true, qty: true, price: true } }, zone: { select: { name: true } } },
    take: 50,
  });

  return (
    <section aria-label="Order history" className="space-y-4">
      <h2 className="font-display font-extrabold text-xl">Orders <span className="text-soft font-semibold text-[14px]">({orders.length})</span></h2>
      {orders.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl" aria-hidden="true">🧾</p>
          <p className="font-bold mt-2">No orders yet</p>
          <p className="text-[13px] text-soft mt-1">Your purchases of genuine cables, breakers and solar will appear here.</p>
          <Link href="/shop" className="btn-primary mt-4 px-5 py-2.5 text-[13.5px] inline-flex">Start shopping</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map(o => (
            <li key={o.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <Link href={`/order/${o.orderNo}`} className="font-extrabold text-[14.5px] hover:text-blue">{o.orderNo}</Link>
                <span className={`text-[10.5px] font-black px-2 py-1 rounded-md ${BADGE[o.status] ?? 'bg-mist text-soft'}`}>{o.status.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-[11.5px] text-soft mt-0.5">{new Date(o.createdAt).toLocaleString('en-GH', { dateStyle: 'medium' })} · {o.fulfilment === 'PICKUP' ? 'Store pickup' : 'Delivery'}{o.zone ? ` · ${o.zone.name}` : ''}</p>
              <ul className="mt-3 space-y-1.5">
                {o.items.slice(0, 3).map(it => (
                  <li key={it.id} className="flex items-center gap-2.5 text-[12.5px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.image ?? '/icon.svg'} alt="" className="h-8 w-8 rounded-md border border-line bg-mist object-contain shrink-0" />
                    <span className="truncate flex-1">{it.name}</span>
                    <span className="text-soft shrink-0">×{it.qty}</span>
                  </li>
                ))}
                {o.items.length > 3 && <li className="text-[11.5px] text-soft">+ {o.items.length - 3} more item{o.items.length - 3 > 1 ? 's' : ''}…</li>}
              </ul>
              <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between">
                <span className="text-[12px] text-soft">{o.items.length} item{o.items.length !== 1 ? 's' : ''} · total</span>
                <span className="flex items-center gap-3">
                  <b className="font-extrabold text-[15px]">{ghs(o.total)}</b>
                  <Link href={`/order/${o.orderNo}`} className="btn-ghost px-3 py-1.5 text-[12px]">Track →</Link>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
