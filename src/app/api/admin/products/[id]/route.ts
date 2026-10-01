import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { recordActivity } from '@/lib/notify';
import { rateLimit, ipOf } from '@/lib/rate-limit';
import { productSchema } from '../route';

export const dynamic = 'force-dynamic';

async function guard(req: Request, bucket: string) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch {
    return { res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }
  const ip = ipOf(req);
  const rl = rateLimit(`admin:product:${bucket}:${ip}`, 60, 60_000);
  if (!rl.ok) return { res: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) } as const;
  return { ip } as const;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await guard(req, 'patch');
  if (g.res) return g.res;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = (body as { action?: string }).action;

  if (action === 'duplicate') {
    const base = `${existing.sku}-COPY`;
    let sku = base;
    for (let i = 2; await prisma.product.findUnique({ where: { sku } }); i++) sku = `${base}-${i}`;
    let slug = `${existing.slug}-copy`;
    for (let i = 2; await prisma.product.findUnique({ where: { slug } }); i++) slug = `${existing.slug}-copy-${i}`;
    const copy = await prisma.product.create({
      data: { ...existing, id: undefined, createdAt: undefined, updatedAt: undefined, sku, slug, name: `${existing.name} (Copy)`, status: 'DRAFT', soldCount: 0, rating: 0, reviewCount: 0 },
    });
    await recordActivity(null, 'PRODUCT_DUPLICATED', 'PRODUCT', copy.id, g.ip, { from: existing.sku });
    return NextResponse.json({ ok: true, id: copy.id });
  }

  if (action === 'status') {
    const s = z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']) }).safeParse(body);
    if (!s.success) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    const p = await prisma.product.update({ where: { id }, data: { status: s.data.status } });
    await recordActivity(null, 'PRODUCT_STATUS_CHANGED', 'PRODUCT', id, g.ip, { status: s.data.status });
    return NextResponse.json({ ok: true, product: p });
  }

  const parsed = productSchema.partial().extend({ slug: z.string().trim().min(2).max(180).optional() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid product', issues: parsed.error.issues.map(i => i.path.join('.')) }, { status: 400 });
  // zod defaults fill omitted fields; PATCH must only touch keys the client actually sent
  const rawKeys = new Set(Object.keys(body as Record<string, unknown>));
  const d = Object.fromEntries(Object.entries(parsed.data).filter(([k]) => rawKeys.has(k))) as Partial<z.infer<typeof productSchema>>;

  if (d.sku && d.sku !== existing.sku && await prisma.product.findUnique({ where: { sku: d.sku } }))
    return NextResponse.json({ error: `SKU "${d.sku}" already exists` }, { status: 409 });
  if (d.categoryId && d.categoryId !== existing.categoryId && !await prisma.category.findUnique({ where: { id: d.categoryId } }))
    return NextResponse.json({ error: 'Unknown category' }, { status: 400 });

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) {
    if (v === undefined) continue;
    if (['badges', 'images', 'tags', 'specs'].includes(k)) data[k] = JSON.stringify(v);
    else if (v === null && ['brandId', 'compareAtPrice', 'weightKg'].includes(k)) data[k] = null;
    else data[k] = v;
  }
  if (d.name && !d.slug) data.slug = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const p = await prisma.product.update({ where: { id }, data });
  await recordActivity(null, 'PRODUCT_UPDATED', 'PRODUCT', id, g.ip, { changed: Object.keys(data) });
  return NextResponse.json({ ok: true, product: p });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await guard(req, 'delete');
  if (g.res) return g.res;
  const used = await prisma.orderItem.count({ where: { productId: id } });
  if (used > 0) return NextResponse.json({ error: `Product has ${used} order lines — archive it instead of deleting.` }, { status: 409 });
  await prisma.product.delete({ where: { id } });
  await recordActivity(null, 'PRODUCT_DELETED', 'PRODUCT', id, g.ip);
  return NextResponse.json({ ok: true });
}
