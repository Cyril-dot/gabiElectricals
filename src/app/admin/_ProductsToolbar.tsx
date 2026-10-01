'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon, ICONS } from './_ui';

export function ProductsToolbar({ query, status, low, page, pages, cats, activeCat }: {
  query: string; status: string; low: boolean; page: number; pages: number;
  cats: { id: string; name: string }[]; activeCat: string;
}) {
  const router = useRouter();
  const qRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const build = (over: Record<string, string>) => {
    const p = new URLSearchParams({ q: query, status, ...(low ? { low: '1' } : {}), ...(activeCat ? { cat: activeCat } : {}), page: String(page), ...over });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    if (!over.page) p.delete('page');
    return `/admin/products?${p.toString()}`;
  };

  const onImport = async (f: File) => {
    setBusy(true);
    setImportMsg(null);
    try {
      const res = await fetch('/api/admin/products/import', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: await f.text() });
      const j = await res.json();
      setImportMsg(res.ok ? `Imported ${j.created} product(s)${j.skipped ? `, skipped ${j.skipped}` : ''}.` : j.error ?? 'Import failed');
      if (res.ok) router.refresh();
    } catch {
      setImportMsg('Import failed — network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card flex flex-wrap items-center gap-2 p-3">
      <form className="relative min-w-[180px] flex-1" onSubmit={e => { e.preventDefault(); router.push(build({ q: qRef.current?.value?.trim() ?? '', page: '1' })); }}>
        <Icon d={ICONS.search} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
        <input ref={qRef} defaultValue={query} placeholder="Search name, SKU, tag…" aria-label="Search products"
          className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-blue dark:bg-navy" />
      </form>
      <select aria-label="Filter by category" value={activeCat} onChange={e => router.push(build({ cat: e.target.value, page: '1' }))}
        className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold dark:bg-navy">
        <option value="">All categories</option>
        {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="flex overflow-hidden rounded-xl border border-line">
        {['', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map(s => (
          <Link key={s || 'all'} href={build({ status: s, page: '1' })}
            className={`px-3 py-2 text-xs font-extrabold ${status === s ? 'bg-navy text-white dark:bg-blue' : 'bg-white text-soft hover:text-blue dark:bg-navy'}`}>
            {s ? s.replace('_', ' ') : 'All'}
          </Link>
        ))}
      </div>
      <Link href={build({ low: low ? '' : '1' })} className={`rounded-xl border px-3 py-2 text-xs font-extrabold ${low ? 'border-warning bg-warning/15 text-warning' : 'border-line bg-white text-soft hover:text-warning dark:bg-navy'}`}>
        Low stock ≤ 5
      </Link>
      <a href="/api/admin/products/csv" className="btn-ghost px-3 py-2 text-xs"><Icon d={ICONS.download} className="h-4 w-4" /> Export CSV</a>
      <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost px-3 py-2 text-xs">
        <Icon d={ICONS.upload} className="h-4 w-4" /> {busy ? 'Importing…' : 'Import CSV'}
      </button>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ''; }} />
      {importMsg && <span className="text-xs font-bold text-success">{importMsg}</span>}
      {pages > 1 && (
        <span className="ml-auto flex items-center gap-1 text-xs font-bold text-soft">
          <Link href={build({ page: String(Math.max(1, page - 1)) })} className="btn-ghost px-2 py-1">‹</Link>
          {page}/{pages}
          <Link href={build({ page: String(Math.min(pages, page + 1)) })} className="btn-ghost px-2 py-1">›</Link>
        </span>
      )}
    </div>
  );
}
