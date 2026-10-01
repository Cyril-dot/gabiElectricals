import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ghs } from '@/lib/money';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function AccountInvoices() {
  const s = await getSession();
  if (!s) redirect('/login?next=/account/invoices');
  const orders = await prisma.order.findMany({
    where: { userId: s.userId, invoiceNo: { not: null } },
    orderBy: { createdAt: 'desc' }, take: 50,
  });

  return (
    <section aria-label="Invoices" className="space-y-4">
      <h2 className="font-display font-extrabold text-xl">Invoices <span className="text-soft font-semibold text-[14px]">({orders.length})</span></h2>
      {orders.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-volt/15 text-navy dark:text-volt" aria-hidden="true"><Icon name="receipt_long" size={30} /></span>
          <p className="font-bold mt-2">No invoices yet</p>
          <p className="text-[13px] text-soft mt-1">Invoices appear automatically once an order is paid.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-soft border-b border-line">
                  <th scope="col" className="px-4 py-3">Invoice</th>
                  <th scope="col" className="px-4 py-3">Order</th>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3 text-right">Amount</th>
                  <th scope="col" className="px-4 py-3 text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-line/50 last:border-0 hover:bg-mist/60 dark:hover:bg-navy-700/50">
                    <td className="px-4 py-3 font-extrabold text-blue">{o.invoiceNo}</td>
                    <td className="px-4 py-3"><Link href={`/order/${o.orderNo}`} className="hover:underline">{o.orderNo}</Link></td>
                    <td className="px-4 py-3 text-soft">{new Date(o.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-right font-bold">{ghs(o.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/order/${o.orderNo}/invoice`} className="btn-ghost px-3 py-1.5 text-[12px]">PDF ↓</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-[12px] text-soft">Need a VAT invoice for a company? <Link href="/contact" className="text-blue font-bold">Contact us</Link> with your GRA TIN.</p>
    </section>
  );
}
