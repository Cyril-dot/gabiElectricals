import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { prisma } from '@/lib/db';
import { ContentBoard } from './board';

export const dynamic = 'force-dynamic';

function walk(dir: string, base = dir): { path: string; size: number }[] {
  const out: { path: string; size: number }[] = [];
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) out.push(...walk(full, base));
      else if (/\.(svg|png|jpe?g|webp|gif|mp4|webm|mov)$/i.test(e.name)) out.push({ path: '/' + relative(process.cwd(), full).replace(/\\/g, '/'), size: statSync(full).size });
    }
  } catch { /* dir missing */ }
  return out;
}

export default async function AdminContentPage() {
  const [heroes, faqs, testimonials, blogs, seos] = await Promise.all([
    prisma.heroSlide.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.faq.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.testimonial.findMany({ orderBy: { id: 'asc' } }),
    prisma.blogPost.findMany({ orderBy: { publishedAt: 'desc' }, take: 80 }),
    prisma.seoMeta.findMany({ where: { entity: 'blog' } }),
  ]);
  const images = walk(join(process.cwd(), 'public', 'images'));
  const seoMap = Object.fromEntries(seos.map((s) => [s.uniqueKey.replace('blog:', ''), { title: s.title, desc: s.desc }]));

  return (
    <ContentBoard
      heroes={heroes.map((h) => ({ id: h.id, headline: h.headline, sub: h.sub, ctaLabel: h.ctaLabel, ctaHref: h.ctaHref, cta2Label: h.cta2Label, cta2Href: h.cta2Href, image: h.image, badge: h.badge, sortOrder: h.sortOrder, active: h.active }))}
      faqs={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer, category: f.category, context: f.context, sortOrder: f.sortOrder }))}
      testimonials={testimonials.map((t) => ({ id: t.id, name: t.name, role: t.role, quote: t.quote, rating: t.rating, avatar: t.avatar, area: t.area, active: t.active }))}
      blogs={blogs.map((b) => ({ id: b.id, slug: b.slug, title: b.title, excerpt: b.excerpt, tags: safeArr(b.tags), published: b.published, cover: b.cover, views: b.views, publishedAt: b.publishedAt.toISOString(), content: b.content, metaTitle: seoMap[b.slug]?.title ?? null, metaDescription: seoMap[b.slug]?.desc ?? null }))}
      images={images.sort((a, b) => b.path.localeCompare(a.path))}
    />
  );
}

function safeArr(s: string): string[] { try { const j = JSON.parse(s); return Array.isArray(j) ? j : []; } catch { return []; } }
