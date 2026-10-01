import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const events = await prisma.orderEvent.findMany({ where: { orderId: id }, orderBy: { at: 'asc' } });
  return NextResponse.json(events.map(e => ({ id: e.id, status: e.status, note: e.note, at: e.at.toISOString() })));
}
