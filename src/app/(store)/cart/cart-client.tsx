'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { priceOrder } from '@/lib/pricing';
import { useToast } from '@/components/Toast';
import { ghs } from '@/lib/money';

type Zone = { id: string; name: string; regions: string[]; fee: number; freeOver: number | null; etaDays: number };

export function CartClient({ tax, walletCredit, signedIn }: {
  tax: { vatPct: number; levyPct: number };
  walletCredit: number;
  signedIn: boolean;
}) {
  const { items, setQty, remove, clear } = useCart();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState('');
  const [pickup, setPickup] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; type: 'PERCENT' | 'FIXED' | 'FREE_DELIVERY'; value: number; minSpend: number; maxDiscount?: number | null } | null>(null);
  const [catBySlug, setCatBySlug] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/zones').then(r => r.json()).then((z: Zone[]) => {
      setZones(z);
      const saved = localStorage.getItem('ge_zone');
      setZoneId(saved && z.some(x => x.id === saved) ? saved : (z[0]?.id ?? ''));
      const cp = localStorage.getItem('ge_coupon');
      if (cp) { try { setCoupon(JSON.parse(cp)); } catch { /* noop */ } }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!items.length) return;
    fetch(`/api/products/categories?slugs=${items.map(i => i.slug).join(',')}`)
      .then(r => r.json()).then(setCatBySlug).catch(() => {});
  }, [items.length]);

  const zone = zones.find(z => z.id === zoneId) ?? null;
  const lines = items.map(i => ({ price: i.price, qty: i.qty, install: i.install }));
  const pricing = useMemo(
    () => priceOrder({ lines, coupon, zoneFee: pickup ? 0 : zone?.fee ?? 0, freeOver: pickup ? undefined : zone?.freeOver ?? undefined, fulfilment: pickup ? 'PICKUP' : 'DELIVERY', vatPct: tax.vatPct, levyPct: tax.levyPct }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(lines), coupon, zone?.id, pickup]
  );

  const applyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/coupon/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeInput.trim(),
          subtotal: pricing.subtotal,
          itemsCategorySlugs: [...new Set(items.map(i => catBySlug[i.slug]).filter(Boolean))],
        }),
      });
      const j = await res.json();
      if (!j.ok) { toast(j.reason ?? 'Coupon not valid.', 'err'); return; }
      setCoupon(j.coupon);
      localStorage.setItem('ge_coupon', JSON.stringify(j.coupon));
      toast(`${j.coupon.code} applied — nice one!`);
      setCodeInput('');
    } finally { setBusy(false); }
  };

  const clearCoupon = () => { setCoupon(null); localStorage.removeItem('ge_coupon'); };

  if (!mounted) {
    return (
      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start" aria-busy="true">
        <div className="skeleton h-72 w-full rounded-[14px]" />
        <div className="skeleton h-56 w-full rounded-[14px]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card p-10 md:p-14 text-center max-w-xl mx-auto">
        <p className="text-6xl mb-4">🛒</p>
        <h2 className="font-display text-2xl font-extrabold mb-2">Your cart is empty</h2>
        <p className="text-sm text-soft mb-6">Genuine Folded Cable, Schneider protection and dumsor-proof solar are one tap away.</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Link href="/shop" className="btn-primary !px-6 !py-3">Shop the catalog</Link>
          <Link href="/shop?cat=solar-inverters" className="btn-ghost !px-6 !py-3">Beat dumsor →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      {/* ── table ── */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <caption className="sr-only">Cart items with quantity, installation option and line totals</caption>
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wider text-soft border-b border-line">
              <th scope="col" className="p-4">Product</th>
              <th scope="col" className="p-4">Qty</th>
              <th scope="col" className="p-4">Install</th>
              <th scope="col" className="p-4 text-right">Line total</th>
              <th scope="col" className="p-4"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => {
              const key = `${i.slug}:${i.install ? 'i' : 'n'}`;
              return (
                <tr key={key} className="border-b border-line last:border-0 align-middle">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.image} alt={i.name} width={64} height={48} className="w-16 h-12 object-contain bg-mist dark:bg-navy-700 rounded-lg p-1 shrink-0" />
                      <Link href={`/product/${i.slug}`} className="font-bold leading-snug hover:text-blue line-clamp-2">{i.name}</Link>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center border border-line rounded-lg overflow-hidden w-fit">
                      <button onClick={() => setQty(i.slug, i.qty - 1, i.install)} disabled={i.qty <= 1} className="px-2.5 py-2 font-black hover:bg-mist dark:hover:bg-navy-700 min-h-[40px]" aria-label={`Decrease quantity of ${i.name}`}>−</button>
                      <span className="px-2.5 w-9 text-center font-bold">{i.qty}</span>
                      <button onClick={() => setQty(i.slug, i.qty + 1, i.install)} disabled={i.qty >= i.stock} className="px-2.5 py-2 font-black hover:bg-mist dark:hover:bg-navy-700 min-h-[40px]" aria-label={`Increase quantity of ${i.name}`}>+</button>
                    </div>
                    {i.qty >= i.stock && <p className="text-[11px] text-warning font-bold mt-1">Max stock ({i.stock}) reached</p>}
                  </td>
                  <td className="p-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[12.5px] font-semibold whitespace-nowrap min-h-[40px]">
                      <input type="checkbox" checked={!!i.install} onChange={e => setQty(i.slug, i.qty, e.target.checked)} className="w-4 h-4 accent-[#0C4A55]" />
                      +10% install
                    </label>
                  </td>
                  <td className="p-4 text-right font-extrabold whitespace-nowrap">{ghs((i.price * i.qty * (i.install ? 1.1 : 1)))}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => { remove(i.slug); toast('Item removed', 'info'); }} className="text-soft hover:text-danger p-2" aria-label={`Remove ${i.name} from cart`}>🗑</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex justify-between p-4 border-t border-line">
          <button onClick={() => { clear(); toast('Cart cleared', 'info'); }} className="text-[13px] font-bold text-danger hover:underline">Clear cart</button>
          <Link href="/shop" className="text-[13px] font-bold text-blue hover:underline">← Keep shopping</Link>
        </div>
      </div>

      {/* ── summary ── */}
      <aside className="card p-5 space-y-4 lg:sticky lg:top-20" aria-label="Order summary">
        {/* coupon */}
        <div>
          <label htmlFor="coupon" className="text-[13px] font-bold block mb-1">Coupon code</label>
          {coupon ? (
            <div className="flex items-center justify-between bg-success/10 border border-success/30 rounded-xl px-3 py-2.5">
              <span className="text-sm font-black text-success">✓ {coupon.code} applied</span>
              <button onClick={clearCoupon} className="text-soft hover:text-danger text-sm font-bold" aria-label="Remove coupon">✕</button>
            </div>
          ) : (
            <form onSubmit={applyCoupon} className="flex gap-2">
              <input id="coupon" value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder="e.g. WELCOME10" className="flex-1 min-w-0 border border-line rounded-xl px-3 py-2.5 text-sm bg-mist/50 dark:bg-navy-700 outline-none focus:border-blue" />
              <button disabled={busy} className="btn-ghost !px-3.5 !py-2.5 text-sm">{busy ? '…' : 'Apply'}</button>
            </form>
          )}
        </div>

        {/* delivery estimate */}
        <div>
          <p className="text-[13px] font-bold mb-1.5">Delivery estimate</p>
          <label className="sr-only" htmlFor="zone">Delivery zone</label>
          <select id="zone" value={pickup ? '' : zoneId} onChange={e => {
            const v = e.target.value;
            if (!v) { setPickup(true); }
            else { setPickup(false); setZoneId(v); localStorage.setItem('ge_zone', v); }
          }} className="w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-navy outline-none focus:border-blue min-h-[44px]">
            <option value="">Pick up at Osu shop (free)</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name} — {ghs(z.fee, { cents: false })} · {z.etaDays}d{z.freeOver ? ` · free over ${ghs(z.freeOver)}` : ''}</option>)}
          </select>
          {!pickup && zone?.freeOver && pricing.subtotal >= zone.freeOver && (
            <p className="text-[12px] font-bold text-success mt-1.5">🎉 Order qualifies for FREE delivery in {zone.name}.</p>
          )}
        </div>

        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-soft">Subtotal (VAT incl.)</dt><dd className="font-bold">{ghs(pricing.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-soft">VAT portion @{tax.vatPct}%</dt><dd className="font-bold">{ghs(pricing.vatPortion)}</dd></div>
          {pricing.levy > 0 && <div className="flex justify-between"><dt className="text-soft">Levy @{tax.levyPct}%</dt><dd className="font-bold">{ghs(pricing.levy)}</dd></div>}
          {pricing.discount > 0 && <div className="flex justify-between text-success"><dt className="font-bold">Coupon discount</dt><dd className="font-black">−{ghs(pricing.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-soft">Delivery</dt><dd className="font-bold">{pricing.deliveryFee === 0 ? 'FREE' : `${ghs(pricing.deliveryFee)}`}</dd></div>
          {signedIn && walletCredit > 0 && (
            <div className="flex justify-between text-gold-dark"><dt className="font-bold">Referral credit</dt><dd className="font-black">{ghs(walletCredit)} usable at checkout</dd></div>
          )}
          <div className="h-px bg-line my-1" />
          <div className="flex justify-between font-display text-lg font-extrabold"><dt>Total</dt><dd>{ghs(pricing.total)}</dd></div>
        </dl>

        <Link href="/checkout" className="btn-gold w-full !py-3.5 text-[15px] min-h-[48px]">Proceed to checkout →</Link>
        <p className="text-[11.5px] text-soft text-center">MTN MoMo · Telecel · AT · Card · GhIPSS · Pay on delivery</p>
      </aside>
    </div>
  );
}
