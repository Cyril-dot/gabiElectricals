import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ghs } from '@/lib/money';
import CompareRemove from './CompareRemove';

export const dynamic = 'force-dynamic';

export default async function AccountCompare() {
  const s = await getSession();
  if (!s) redirect('/login?next=/account/compare');
  const items = await prisma.compareItem.findMany({
    where: { userId: s.userId }, orderBy: { id: 'desc' }, take: 3,
    include: { product: { include: { brand: { select: { name: true } }, category: { select: { name: true } } } } },
  });

  const prods = items.map(w => ({
    ...w.product,
    image: (JSON.parse(w.product.images || '[]') as string[])[0] ?? '/icon.svg',
    badges: JSON.parse(w.product.badges || '[]') as string[],
    specList: JSON.parse(w.product.specs || '[]') as { label: string; value: string }[],
  }));

  if (prods.length === 0) {
    return (
      <section aria-label="Compare" className="space-y-4">
        <h2 className="font-display font-extrabold text-xl">Compare</h2>
        <div className="card p-10 text-center">
          <p className="text-4xl" aria-hidden="true">⇄</p>
          <p className="font-bold mt-2">Nothing to compare</p>
          <p className="text-[13px] text-soft mt-1">Add up to 3 products from the shop and we put them side by side — specs, warranty, price.</p>
          <Link href="/shop" className="btn-primary mt-4 px-5 py-2.5 text-[13.5px] inline-flex">Find products</Link>
        </div>
      </section>
    );
  }

  // union of spec labels across picked products
  const specLabels = Array.from(new Set(prods.flatMap(p => p.specList.map(x => x.label))));

  return (
    <section aria-label="Compare products" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display font-extrabold text-xl">Compare <span className="text-soft font-semibold text-[14px]">({prods.length}/3)</span></h2>
        <Link href="/shop" className="text-[12.5px] font-bold text-blue hover:underline">+ Add another</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-[13px] min-w-[520px]">
          <caption className="sr-only">Side-by-side product comparison</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left p-3 w-32 text-[11px] uppercase tracking-wide text-soft">Product</th>
              {prods.map(pr => (
                <th scope="col" key={pr.id} className="p-3 text-center align-top">
                  <div className="flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pr.image} alt={pr.name} className="h-20 w-full max-w-[130px] object-contain bg-mist rounded-lg p-2" />
                    <Link href={`/product/${pr.slug}`} className="font-bold text-[12.5px] leading-snug hover:text-blue line-clamp-2">{pr.name}</Link>
                    <CompareRemove slug={pr.slug} name={pr.name} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Price', render: (pr: typeof prods[number]) => <b className="text-gold-dark">{ghs(pr.price)}</b> },
              { label: 'Was', render: (pr: typeof prods[number]) => (pr.compareAtPrice ? <s className="text-soft">{ghs(pr.compareAtPrice)}</s> : <span className="text-soft">—</span>) },
              { label: 'Rating', render: (pr: typeof prods[number]) => <span>{'★'.repeat(Math.round(pr.rating))} {pr.rating.toFixed(1)} ({pr.reviewCount})</span> },
              { label: 'In stock', render: (pr: typeof prods[number]) => (pr.stock > 0 ? <span className="text-success font-bold">{pr.stock} units</span> : <span className="text-danger font-bold">Out</span>) },
              { label: 'Brand', render: (pr: typeof prods[number]) => <span>{pr.brand?.name ?? '—'}</span> },
              { label: 'Category', render: (pr: typeof prods[number]) => <span>{pr.category.name}</span> },
              { label: 'Warranty', render: (pr: typeof prods[number]) => <span>{pr.warrantyMonths > 0 ? `${pr.warrantyMonths} months` : '—'}</span> },
              { label: 'Badges', render: (pr: typeof prods[number]) => <span className="flex flex-wrap gap-1 justify-center">{pr.badges.slice(0, 2).map(b => <span key={b} className="text-[10px] font-bold bg-success/10 text-success rounded px-1.5 py-0.5">{b}</span>)}</span> },
              ...specLabels.map(lb => ({ label: lb, render: (pr: typeof prods[number]) => <span>{pr.specList.find(x => x.label === lb)?.value ?? '—'}</span> })),
            ].map(row => (
              <tr key={row.label} className="border-t border-line/60">
                <th scope="row" className="text-left p-3 text-[11.5px] font-bold text-soft">{row.label}</th>
                {prods.map(pr => <td key={pr.id} className="p-3 text-center">{row.render(pr)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/shop" className="btn-ghost px-4 py-2 text-[13px] inline-flex">Continue shopping</Link>
    </section>
  );
}
