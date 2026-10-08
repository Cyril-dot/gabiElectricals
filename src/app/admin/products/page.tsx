import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { ghs } from '@/lib/money';
import { StatusBadge, Icon, ICONS, fmtDate } from '../_ui';
import { ProductsToolbar } from '../_ProductsToolbar';
import { RowActions } from '../_RowActions';

export const dynamic = 'force-dynamic';

const PAGE = 20;

export default async function AdminProducts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined = ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(sp.status ?? '') ? (sp.status! as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') : undefined;
  const low = sp.low === '1';
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1);

  const where: Prisma.ProductWhereInput = {
    ...(q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }, { tags: { contains: q } }] } : {}),
    ...(status ? { status } : {}),
    ...(low ? { stock: { lte: 5 } } : {}),
    ...(sp.cat ? { categoryId: sp.cat } : {}),
  };
  const [products, total, cats, lowStock] = await Promise.all([
    prisma.product.findMany({ where, include: { category: { select: { name: true } }, brand: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    low ? Promise.resolve([]) : prisma.product.findMany({ where: { stock: { lte: 5 }, status: 'PUBLISHED' }, orderBy: { stock: 'asc' }, take: 8, select: { id: true, name: true, sku: true, stock: true, lowStockAlert: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white md:text-3xl">Products</h1>
          <p className="text-sm font-semibold text-soft">{total} match{total === 1 ? '' : 'es'} · page {page}/{pages}</p>
        </div>
        <Link href="/admin/products/new" className="btn-primary px-4 py-2 text-sm"><Icon d={ICONS.plus} /> New product</Link>
      </div>

      <ProductsToolbar query={q} status={status ?? ''} low={low} page={page} pages={pages} cats={cats.map(c => ({ id: c.id, name: c.name }))} activeCat={sp.cat ?? ''} />

      {!low && lowStock.length > 0 && (
        <div className="card border-warning/50 p-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-extrabold text-warning"><Icon d={ICONS.alert} /> Low stock alerts (≤ 5)</h2>
          <ul className="flex flex-wrap gap-2">
            {lowStock.map(p => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-bold hover:border-warning hover:text-warning">
                  {p.name.slice(0, 34)} <span className={p.stock === 0 ? 'text-danger' : 'text-warning'}>{p.stock === 0 ? 'OUT' : `${p.stock} left`}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line bg-mist text-left text-[11px] font-bold uppercase tracking-wide text-soft">
                <th className="px-4 py-2.5">Product</th><th className="px-4 py-2.5">SKU</th><th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Brand</th><th className="px-4 py-2.5 text-right">Price</th><th className="px-4 py-2.5 text-right">Cost</th>
                <th className="px-4 py-2.5 text-right">Stock</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Updated</th><th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const marginPct = p.price > 0 ? Math.round(((p.price - p.costPrice) / p.price) * 100) : 0;
                return (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-mist">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={(JSON.parse(p.images)[0] as string) ?? '/icon.svg'} alt="" className="h-10 w-10 rounded-lg border border-line object-cover" loading="lazy" />
                        <span className="max-w-[220px] truncate font-bold text-navy group-hover:text-blue dark:text-white">{p.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-2.5">{p.category.name}</td>
                    <td className="px-4 py-2.5">{p.brand?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <p className="font-bold">{ghs(p.price)}</p>
                      <p className={`text-[11px] font-bold ${marginPct < 15 ? 'text-danger' : marginPct < 30 ? 'text-warning' : 'text-success'}`}>{marginPct}% margin</p>
                    </td>
                    <td className="px-4 py-2.5 text-right text-soft">{ghs(p.costPrice)}</td>
                    <td className={`px-4 py-2.5 text-right font-bold ${p.stock === 0 ? 'text-danger' : p.stock <= p.lowStockAlert ? 'text-warning' : ''}`}>{p.stock}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-soft">{fmtDate(p.updatedAt)}</td>
                    <td className="px-4 py-2.5"><RowActions id={p.id} sku={p.sku} status={p.status} /></td>
                  </tr>
                );
              })}
              {products.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-soft">No products match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: Math.min(pages, 8) }, (_, i) => i + 1).map(n => (
            <Link key={n} href={`/admin/products?${new URLSearchParams({ ...sp, page: String(n) })}`}
              className={`h-9 w-9 place-items-center rounded-xl text-sm font-bold ${n === page ? 'bg-blue text-white' : 'btn-ghost'}`}>{n}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
