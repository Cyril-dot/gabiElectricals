import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { ProductEditor, type ProductInit } from '../../../_ProductEditor';

export const dynamic = 'force-dynamic';

const arr = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; } };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch { redirect('/'); }
  const { id } = await params;
  const [p, cats, brands] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.brand.findMany({ orderBy: { name: 'asc' } }),
  ]);
  if (!p) notFound();

  let specs: { label: string; value: string }[] = [];
  try {
    const raw = JSON.parse(p.specs);
    if (Array.isArray(raw)) specs = raw.map((x: Record<string, string>) => ({ label: String(x?.label ?? ''), value: String(x?.value ?? '') }));
  } catch { /* legacy free-text */ }

  const init: ProductInit = {
    id: p.id, name: p.name, sku: p.sku, slug: p.slug, description: p.description, shortDesc: p.shortDesc ?? '',
    categoryId: p.categoryId, brandId: p.brandId ?? '', price: String(p.price), costPrice: String(p.costPrice),
    compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : '',
    stock: String(p.stock), lowStockAlert: String(p.lowStockAlert), warrantyMonths: String(p.warrantyMonths),
    weightKg: p.weightKg != null ? String(p.weightKg) : '',
    badges: arr(p.badges), images: arr(p.images), tags: arr(p.tags),
    specs: specs.length ? specs : [{ label: '', value: '' }],
    featured: p.featured, bestSeller: p.bestSeller, isNew: p.isNew, status: p.status,
    metaTitle: p.metaTitle ?? '', metaDescription: p.metaDescription ?? '',
  };

  return <ProductEditor init={init} cats={cats.map(c => ({ id: c.id, name: c.name }))} brands={brands.map(b => ({ id: b.id, name: b.name }))} />;
}
