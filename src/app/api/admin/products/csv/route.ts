import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export async function GET() {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch {
    return new Response('Unauthorized', { status: 401 });
  }
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { name: true } }, brand: { select: { name: true } } },
  });
  const head = ['sku', 'name', 'category', 'brand', 'price', 'costPrice', 'compareAtPrice', 'stock', 'warrantyMonths', 'status', 'featured', 'soldCount', 'description'];
  const lines = [head.join(',')];
  for (const p of products) {
    lines.push([
      p.sku, p.name, p.category.name, p.brand?.name ?? '', p.price, p.costPrice, p.compareAtPrice ?? '',
      p.stock, p.warrantyMonths, p.status, p.featured, p.soldCount, p.description,
    ].map(esc).join(','));
  }
  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gabi-products-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
