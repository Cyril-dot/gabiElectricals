import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { initiatePayment, type GatewayMethod } from '@/lib/gateway';
import { normalizeGhPhone } from '@/lib/ghana';
import { rateLimit, ipOf } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

async function loadLink(code: string) {
  return prisma.paymentLink.findUnique({
    where: { code: code.toUpperCase() },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
}

function publicInfo(link: Awaited<ReturnType<typeof loadLink>>) {
  if (!link) return null;
  const paid = link.payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const expired = !!link.expiresAt && link.expiresAt < new Date();
  return {
    code: link.code,
    label: link.label,
    description: link.description,
    amount: link.amount,
    flexible: link.amount === 0,
    status: expired && link.status === 'ACTIVE' ? 'EXPIRED' : link.status,
    forType: link.forType,
    paid,
    balance: Math.max(0, Math.round((link.amount - paid) * 100) / 100),
  };
}

/** GET /api/paylinks/[code] — public link details for the hosted pay page */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const link = await loadLink(code);
  if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  return NextResponse.json({ link: publicInfo(link) });
}

const PaySchema = z.object({
  method: z.enum(['MOMO_MTN', 'MOMO_TELECEL', 'MOMO_AT', 'CARD', 'BANK_TRANSFER', 'GHIPSS', 'QR', 'MANUAL_TRANSFER']),
  phone: z.string().trim().optional(),
  email: z.string().email().optional(),
  amount: z.number().min(1).max(1_000_000).optional(), // for flexible links
});

/** POST /api/paylinks/[code] — payer initiates payment against the link */
export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const rl = rateLimit(`paylink:${ipOf(req)}`, 12, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` }, { status: 429 });

  const link = await loadLink(code);
  if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  if (link.status !== 'ACTIVE' || (link.expiresAt && link.expiresAt < new Date())) {
    return NextResponse.json({ error: 'This payment link is no longer active.' }, { status: 410 });
  }

  const parsed = PaySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payment request.' }, { status: 400 });
  const d = parsed.data;

  const paid = link.payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const due = link.amount === 0 ? (d.amount ?? 0) : Math.max(0.01, Math.round((link.amount - paid) * 100) / 100);
  if (link.amount > 0 && paid >= link.amount - 0.01) return NextResponse.json({ error: 'Already paid in full.' }, { status: 409 });
  if (due <= 0) return NextResponse.json({ error: 'Enter a valid amount.' }, { status: 400 });

  const phone = d.phone ? normalizeGhPhone(d.phone) : null;
  if (d.method.startsWith('MOMO') && !phone) {
    return NextResponse.json({ error: 'Enter a valid MoMo number (e.g. 024 123 4567).' }, { status: 400 });
  }
  const email = d.email ?? 'guest@gabielectricals.com';

  const res = await initiatePayment({
    amount: due, email, phone: phone ?? undefined, method: d.method as GatewayMethod,
    linkId: link.id, meta: { linkCode: link.code, linkLabel: link.label, forType: link.forType, forId: link.forId },
  });
  return NextResponse.json({ ok: true, reference: res.reference, status: res.status, prompt: res.prompt, qrPayload: res.qrPayload, pollUrl: res.pollUrl, expiresAt: res.expiresAt, amount: due });
}
