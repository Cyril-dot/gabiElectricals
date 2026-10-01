import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Icon } from '@/components/Icon';
import AccountNav, { type AccountNavItem } from './AccountNav';

export const dynamic = 'force-dynamic';

const NAV: AccountNavItem[] = [
  { href: '/account', label: 'Overview', icon: 'home', exact: true },
  { href: '/account/orders', label: 'Orders', icon: 'inventory_2' },
  { href: '/account/invoices', label: 'Invoices', icon: 'receipt_long' },
  { href: '/account/bookings', label: 'Bookings', icon: 'calendar_month' },
  { href: '/account/addresses', label: 'Addresses', icon: 'location_on' },
  { href: '/account/wishlist', label: 'Wishlist', icon: 'favorite' },
  { href: '/account/compare', label: 'Compare', icon: 'sync' },
  { href: '/account/referrals', label: 'Referrals & Wallet', icon: 'payments' },
  { href: '/account/profile', label: 'Profile', icon: 'person' },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login?next=/account');

  return (
    <div className="bg-mist dark:bg-navy min-h-[70vh]">
      <div className="container-x py-6 md:py-10">
        <header className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue">My account</p>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold mt-0.5">
            Hi, {session.name.split(' ')[0]} <span className="text-soft font-semibold text-lg"><Icon name="waving_hand" size={20} className="inline" /></span>
          </h1>
        </header>
        <div className="grid lg:grid-cols-[230px_1fr] gap-5 items-start">
          <AccountNav items={NAV} role={session.role} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
