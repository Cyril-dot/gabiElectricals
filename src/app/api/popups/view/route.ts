import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({ id: z.string().min(1), email: z.string().email().optional(), name: z.string().max(80).optional() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  const { id, email, name } = parsed.data;
  await prisma.popup.update({ where: { id }, data: { impressions: { increment: 1 } } }).catch(() => {});
  if (email) {
    await prisma.lead.create({ data: { email, name, source: 'POPUP', popupId: id } }).catch(() => {});
    await prisma.popup.update({ where: { id }, data: { conversions: { increment: 1 } } }).catch(() => {});
    await prisma.subscription.upsert({ where: { email }, create: { email }, update: { active: true } }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
