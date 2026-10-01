import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma, DEMO_MODE } from '@/lib/db';
import { logNotify, recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({
  items: z.array(z.object({ label: z.string().min(1).max(120), qty: z.number().int().min(1).max(999), amount: z.number().min(0).max(1000000) })).max(30).optional(),
  status: z.enum(['SENT', 'ACCEPTED', 'DECLINED', 'PAID', 'EXPIRED']).optional(),
  validUntil: z.string().nullable().optional(),
});

/** PATCH /api/admin/quotes/[id] — edit line items (amount recomputed), advance status; SENT mints a QUOTE payment link */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid quote update.');
  const d = parsed.data;
  const q = await prisma.quote.findUnique({ where: { id } });
  if (!q) return fail('Quote not found.', 404);

  const data: Record<string, unknown> = {};
  if (d.items) {
    data.itemsJson = JSON.stringify(d.items);
    data.amount = Math.round(d.items.reduce((a, i) => a + i.qty * i.amount, 0) * 100) / 100;
  }
  if (d.validUntil !== undefined) data.validUntil = d.validUntil ? new Date(d.validUntil) : null;

  let payUrl: string | null = null;
  let payCode: string | null = null;
  if (d.status) {
    if (d.status === 'SENT' && !['DRAFT'].includes(q.status) && q.status !== 'SENT') return fail(`Cannot send a ${q.status} quote.`);
    data.status = d.status;
    if (d.status === 'SENT') {
      const link = await prisma.paymentLink.findFirst({ where: { forType: 'QUOTE', forId: q.id } });
      if (!link) {
        const amount = (data.amount as number) ?? q.amount;
        const created = await prisma.paymentLink.create({
          data: {
            code: randomBytes(4).toString('hex').toUpperCase(), label: `Quote ${q.quoteNo}`, description: q.description.slice(0, 200),
            amount, forType: 'QUOTE', forId: q.id, createdBy: g.user.userId,
            expiresAt: q.validUntil ?? new Date(Date.now() + 7 * 864e5), qrSeed: randomBytes(8).toString('hex'),
          },
        });
        payCode = created.code;
      } else if (link.status !== 'PAID') {
        await prisma.paymentLink.update({ where: { id: link.id }, data: { amount: (data.amount as number) ?? q.amount } });
        payCode = link.code;
      }
      if (payCode) payUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? (DEMO_MODE ? 'http://localhost:3000' : '')}/pay/${payCode}`;
      const to = q.customerPhone || q.customerEmail;
      if (to) await logNotify(q.customerPhone ? 'SMS' : 'EMAIL', to, 'QUOTE_SENT', `GabiElectricals quote ${q.quoteNo}: GHS ${((data.amount as number) ?? q.amount).toFixed(2)}. Pay here: ${payUrl ?? 'we will call you'}`);
    }
    if (d.status === 'ACCEPTED' || d.status === 'DECLINED') {
      await prisma.paymentLink.updateMany({ where: { forType: 'QUOTE', forId: q.id }, data: { status: d.status === 'ACCEPTED' ? 'ACTIVE' : 'CANCELLED' } });
      if (q.customerPhone) await logNotify('WHATSAPP', q.customerPhone, `QUOTE_${d.status}`, `GabiElectricals: quote ${q.quoteNo} marked ${d.status}.`);
    }
    if (d.status === 'PAID') await prisma.paymentLink.updateMany({ where: { forType: 'QUOTE', forId: q.id }, data: { status: 'PAID' } });
  }

  const updated = await prisma.quote.update({ where: { id }, data: data as never });
  await recordActivity(g.user.userId, 'QUOTE_UPDATED', 'Quote', id, undefined, { status: d.status, items: !!d.items });
  return NextResponse.json({ ok: true, id, amount: updated.amount, status: updated.status, payUrl, payCode });
}
