'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useCart } from '@/lib/cart-store';
import { ghs } from '@/lib/money';
import { Icon } from './Icon';

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove, subtotal } = useCart();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [setOpen]);
  if (!open) return null;
  const sub = subtotal();
  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button aria-label="Close cart" className="absolute inset-0 bg-navy/60 backdrop-blur-[2px] animate-fade-in" onClick={() => setOpen(false)} />
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white dark:bg-navy shadow-pop flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="font-display font-extrabold text-lg">Your cart <span className="text-soft text-sm font-sans">({items.length})</span></h2>
          <button onClick={() => setOpen(false)} className="icon-btn" aria-label="Close"><Icon name="close" size={19} /></button>
        </div>
        {items.length === 0 ? (
          <div className="flex-1 grid place-items-center p-8 text-center">
            <div>
              <span className="grid place-items-center w-16 h-16 rounded-2xl bg-mist dark:bg-navy-700 text-soft mb-3 mx-auto"><Icon name="shopping_cart" size={30} /></span>
              <p className="font-bold text-lg mb-1">Cart is empty</p>
              <p className="text-sm text-soft mb-4">Genuine cables, breakers & solar await.</p>
              <Link href="/shop" onClick={() => setOpen(false)} className="btn-primary !px-5 !py-2.5">Start shopping</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map(i => (
                <div key={`${i.slug}:${i.install ? 'i' : 'n'}`} className="flex gap-3 border border-line rounded-xl p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.image} alt={i.name} width={64} height={48} className="w-16 h-12 object-contain bg-mist dark:bg-navy-700 rounded-lg p-1" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${i.slug}`} onClick={() => setOpen(false)} className="text-[13px] font-bold leading-tight line-clamp-2 hover:text-blue">{i.name}</Link>
                    {i.install && <p className="text-[11px] text-blue font-semibold mt-0.5">+ installation (10%)</p>}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center border border-line rounded-lg overflow-hidden">
                        <button onClick={() => setQty(i.slug, i.qty - 1, i.install)} className="px-2.5 py-1 text-sm font-black hover:bg-mist dark:hover:bg-navy-700" aria-label="Decrease quantity">−</button>
                        <span className="px-2 text-sm font-bold min-w-7 text-center" aria-label="Quantity">{i.qty}</span>
                        <button onClick={() => setQty(i.slug, i.qty + 1, i.install)} className="px-2.5 py-1 text-sm font-black hover:bg-mist dark:hover:bg-navy-700" aria-label="Increase quantity">+</button>
                      </div>
                      <span className="font-extrabold text-sm">{ghs((i.price * i.qty * (i.install ? 1.1 : 1)))}</span>
                    </div>
                  </div>
                  <button onClick={() => remove(i.slug, i.install)} className="text-soft hover:text-danger self-start p-1" aria-label={`Remove ${i.name}`}><Icon name="delete" size={17} /></button>
                </div>
              ))}
            </div>
            <div className="border-t border-line p-4 space-y-3 bg-mist/60 dark:bg-navy-700/60">
              <div className="flex justify-between font-bold"><span>Subtotal (VAT incl.)</span><span>{ghs(sub)}</span></div>
              <p className="text-xs text-soft">Delivery & coupons calculated at checkout.</p>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/cart" onClick={() => setOpen(false)} className="btn-ghost !py-3 justify-center">View cart</Link>
                <Link href="/checkout" onClick={() => setOpen(false)} className="btn-gold !py-3 link-nudge justify-center">Checkout <Icon name="arrow_forward" size={17} /></Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
