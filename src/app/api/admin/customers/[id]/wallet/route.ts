import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { recordActivity } from '@/lib/notify';
import { rateLimit, ipOf } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be positive').max(100000),
  direction: z.enum(['credit', 'debit']),
  reason: z.string().trim().min(3).max(200),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  let session;
  try { session = await requireRole('ADMIN', 'SUPER_ADMIN'); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ip = ipOf(req);
  const rl = rateLimit(`admin:wallet:${ip}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { id } = await ctx.params;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid adjustment' }, { status: 400 });
  const { amount, direction, reason } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const delta = direction === 'credit' ? amount : -amount;
  const balanceAfter = Math.round((user.walletCredit + delta) * 100) / 100;
  if (balanceAfter < 0) return NextResponse.json({ error: `Debit exceeds wallet balance (${user.walletCredit.toFixed(2)})` }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { walletCredit: balanceAfter } }),
    prisma.ledgerEntry.create({ data: { userId: id, amount: delta, reason: 'ADMIN_ADJUST', refType: 'ADMIN', refId: session.userId, balanceAfter } }),
  ]);
  await recordActivity(session.userId, direction === 'credit' ? 'WALLET_CREDIT' : 'WALLET_DEBIT', 'USER', id, ip, { amount, reason });
  return NextResponse.json({ ok: true, balanceAfter });
}
