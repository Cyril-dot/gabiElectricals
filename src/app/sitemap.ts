import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Built once at deploy time would freeze the URL list, so new products and posts would never be crawled.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/services`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/book`, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${SITE}/deals`, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE}/refer`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/emergency`, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${SITE}/about`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE}/contact`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/tools/load-calculator`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${SITE}/terms`, priority: 0.3 }, { url: `${SITE}/privacy`, priority: 0.3 }, { url: `${SITE}/returns`, priority: 0.3 },
  ];
  try {
    const [products, cats, services, posts] = await Promise.all([
      prisma.product.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ select: { slug: true } }),
      prisma.service.findMany({ where: { active: true }, select: { slug: true } }),
      prisma.blogPost.findMany({ where: { published: true }, select: { slug: true, publishedAt: true } }),
    ]);
    return [
      ...base,
      ...products.map(p => ({ url: `${SITE}/product/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.8 })),
      ...cats.map(c => ({ url: `${SITE}/shop?cat=${c.slug}` as string, changeFrequency: 'daily' as const, priority: 0.7 })),
      ...services.map(s => ({ url: `${SITE}/services/${s.slug}`, changeFrequency: 'monthly' as const, priority: 0.75 })),
      ...posts.map(b => ({ url: `${SITE}/blog/${b.slug}`, lastModified: b.publishedAt, changeFrequency: 'yearly' as const, priority: 0.5 })),
    ];
  } catch {
    return base;
  }
}
