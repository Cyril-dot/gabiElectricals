import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logNotify } from '@/lib/notify';

const Schema = z.object({ email: z.string().trim().email(), source: z.string().max(20).optional() });

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.subscription.findUnique({ where: { email } });
  if (existing) {
    if (!existing.active) await prisma.subscription.update({ where: { email }, data: { active: true } });
    return NextResponse.json({ ok: true, already: true });
  }
  await prisma.subscription.create({ data: { email } });
  await prisma.lead.create({ data: { email, source: parsed.data.source ?? 'NEWSLETTER' } });
  await logNotify('EMAIL', email, 'NEWSLETTER_WELCOME', 'You are on the Power Notes list — genuine gear tips and member-only deals from GabiElectricals.');
  return NextResponse.json({ ok: true });
}
