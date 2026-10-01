'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon, ICONS } from './_ui';

const TABS: { key: string; label: string }[] = [
  { key: '', label: 'All' }, { key: 'PENDING_PAYMENT', label: 'Pending' }, { key: 'PAID', label: 'Paid' },
  { key: 'PROCESSING', label: 'Processing' }, { key: 'OUT_FOR_DELIVERY', label: 'Out' }, { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' }, { key: 'REFUNDED', label: 'Refunded' },
];

export function OrdersToolbar({ query, status, page, pages }: { query: string; status: string; page: number; pages: number }) {
  const router = useRouter();
  const qRef = useRef<HTMLInputElement>(null);
  const build = (over: Record<string, string>) => {
    const p = new URLSearchParams({ q: query, status, page: String(page), ...over });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    if (!over.page) p.delete('page');
    return `/admin/orders?${p.toString()}`;
  };

  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <form className="relative min-w-[200px] flex-1" onSubmit={e => { e.preventDefault(); router.push(build({ q: qRef.current?.value?.trim() ?? '', page: '1' })); }}>
          <Icon d={ICONS.search} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
          <input ref={qRef} defaultValue={query} placeholder="Search order no, email or phone…" aria-label="Search orders"
            className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-blue dark:bg-navy" />
        </form>
        {pages > 1 && (
          <span className="flex items-center gap-1 text-xs font-bold text-soft">
            <Link href={build({ page: String(Math.max(1, page - 1)) })} className="btn-ghost px-2 py-1">‹</Link>
            {page}/{pages}
            <Link href={build({ page: String(Math.min(pages, page + 1)) })} className="btn-ghost px-2 py-1">›</Link>
          </span>
        )}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {TABS.map(t => (
          <Link key={t.key} href={build({ status: t.key, page: '1' })}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-extrabold transition-colors ${status === t.key ? 'bg-blue text-white' : 'border border-line bg-white text-soft hover:text-blue dark:bg-navy'}`}>
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
