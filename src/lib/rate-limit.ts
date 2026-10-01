// Naive in-memory fixed-window rate limiter (per-process; fine for demo/single node).
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= limit) return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  b.count++;
  return { ok: true, retryAfterSec: 0 };
}

// keep the map from growing unbounded
if (buckets.size > 10_000) {
  for (const [k, v] of buckets) if (v.resetAt <= Date.now()) buckets.delete(k);
}

export function ipOf(req: Request): string {
  const h = req.headers;
  return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || '127.0.0.1';
}
