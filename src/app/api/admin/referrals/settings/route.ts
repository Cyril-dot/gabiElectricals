import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSettings, setSetting } from '@/lib/settings';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({
  referrerReward: z.number().min(0).max(1000),
  friendReward: z.number().min(0).max(1000),
  minOrder: z.number().min(0).max(100000),
  minPayout: z.number().min(0).max(10000),
  affiliateDefaultPct: z.number().min(0).max(50),
});

/** POST /api/admin/referrals/settings — edit referral programme settings */
export async function POST(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid referral settings.');
  const current = await getSettings();
  await setSetting('referral', { ...current.referral, ...parsed.data });
  await recordActivity(g.user.userId, 'REFERRAL_SETTINGS_UPDATED', 'Setting', 'referral');
  return NextResponse.json({ ok: true });
}
