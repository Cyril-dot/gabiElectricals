import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({ id: z.string().min(1), email: z.string().email().optional() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  await prisma.popup.update({ where: { id: parsed.data.id }, data: { conversions: { increment: 1 } } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
