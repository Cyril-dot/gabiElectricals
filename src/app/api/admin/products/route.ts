import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { recordActivity } from '@/lib/notify';
import { rateLimit, ipOf } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const jsonArr = z.array(z.string()).default([]);
const specsArr = z.array(z.object({ label: z.string().min(1), value: z.string() })).default([]);

export const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().min(2).max(60),
  slug: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().min(1).max(8000),
  shortDesc: z.string().trim().max(300).optional(),
  categoryId: z.string().min(1),
  brandId: z.string().nullable().optional(),
  price: z.coerce.number().min(0.01),
  costPrice: z.coerce.number().min(0).default(0),
  compareAtPrice: z.coerce.number().min(0).nullable().optional(),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockAlert: z.coerce.number().int().min(0).default(5),
  warrantyMonths: z.coerce.number().int().min(0).max(120).default(0),
  weightKg: z.coerce.number().min(0).nullable().optional(),
  badges: jsonArr,
  images: jsonArr,
  tags: jsonArr,
  specs: specsArr,
  featured: z.coerce.boolean().default(false),
  bestSeller: z.coerce.boolean().default(false),
  isNew: z.coerce.boolean().default(false),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
  metaTitle: z.string().trim().max(180).optional(),
  metaDescription: z.string().trim().max(320).optional(),
});

async function uniqueSlug(base: string) {
  let slug = base || 'product';
  for (let i = 0; await prisma.product.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${Date.now().toString(36)}${i || ''}`;
  }
  return slug;
}

export async function POST(req: Request) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ip = ipOf(req);
  const rl = rateLimit(`admin:product:new:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const parsed = productSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid product', issues: parsed.error.issues.map(i => i.path.join('.')) }, { status: 400 });
  const d = parsed.data;

  const cat = await prisma.category.findUnique({ where: { id: d.categoryId } });
  if (!cat) return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
  if (d.sku && await prisma.product.findUnique({ where: { sku: d.sku } }))
    return NextResponse.json({ error: `SKU "${d.sku}" already exists` }, { status: 409 });

  const p = await prisma.product.create({
    data: {
      slug: await uniqueSlug(d.slug || d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')),
      name: d.name, sku: d.sku, description: d.description, shortDesc: d.shortDesc || null,
      categoryId: d.categoryId, brandId: d.brandId || null,
      price: d.price, costPrice: d.costPrice, compareAtPrice: d.compareAtPrice ?? null,
      stock: d.stock, lowStockAlert: d.lowStockAlert, warrantyMonths: d.warrantyMonths, weightKg: d.weightKg ?? null,
      badges: JSON.stringify(d.badges), images: JSON.stringify(d.images), tags: JSON.stringify(d.tags), specs: JSON.stringify(d.specs),
      featured: d.featured, bestSeller: d.bestSeller, isNew: d.isNew, status: d.status,
      metaTitle: d.metaTitle || null, metaDescription: d.metaDescription || null,
    },
  });
  await recordActivity(null, 'PRODUCT_CREATED', 'PRODUCT', p.id, ip, { name: p.name, sku: p.sku });
  return NextResponse.json({ ok: true, id: p.id, slug: p.slug }, { status: 201 });
}
