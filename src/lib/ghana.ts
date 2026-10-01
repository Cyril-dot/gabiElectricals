// Ghana-specific helpers: regions/cities, mobile number + Ghana Post GPS validation.

export const REGIONS: Record<string, string[]> = {
  'Greater Accra': ['Accra', 'Tema', 'Madina', 'Kasoa', 'Spintex', 'East Legon', 'Adenta', 'Achimota', 'Lashon'],
  'Ashanti': ['Kumasi', 'Ejisu', 'Obuasi'],
  'Western': ['Takoradi', 'Tarkwa', 'Sekondi'],
  'Central': ['Cape Coast', 'Winneba', 'Kumador'],
  'Northern': ['Tamale', 'Yendi', 'Savelugu'],
  'Eastern': ['Koforidua', 'Nkawkaw', 'Suhum'],
  'Volta': ['Ho', 'Hohoe', 'Keta'],
  'Bono': ['Sunyani', 'Techiman', 'Berekum'],
};

/** Normalize then validate a Ghana mobile number: 0XXXXXXXXX / +233XXXXXXXXX / 233XXXXXXXXX */
export function normalizeGhPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '');
  let nat = digits;
  if (nat.startsWith('+233')) nat = '0' + nat.slice(4);
  else if (nat.startsWith('00233')) nat = '0' + nat.slice(5);
  else if (nat.startsWith('233') && nat.length === 12) nat = '0' + nat.slice(3);
  if (!/^0[2357][0-9]\d{7}$/.test(nat)) return null;
  return nat;
}

export function toE164(nat: string): string {
  return '+233' + nat.slice(1);
}

/** Ghana Post digital GPS: two letters (region), 3 digits, 4 digits — e.g. GA-123-4567 or GT-123-4567 */
export const GHGPS_RE = /^[A-Za-z]{2}-\d{3}-\d{4}$/;

export function waDigits(whatsapp: string): string {
  return whatsapp.replace(/[^\d]/g, '').replace(/^0/, '');
}

export function jsonArr<T = string>(raw: string | null | undefined): T[] {
  try {
    const v = JSON.parse(raw ?? '[]');
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}
