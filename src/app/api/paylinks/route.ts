import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma, DEMO_MODE } from '@/lib/db';
import { requireRole, isStaff } from '@/lib/auth';

const Schema = z.object({
  label: z.string().min(2).max(80),
  description: z.string().max(240).optional(),
  amount: z.number().min(0).max(1_000_000).default(0), // 0 = payer enters amount
  forType: z.enum(['ORDER', 'BOOKING', 'QUOTE', 'CUSTOM']).default('CUSTOM'),
  forId: z.string().optional(),
  expiresInMin: z.number().int().min(5).max(60 * 24 * 30).optional(),
});

/** POST /api/paylinks — staff (admin/technician) generates a shareable payment link + QR */
export async function POST(req: Request) {
  const user = await requireRole('ADMIN', 'SUPER_ADMIN', 'TECHNICIAN').catch(() => null);
  if (!user || !isStaff(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid link payload.' }, { status: 400 });
  const d = parsed.data;

  const code = randomBytes(4).toString('hex').toUpperCase(); // e.g. /pay/3F9A1C22
  const link = await prisma.paymentLink.create({
    data: {
      code,
      label: d.label,
      description: d.description,
      amount: d.amount,
      forType: d.forType,
      forId: d.forId,
      createdBy: user.userId,
      expiresAt: d.expiresInMin ? new Date(Date.now() + d.expiresInMin * 60_000) : null,
      qrSeed: randomBytes(8).toString('hex'),
    },
  });
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? (DEMO_MODE ? 'http://localhost:3000' : '')}/pay/${link.code}`;
  return NextResponse.json({ ok: true, code: link.code, url });
}
