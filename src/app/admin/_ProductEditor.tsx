'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Icon, ICONS } from './_ui';
import { ghs } from '@/lib/money';

export type SpecRow = { label: string; value: string };
export type ProductInit = {
  id?: string; name: string; sku: string; slug?: string; description: string; shortDesc: string;
  categoryId: string; brandId: string; price: string; costPrice: string; compareAtPrice: string;
  stock: string; lowStockAlert: string; warrantyMonths: string; weightKg: string;
  badges: string[]; images: string[]; tags: string[]; specs: SpecRow[];
  featured: boolean; bestSeller: boolean; isNew: boolean; status: string;
  metaTitle: string; metaDescription: string;
};
export const emptyProduct: ProductInit = {
  name: '', sku: '', description: '', shortDesc: '', categoryId: '', brandId: '', price: '', costPrice: '',
  compareAtPrice: '', stock: '0', lowStockAlert: '5', warrantyMonths: '12', weightKg: '',
  badges: ['100% Genuine'], images: [], tags: [], specs: [{ label: '', value: '' }],
  featured: false, bestSeller: false, isNew: true, status: 'DRAFT', metaTitle: '', metaDescription: '',
};

const field = 'w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue dark:bg-navy';
const label = 'mb-1 block text-[11px] font-extrabold uppercase tracking-wide text-soft';

export function ProductEditor({ init, cats, brands }: { init: ProductInit; cats: { id: string; name: string }[]; brands: { id: string; name: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState(init);
  const [badgeDraft, setBadgeDraft] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductInit>(k: K) => (v: ProductInit[K]) => setF(p => ({ ...p, [k]: v }));
  const num = (s: string) => (s === '' ? null : parseFloat(s));

  const live = useMemo(() => {
    const price = num(f.price) ?? 0, cost = num(f.costPrice) ?? 0, cmp = num(f.compareAtPrice);
    const gross = price - cost;
    const pct = price > 0 ? Math.round((gross / price) * 100) : 0;
    return { gross, pct, cmpPct: cmp && cmp > price ? Math.round(((cmp - price) / cmp) * 100) : 0 };
  }, [f.price, f.costPrice, f.compareAtPrice]);

  const upload = async (files: FileList) => {
    setUploading(true);
    const paths: string[] = [];
    for (const file of Array.from(files).slice(0, 8)) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.path) paths.push(j.path as string);
      else toast(`${file.name}: ${j.error ?? 'upload failed'}`, 'err');
    }
    if (paths.length) setF(p => ({ ...p, images: [...p.images, ...paths] }));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async (action?: string) => {
    if (!f.name || !f.price || !f.categoryId) { toast('Name, price and category are required', 'err'); return; }
    setBusy(true);
    const body: Record<string, unknown> = {
      name: f.name, sku: f.sku || `GE-${Date.now().toString(36).toUpperCase()}`, slug: f.slug || undefined,
      description: f.description || f.name, shortDesc: f.shortDesc || undefined,
      categoryId: f.categoryId, brandId: f.brandId || null,
      price: num(f.price), costPrice: num(f.costPrice) ?? 0, compareAtPrice: num(f.compareAtPrice),
      stock: parseInt(f.stock) || 0, lowStockAlert: parseInt(f.lowStockAlert) || 5,
      warrantyMonths: parseInt(f.warrantyMonths) || 0, weightKg: num(f.weightKg),
      badges: f.badges, images: f.images, tags: f.tags,
      specs: f.specs.filter(s => s.label.trim()),
      featured: f.featured, bestSeller: f.bestSeller, isNew: f.isNew, status: f.status,
      metaTitle: f.metaTitle || undefined, metaDescription: f.metaDescription || undefined,
    };
    try {
      const res = await fetch(f.id ? `/api/admin/products/${f.id}` : '/api/admin/products', {
        method: f.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action ? { action } : body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast(j.error ?? 'Save failed', 'err'); return; }
      if (action === 'duplicate') { toast('Duplicated — opening draft copy', 'ok'); router.push(`/admin/products/${j.id}/edit`); return; }
      toast(f.id ? 'Product saved' : 'Product created', 'ok');
      router.push('/admin/products');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!f.id || !confirm(`Delete ${f.sku}? Products with order history must be archived instead.`)) return;
    const res = await fetch(`/api/admin/products/${f.id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (res.ok) { toast('Product deleted', 'ok'); router.push('/admin/products'); }
    else toast(j.error ?? 'Delete failed', 'err');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white md:text-3xl">{f.id ? 'Edit product' : 'New product'}</h1>
          <p className="text-sm font-semibold text-soft">{f.id ? `${f.sku} · ${f.status}` : 'Add a genuine product to the catalog'}</p>
        </div>
        <div className="flex gap-2">
          {f.id && <button onClick={() => void save('duplicate')} disabled={busy} className="btn-ghost px-4 py-2 text-sm"><Icon d={ICONS.copy} className="h-4 w-4" /> Duplicate</button>}
          {f.id && <button onClick={() => void remove()} disabled={busy} className="btn-ghost px-4 py-2 text-sm text-danger">Delete</button>}
          <button onClick={() => void save()} disabled={busy} className="btn-primary px-5 py-2 text-sm">{busy ? 'Saving…' : f.id ? 'Save changes' : 'Create product'}</button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="card space-y-4 p-4 md:p-5">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Basics</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={label}>Product name *</label>
                <input className={field} value={f.name} onChange={e => set('name')(e.target.value)} placeholder="e.g. Folded Cable 2.5mm² — 100m Roll" />
              </div>
              <div>
                <label className={label}>SKU *</label>
                <input className={`${field} font-mono`} value={f.sku} onChange={e => set('sku')(e.target.value.toUpperCase())} placeholder="GE-CAB-1002" />
              </div>
              <div>
                <label className={label}>Slug (auto if blank)</label>
                <input className={field} value={f.slug ?? ''} onChange={e => set('slug')(e.target.value.toLowerCase())} placeholder="folded-cable-2-5mm" />
              </div>
              <div>
                <label className={label}>Category *</label>
                <select className={field} value={f.categoryId} onChange={e => set('categoryId')(e.target.value)}>
                  <option value="">Select category…</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Brand</label>
                <select className={field} value={f.brandId} onChange={e => set('brandId')(e.target.value)}>
                  <option value="">No brand</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={label}>Short description</label>
                <input className={field} value={f.shortDesc} onChange={e => set('shortDesc')(e.target.value)} maxLength={300} placeholder="One punchy line shown on cards" />
              </div>
              <div className="md:col-span-2">
                <label className={label}>Full description</label>
                <textarea className={`${field} min-h-28`} value={f.description} onChange={e => set('description')(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="card space-y-4 p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Pricing &amp; margin</h2>
              <div className={`rounded-full px-3 py-1 text-xs font-extrabold ${live.pct < 15 ? 'bg-danger/15 text-danger' : live.pct < 30 ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>
                Margin {live.pct}% · {ghs(live.gross)}{live.cmpPct > 0 && ` · save ${live.cmpPct}%`}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <label className={label}>Selling price (₵) *</label>
                <input className={field} inputMode="decimal" value={f.price} onChange={e => set('price')(e.target.value)} />
              </div>
              <div>
                <label className={label}>Cost price (₵)</label>
                <input className={field} inputMode="decimal" value={f.costPrice} onChange={e => set('costPrice')(e.target.value)} />
              </div>
              <div>
                <label className={label}>Compare-at (₵)</label>
                <input className={field} inputMode="decimal" value={f.compareAtPrice} onChange={e => set('compareAtPrice')(e.target.value)} />
              </div>
              <div>
                <label className={label}>Stock qty</label>
                <input className={field} inputMode="numeric" value={f.stock} onChange={e => set('stock')(e.target.value)} />
              </div>
              <div>
                <label className={label}>Low-stock alert at</label>
                <input className={field} inputMode="numeric" value={f.lowStockAlert} onChange={e => set('lowStockAlert')(e.target.value)} />
              </div>
              <div>
                <label className={label}>Warranty (months)</label>
                <input className={field} inputMode="numeric" value={f.warrantyMonths} onChange={e => set('warrantyMonths')(e.target.value)} />
              </div>
              <div>
                <label className={label}>Weight (kg)</label>
                <input className={field} inputMode="decimal" value={f.weightKg} onChange={e => set('weightKg')(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="card space-y-4 p-4 md:p-5">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Specifications</h2>
            <div className="space-y-2">
              {f.specs.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input className={field} placeholder="Label (e.g. Conductor)" value={s.label}
                    onChange={e => set('specs')(f.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className={field} placeholder="Value (e.g. 99.9% copper)" value={s.value}
                    onChange={e => set('specs')(f.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <button aria-label="Remove spec row" onClick={() => set('specs')(f.specs.filter((_, j) => j !== i))} className="btn-ghost !p-2 text-danger"><Icon d={ICONS.x} className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={() => set('specs')([...f.specs, { label: '', value: '' }])} className="btn-ghost px-3 py-1.5 text-xs"><Icon d={ICONS.plus} className="h-4 w-4" /> Add spec row</button>
          </section>

          <section className="card space-y-4 p-4 md:p-5">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">SEO</h2>
            <div>
              <label className={label}>Meta title</label>
              <input className={field} value={f.metaTitle} maxLength={180} onChange={e => set('metaTitle')(e.target.value)} placeholder={f.name ? `${f.name} Ghana | GabiElectricals` : undefined} />
            </div>
            <div>
              <label className={label}>Meta description</label>
              <textarea className={`${field} min-h-20`} value={f.metaDescription} maxLength={320} onChange={e => set('metaDescription')(e.target.value)} />
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="card space-y-3 p-4">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Status</h2>
            <select className={field} value={f.status} onChange={e => set('status')(e.target.value)}>
              <option value="DRAFT">Draft — hidden</option>
              <option value="PUBLISHED">Published — live</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            {([['featured', 'Featured'], ['bestSeller', 'Best seller'], ['isNew', 'New badge']] as const).map(([k, l]) => (
              <label key={k} className="flex cursor-pointer items-center justify-between rounded-xl border border-line px-3 py-2 text-sm font-bold">
                {l}
                <input type="checkbox" checked={f[k]} onChange={e => set(k)(e.target.checked)} className="h-4 w-4 accent-[#0C4A55]" />
              </label>
            ))}
          </section>

          <section className="card space-y-3 p-4">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Images</h2>
            <div className="grid grid-cols-3 gap-2">
              {f.images.map((src, i) => (
                <div key={src} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Image ${i + 1}`} className="h-20 w-full rounded-lg border border-line object-cover" />
                  <button aria-label="Remove image" onClick={() => set('images')(f.images.filter((_, j) => j !== i))}
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-danger text-[10px] font-black text-white"><Icon d={ICONS.x} className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-ghost w-full py-2.5 text-sm">
              <Icon d={ICONS.upload} className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload images (JPG/PNG/WebP)'}
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.length) void upload(e.target.files); }} />
            <p className="text-[11px] font-semibold text-soft">First image is the cover. Files go through the existing /api/upload store.</p>
          </section>

          <section className="card space-y-3 p-4">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Badges</h2>
            <div className="flex flex-wrap gap-1.5">
              {f.badges.map(b => (
                <span key={b} className="flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-1 text-xs font-extrabold text-gold-dark">
                  {b}
                  <button aria-label={`Remove ${b}`} onClick={() => set('badges')(f.badges.filter(x => x !== b))} className="text-[10px]"><Icon d={ICONS.x} className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={field} value={badgeDraft} onChange={e => setBadgeDraft(e.target.value)} placeholder="Warranty Included"
                onKeyDown={e => { if (e.key === 'Enter' && badgeDraft.trim()) { e.preventDefault(); set('badges')([...new Set([...f.badges, badgeDraft.trim()])]); setBadgeDraft(''); } }} />
              <button onClick={() => { if (badgeDraft.trim()) { set('badges')([...new Set([...f.badges, badgeDraft.trim()])]); setBadgeDraft(''); } }} className="btn-ghost !px-3 text-sm">Add</button>
            </div>
          </section>

          <section className="card space-y-3 p-4">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Tags (multi-category search)</h2>
            <div className="flex flex-wrap gap-1.5">
              {f.tags.map(t => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-blue/10 px-2.5 py-1 text-xs font-extrabold text-blue">
                  #{t}
                  <button aria-label={`Remove tag ${t}`} onClick={() => set('tags')(f.tags.filter(x => x !== t))} className="text-[10px]"><Icon d={ICONS.x} className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={field} value={tagDraft} onChange={e => setTagDraft(e.target.value)} placeholder="solar, backup…"
                onKeyDown={e => { if (e.key === 'Enter' && tagDraft.trim()) { e.preventDefault(); setF(p => ({ ...p, tags: [...new Set([...p.tags, ...tagDraft.split(',').map(x => x.trim().toLowerCase()).filter(Boolean)])] })); setTagDraft(''); } }} />
              <button onClick={() => { setF(p => ({ ...p, tags: [...new Set([...p.tags, ...tagDraft.split(',').map(x => x.trim().toLowerCase()).filter(Boolean)])] })); setTagDraft(''); }} className="btn-ghost !px-3 text-sm">Add</button>
            </div>
          </section>
        </div>
      </div>

      <div className="flex justify-between">
        <Link href="/admin/products" className="btn-ghost px-4 py-2 text-sm">← Back to products</Link>
        <button onClick={() => void save()} disabled={busy} className="btn-primary px-6 py-2.5 text-sm">{busy ? 'Saving…' : f.id ? 'Save changes' : 'Create product'}</button>
      </div>
    </div>
  );
}
