import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';
import { contentSchemas, pickModel, type ContentModel } from '../route';

const delegates: Record<ContentModel, keyof typeof prisma> = {
  hero: 'heroSlide', faq: 'faq', testimonial: 'testimonial', blog: 'blogPost',
};

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ model: string; id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { model, id } = await ctx.params;
  const m = pickModel(model);
  if (!m) return fail('Unknown content model.');
  const parsed = contentSchemas[m].partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid update.');
  const d = { ...parsed.data } as Record<string, unknown>;
  if (m === 'blog') {
    const tags = d.tags; delete d.tags; delete d.metaTitle; delete d.metaDescription;
    if (d.title) {
      const slug = String(d.title).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const clash = await prisma.blogPost.findFirst({ where: { slug, id: { not: id } } });
      if (slug) d.slug = clash ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug;
    }
    if (Array.isArray(tags)) d.tags = JSON.stringify(tags);
  }
  if (m === 'hero' || m === 'testimonial') for (const k of ['cta2Label', 'cta2Href', 'role', 'avatar', 'badge', 'cover', 'area']) if (d[k] === '') d[k] = null;
  const dp = (prisma as never as Record<string, { update: (a: unknown) => Promise<unknown> }>)[delegates[m] as string];
  const updated = await dp.update({ where: { id }, data: d }).catch(() => null);
  if (!updated) return fail('Record not found.', 404);
  await recordActivity(g.user.userId, `CONTENT_${m.toUpperCase()}_UPDATED`, m, id);
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ model: string; id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { model, id } = await ctx.params;
  const m = pickModel(model);
  if (!m) return fail('Unknown content model.');
  const dp = (prisma as never as Record<string, { delete: (a: unknown) => Promise<unknown> }>)[delegates[m] as string];
  await dp.delete({ where: { id } }).catch(() => null);
  await recordActivity(g.user.userId, `CONTENT_${m.toUpperCase()}_DELETED`, m, id);
  return NextResponse.json({ ok: true });
}
