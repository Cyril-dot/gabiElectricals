import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole, isStaff } from '@/lib/auth';
import { logNotify, recordActivity } from '@/lib/notify';
import { round2 } from '@/lib/money';

export const dynamic = 'force-dynamic';

const Item = z.object({ label: z.string().min(1).max(120), qty: z.number().int().min(1).max(999), amount: z.number().min(0).max(1_000_000) });
const Schema = z.object({
  customerName: z.string().min(2).max(80),
  customerPhone: z.string().min(7).max(20),
  customerEmail: z.union([z.string().email(), z.literal('')]).optional(),
  description: z.string().min(5).max(2000),
  items: z.array(Item).min(1).max(50),
  validUntil: z.string().optional(), // ISO date
  bookingId: z.string().optional(),
});

/** POST /api/quotes — staff create; amount is recomputed SERVER-side from items */
export async function POST(req: NextRequest) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'); }
  catch { return NextResponse.json({ error: 'Staff login required' }, { status: 401 }); }

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return NextResponse.json({ error: i ? `${i.path.join('.')}: ${i.message}` : 'Invalid quote' }, { status: 422 });
  }
  const d = parsed.data;
  const amount = round2(d.items.reduce((s, it) => s + it.qty * it.amount, 0));
  const c = await prisma.quote.count();
  const quoteNo = `GQ-${new Date().getFullYear()}-${3100 + c}`;

  const quote = await prisma.quote.create({
    data: {
      quoteNo, customerName: d.customerName, customerPhone: d.customerPhone, customerEmail: d.customerEmail || null,
      description: d.description, itemsJson: JSON.stringify(d.items), amount, status: 'DRAFT',
      validUntil: d.validUntil ? new Date(d.validUntil) : new Date(Date.now() + 14 * 86400_000),
      bookingId: d.bookingId || null,
    },
  });
  await recordActivity(null, 'QUOTE_CREATED', 'QUOTE', quote.id, undefined, { quoteNo, amount });
  return NextResponse.json({ ok: true, id: quote.id, quoteNo: quote.quoteNo, amount }, { status: 201 });
}
