import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';
import { hashPw, createSessionCookie } from '@/lib/auth';
import { recordActivity, logNotify } from '@/lib/notify';
import { rateLimit, ipOf } from '@/lib/rate-limit';
import { normalizeGhPhone } from '@/lib/ghana';

const Schema = z.object({
  name: z.string().trim().min(2, 'Please tell us your full name'),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  referralCode: z.string().trim().optional(),
});

async function uniqueCode() {
  for (let i = 0; i < 8; i++) {
    const code = randomBytes(3).toString('hex').toUpperCase();
    const exists = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
  return randomBytes(6).toString('hex').toUpperCase();
}

export async function POST(req: Request) {
  const ip = ipOf(req);
  const rl = rateLimit(`register:${ip}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` }, { status: 429 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });

  const { name, password, referralCode } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const phone = parsed.data.phone ? normalizeGhPhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) return NextResponse.json({ error: 'Enter a valid Ghana number, e.g. 024 123 4567 or +233…' }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: 'That email already has an account — sign in instead.' }, { status: 409 });

  let referredById: string | undefined;
  if (referralCode) {
    const ref = await prisma.user.findUnique({ where: { referralCode: referralCode.toUpperCase() } });
    if (ref) referredById = ref.id;
  }

  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash: await hashPw(password), referralCode: await uniqueCode(), referredById },
  });

  if (referredById) {
    await prisma.referralVisit.create({ data: { code: referralCode!.toUpperCase(), referrerId: referredById, fingerprint: `reg:${ip}`, converted: true } });
    const reward = referredById ? 20 : 0;
    if (reward > 0) {
      const referrer = await prisma.user.update({ where: { id: referredById }, data: { walletCredit: { increment: reward } } });
      await prisma.ledgerEntry.create({ data: { userId: referredById, amount: reward, reason: 'REFERRAL_BONUS', refType: 'REFERRAL', refId: user.id, balanceAfter: referrer.walletCredit } });
    }
    await prisma.user.update({ where: { id: user.id }, data: { walletCredit: { increment: 20 } } });
    await prisma.ledgerEntry.create({ data: { userId: user.id, amount: 20, reason: 'ORDER_REWARD', refType: 'REFERRAL', refId: referredById, balanceAfter: 20 } });
  }

  await createSessionCookie({ userId: user.id, role: user.role, name: user.name });
  await recordActivity(user.id, 'REGISTER', 'User', user.id, ip);
  await logNotify('EMAIL', email, 'WELCOME', `Welcome to GabiElectricals, ${name.split(' ')[0]}! Your account is ready — ₵20 starter credit${referredById ? ' (via referral)' : ''}.`);
  return NextResponse.json({ ok: true, name: user.name, role: user.role });
}
