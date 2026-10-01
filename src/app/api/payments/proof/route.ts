import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { rateLimit, ipOf } from '@/lib/rate-limit';
import { ghs } from '@/lib/money';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  reference: z.string().min(6).max(40),
  proofPath: z.string().min(3).max(300),
  note: z.string().max(200).optional(),
});

/** POST /api/payments/proof — payer uploads manual-transfer proof; awaits admin approval */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`proof:${ipOf(req)}`, 8, 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });

  const p = await prisma.payment.findUnique({ where: { reference: parsed.data.reference } });
  if (!p) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  if (p.status === 'PAID') return NextResponse.json({ error: 'Already paid.' }, { status: 409 });

  await prisma.payment.update({
    where: { id: p.id },
    data: {
      status: 'AWAITING_APPROVAL',
      proofImage: parsed.data.proofPath,
      metaJson: JSON.stringify({ ...safeMeta(p.metaJson), proofNote: parsed.data.note ?? null }),
      events: { create: [{ type: 'PENDING', note: 'Transfer proof uploaded — awaiting approval' }] },
    },
  });
  const { logNotify } = await import('@/lib/notify');
  await logNotify('EMAIL', process.env.ADMIN_EMAIL ?? 'admin@gabielectricals.com', 'PAYMENT_APPROVAL_REQUEST', `Manual transfer proof uploaded for ${p.reference} (${ghs(p.amount)}). Approve in Admin → Payments.`);
  return NextResponse.json({ ok: true, status: 'AWAITING_APPROVAL' });
}

function safeMeta(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}
