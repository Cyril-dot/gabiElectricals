import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({ status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST']) });

/** PATCH /api/admin/marketing/leads/[id] — move lead through pipeline (status kept in metaJson; Lead has no status column) */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid lead status.');
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return fail('Lead not found.', 404);
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(lead.metaJson) as Record<string, unknown>; } catch { /* fresh */ }
  meta.status = parsed.data.status;
  await prisma.lead.update({ where: { id }, data: { metaJson: JSON.stringify(meta) } });
  await recordActivity(g.user.userId, 'LEAD_STATUS', 'Lead', id, undefined, { status: parsed.data.status });
  return NextResponse.json({ ok: true, id, status: parsed.data.status });
}
