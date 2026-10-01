'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart-store';
import { useToast } from './Toast';
import { Icon } from './Icon';
import { ghs } from '@/lib/money';

export type CardProduct = {
  slug: string; name: string; price: number; compareAt?: number | null;
  image: string; rating: number; reviewCount: number; stock: number;
  badges?: string[]; isNew?: boolean; category?: string;
};

export function Stars({ r, size = 13 }: { r: number; size?: number }) {
  const full = Math.round(r);
  return (
    <span aria-label={`${r.toFixed(1)} out of 5 stars`} className="inline-flex items-center gap-[1px] text-gold" role="img">
      {Array.from({ length: 5 }, (_, k) => (
        <Icon key={k} name="star" size={size} filled={k < full} className={k < full ? '' : 'opacity-30'} />
      ))}
    </span>
  );
}

export function ProductCard({ p, list = false }: { p: CardProduct; list?: boolean }) {
  const add = useCart(s => s.add);
  const toast = useToast();
  const off = p.compareAt && p.compareAt > p.price ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100) : 0;
  return (
    <article className={`card lift group relative overflow-hidden ${list ? 'flex gap-4 p-4' : ''}`}>
      <div className={`relative overflow-hidden ${list ? 'w-36 shrink-0' : ''}`}>
        <Link href={`/product/${p.slug}`} aria-label={p.name} className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt={p.name} width={320} height={240} loading="lazy"
            className={`w-full ${list ? 'h-28' : 'h-44 sm:h-52'} object-contain bg-mist dark:bg-navy-700 p-3 transition-transform duration-500 ease-out group-hover:scale-[1.06]`} />
        </Link>
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {off > 0 && <span className="bg-danger text-white text-[10px] font-black px-1.5 py-0.5 rounded-md -rotate-2 shadow-sm">-{off}%</span>}
          {p.isNew && <span className="bg-blue text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm inline-flex items-center gap-0.5"><Icon name="auto_awesome" size={10} />NEW</span>}
          {p.stock === 0 && <span className="bg-navy/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">Out of stock</span>}
        </div>
        {p.stock > 0 && p.stock <= 5 && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-navy/85 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
            <Icon name="timer" size={11} className="text-gold" /> Only {p.stock} left
          </span>
        )}
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
          <span key={b} className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 self-start rounded-md px-1.5 py-0.5"><Icon name="check_circle" size={11} /> {b}</span>
        ))}
        <button
          disabled={p.stock === 0}
          onClick={() => { add({ slug: p.slug, name: p.name, price: p.price, image: p.image, stock: p.stock }); toast(`Added: ${p.name.slice(0, 34)}…`); }}
          className="btn-primary w-full !py-2.5 text-[13px] mt-2"
        >
          <Icon name={p.stock === 0 ? 'notifications' : 'add_shopping_cart'} size={16} />
          {p.stock === 0 ? 'Notify me' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
