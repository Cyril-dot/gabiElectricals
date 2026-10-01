'use client';

/** Sort dropdown that applies immediately on change (no "Go" button needed). */
export function SortForm({ sp, sort, sorts, view }: {
  sp: Record<string, string | string[] | undefined>;
  sort: string;
  sorts: readonly { key: string; label: string }[];
  view: string;
}) {
  return (
    <form method="get" className="flex gap-1 items-center">
      {Object.entries(sp).filter(([k, v]) => typeof v === 'string' && v && !['sort', 'page'].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v as string} />)}
      <select id="sort" name="sort" defaultValue={sort} onChange={e => e.currentTarget.form?.requestSubmit()}
        className="border border-line rounded-xl px-3 py-2.5 text-sm font-semibold bg-white dark:bg-navy min-h-[44px]" aria-label="Sort products">
        {sorts.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
      <input type="hidden" name="view" value={view} />
    </form>
  );
}
