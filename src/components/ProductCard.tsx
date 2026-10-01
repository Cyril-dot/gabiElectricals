'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart-store';
import { useToast } from './Toast';
import { ghs } from '@/lib/money';

export type CardProduct = {
  slug: string; name: string; price: number; compareAt?: number | null;
  image: string; rating: number; reviewCount: number; stock: number;
  badges?: string[]; isNew?: boolean; category?: string;
};

export function Stars({ r }: { r: number }) {
  return (
    <span aria-label={`${r.toFixed(1)} out of 5 stars`} className="text-gold text-[12px] tracking-tight" role="img">
      {'★'.repeat(Math.round(r))}{'☆'.repeat(5 - Math.round(r))}
    </span>
  );
}

export function ProductCard({ p, list = false }: { p: CardProduct; list?: boolean }) {
  const add = useCart(s => s.add);
  const toast = useToast();
  const off = p.compareAt && p.compareAt > p.price ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100) : 0;
  return (
    <article className={`card group relative overflow-hidden ${list ? 'flex gap-4 p-4' : ''}`}>
      <div className={`relative ${list ? 'w-36 shrink-0' : ''}`}>
        <Link href={`/product/${p.slug}`} aria-label={p.name} className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt={p.name} width={320} height={240} loading="lazy"
            className={`w-full ${list ? 'h-28' : 'h-44 sm:h-52'} object-contain bg-mist dark:bg-navy-700 p-3 transition-transform duration-300 group-hover:scale-[1.04]`} />
        </Link>
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {off > 0 && <span className="bg-danger text-white text-[10px] font-black px-1.5 py-0.5 rounded-md -rotate-2">-{off}%</span>}
          {p.isNew && <span className="bg-blue text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">NEW</span>}
          {p.stock === 0 && <span className="bg-navy/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">Out of stock</span>}
        </div>
      </div>
      <div className="p-3.5 pt-2.5 flex flex-col gap-1">
        {p.category && <p className="text-[10.5px] uppercase tracking-widest font-bold text-soft">{p.category}</p>}
        <h3 className="text-[13.5px] font-bold leading-snug line-clamp-2 min-h-[2.4em]">
          <Link href={`/product/${p.slug}`} className="hover:text-blue transition-colors">{p.name}</Link>
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-soft"><Stars r={p.rating} /><span>({p.reviewCount})</span></div>
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span className="font-display font-extrabold text-[17px] text-navy dark:text-white">{ghs(p.price)}</span>
          {p.compareAt ? <span className="text-[12px] line-through text-soft">{ghs(p.compareAt)}</span> : null}
        </div>
        {(p.badges ?? []).slice(0, 2).map(b => (
          <span key={b} className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 self-start rounded-md px-1.5 py-0.5">✓ {b}</span>
        ))}
        <button
          disabled={p.stock === 0}
          onClick={() => { add({ slug: p.slug, name: p.name, price: p.price, image: p.image, stock: p.stock }); toast(`Added: ${p.name.slice(0, 34)}…`); }}
          className="btn-primary w-full !py-2.5 text-[13px] mt-2"
        >
          {p.stock === 0 ? 'Notify me' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
