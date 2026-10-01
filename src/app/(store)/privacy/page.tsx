import type { Metadata } from 'next';
import { LegalShell, H2 } from '@/components/LegalShell';

export const metadata: Metadata = { title: 'Privacy Policy', description: 'How GabiElectricals collects, uses and protects your data under the Ghana Data Protection Act, 2012 (Act 843).' };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="30 September 2026">
      <p>GabiElectricals respects your privacy in line with the <strong>Data Protection Act, 2012 (Act 843)</strong>. We are the data controller for information collected on this platform.</p>
      <H2>1. What we collect</H2>
      <p>Account details (name, email, phone), delivery addresses including Ghana Post GPS, order/booking history, payment references and status (never full card numbers — card processing is delegated to PCI-compliant providers), support interactions, and basic analytics (pages viewed, devices). With consent we collect marketing preferences and WhatsApp/SMS contact.</p>
      <H2>2. Legal bases & use</H2>
      <p>Contract (fulfilling orders, bookings, payments, deliveries), legitimate interest (fraud prevention, service quality, referrals integrity), consent (marketing messages, cookies beyond essentials), and legal obligation (tax/VAT records, MoMo payout KYC).</p>
      <H2>3. Sharing</H2>
      <p>We share only what is necessary: payment providers (Paystack/Hubtel/rival rails) to process transactions, delivery partners to complete deliveries, SMS/email gateways to send your notifications, technicians assigned to your job (they see name, phone, address and job notes), and government authorities where law requires. We never sell personal data.</p>
      <H2>4. Retention & security</H2>
      <p>Transaction records are kept for statutory tax periods; marketing data until you unsubscribe. Passwords are stored only as bcrypt hashes; sessions use signed cookies; staff access is role-based and logged. Uploads are validated and sandboxed.</p>
      <H2>5. Your rights</H2>
      <p>Access, correction, deletion, objection to processing, and withdrawal of consent at any time. Email privacy@gabielectricals.com or call +233 24 100 2030. You may complain to the Data Protection Commission of Ghana.</p>
      <H2>6. Cookies</H2>
      <p>Essential: session, cart, referral attribution. Preference: theme. Analytics: aggregate usage (only when GA4 is configured). A consent banner lets you accept or reject non-essential cookies.</p>
      <H2>7. Children</H2>
      <p>This store is not directed at children under 13; we do not knowingly collect their data.</p>
      <H2>8. Changes</H2>
      <p>Material changes will be announced on this page and, for registered customers, by email at least 14 days before taking effect.</p>
    </LegalShell>
  );
}
