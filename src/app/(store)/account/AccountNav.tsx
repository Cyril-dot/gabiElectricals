'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/Icon';

export type AccountNavItem = { href: string; label: string; icon: string; exact?: boolean };

export default function AccountNav({ items, role }: { items: AccountNavItem[]; role: string }) {
  const pathname = usePathname();
  const extra: AccountNavItem[] = role === 'TECHNICIAN'
    ? [{ href: '/technician', label: 'Technician Desk', icon: 'build' }]
    : role === 'ADMIN' || role === 'SUPER_ADMIN'
      ? [{ href: '/admin', label: 'Admin Console', icon: 'handyman' }]
      : [];
  const all = [...items, ...extra];
  return (
    <nav aria-label="Account sections" className="card p-2 lg:sticky lg:top-24 max-lg:overflow-x-auto">
      <ul className="flex lg:flex-col gap-1 max-lg:min-w-max">
        {all.map(l => {
          const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(l.href + '/');
          return (
            <li key={l.href} className="flex-1 lg:flex-none">
              <Link href={l.href} aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-bold transition-colors whitespace-nowrap ${
                  active ? 'bg-navy text-white' : 'text-ink dark:text-white hover:bg-mist dark:hover:bg-navy-700'}`}>
                <span aria-hidden="true"><Icon name={l.icon as IconName} size={18} /></span>{l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
