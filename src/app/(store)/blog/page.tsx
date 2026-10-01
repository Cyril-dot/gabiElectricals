import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { JSONLd } from '@/components/JsonLd';

export const metadata: Metadata = { title: 'Power Notes — Blog', description: 'Ghana electrical safety, dumsor preparedness, solar and wiring guides from certified electricians.' };

const tagsOf = (j: string): string[] => { try { const a = JSON.parse(j); return Array.isArray(a) ? a : []; } catch { return []; } };

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({ where: { published: true }, orderBy: { publishedAt: 'desc' } }).catch(() => []);
  return (
    <div className="container-x py-12">
      <JSONLd data={{ '@context': 'https://schema.org', '@type': 'Blog', name: 'Power Notes by GabiElectricals', url: `${process.env.NEXT_PUBLIC_SITE_URL}/blog` }} />
      <div className="max-w-2xl mb-10">
        <p className="text-blue font-black text-xs tracking-[0.3em] uppercase mb-2">Power Notes</p>
        <h1 className="font-display font-extrabold text-4xl mb-3">Wired right: safety, savings & Ghana power guides</h1>
        <p className="text-soft">Field notes from our certified crews — dumsor prep, solar numbers for Accra roofs, spotting fake cable, and the fixes that keep homes safe.</p>
      </div>
      {posts.length === 0 && <p className="text-soft">No articles yet — new guides publish weekly.</p>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts.map(p => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="card overflow-hidden group hover:-translate-y-1 hover:border-blue transition-all">
            <div className="h-36 bg-navy relative overflow-hidden">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, #0A5CFF, transparent 60%)' }} aria-hidden="true" />
              <p className="absolute inset-x-4 bottom-3 text-gold font-black text-[10px] tracking-[0.25em] uppercase">{tagsOf(p.tags)[0] ?? 'Guide'}</p>
              <p className="absolute top-3 right-3 text-[11px] text-white/60">{p.publishedAt.toDateString()}</p>
            </div>
            <div className="p-5">
              <h2 className="font-display font-extrabold text-[17px] leading-snug group-hover:text-blue line-clamp-2">{p.title}</h2>
              <p className="text-[13.5px] text-soft mt-2 line-clamp-3">{p.excerpt}</p>
              <p className="text-[12px] font-bold text-blue mt-3">Read guide →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
