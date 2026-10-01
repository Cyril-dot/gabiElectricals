import { prisma } from './db';

export type Settings = {
  business: { name: string; tagline: string; phone: string; whatsapp: string; email: string; address: string; gps: string; hours: string };
  tax: { vatPct: number; vatInclusive: boolean; levyPct: number };
  referral: { referrerReward: number; friendReward: number; minOrder: number; minPayout: number; affiliateDefaultPct: number };
  payments: { enabled: Record<string, boolean>; qrExpiryMinutes: number };
  loyalty: { pointsEnabled: boolean; giftCardsEnabled: boolean };
};

export const DEFAULT_SETTINGS: Settings = {
  business: { name: 'GabiElectricals', tagline: 'Premium Power. Trusted Safety. Done Right.', phone: '+233 24 100 2030', whatsapp: '+233 24 100 2030', email: 'hello@gabielectricals.com', address: 'Ghana House, 44 Liberation Link, Osu, Accra', gps: 'DG-123-4567', hours: 'Mon–Sat 7:00–18:00 · Emergency 24/7' },
  tax: { vatPct: 15, vatInclusive: true, levyPct: 2.5 },
  referral: { referrerReward: 20, friendReward: 20, minOrder: 150, minPayout: 100, affiliateDefaultPct: 5 },
  payments: { enabled: { MOMO_MTN: true, MOMO_TELECEL: true, MOMO_AT: true, CARD: true, BANK_TRANSFER: true, GHIPSS: true, QR: true, PAY_ON_DELIVERY: true, MANUAL_TRANSFER: true }, qrExpiryMinutes: 15 },
  loyalty: { pointsEnabled: false, giftCardsEnabled: false },
};

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const out = structuredClone(DEFAULT_SETTINGS) as Settings & Record<string, unknown>;
  for (const r of rows) {
    try { out[r.key] = JSON.parse(r.valueJson); } catch { /* keep default */ }
  }
  return out as Settings;
}

export async function setSetting(key: string, value: unknown) {
  await prisma.setting.upsert({ where: { key }, create: { key, valueJson: JSON.stringify(value) }, update: { valueJson: JSON.stringify(value) } });
}
