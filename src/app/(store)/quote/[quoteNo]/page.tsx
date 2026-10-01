import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ghs } from '@/lib/money';
import { JSONLd } from '@/components/JsonLd';
import QuoteActions from './QuoteActions';

export const dynamic = 'force-dynamic';

const parse = <T,>(raw: string, fb: T): T => { try { return JSON.parse(raw) as T; } catch { return fb; } };

type Props = { params: Promise<{ quoteNo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { quoteNo } = await params;
  return { title: `Quote ${quoteNo}`, description: 'Review, accept and pay your GabiElectricals quote.' };
}

const BADGE: Record<string, string> = {
  DRAFT: 'bg-soft/10 text-soft', SENT: 'bg-blue/10 text-blue', ACCEPTED: 'bg-gold/15 text-gold-dark',
  PAID: 'bg-success/10 text-success', DECLINED: 'bg-danger/10 text-danger', EXPIRED: 'bg-danger/10 text-danger',
};

export default async function QuotePage({ params }: Props) {
  const { quoteNo } = await params;
  const quote = await prisma.quote.findUnique({ where: { quoteNo }, include: { booking: { select: { bookingNo: true } } } });
  if (!quote) notFound();

  const expired = !!quote.validUntil && quote.validUntil < new Date() && !['PAID', 'DECLINED'].includes(quote.status);
  const effectiveStatus = expired && quote.status !== 'EXPIRED' ? 'EXPIRED' : quote.status;
  const items = parse<{ label: string; qty: number; amount: number }[]>(quote.itemsJson, []);

  return (
    <div className="bg-mist dark:bg-navy min-h-[70vh]">
      <JSONLd data={{
        '@context': 'https://schema.org', '@type': 'Invoice', number: quote.quoteNo,
        totalPrice: quote.amount, currency: 'GHS', paymentDue: quote.validUntil?.toISOString() ?? undefined,
        description: quote.description,
      }} />
      <div className="container-x py-8 md:py-12 max-w-2xl">
        <nav aria-label="Breadcrumb" className="text-[12.5px] text-soft mb-4">
          <Link href="/" className="hover:text-blue">Home</Link> / <span className="font-bold text-ink dark:text-white">Quote {quote.quoteNo}</span>
        </nav>

        <div className="card overflow-hidden">
          <div className="bg-navy text-white p-5 md:p-7">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">Written Quote</p>
                <h1 className="font-display text-2xl md:text-3xl font-extrabold mt-1">{quote.quoteNo}</h1>
                <p className="text-white/70 text-[13px] mt-1">Prepared for <b className="text-white">{quote.customerName}</b>{quote.booking ? ` · booking ${quote.booking.bookingNo}` : ''}</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-[12px] font-black ${BADGE[effectiveStatus] ?? 'bg-white/10 text-white'}`}>
                {effectiveStatus}
              </span>
            </div>
          </div>

          <div className="p-5 md:p-7">
            <p className="text-[14px] leading-relaxed mb-5">{quote.description}</p>

            <table className="w-full text-[13.5px]" aria-label="Quote line items">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-soft border-b border-line">
                  <th scope="col" className="py-2">Item</th>
                  <th scope="col" className="py-2 text-center w-16">Qty</th>
                  <th scope="col" className="py-2 text-right">Unit (₵)</th>
                  <th scope="col" className="py-2 text-right">Total (₵)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-line/50 last:border-0">
                    <td className="py-2.5 pr-2 font-semibold">{it.label}</td>
                    <td className="py-2.5 text-center">{it.qty}</td>
                    <td className="py-2.5 text-right text-soft">{it.amount.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-bold">{(it.qty * it.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="py-3 text-right font-extrabold text-[15px]">Quote total</td>
                  <td className="py-3 text-right font-display font-extrabold text-xl text-navy dark:text-gold">{ghs(quote.amount)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-4 flex items-center justify-between flex-wrap gap-2 text-[13px]">
              <span className="text-soft">
                {quote.validUntil
                  ? <>Valid until <b>{quote.validUntil.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}</b></>
                  : 'No expiry'}
              </span>
              {quote.validUntil && effectiveStatus === 'SENT' && (
                <span className="rounded-lg bg-gold/15 text-gold-dark font-bold px-3 py-1.5" aria-label="Quote validity countdown">
                  <Countdown to={quote.validUntil.toISOString()} />
                </span>
              )}
            </div>

            <QuoteActions quoteNo={quote.quoteNo} id={quote.id} status={effectiveStatus} amount={quote.amount}
              phone={quote.customerPhone} email={quote.customerEmail} />

            <p className="mt-5 text-[11.5px] text-soft border-t border-line pt-3">
              Prices include certified workmanship and warranty. Payment via MoMo, card, QR or bank transfer — invoice issued automatically.
              Questions? <Link href="/services" className="text-blue font-bold">See our services</Link> or call us.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Countdown({ to }: { to: string }) {
  // server-rendered shell; QuoteActions polls live status so no client timer/hydration drift
  const ms = new Date(to).getTime() - Date.now();
  const d = Math.max(0, Math.floor(ms / 86400000));
  const label = d > 0 ? `${d} day${d > 1 ? 's' : ''} remaining` : 'Expiring soon';
  return <b>{label}</b>;
}
