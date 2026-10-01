import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail, slugify } from '@/lib/ops-api';

export const contentSchemas = {
  hero: z.object({
    headline: z.string().min(3).max(140), sub: z.string().min(3).max(240),
    ctaLabel: z.string().min(1).max(40), ctaHref: z.string().min(1).max(200),
    cta2Label: z.string().max(40).optional(), cta2Href: z.string().max(200).optional(),
    image: z.string().min(1).max(300), badge: z.string().max(40).optional(),
    sortOrder: z.number().int().min(0).max(99).default(0), active: z.boolean().default(true),
  }),
  faq: z.object({
    question: z.string().min(5).max(300), answer: z.string().min(5).max(3000),
    category: z.enum(['General', 'Shop', 'Delivery', 'Payments', 'Services']).default('General'),
    context: z.enum(['PUBLIC', 'CHATBOT']).default('PUBLIC'), sortOrder: z.number().int().min(0).max(999).default(0),
  }),
  testimonial: z.object({
    name: z.string().min(2).max(80), role: z.string().max(80).optional(), quote: z.string().min(5).max(600),
    rating: z.number().int().min(1).max(5).default(5), avatar: z.string().max(300).optional(),
    area: z.string().max(60).optional(), active: z.boolean().default(true),
  }),
  blog: z.object({
    title: z.string().min(5).max(160), excerpt: z.string().min(10).max(400), content: z.string().min(20),
    cover: z.string().max(300).optional(), tags: z.array(z.string().max(40)).max(12).default([]),
    author: z.string().max(80).optional(), published: z.boolean().default(true),
    metaTitle: z.string().max(80).optional(), metaDescription: z.string().max(200).optional(),
  }),
};
export type ContentModel = keyof typeof contentSchemas;

export function pickModel(seg: string): ContentModel | null {
  return seg in contentSchemas ? (seg as ContentModel) : null;
}

/** POST /api/admin/content/[model] — hero | faq | testimonial | blog */
export async function POST(req: NextRequest, ctx: { params: Promise<{ model: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { model } = await ctx.params;
  if (!pickModel(model)) return fail('Unknown content model.');
  const parsed = contentSchemas[model as ContentModel].safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid content.');
  const d = parsed.data as Record<string, unknown>;
  let created;
  if (model === 'hero') created = await prisma.heroSlide.create({ data: d as never });
  if (model === 'faq') created = await prisma.faq.create({ data: d as never });
  if (model === 'testimonial') created = await prisma.testimonial.create({ data: d as never });
  if (model === 'blog') {
    let slug = slugify(d.title as string);
    const clash = await prisma.blogPost.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    created = await prisma.blogPost.create({
      data: { title: d.title as string, excerpt: d.excerpt as string, content: d.content as string, cover: (d.cover as string) || null, tags: JSON.stringify(d.tags ?? []), author: (d.author as string) || undefined, published: d.published as boolean, slug },
    });
    if (d.metaTitle || d.metaDescription) {
      await prisma.seoMeta.upsert({
        where: { uniqueKey: `blog:${slug}` },
        create: { entity: 'blog', uniqueKey: `blog:${slug}`, title: (d.metaTitle as string) || null, desc: (d.metaDescription as string) || null, blogId: created.id },
        update: { title: (d.metaTitle as string) || null, desc: (d.metaDescription as string) || null },
      });
    }
  }
  await recordActivity(g.user.userId, `CONTENT_${model.toUpperCase()}_CREATED`, model, (created as { id: string }).id);
  return NextResponse.json({ ok: true, id: (created as { id: string }).id }, { status: 201 });
}
