'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { priceOrder } from '@/lib/pricing';
import { normalizeGhPhone } from '@/lib/ghana';
import { useToast } from '@/components/Toast';
import { ghs } from '@/lib/money';

type Zone = { id: string; name: string; regions: string[]; fee: number; freeOver: number | null; etaDays: number };
type AddressIn = { id: string; label: string; region: string; city: string; landmark: string; gps: string; phone: string; isDefault: boolean };

const METHOD_META: Record<string, { label: string; icon: string; note: string; phonePrompt?: boolean }> = {
  MOMO_MTN: { label: 'MTN Mobile Money', icon: '📱', note: 'A payment prompt will pop on your MTN line — approve with your PIN.', phonePrompt: true },
  MOMO_TELECEL: { label: 'Telecel Cash', icon: '📱', note: 'Approve the Telecel prompt on your phone to confirm.', phonePrompt: true },
  MOMO_AT: { label: 'AT Money', icon: '📱', note: 'You will get an AT Money push/SMS to authorise.', phonePrompt: true },
  CARD: { label: 'Visa / Mastercard', icon: '💳', note: 'Hosted card page. Sandbox: 4084 0840 8408 4081, any future expiry, OTP 123456.' },
  BANK_TRANSFER: { label: 'Bank transfer / GhIPSS', icon: '🏦', note: 'We send account details instantly after checkout; order confirms on receipt (usually < 1 h).' },
  GHIPSS: { label: 'GhIPSS Instant Pay', icon: '🇬🇭', note: 'Pay from any Ghanaian bank or mobile wallet through the national switch.' },
  QR: { label: 'Scan QR to pay', icon: '▣', note: 'A QR code appears after checkout — scan with any banking app. Expires in 15 minutes.' },
  PAY_ON_DELIVERY: { label: 'Pay on delivery', icon: '🚚', note: 'Cash or MoMo to the rider at your door. Available in Greater Accra & Kumasi.', },
  MANUAL_TRANSFER: { label: 'Manual transfer (with proof)', icon: '🧾', note: 'Transfer to our Ecobank/CalBank merchant account, then upload the receipt on the next screen — we approve within 30 minutes in business hours.' },
};

export function CheckoutClient({ enabledMethods, regions, tax, me, shopAddress }: {
  enabledMethods: string[];
  regions: Record<string, string[]>;
  tax: { vatPct: number; levyPct: number };
  me: { name: string; email: string; phone: string; walletCredit: number; addresses: AddressIn[] } | null;
  shopAddress: string;
}) {
  const { items, clear } = useCart();
  const toast = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState('');
  const [fulfilment, setFulfilment] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [method, setMethod] = useState(enabledMethods[0] ?? 'MOMO_MTN');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; type: 'PERCENT' | 'FIXED' | 'FREE_DELIVERY'; value: number; minSpend: number; maxDiscount?: number | null } | null>(null);
  const [catBySlug, setCatBySlug] = useState<Record<string, string>>({});
  const [c, setC] = useState({ name: me?.name ?? '', email: me?.email ?? '', phone: me?.phone ?? '' });
  const [momoPhone, setMomoPhone] = useState('');
  const [a, setA] = useState({ region: Object.keys(regions)[0], city: '', landmark: '', gps: '', line: '' });
  const [referral, setReferral] = useState('');

  useEffect(() => {
    setMounted(true);
    fetch('/api/zones').then(r => r.json()).then((z: Zone[]) => {
      setZones(z);
      const saved = localStorage.getItem('ge_zone');
      setZoneId(saved && z.some(x => x.id === saved) ? saved : (z[0]?.id ?? ''));
    }).catch(() => {});
    const cp = localStorage.getItem('ge_coupon');
    if (cp) { try { setCoupon(JSON.parse(cp)); } catch { /* noop */ } }
    const ref = document.cookie.match(/ge_ref=([A-Z0-9]+)/i)?.[1];
    if (ref) setReferral(ref);
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'CHECKOUT_START', payload: { items: items.length } }) }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!items.length) return;
    fetch(`/api/products/categories?slugs=${items.map(i => i.slug).join(',')}`).then(r => r.json()).then(setCatBySlug).catch(() => {});
  }, [items.length]);

  const zone = zones.find(z => z.id === zoneId) ?? null;
  const lines = items.map(i => ({ price: i.price, qty: i.qty, install: i.install }));
  const pricing = useMemo(() => {
    const p = priceOrder({
      lines, coupon: coupon ?? undefined, zoneFee: fulfilment === 'PICKUP' ? 0 : zone?.fee ?? 0,
      freeOver: fulfilment === 'PICKUP' ? undefined : zone?.freeOver ?? undefined,
      fulfilment, vatPct: tax.vatPct, levyPct: tax.levyPct,
      walletAvailable: me?.walletCredit ?? 0, walletUse: useWallet ? me?.walletCredit ?? 0 : 0,
    });
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lines), coupon, zone?.id, fulfilment, useWallet]);

  const cities = regions[a.region] ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!items.length) { toast('Your cart is empty.', 'err'); return; }
    if (!normalizeGhPhone(c.phone)) { setErr('Enter a valid Ghana mobile number (e.g. 024 123 4567).'); return; }
    if (fulfilment === 'DELIVERY' && (!a.city || !a.landmark)) { setErr('Fill in your city and a landmark — our riders rely on landmarks, not street names.'); return; }
    if (a.gps && !/^[A-Za-z]{2}-\d{3}-\d{4}$/.test(a.gps)) { setErr('Ghana Post GPS looks like GA-123-4567. Check the format or leave it blank.'); return; }
    if (METHOD_META[method]?.phonePrompt && momoPhone && !normalizeGhPhone(momoPhone)) { setErr('That MoMo number does not look right.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: { name: c.name, email: c.email, phone: c.phone },
          fulfilment,
          address: fulfilment === 'DELIVERY' ? { region: a.region, city: a.city, line: a.line || undefined, landmark: a.landmark || undefined, gps: a.gps || undefined } : undefined,
          zoneId: fulfilment === 'DELIVERY' ? zoneId : undefined,
          payment: { method, momoPhone: momoPhone || undefined },
          items: items.map(i => ({ slug: i.slug, qty: i.qty, install: !!i.install })),
          couponCode: coupon?.code,
          walletUse: useWallet ? me?.walletCredit : 0,
          referralCode: referral || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) { setBusy(false); setErr(j.error ?? 'Checkout failed — no money was taken. Try again.'); return; }
      clear();
      localStorage.removeItem('ge_coupon');
      toast('Order placed!');
      router.push(`/order/${j.orderNo}${j.ref ? `?ref=${j.ref}` : ''}`);
    } catch {
      setBusy(false);
      setErr('Network hiccup — your card was not charged. Please retry.');
    }
  };

  if (!mounted) {
    return <div className="grid lg:grid-cols-[1fr_360px] gap-6"><div className="skeleton h-[520px] rounded-[14px]" /><div className="skeleton h-[340px] rounded-[14px]" /></div>;
  }
  if (items.length === 0) {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto">
        <p className="text-5xl mb-3">🧾</p>
        <h2 className="font-display text-xl font-extrabold mb-2">Nothing to check out</h2>
        <p className="text-sm text-soft mb-5">Add something genuine first — your cart is empty.</p>
        <Link href="/shop" className="btn-primary !px-6 !py-3">Go to the shop</Link>
      </div>
    );
  }

  const inputCls = 'w-full border border-line rounded-xl px-3.5 py-3 text-sm bg-white dark:bg-navy outline-none focus:border-blue min-h-[44px]';
  const labelCls = 'text-[13px] font-bold mb-1 block';

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div className="space-y-5">
        {/* 1 — contact */}
        <section className="card p-5" aria-labelledby="step1">
          <h2 id="step1" className="font-display text-lg font-extrabold mb-4">1 · Your details {!me && <span className="text-[12px] font-sans font-semibold text-soft">(guest checkout is fine)</span>}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label htmlFor="c-name" className={labelCls}>Full name</label><input id="c-name" required minLength={2} autoComplete="name" value={c.name} onChange={e => setC({ ...c, name: e.target.value })} className={inputCls} placeholder="Kofi Owusu" /></div>
            <div><label htmlFor="c-email" className={labelCls}>Email</label><input id="c-email" type="email" required autoComplete="email" value={c.email} onChange={e => setC({ ...c, email: e.target.value })} className={inputCls} placeholder="you@example.com" /></div>
            <div><label htmlFor="c-phone" className={labelCls}>Mobile number (GH)</label><input id="c-phone" type="tel" required autoComplete="tel" value={c.phone} onChange={e => setC({ ...c, phone: e.target.value })} className={inputCls} placeholder="024 123 4567" /><p className="text-[11.5px] text-soft mt-1">Delivery updates come by SMS on this number.</p></div>
            <div><label htmlFor="c-ref" className={labelCls}>Referral code (optional)</label><input id="c-ref" value={referral} onChange={e => setReferral(e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. KOFI24" /></div>
          </div>
        </section>

        {/* 2 — delivery */}
        <section className="card p-5" aria-labelledby="step2">
          <h2 id="step2" className="font-display text-lg font-extrabold mb-4">2 · Get it to site</h2>
          <div className="grid grid-cols-2 gap-2.5 mb-4" role="radiogroup" aria-label="Fulfilment method">
            {(['DELIVERY', 'PICKUP'] as const).map(f => (
              <button type="button" key={f} role="radio" aria-checked={fulfilment === f} onClick={() => setFulfilment(f)}
                className={`rounded-xl border-2 p-3.5 text-left transition-colors min-h-[64px] ${fulfilment === f ? 'border-blue bg-blue/5' : 'border-line hover:border-blue/40'}`}>
                <span className="font-bold text-sm block">{f === 'DELIVERY' ? '🚚 Deliver to me' : '🏬 Pick up in Osu'}</span>
                <span className="text-[12px] text-soft">{f === 'DELIVERY' ? (zone ? `${zone.name} · ${zone.etaDays}-2 days` : 'Fee by zone') : shopAddress}</span>
              </button>
            ))}
          </div>

          {fulfilment === 'DELIVERY' && (
            <>
              {me && me.addresses.length > 0 && (
                <div className="mb-4">
                  <label htmlFor="saved-addr" className={labelCls}>Use a saved address</label>
                  <select id="saved-addr" defaultValue="" onChange={e => {
                    const addr = me.addresses.find(x => x.id === e.target.value);
                    if (addr) { setA({ region: addr.region, city: addr.city, landmark: addr.landmark, gps: addr.gps, line: '' }); if (addr.phone) setC(s => ({ ...s, phone: addr.phone })); }
                  }} className={inputCls}>
                    <option value="">Enter a new address ↓</option>
                    {me.addresses.map(addr => <option key={addr.id} value={addr.id}>{addr.label} — {addr.city}, {addr.region}</option>)}
                  </select>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="a-region" className={labelCls}>Region</label>
                  <select id="a-region" value={a.region} onChange={e => setA({ ...a, region: e.target.value, city: '' })} className={inputCls}>
                    {Object.keys(regions).map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="a-city" className={labelCls}>City / Town</label>
                  <input id="a-city" required list="city-list" value={a.city} onChange={e => setA({ ...a, city: e.target.value })} className={inputCls} placeholder={cities[0]} />
                  <datalist id="city-list">{cities.map(ct => <option key={ct} value={ct} />)}</datalist>
                </div>
                <div><label htmlFor="a-line" className={labelCls}>Street / house number (optional)</label><input id="a-line" value={a.line} onChange={e => setA({ ...a, line: e.target.value })} className={inputCls} placeholder="12 Owusu Ave" /></div>
                <div><label htmlFor="a-landmark" className={labelCls}>Landmark</label><input id="a-landmark" required value={a.landmark} onChange={e => setA({ ...a, landmark: e.target.value })} className={inputCls} placeholder="Red gate beside Melcom" /></div>
                <div className="sm:col-span-2">
                  <label htmlFor="a-gps" className={labelCls}>Ghana Post Digital GPS (optional, speeds up riders)</label>
                  <input id="a-gps" value={a.gps} onChange={e => setA({ ...a, gps: e.target.value.toUpperCase() })} pattern="[A-Za-z]{2}-\d{3}-\d{4}" className={inputCls} placeholder="GA-123-4567" />
                  <p className="text-[11.5px] text-soft mt-1">Format: two letters, dash, 3 digits, dash, 4 digits — check the Ghana Post app.</p>
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="a-zone" className={labelCls}>Delivery zone</label>
                <select id="a-zone" value={zoneId} onChange={e => { setZoneId(e.target.value); localStorage.setItem('ge_zone', e.target.value); }} className={inputCls}>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name} — {ghs(z.fee, { cents: false })}{z.freeOver ? ` · free over ${ghs(z.freeOver)}` : ''} · ~{z.etaDays} day(s)</option>)}
                </select>
              </div>
            </>
          )}
        </section>

        {/* 3 — payment */}
        <section className="card p-5" aria-labelledby="step3">
          <h2 id="step3" className="font-display text-lg font-extrabold mb-4">3 · Payment</h2>
          <div className="space-y-2" role="radiogroup" aria-label="Payment method">
            {enabledMethods.filter(m => METHOD_META[m]).map(m => {
              const meta = METHOD_META[m];
              return (
                <label key={m} className={`flex items-start gap-3 border rounded-xl p-3.5 cursor-pointer transition-colors min-h-[56px] ${method === m ? 'border-blue bg-blue/5 ring-1 ring-blue/30' : 'border-line hover:border-blue/40'}`}>
                  <input type="radio" name="paymethod" value={m} checked={method === m} onChange={() => setMethod(m)} className="mt-1 w-4 h-4 accent-[#1B1B1D]" />
                  <span className="flex-1">
                    <span className="font-bold text-sm">{meta.icon} {meta.label}</span>
                    <span className="block text-[12px] text-soft mt-0.5">{meta.note}</span>
                    {method === m && meta.phonePrompt && (
                      <span className="block mt-2.5">
                        <label htmlFor="momo" className="text-[12px] font-bold block mb-1">MoMo number to receive the prompt</label>
                        <input id="momo" type="tel" value={momoPhone} onChange={e => setMomoPhone(e.target.value)} placeholder={`Leave blank to use ${c.phone || '024 123 4567'}`} className="w-full sm:w-64 border border-line rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy outline-none focus:border-blue min-h-[44px]" />
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      </div>

      {/* summary */}
      <aside className="card p-5 space-y-4 lg:sticky lg:top-20" aria-label="Order summary">
        <h2 className="font-display text-lg font-extrabold">Order summary</h2>
        <ul className="space-y-2 max-h-52 overflow-y-auto text-sm">
          {items.map(i => (
            <li key={`${i.slug}:${i.install ? 'i' : 'n'}`} className="flex gap-2.5 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.image} alt="" width={40} height={32} className="w-10 h-8 object-contain bg-mist dark:bg-navy-700 rounded-md p-0.5 shrink-0" />
              <span className="flex-1 min-w-0 truncate font-semibold">{i.qty} × {i.name}{i.install && <span className="text-blue font-bold"> +install</span>}</span>
              <span className="font-bold whitespace-nowrap">{ghs((i.price * i.qty * (i.install ? 1.1 : 1)))}</span>
            </li>
          ))}
        </ul>
        {coupon && <p className="text-[12.5px] font-bold text-success">✓ Coupon {coupon.code} will be re-verified server-side</p>}
        <dl className="space-y-1.5 text-sm border-t border-line pt-3">
          <div className="flex justify-between"><dt className="text-soft">Subtotal</dt><dd className="font-bold">{ghs(pricing.subtotal)}</dd></div>
          {pricing.discount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd className="font-black">−{ghs(pricing.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-soft">Delivery</dt><dd className="font-bold">{pricing.deliveryFee === 0 ? 'FREE' : `${ghs(pricing.deliveryFee)}`}</dd></div>
          {pricing.levy > 0 && <div className="flex justify-between"><dt className="text-soft">Levy</dt><dd className="font-bold">{ghs(pricing.levy)}</dd></div>}
          {me && me.walletCredit > 0 && (
            <div className="flex justify-between items-center">
              <dt>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gold-dark text-[13px] min-h-[40px]">
                  <input type="checkbox" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} className="w-4 h-4 accent-[#D7FF3E]" />
                  Use referral credit
                </label>
              </dt>
              <dd className="font-black text-gold-dark">−{ghs((useWallet ? pricing.walletUsed : 0))} <span className="text-[11px] font-semibold text-soft">of {ghs(me.walletCredit)}</span></dd>
            </div>
          )}
          <div className="h-px bg-line my-1" />
          <div className="flex justify-between font-display text-lg font-extrabold"><dt>To pay</dt><dd>{ghs(pricing.total)}</dd></div>
          <p className="text-[11px] text-soft">Incl. {ghs(pricing.vatPortion)} VAT. Final totals are computed on our server — this is an estimate.</p>
        </dl>
        {err && <p role="alert" className="text-sm font-semibold text-danger bg-danger/10 rounded-lg px-3 py-2">{err}</p>}
        <button disabled={busy} className="btn-gold w-full !py-4 text-[15px] min-h-[48px]">
          {busy ? 'Placing order…' : method === 'PAY_ON_DELIVERY' ? 'Place order — pay on delivery' : `Pay ${ghs(pricing.total)} securely →`}
        </button>
        <p className="text-[11.5px] text-soft text-center">🔒 Your details never leave GabiElectricals. Demo mode — no real money moves.</p>
      </aside>
    </form>
  );
}
