import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { ghs } from '@/lib/money';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

export default async function InvoicePage({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNo: orderNo.toUpperCase() },
    include: { items: true, zone: true },
  });
  if (!order) notFound();
  const biz = (await getSettings()).business;

  return (
    <div className="container-x py-6 md:py-10">
      <style>{`
        @media print {
          header, footer, .no-print, #floating-buttons { display: none !important; }
          body { background: #fff !important; }
          .invoice-sheet { box-shadow: none !important; border: none !important; }
        }
      `}</style>
      <div className="no-print flex justify-between items-center mb-4 max-w-3xl mx-auto">
        <a href={`/order/${order.orderNo}`} className="text-sm font-bold text-blue hover:underline">← Back to order</a>
        <PrintButton />      </div>

      <article className="invoice-sheet card max-w-3xl mx-auto p-6 md:p-10 text-ink">
        <header className="flex flex-wrap justify-between gap-4 border-b-2 border-navy pb-5 mb-6">
          <div>
            <p className="font-display text-2xl font-extrabold text-navy">{biz.name}</p>
            <p className="text-[13px] text-soft mt-1">{biz.address}<br />Tel: {biz.phone} · {biz.email} · GPS: {biz.gps}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-extrabold uppercase">Tax Invoice</p>
            <p className="text-[13px] text-soft mt-1">{order.invoiceNo ?? `DRAFT-${order.orderNo}`}<br />Date: {new Date(order.createdAt).toLocaleDateString('en-GB')}</p>
          </div>
        </header>

        <section className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="font-black uppercase text-[11px] tracking-widest text-soft mb-1">Billed to</p>
            <p className="font-bold">{order.email}</p>
            <p>{order.phone}</p>
            {order.addrCity && <p>{order.addrLine ? order.addrLine + ', ' : ''}{order.addrCity}{order.addrRegion ? `, ${order.addrRegion}` : ''}{order.addrGps ? ` · GH GPS: ${order.addrGps}` : ''}</p>}
            {order.fulfilment === 'PICKUP' && <p>Collection at {biz.name} — {biz.address}</p>}
          </div>
          <div className="sm:text-right">
            <p className="font-black uppercase text-[11px] tracking-widest text-soft mb-1">Order</p>
            <p className="font-bold">{order.orderNo}</p>
            <p>Status: {order.status.replaceAll('_', ' ')}</p>
            {order.referralCode && <p>Referral: {order.referralCode}</p>}
          </div>
        </section>

        <table className="w-full text-sm border-collapse">
          <caption className="sr-only">Invoice line items</caption>
          <thead>
            <tr className="bg-mist dark:bg-navy-700 text-left">
              <th scope="col" className="p-2.5 font-black">Item</th>
              <th scope="col" className="p-2.5 font-black text-center">Qty</th>
              <th scope="col" className="p-2.5 font-black text-right">Unit</th>
              <th scope="col" className="p-2.5 font-black text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(it => (
              <tr key={it.id} className="border-b border-line">
                <td className="p-2.5">{it.name}{it.sku ? <span className="text-soft"> · {it.sku}</span> : ''}{it.addOnInstall && <span className="text-blue font-bold"> (+installation)</span>}</td>
                <td className="p-2.5 text-center">{it.qty}</td>
                <td className="p-2.5 text-right">{ghs(it.price)}</td>
                <td className="p-2.5 text-right font-bold">{ghs(it.price * it.qty * (it.addOnInstall ? 1.1 : 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-5 ml-auto max-w-xs text-sm space-y-1.5">
          <div className="flex justify-between"><span className="text-soft">Subtotal (VAT incl.)</span><span className="font-bold">{ghs(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between"><span className="text-soft">Discount</span><span className="font-bold">−{ghs(order.discount)}</span></div>}
          <div className="flex justify-between"><span className="text-soft">Delivery ({order.zone?.name ?? (order.fulfilment === 'PICKUP' ? 'pickup' : 'n/a')})</span><span className="font-bold">{order.deliveryFee === 0 ? 'FREE' : ghs(order.deliveryFee)}</span></div>
          {order.levy > 0 && <div className="flex justify-between"><span className="text-soft">Levy</span><span className="font-bold">{ghs(order.levy)}</span></div>}
          {order.walletUsed > 0 && <div className="flex justify-between"><span className="text-soft">Wallet credit</span><span className="font-bold">−{ghs(order.walletUsed)}</span></div>}
          <div className="h-px bg-navy my-1" />
          <div className="flex justify-between font-display text-lg font-extrabold"><span>TOTAL</span><span>{ghs(order.total)}</span></div>
          <div className="flex justify-between text-[12.5px] text-soft"><span>of which VAT @15% (inclusive)</span><span>{ghs(order.vat)}</span></div>
        </section>

        <footer className="mt-8 pt-4 border-t border-line text-[12px] text-soft leading-relaxed">
          <p>Goods remain property of {biz.name} until paid in full. Warranty claims need this invoice — register at collection. Returns within 7 days, unopened, with receipt. GRA TIN available on request for VAT invoices.</p>
          <p className="mt-1 font-bold text-ink">Thank you for buying genuine. — {biz.tagline}</p>
        </footer>
      </article>
    </div>
  );
}
