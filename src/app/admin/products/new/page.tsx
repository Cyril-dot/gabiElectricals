import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProductEditor, emptyProduct } from '../../_ProductEditor';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch { redirect('/'); }
  const [cats, brands] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.brand.findMany({ orderBy: { name: 'asc' } }),
  ]);
  return <ProductEditor init={emptyProduct} cats={cats.map(c => ({ id: c.id, name: c.name }))} brands={brands.map(b => ({ id: b.id, name: b.name }))} />;
}
