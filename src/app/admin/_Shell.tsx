'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon, ICONS } from './_ui';

const NAV = [
  { href: '/admin', label: 'Overview', icon: ICONS.overview, exact: true },
  { href: '/admin/products', label: 'Products', icon: ICONS.products },
  { href: '/admin/orders', label: 'Orders', icon: ICONS.orders },
  { href: '/admin/bookings', label: 'Bookings', icon: ICONS.bookings },
  { href: '/admin/customers', label: 'Customers', icon: ICONS.customers },
  { href: '/admin/technicians', label: 'Technicians', icon: ICONS.technicians },
  { href: '/admin/services', label: 'Services', icon: ICONS.services },
  { href: '/admin/payments', label: 'Payments', icon: ICONS.payments },
  { href: '/admin/promotions', label: 'Promotions', icon: ICONS.promotions },
  { href: '/admin/referrals', label: 'Referrals', icon: ICONS.referrals },
  { href: '/admin/reviews', label: 'Reviews', icon: ICONS.reviews },
  { href: '/admin/content', label: 'Content', icon: ICONS.content },
  { href: '/admin/marketing', label: 'Marketing', icon: ICONS.marketing },
  { href: '/admin/settings', label: 'Settings', icon: ICONS.settings },
  { href: '/admin/reports', label: 'Reports', icon: ICONS.reports },
  { href: '/admin/notifications', label: 'Notification Log', icon: ICONS.notifications },
] as const;

export function AdminShell({ user, demoMode, children }: {
  user: { name: string; role: string };
  demoMode: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (n: { href: string; exact?: boolean }) =>
    n.exact ? pathname === n.href : pathname.startsWith(n.href);

  const NavList = ({ shrink }: { shrink?: boolean }) => (
    <nav className="flex flex-col gap-0.5 px-2">
      {NAV.map(n => (
        <Link key={n.href} href={n.href} aria-current={isActive(n) ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive(n) ? 'bg-blue text-white shadow-pop' : 'text-soft hover:bg-navy-700 hover:text-white'} ${shrink ? 'max-md:sr-only' : ''}`}>
          <Icon d={n.icon} className="h-5 w-5 shrink-0" />
          <span>{n.label}</span>
        </Link>
      ))}
    </nav>
  );

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-dvh bg-mist text-ink" style={{ '--admin-nav': collapsed ? '76px' : '16rem' } as React.CSSProperties}>
      <aside className="no-print fixed inset-y-0 left-0 z-40 flex w-[var(--admin-nav,16rem)] flex-col gap-2 bg-navy py-4 transition-all duration-200 max-md:w-64 max-md:-translate-x-full max-md:data-[open]:translate-x-0" data-open={open || undefined}>
        <div className={`px-4 ${collapsed ? 'md:hidden' : ''}`}>
          <Link href="/admin" className="font-display text-lg font-extrabold text-white">
            Gabi<span className="text-gold">Admin</span>
          </Link>
          <p className="text-[11px] font-semibold text-soft">Store control · {user.role.replace('_', ' ')}</p>
        </div>
        <div className="mt-2 flex-1 overflow-y-auto">
          <NavList shrink={collapsed} />
        </div>
        <div className="mx-2 rounded-xl bg-navy-700 p-3">
          <p className="truncate text-xs font-bold text-white">{user.name}</p>
          <button onClick={logout} className="mt-2 flex items-center gap-2 text-xs font-bold text-gold hover:underline">
            <Icon d={ICONS.logout} className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      {open && <button aria-label="Close menu" onClick={() => setOpen(false)} className="no-print fixed inset-0 z-30 bg-navy/60 md:hidden" />}

      <div className="flex min-h-dvh flex-col md:pl-[var(--admin-nav,16rem)] transition-all duration-200">
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white px-4 py-3 dark:bg-navy md:hidden">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="btn-ghost !p-2"><Icon d={ICONS.menu} className="h-5 w-5" /></button>
          <span className="font-display font-extrabold">Gabi<span className="text-gold">Admin</span></span>
        </header>
        <button onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar"
          className="no-print fixed bottom-4 z-40 hidden h-8 w-8 place-items-center rounded-full border border-line bg-white text-soft shadow-pop transition-all hover:text-blue md:grid"
          style={{ left: 'calc(var(--admin-nav, 16rem) + 10px)' }}>
          <Icon d={ICONS.chevron} className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>

        <main id="main" className="flex-1 px-4 py-5 md:px-8">
          {demoMode && (
            <div className="no-print mb-4 flex items-center justify-center gap-2 rounded-xl bg-gold/20 border border-gold px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-gold-dark">
              <Icon d={ICONS.alert} className="h-4 w-4" /> Demo mode — sandbox payments &amp; logged notifications only
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
