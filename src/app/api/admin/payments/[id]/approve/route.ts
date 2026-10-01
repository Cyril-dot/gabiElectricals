import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { applyPaidSideEffects } from '@/lib/gateway';
import { logNotify, recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({ action: z.enum(['APPROVE', 'REJECT']), note: z.string().max(300).optional() });

/** POST /api/admin/payments/[id]/approve — AWAITING_APPROVAL → PAID (+ side effects) or FAILED */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid payload.');
  const { action, note } = parsed.data;

  const p = await prisma.payment.findUnique({ where: { id } });
  if (!p) return fail('Payment not found.', 404);
  if (p.status !== 'AWAITING_APPROVAL') return fail('Payment is not awaiting approval.');

  if (action === 'APPROVE') {
    await prisma.payment.update({
      where: { id: p.id },
      data: { status: 'PAID', confirmedAt: new Date(), events: { create: [{ type: 'SUCCESS', note: `Transfer approved by admin${note ? `: ${note}` : ''}` }] } },
    });
    await applyPaidSideEffects(p.id);
    await recordActivity(g.user.userId, 'PAYMENT_APPROVED', 'Payment', p.id);
  } else {
    await prisma.payment.update({
      where: { id: p.id },
      data: { status: 'FAILED', metaJson: JSON.stringify({ reason: note ?? 'Rejected by admin' }), events: { create: [{ type: 'FAILED', note: note ?? 'Rejected by admin' }] } },
    });
    if (p.payerPhone) await logNotify('SMS', p.payerPhone, 'TRANSFER_REJECTED', `GabiElectricals: Your transfer for ${p.reference} was not verified (${note ?? 'contact us'}). Please retry.`);
    await recordActivity(g.user.userId, 'PAYMENT_REJECTED', 'Payment', p.id);
  }
  return NextResponse.json({ ok: true, id: p.id, status: action === 'APPROVE' ? 'PAID' : 'FAILED' });
}
