import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { recordActivity } from '@/lib/notify';
import { rateLimit, ipOf } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);
  return rows;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function POST(req: Request) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ip = ipOf(req);
  const rl = rateLimit(`admin:product:import:${ip}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many imports, slow down.' }, { status: 429 });

  const text = await req.text();
  if (text.length > 2_000_000) return NextResponse.json({ error: 'CSV too large (max ~2MB).' }, { status: 413 });
  const rows = parseCsv(text);
  if (rows.length < 2) return NextResponse.json({ error: 'CSV needs a header row and at least one product.' }, { status: 400 });

  const head = rows[0].map(h => h.trim().toLowerCase());
  const col = (...names: string[]) => head.findIndex(h => names.includes(h));
  const idx = {
    name: col('name', 'product', 'title'), sku: col('sku'), price: col('price', 'sellingprice', 'sell'),
    cost: col('costprice', 'cost'), stock: col('stock', 'qty', 'quantity'),
    category: col('category', 'categoryname'), brand: col('brand', 'brandname'),
    warranty: col('warrantymonths', 'warranty'), description: col('description', 'desc'),
  };
  if (idx.name < 0 || idx.price < 0) return NextResponse.json({ error: 'CSV header must include at least: name, price (also sku, stock, category, brand, costPrice, warrantyMonths, description).' }, { status: 400 });

  const cats = await prisma.category.findMany();
  const brands = await prisma.brand.findMany();
  const byCatName = new Map(cats.map(c => [c.name.toLowerCase(), c.id]));
  const byCatSlug = new Map(cats.map(c => [c.slug, c.id]));
  const byBrand = new Map(brands.map(b => [b.name.toLowerCase(), b.id]));

  const created: string[] = [];
  const errors: string[] = [];
  for (let r = 1; r < Math.min(rows.length, 2000); r++) {
    const row = rows[r];
    const get = (i: number) => (i >= 0 ? (row[i] ?? '').trim() : '');
    const name = get(idx.name);
    const price = parseFloat(get(idx.price).replace(/[₵,\s]/g, ''));
    if (!name || !Number.isFinite(price) || price <= 0) { errors.push(`Row ${r + 1}: missing name or invalid price`); continue; }
    const sku = get(idx.sku) || `GE-IMP-${Date.now().toString(36).toUpperCase()}-${r}`;
    if (await prisma.product.findUnique({ where: { sku } })) { errors.push(`Row ${r + 1}: SKU ${sku} already exists — skipped`); continue; }
    const catKey = get(idx.category).toLowerCase();
    const categoryId = byCatName.get(catKey) ?? byCatSlug.get(slugify(catKey)) ?? cats[0]?.id;
    if (!categoryId) { errors.push(`Row ${r + 1}: no categories exist yet`); break; }
    let slug = slugify(name) || `product-${r}`;
    for (let i = 0; await prisma.product.findUnique({ where: { slug } }); i++) slug = `${slugify(name)}-${Date.now().toString(36)}${i}`;
    const p = await prisma.product.create({
      data: {
        name, sku, slug, price,
        description: get(idx.description) || name,
        shortDesc: (get(idx.description) || name).split('.')[0] + '.',
        categoryId,
        brandId: byBrand.get(get(idx.brand).toLowerCase()) ?? null,
        costPrice: parseFloat(get(idx.cost)) || 0,
        stock: parseInt(get(idx.stock)) || 0,
        warrantyMonths: parseInt(get(idx.warranty)) || 0,
      },
    });
    created.push(p.sku);
  }
  await recordActivity(null, 'PRODUCTS_CSV_IMPORT', 'PRODUCT', undefined, ip, { created: created.length, errors: errors.length });
  return NextResponse.json({ ok: true, created: created.length, skipped: errors.length, errors: errors.slice(0, 20) });
}
