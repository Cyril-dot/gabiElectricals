import type { Metadata } from 'next';
import { LegalShell, H2 } from '@/components/LegalShell';

export const metadata: Metadata = { title: 'Refunds & Warranty Policy', description: '14-day returns, genuine-product guarantee, manufacturer warranties and workmanship cover from GabiElectricals.' };

export default function ReturnsPage() {
  return (
    <LegalShell title="Refunds & Warranty Policy" updated="30 September 2026">
      <H2>1. 14-day return window</H2>
      <p>Unopened items in original condition with proof of purchase may be returned within 14 days of delivery for exchange or store credit. Refunds to the original payment method are processed within 7 working days of our receiving and inspecting the item. Opened cable rolls, cut-by-metre goods and special-order items cannot be returned unless faulty.</p>
      <H2>2. The genuineness guarantee</H2>
      <p>If any product is found counterfeit — verified by the manufacturer or an independent test — we refund 100% of the purchase price plus the delivery cost, and the affected batch is withdrawn. This guarantee has no time limit on the claim window for the batch purchased.</p>
      <H2>3. Manufacturer warranty</H2>
      <p>Warranty periods are shown on each product (6 months to 25 years on solar panels). Register via your dashboard or the warranty form; keep your invoice. We coordinate claims and advance replacements for verified defects on stocked brands where the manufacturer process exceeds 14 days.</p>
      <H2>4. Workmanship warranty</H2>
      <p>All installation and service work carries a <strong>12-month workmanship warranty</strong> (rewires and solar: 24 months). If a fault we installed recurs, we return and rectify free of charge — materials excluded only where the failure cause is misuse, unauthorised modification, or grid surges beyond agreed protection.</p>
      <H2>5. Faulty goods & DOA</H2>
      <p>Dead-on-arrival electronics (within 7 days) are replaced same-day in Greater Accra where stock allows. Transport-damaged items: refuse delivery or photograph within 24 hours and WhatsApp us.</p>
      <H2>6. Booking deposits</H2>
      <p>Deposits are credited against the job. If we cannot attend within the agreed window (barring force majeure), you may cancel for a full deposit refund. Customer-initiated cancellations inside 24 hours of a dispatched call-out forfeit the travel retainer shown at booking.</p>
      <H2>7. How to start a claim</H2>
      <p>Dashboard → Orders → Request return, or WhatsApp +233 24 100 2030 with your order number. Keep packaging until resolved.</p>
    </LegalShell>
  );
}
