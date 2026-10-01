import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getSettings, DEFAULT_SETTINGS, type Settings } from '@/lib/settings';
import { DEMO_MODE } from '@/lib/db';
import { SettingsForms } from '../_SettingsForms';
import { DemoButtons } from '../_DemoButtons';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  let session;
  try { session = await requireRole('ADMIN', 'SUPER_ADMIN'); } catch { redirect('/'); }
  const [s, zones, notifTemplates] = await Promise.all([
    getSettings(),
    prisma.deliveryZone.findMany({ orderBy: { name: 'asc' } }),
    prisma.setting.findUnique({ where: { key: 'notificationTemplates' } }),
  ]);

  const templates: Record<string, string> = notifTemplates
    ? (JSON.parse(notifTemplates.valueJson) as Record<string, string>)
    : {
      ORDER_PAID: 'GabiElectricals: Payment ₵{{amount}} received for order {{orderNo}}. Invoice {{invoiceNo}}.',
      ORDER_SHIPPED: 'GabiElectricals: Order {{orderNo}} is out for delivery to {{city}}. Track: {{link}}',
      ORDER_DELIVERED: 'GabiElectricals: Order {{orderNo}} delivered. Rate us in 30 seconds: {{link}}',
      BOOKING_CONFIRMED: 'GabiElectricals: Booking {{bookingNo}} confirmed for {{date}} {{slot}}.',
      TECH_ASSIGNED: 'GabiElectricals: {{tech}} ({{rating}}★) is on the way. ETA {{eta}} min.',
    };

  const zoneData = zones.map(z => ({
    id: z.id, name: z.name, regions: (() => { try { return JSON.parse(z.regions) as string[]; } catch { return []; } })(),
    fee: z.fee, freeOver: z.freeOver, etaDays: z.etaDays, active: z.active,
  }));

  const superAdmin = session.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white md:text-3xl">Settings</h1>
        <p className="text-sm font-semibold text-soft">Business, tax, delivery, payments, notifications and referrals. Saves to the Setting table.</p>
      </div>
      <SettingsForms initial={s} defaultPayments={DEFAULT_SETTINGS.payments} zones={zoneData} templates={templates} />
      {superAdmin && DEMO_MODE && <DemoButtons />}
    </div>
  );
}

export type { Settings };
