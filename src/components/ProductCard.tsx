'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { useToast } from './Toast';
import { Icon } from './Icon';
import WishlistButton from './WishlistButton';
import { ghs } from '@/lib/money';

export type CardProduct = {
  slug: string; name: string; price: number; compareAt?: number | null;
  image: string; rating: number; reviewCount: number; stock: number;
  badges?: string[]; isNew?: boolean; category?: string;
};

export function Stars({ r, size = 13 }: { r: number; size?: number }) {
  const full = Math.round(r);
  return (
    <span aria-label={`${r.toFixed(1)} out of 5 stars`} className="inline-flex items-center gap-[1px] text-volt" role="img">
      {Array.from({ length: 5 }, (_, k) => (
        <Icon key={k} name="star" size={size} filled={k < full} className={k < full ? 'drop-shadow-[0_0_4px_rgb(34_211_238/0.5)]' : 'opacity-25'} />
      ))}
    </span>
  );
}

export function ProductCard({ p, list = false }: { p: CardProduct; list?: boolean }) {
  const add = useCart(s => s.add);
  const toast = useToast();
  const [justAdded, setJustAdded] = useState(false);
  const off = p.compareAt && p.compareAt > p.price ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100) : 0;

  const doAdd = () => {
    if (p.stock === 0 || justAdded) return;
    add({ slug: p.slug, name: p.name, price: p.price, image: p.image, stock: p.stock });
    toast(`Added: ${p.name.slice(0, 34)}…`);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <article className={`group relative overflow-hidden rounded-[1.4rem] bg-white dark:bg-navy-700 border border-line shadow-soft hover:shadow-pop sm:hover:-translate-y-1 hover:border-volt/50 active:scale-[0.98] transition-all duration-300 h-full flex flex-col ${list ? '!flex-row gap-3 p-3 !rounded-2xl' : ''}`}>
      {/* ── image ── */}
      <div className={`relative overflow-hidden ${list ? 'w-32 shrink-0 rounded-xl' : 'rounded-t-[1.3rem]'}`}>
        <Link href={`/product/${p.slug}`} aria-label={p.name} className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt={p.name} width={320} height={240} loading="lazy"
            className={`w-full ${list ? 'h-28' : 'h-44 sm:h-56'} object-contain bg-gradient-to-b from-mist via-white to-mist dark:from-navy-600 dark:via-navy-700 dark:to-navy-600 p-4 transition-transform duration-500 ease-out group-hover:scale-[1.07]`} />
        </Link>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-navy/[0.07] to-transparent pointer-events-none" aria-hidden="true" />

        {/* badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
          {off > 0 && <span className="bg-ember text-white text-[10px] font-black px-2 py-1 rounded-lg -rotate-3 shadow-md">-{off}%</span>}
          {p.isNew && <span className="bg-volt text-navy text-[10px] font-black px-2 py-1 rounded-lg shadow-md inline-flex items-center gap-1"><Icon name="auto_awesome" size={10} />NEW</span>}
          {p.stock === 0 && <span className="bg-navy/85 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm">Out of stock</span>}
        </div>

        {/* wishlist */}
        <div className="absolute top-2.5 right-2.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
          <WishlistButton slug={p.slug} variant="icon" className="!bg-white/85 dark:!bg-navy/70 backdrop-blur-sm !border-white/40" />
        </div>

        {p.stock > 0 && p.stock <= 5 && !list && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 bg-navy/85 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
            <Icon name="timer" size={11} className="text-volt" /> Only {p.stock} left
          </span>
        )}

        {/* mobile quick-add FAB */}
        {!list && (
          <button
            onClick={doAdd}
            disabled={p.stock === 0}
            aria-label={p.stock === 0 ? 'Out of stock' : justAdded ? 'Added to cart' : `Add ${p.name} to cart`}
            className={`sm:hidden absolute bottom-3 right-3 w-11 h-11 rounded-full grid place-items-center shadow-pop transition-all duration-300 active:scale-90 ${
              justAdded ? 'bg-success text-white scale-110' : p.stock === 0 ? 'bg-line text-soft' : 'bg-volt text-navy hover:scale-105'
            }`}
          >
            <span key={justAdded ? 'y' : 'n'} className="animate-scale-in grid place-items-center">
              <Icon name={justAdded ? 'check' : 'add'} size={22} />
            </span>
          </button>
        )}
      </div>

      {/* ── body ── */}
      <div className={`${list ? 'flex-1 py-1' : 'p-3.5 sm:p-4'} pt-3 flex flex-col gap-1 flex-1`}>
        {p.category && <p className="text-[9.5px] sm:text-[10px] uppercase tracking-[0.14em] font-black text-soft">{p.category}</p>}
        <h3 className="text-[13px] sm:text-[14px] font-bold leading-snug line-clamp-2 min-h-[2.5em]">
          <Link href={`/product/${p.slug}`} className="group-hover:text-blue transition-colors">{p.name}</Link>
        </h3>
        <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] text-soft"><Stars r={p.rating} size={12} /><span>({p.reviewCount})</span></div>
        <div className="flex items-baseline gap-1.5 mt-auto pt-1">
          <span className="font-display font-bold text-[17px] sm:text-[19px] text-navy dark:text-white tracking-tight tabular-nums">{ghs(p.price)}</span>
          {p.compareAt ? <span className="text-[11px] sm:text-[12px] line-through text-soft tabular-nums">{ghs(p.compareAt)}</span> : null}
        </div>
        {(p.badges ?? []).slice(0, 2).map(b => (
          <span key={b} className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-blue dark:text-volt bg-blue/5 dark:bg-volt/10 self-start rounded-md px-1.5 py-0.5"><Icon name="check_circle" size={11} /> {b}</span>
        ))}
        {/* desktop full-width button */}
        <button
          disabled={p.stock === 0}
          onClick={doAdd}
          className="btn-primary w-full !py-2.5 !rounded-xl text-[13px] mt-2 hidden sm:inline-flex"
        >
          <Icon name={p.stock === 0 ? 'notifications' : 'add_shopping_cart'} size={16} />
          {p.stock === 0 ? 'Notify me' : 'Add to cart'}
        </button>
        {/* mobile stock note */}
        {p.stock === 0 && !list && (
          <p className="sm:hidden text-[11px] font-bold text-soft mt-1 inline-flex items-center gap-1"><Icon name="notifications" size={13} /> Notify me when back</p>
        )}
      </div>
    </article>
  );
}
