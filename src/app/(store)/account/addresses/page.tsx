import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import AddressesManager from './AddressesManager';

export const dynamic = 'force-dynamic';

export default async function AccountAddresses() {
  const s = await getSession();
  if (!s) redirect('/login?next=/account/addresses');
  const addresses = await prisma.address.findMany({ where: { userId: s.userId }, orderBy: [{ isDefault: 'desc' }] });
  return (
    <section aria-label="Saved addresses" className="space-y-4">
      <h2 className="font-display font-extrabold text-xl">Delivery addresses</h2>
      <AddressesManager initial={addresses.map(a => ({
        id: a.id, label: a.label, region: a.region, city: a.city, landmark: a.landmark, gps: a.gps, phone: a.phone, isDefault: a.isDefault,
      }))} />
    </section>
  );
}
