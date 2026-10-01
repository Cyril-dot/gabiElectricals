import { round2 } from './money';

export type PricingLine = { price: number; qty: number; install?: boolean };
export type PricingInput = {
  lines: PricingLine[];
  installFeePct?: number; // installation add-on % on line price
  coupon?: { type: 'PERCENT' | 'FIXED' | 'FREE_DELIVERY'; value: number; minSpend: number; maxDiscount?: number | null } | null;
  zoneFee?: number;
  freeOver?: number; // order value that waives delivery
  fulfilment?: 'DELIVERY' | 'PICKUP';
  vatPct?: number; // applied inclusively (prices are VAT-inclusive retail)
  levyPct?: number; // added on top
  walletAvailable?: number;
  walletUse?: number;
};
export type PricingResult = {
  subtotal: number; discount: number; deliveryFee: number;
  vatPortion: number; levy: number; walletUsed: number; total: number;
};

export function priceOrder(i: PricingInput): PricingResult {
  const installPct = i.installFeePct ?? 10;
  const gross = i.lines.reduce((s, l) => s + l.price * l.qty * (l.install ? 1 + installPct / 100 : 1), 0);
  const subtotal = round2(gross);
  const baseZone = i.fulfilment === 'PICKUP' ? 0 : i.zoneFee ?? 0;
  const freeShip = (i.freeOver ?? Infinity) <= subtotal;
  let discount = 0;
  let deliveryFee = freeShip ? 0 : baseZone;
  const c = i.coupon;
  if (c && subtotal >= c.minSpend) {
    if (c.type === 'PERCENT') discount = round2(Math.min(subtotal * (c.value / 100), c.maxDiscount ?? Infinity));
    if (c.type === 'FIXED') discount = round2(Math.min(c.value, subtotal - discount));
    if (c.type === 'FREE_DELIVERY') deliveryFee = 0;
  }
  const net = subtotal - discount;
  const vatPct = i.vatPct ?? 15;
  const vatPortion = round2(net - net / (1 + vatPct / 100)); // inclusive
  const levy = round2(net * ((i.levyPct ?? 0) / 100));
  const walletCap = Math.min(i.walletUse ?? 0, i.walletAvailable ?? 0, net + levy + deliveryFee);
  const walletUsed = round2(Math.max(0, walletCap));
  const total = round2(Math.max(0, net + levy + deliveryFee - walletUsed));
  return { subtotal, discount, deliveryFee, vatPortion, levy, walletUsed, total };
}

export function margin(cost: number, sell: number, compareAt?: number | null) {
  const gross = sell - cost;
  return {
    gross: round2(gross),
    pct: sell > 0 ? round2((gross / sell) * 100) : 0,
    strikePct: compareAt && compareAt > sell ? round2(((compareAt - sell) / compareAt) * 100) : 0,
  };
}
