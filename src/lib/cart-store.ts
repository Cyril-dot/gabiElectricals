'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = { slug: string; name: string; price: number; image: string; qty: number; install?: boolean; stock: number };

type S = {
  items: CartItem[];
  open: boolean;
  add: (i: Omit<CartItem, 'qty'>, qty?: number) => void;
  setQty: (slug: string, qty: number, install?: boolean) => void;
  remove: (slug: string, install?: boolean) => void;
  clear: () => void;
  setOpen: (v: boolean) => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<S>()(
  persist(
    (set, get) => ({
      items: [],
      open: false,
      add: (i, qty = 1) => {
        const key = `${i.slug}:${i.install ? 'i' : 'n'}`;
        const items = get().items.map(x =>
          `${x.slug}:${x.install ? 'i' : 'n'}` === key
            ? { ...x, qty: Math.min(x.qty + qty, x.stock || 99) }
            : x
        );
        if (!items.some(x => `${x.slug}:${x.install ? 'i' : 'n'}` === key)) {
          items.push({ ...i, qty: Math.min(qty, i.stock || 99) });
        }
        set({ items, open: true });
      },
      setQty: (slug, qty, install = false) => set(s => ({ items: s.items.map(i => (i.slug === slug && !!i.install === install) ? { ...i, qty: Math.max(1, Math.min(qty, i.stock || 99)) } : i) })),
      remove: (slug, install) => set(s => ({ items: s.items.filter(i => !(i.slug === slug && (install === undefined || !!i.install === !!install))) })),
      clear: () => set({ items: [] }),
      setOpen: v => set({ open: v }),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotal: () => get().items.reduce((n, i) => n + i.price * i.qty * (i.install ? 1.1 : 1), 0),
    }),
    { name: 'ge-cart' }
  )
);
