import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logNotify, recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  commissionPct: z.number().min(1).max(50).optional(),
});

/** POST /api/admin/affiliate/[id] — approve → user role AFFILIATE + commissionPct; reject */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid payload.');
  const app = await prisma.affiliateApplication.findUnique({ where: { id } });
  if (!app) return fail('Application not found.', 404);
  if (app.status !== 'PENDING') return fail('Application already processed.');
  const applicant = await prisma.user.findUnique({ where: { id: app.userId } });
  if (!applicant) return fail('Applicant user missing.', 404);

  if (parsed.data.action === 'APPROVE') {
    const pct = parsed.data.commissionPct ?? app.commissionPct;
    await prisma.affiliateApplication.update({ where: { id }, data: { status: 'APPROVED', commissionPct: pct } });
    if (applicant.role !== 'SUPER_ADMIN' && applicant.role !== 'ADMIN') await prisma.user.update({ where: { id: applicant.id }, data: { role: 'AFFILIATE', commissionPct: pct, tier: applicant.tier ?? 'BRONZE' } });
    await logNotify('EMAIL', applicant.email, 'AFFILIATE_APPROVED', `Welcome to the GabiElectricals affiliate programme — your ${pct}% commission is live. Track earnings: ${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/refer`);
    await recordActivity(g.user.userId, 'AFFILIATE_APPROVED', 'AffiliateApplication', id);
  } else {
    await prisma.affiliateApplication.update({ where: { id }, data: { status: 'REJECTED' } });
    await logNotify('EMAIL', applicant.email, 'AFFILIATE_REJECTED', 'GabiElectricals: we could not approve your affiliate application right now. Reply to this note to discuss.');
    await recordActivity(g.user.userId, 'AFFILIATE_REJECTED', 'AffiliateApplication', id);
  }
  return NextResponse.json({ ok: true, id });
}
