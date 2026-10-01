import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(2).max(80), phone: z.string().min(9).max(17), audience: z.string().min(10).max(800) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check name, phone and audience fields' }, { status: 400 });
  const s = await getSession();
  await prisma.affiliateApplication.create({ data: { ...parsed.data, userId: s?.userId ?? 'guest', status: 'PENDING' } });
  return NextResponse.json({ ok: true });
}
