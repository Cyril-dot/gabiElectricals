import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { ghs } from '@/lib/money';
import { StatusBadge, Icon, ICONS, fmtDate, fmtDateTime } from '../../_ui';

export const dynamic = 'force-dynamic';

const arr = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; } };

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-soft">{label}</p>
      <div className="mt-0.5 font-semibold text-navy dark:text-white">{children}</div>
    </div>
  );
}

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch { redirect('/'); }
  const { id } = await params;
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true } } },
      },
    },
  });
  if (!p) notFound();

  const images = arr(p.images);
  const tags = arr(p.tags);
  const badges = arr(p.badges);
  let specs: { label: string; value: string }[] = [];
  try {
    const raw = JSON.parse(p.specs);
    if (Array.isArray(raw)) specs = raw.map((x: Record<string, string>) => ({ label: String(x?.label ?? ''), value: String(x?.value ?? '') })).filter(s => s.label || s.value);
  } catch { /* legacy free-text specs are not shown as a table */ }
  const marginPct = p.price > 0 ? Math.round(((p.price - p.costPrice) / p.price) * 100) : 0;
  const flags = [p.featured && 'Featured', p.bestSeller && 'Best seller', p.isNew && 'New'].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/products" className="text-sm font-bold text-soft hover:text-blue">← Products</Link>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-navy dark:text-white md:text-3xl">{p.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={p.status} />
            <span className="font-mono text-xs text-soft">{p.sku}</span>
            {flags.map(f => <span key={f} className="rounded-full bg-blue/10 px-2.5 py-0.5 text-[11px] font-bold text-blue">{f}</span>)}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href={`/product/${p.slug}`} target="_blank" className="btn-ghost px-4 py-2 text-sm"><Icon d={ICONS.eye} /> View in store</Link>
          <Link href={`/admin/products/${p.id}/edit`} className="btn-primary px-4 py-2 text-sm"><Icon d={ICONS.edit} /> Edit product</Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="card overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0] ?? '/icon.svg'} alt={p.name} className="aspect-square w-full object-cover" />
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 p-3">
              {images.slice(1).map(src => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="aspect-square w-full rounded-lg border border-line object-cover" loading="lazy" />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-4 font-display text-sm font-extrabold uppercase tracking-wide text-soft">Pricing &amp; stock</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Fact label="Price">{ghs(p.price)}</Fact>
              <Fact label="Was price">{p.compareAtPrice != null ? ghs(p.compareAtPrice) : '—'}</Fact>
              <Fact label="Cost">{ghs(p.costPrice)}</Fact>
              <Fact label="Margin"><span className={marginPct < 15 ? 'text-danger' : marginPct < 30 ? 'text-warning' : 'text-success'}>{marginPct}%</span></Fact>
              <Fact label="Stock"><span className={p.stock === 0 ? 'text-danger' : p.stock <= p.lowStockAlert ? 'text-warning' : ''}>{p.stock} units</span></Fact>
              <Fact label="Low stock alert">at {p.lowStockAlert}</Fact>
              <Fact label="Sold">{p.soldCount}</Fact>
              <Fact label="Warranty">{p.warrantyMonths > 0 ? `${p.warrantyMonths} months` : '—'}</Fact>
              <Fact label="Weight">{p.weightKg != null ? `${p.weightKg} kg` : '—'}</Fact>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-4 font-display text-sm font-extrabold uppercase tracking-wide text-soft">Catalogue</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Fact label="Category">{p.category.name}</Fact>
              <Fact label="Brand">{p.brand?.name ?? '—'}</Fact>
              <Fact label="Store URL"><span className="break-all font-mono text-xs">/product/{p.slug}</span></Fact>
              <Fact label="Rating">{p.reviewCount > 0 ? `${p.rating.toFixed(1)} ★ (${p.reviewCount})` : 'No reviews yet'}</Fact>
              <Fact label="Created">{fmtDate(p.createdAt)}</Fact>
              <Fact label="Last updated">{fmtDateTime(p.updatedAt)}</Fact>
            </div>
            {tags.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-soft">Tags</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{tags.map(t => <span key={t} className="rounded-full bg-mist px-2.5 py-0.5 text-[11px] font-bold text-soft">{t}</span>)}</div>
              </div>
            )}
            {badges.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-soft">Badges</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{badges.map(b => <span key={b} className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-gold-dark">{b}</span>)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {(p.shortDesc || p.description) && (
        <div className="card p-5">
          <h2 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wide text-soft">Description</h2>
          {p.shortDesc && <p className="font-semibold text-navy dark:text-white">{p.shortDesc}</p>}
          {p.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-soft">{p.description}</p>}
        </div>
      )}

      {specs.length > 0 && (
        <div className="card overflow-hidden">
          <h2 className="border-b border-line bg-mist px-5 py-3 font-display text-sm font-extrabold uppercase tracking-wide text-soft">Specifications</h2>
          <table className="w-full text-sm">
            <tbody>
              {specs.map((s, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="w-1/3 px-5 py-2.5 font-bold text-navy dark:text-white">{s.label}</td>
                  <td className="px-5 py-2.5 text-soft">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-soft">Latest reviews</h2>
          <Link href="/admin/reviews" className="text-xs font-bold text-blue hover:underline">All reviews</Link>
        </div>
        {p.reviews.length === 0 && <p className="text-sm text-soft">No reviews for this product yet.</p>}
        <ul className="divide-y divide-line">
          {p.reviews.map(r => (
            <li key={r.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gold">{'★'.repeat(r.rating)}<span className="text-line">{'★'.repeat(5 - r.rating)}</span></span>
                <span className="font-bold text-navy dark:text-white">{r.title}</span>
                <StatusBadge status={r.status} />
                <span className="text-xs text-soft">{r.user.name} · {fmtDate(r.createdAt)}{r.verified ? ' · verified purchase' : ''}</span>
              </div>
              <p className="mt-1 text-sm text-soft">{r.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
