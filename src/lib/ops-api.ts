import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { rateLimit, ipOf } from '@/lib/rate-limit';

export async function staff(req: Request, roles: string[] = ['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN']) {
  const user = await requireRole(...roles).catch(() => null);
  if (!user) return { res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  const ip = ipOf(req);
  const rl = rateLimit(`ops:${user.userId}:${new URL(req.url).pathname}`, 10, 60_000);
  if (!rl.ok) return { res: NextResponse.json({ error: `Too many requests. Retry in ${rl.retryAfterSec}s.` }, { status: 429 }) } as const;
  return { user, ip } as const;
}

export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
export const ok = (data: object = {}) => NextResponse.json({ ok: true, ...data });

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
