import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { ghs } from '@/lib/money';
import { PaySandbox } from './pay-client';

export const dynamic = 'force-dynamic';

export default async function PayOrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNo: orderNo.toUpperCase() },
    select: { orderNo: true, status: true, total: true, email: true, phone: true, payments: { where: { status: 'PAID' }, select: { amount: true } } },
  });
  if (!order) notFound();
  const settings = await getSettings();
  const paidSoFar = order.payments.reduce((s, p) => s + p.amount, 0);
  const due = Math.max(0, Math.round((order.total - paidSoFar) * 100) / 100);
  const closed = order.status !== 'PENDING_PAYMENT' && order.status !== 'PARTIALLY_PAID';

  return (
    <div className="container-x py-6 md:py-10 max-w-2xl">
      <nav className="text-[12.5px] text-soft mb-3 font-medium">
        <Link href={`/order/${order.orderNo}`} className="hover:text-blue">← Back to {order.orderNo}</Link>
      </nav>
      <div className="card p-6 md:p-8">
        <h1 className="font-display text-2xl font-extrabold mb-1">Secure payment</h1>
        <p className="text-sm text-soft mb-5">Order {order.orderNo} · {ghs(order.total)} total{paidSoFar > 0 ? `, ${ghs(paidSoFar)} already paid` : ''}.</p>
        {closed ? (
          <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-sm font-bold text-success">
            ✓ This order is already {order.status.toLowerCase().replaceAll('_', ' ')} — nothing more to pay.
            <Link href={`/order/${order.orderNo}`} className="block text-blue mt-2 hover:underline">View order →</Link>
          </div>
        ) : (
          <PaySandbox orderNo={order.orderNo} due={due} email={order.email} phone={order.phone} qrExpiryMinutes={settings.payments.qrExpiryMinutes} />
        )}
      </div>
    </div>
  );
}
