import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { setSetting } from '@/lib/settings';
import { recordActivity } from '@/lib/notify';
import { rateLimit, ipOf } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = ['business', 'tax', 'referral', 'payments', 'loyalty', 'notificationTemplates'];

const Schema = z.object({
  key: z.string().min(1).max(60),
  value: z.unknown(),
});

export async function PATCH(req: Request) {
  let session;
  try { session = await requireRole('ADMIN', 'SUPER_ADMIN'); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ip = ipOf(req);
  const rl = rateLimit(`admin:settings:${ip}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  const { key, value } = parsed.data;
  if (!ALLOWED_KEYS.includes(key)) return NextResponse.json({ error: `Setting "${key}" cannot be edited here` }, { status: 400 });
  const size = JSON.stringify(value ?? null).length;
  if (size > 20_000) return NextResponse.json({ error: 'Setting value too large' }, { status: 413 });

  await setSetting(key, value);
  await recordActivity(session.userId, 'SETTING_UPDATED', 'SETTING', key, ip, { bytes: size });
  return NextResponse.json({ ok: true });
}
