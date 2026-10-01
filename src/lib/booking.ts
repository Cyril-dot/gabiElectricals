// Booking pricing + availability engine — Phase 4 services lane.
// All money here is computed SERVER-side from DB rows; client amounts are never trusted.
import { prisma } from './db';
import { round2 } from './money';

export type UrgencyKey = 'STANDARD' | 'URGENT' | 'EMERGENCY';
export const URGENCIES: UrgencyKey[] = ['STANDARD', 'URGENT', 'EMERGENCY'];

export type QuoteEstimate = {
  serviceSlug: string;
  serviceName: string;
  base: number;
  surcharge: number;
  total: number;
  deposit: number;
  depositPct: number;
  urgency: UrgencyKey;
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

/** Absolute GHS surcharge from a service urgencyJson ({STANDARD:0,URGENT:60,...}).
 *  Accepts percentages-by-mistake defensively: if value > base it is treated as absolute anyway. */
export function urgencySurcharge(urgencyJson: string, urgency: UrgencyKey, base: number): number {
  const map = parseJson<Record<string, number>>(urgencyJson, {});
  const v = map?.[urgency];
  if (!Number.isFinite(v) || urgency === 'STANDARD') return 0;
  return round2(Math.max(0, Math.min(v as number, base * 2))); // sanity clamp
}

export async function getQuoteEstimate(serviceId: string, urgency: UrgencyKey): Promise<QuoteEstimate | null> {
  const svc = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!svc) return null;
  return estimateFrom(svc, urgency);
}

function estimateFrom(svc: { slug: string; name: string; basePrice: number; depositPct: number; urgencyJson: string }, urgency: UrgencyKey): QuoteEstimate {
  const base = round2(svc.basePrice);
  const surcharge = urgencySurcharge(svc.urgencyJson, urgency, base);
  const total = round2(base + surcharge);
  const depositPct = svc.depositPct > 0 ? svc.depositPct : 30;
  return {
    serviceSlug: svc.slug, serviceName: svc.name, base, surcharge, total,
    deposit: round2((total * depositPct) / 100), depositPct, urgency,
  };
}

// ─────────────────────────── AVAILABILITY ENGINE ───────────────────────────

export const DEFAULT_SLOTS = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];
export const DEFAULT_CAPACITY = 3;

export type SlotDay = {
  date: string;            // YYYY-MM-DD
  weekday: number;         // 0=Sun
  blocked: boolean;
  blockedReason?: string;
  slots: { slot: string; capacity: number; booked: number; remaining: number }[];
  totalRemaining: number;
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dayStart(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Free-slot computation for a service over N days starting at `from`.
 * SlotCapacity rows match by dayOfWeek; service-specific rows override global ones.
 * Fallback: default 08:00–18:00 in 2h windows with capacity 3.
 * Subtracts: non-cancelled bookings on that date+slot, and BlockedDate entries.
 */
export async function getAvailability(serviceSlug: string, fromStr: string, days: number, excludeBookingId?: string): Promise<SlotDay[]> {
  const daysN = Math.min(Math.max(days || 14, 1), 60);
  let start = dayStart(fromStr);
  if (Number.isNaN(start.getTime())) start = new Date();
  start.setHours(0, 0, 0, 0);
  if (start < new Date(new Date().setHours(0, 0, 0, 0))) { const n = new Date(); n.setHours(0, 0, 0, 0); start = n; }
  const end = new Date(start); end.setDate(end.getDate() + daysN - 1); end.setHours(23, 59, 59, 999);

  const service = await prisma.service.findUnique({ where: { slug: serviceSlug }, select: { id: true } });

  const [caps, blocked, booked] = await Promise.all([
    prisma.slotCapacity.findMany({ where: service ? { OR: [{ serviceId: null }, { serviceId: service.id }] } : { serviceId: null } }),
    prisma.blockedDate.findMany({
      where: {
        date: { gte: new Date(start.getTime() - 12 * 3600_000), lte: end },
        OR: [{ serviceId: null }, ...(service ? [{ serviceId: service.id }] : [])],
      },
    }),
    prisma.booking.findMany({
      where: {
        status: { not: 'CANCELLED' },
        date: { gte: start, lte: end },
        ...(service ? { serviceId: service.id } : {}),
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { date: true, timeSlot: true },
    }),
  ]);

  const bookedMap = new Map<string, number>(); // `${ymd}|${slot}` -> count
  for (const b of booked) bookedMap.set(`${ymd(new Date(b.date))}|${b.timeSlot}`, (bookedMap.get(`${ymd(new Date(b.date))}|${b.timeSlot}`) ?? 0) + 1);

  const out: SlotDay[] = [];
  for (let i = 0; i < daysN; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    const key = ymd(d);
    // prefer service-specific capacity row for the weekday, then global
    const cap = caps.filter(c => c.dayOfWeek === dow).sort((a, b) => (a.serviceId ? -1 : 1) - (b.serviceId ? -1 : 1))[0];
    const slotList = cap ? parseJson<string[]>(cap.slotsJson, DEFAULT_SLOTS) : DEFAULT_SLOTS;
    const capacity = cap?.capacity ?? DEFAULT_CAPACITY;
    const block = blocked.find(b => ymd(new Date(b.date)) === key);
    const slots = slotList.map(slot => {
      const used = bookedMap.get(`${key}|${slot}`) ?? 0;
      const remaining = Math.max(0, capacity - used);
      return { slot, capacity, booked: used, remaining };
    });
    out.push({
      date: key, weekday: dow, blocked: !!block, blockedReason: block?.reason ?? undefined,
      slots, totalRemaining: block ? 0 : slots.reduce((s, x) => s + x.remaining, 0),
    });
  }
  return out;
}

/** True when the exact service/date/slot still has room (used to validate create + reschedule). */
export async function slotIsOpen(serviceSlug: string, dateStr: string, slot: string, excludeBookingId?: string): Promise<boolean> {
  const days = await getAvailability(serviceSlug, dateStr, 1, excludeBookingId);
  const day = days[0];
  if (!day || day.blocked) return false;
  const s = day.slots.find(x => x.slot === slot);
  return !!s && s.remaining > 0;
}

export const URGENT_LABEL: Record<UrgencyKey, string> = {
  STANDARD: 'Standard', URGENT: 'Urgent', EMERGENCY: 'Emergency',
};
