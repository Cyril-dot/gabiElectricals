import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { JSONLd } from '@/components/JsonLd';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.blogPost.findUnique({ where: { slug }, select: { title: true, excerpt: true } }).catch(() => null);
  return { title: p?.title ?? 'Article', description: p?.excerpt ?? '' };
}

function render(md: string) {
  // markdown-lite: ##, >, **bold**, ordered bullets — escaped server-side JSON-LD only; body rendered as React text blocks
  return md.split('\n').filter(l => l.trim()).map((l, i) => {
    const bold = (s: string) => s.split(/\*\*(.+?)\*\*/g).map((t, k) => (k % 2 ? <strong key={k}>{t}</strong> : t));
    if (l.startsWith('## ')) return <h2 key={i} className="font-display font-extrabold text-2xl mt-8 mb-2">{bold(l.slice(3))}</h2>;
    if (l.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-gold pl-4 italic text-soft my-4">{bold(l.slice(2))}</blockquote>;
    if (l.startsWith('1. ') || l.startsWith('2. ') || l.startsWith('3. ') || l.startsWith('4. ')) return <li key={i} className="ml-6 list-decimal text-[15px] leading-relaxed my-1">{bold(l.slice(3))}</li>;
    return <p key={i} className="text-[15.5px] leading-relaxed my-3">{bold(l)}</p>;
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || !post.published) notFound();
  await prisma.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } }).catch(() => {});
  const related = await prisma.blogPost.findMany({ where: { published: true, slug: { not: post.slug } }, take: 3, orderBy: { publishedAt: 'desc' } });
  return (
    <article className="container-x py-12 max-w-3xl">
      <JSONLd data={{ '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.excerpt, datePublished: post.publishedAt.toISOString(), author: { '@type': 'Organization', name: post.author }, publisher: { '@type': 'Organization', name: 'GabiElectricals' } }} />
      <nav aria-label="Breadcrumb" className="text-sm text-soft mb-6"><Link href="/blog" className="hover:text-blue">Power Notes</Link> / <span className="text-ink dark:text-white font-semibold">{post.title.slice(0, 40)}…</span></nav>
      <h1 className="font-display font-extrabold text-3xl md:text-4xl leading-tight mb-3">{post.title}</h1>
      <p className="text-soft text-sm mb-8">By {post.author} · {post.publishedAt.toDateString()} · {post.views} reads</p>
      <div className="card p-6 md:p-8 mb-8">{render(post.content)}</div>
      <div className="rounded-2xl bg-navy text-white p-6 mb-10 text-center">
        <p className="font-display font-extrabold text-xl mb-1">Face this exact problem at home?</p>
        <p className="text-white/70 text-sm mb-4">Our certified electricians are same-day across Greater Accra.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/book" className="btn-gold !px-5 !py-3">Book a service</Link>
          <Link href="/shop" className="btn !px-5 !py-3 border border-white/30 text-white hover:bg-white/10">Shop the fix</Link>
        </div>
      </div>
      <h2 className="font-display font-extrabold text-xl mb-4">Keep reading</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {related.map(r => (
          <Link key={r.id} href={`/blog/${r.slug}`} className="card p-4 hover:border-blue transition-colors">
            <p className="font-bold text-sm leading-snug line-clamp-2">{r.title}</p>
            <p className="text-[11px] text-soft mt-2">{r.publishedAt.toDateString()}</p>
          </Link>
        ))}
      </div>
    </article>
  );
}
