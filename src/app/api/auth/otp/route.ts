import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomInt } from 'node:crypto';
import { prisma, DEMO_MODE } from '@/lib/db';
import { createSessionCookie, hashPw, checkPw } from '@/lib/auth';
import { logNotify, recordActivity } from '@/lib/notify';
import { rateLimit, ipOf } from '@/lib/rate-limit';

const Schema = z.object({
  action: z.enum(['send', 'verify', 'reset']),
  email: z.string().trim().email(),
  code: z.string().trim().optional(),
  password: z.string().min(8).optional(),
  purpose: z.enum(['LOGIN', 'RESET']).default('LOGIN'),
});

export async function POST(req: Request) {
  const ip = ipOf(req);
  const rl = rateLimit(`otp:${ip}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` }, { status: 429 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { action, code, purpose } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return NextResponse.json({ error: 'No account found for that email.' }, { status: 404 });

  if (action === 'send') {
    const otp = String(randomInt(100000, 999999));
    await prisma.user.update({ where: { id: user.id }, data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 10 * 60_000) } });
    const body = `GabiElectricals: your ${purpose === 'RESET' ? 'password reset' : 'sign-in'} code is ${otp}. It expires in 10 minutes. Never share it.`;
    await logNotify(user.phone ? 'SMS' : 'EMAIL', user.phone ?? user.email, 'OTP', body, user.id);
    await recordActivity(user.id, 'OTP_SENT', 'User', user.id, ip);
    // demo convenience: surface the code in the response since delivery is simulated
    return NextResponse.json({ ok: true, sentTo: user.phone ? `${user.phone.slice(0, 5)}•••${user.phone.slice(-2)}` : email, demoCode: DEMO_MODE ? otp : undefined });
  }

  if (action === 'verify') {
    if (!code) return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 });
    if (user.otpCode !== code || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return NextResponse.json({ error: 'Wrong or expired code. Request a new one.' }, { status: 400 });
    }
    await prisma.user.update({ where: { id: user.id }, data: { otpCode: null, otpExpiresAt: null } });
    if (purpose === 'LOGIN') {
      await createSessionCookie({ userId: user.id, role: user.role, name: user.name });
      await recordActivity(user.id, 'LOGIN_OTP', 'User', user.id, ip);
    }
    return NextResponse.json({ ok: true, purpose });
  }

  // action === 'reset'
  if (!code || !parsed.data.password) return NextResponse.json({ error: 'Code and new password are required.' }, { status: 400 });
  if (user.otpCode !== code || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    return NextResponse.json({ error: 'Wrong or expired code. Request a new one.' }, { status: 400 });
  }
  if (await checkPw(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: 'New password must differ from the old one.' }, { status: 400 });
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPw(parsed.data.password), otpCode: null, otpExpiresAt: null } });
  await logNotify('EMAIL', user.email, 'PASSWORD_CHANGED', `Your GabiElectricals password was reset. If this wasn't you, call +233 24 100 2030 now.`);
  await recordActivity(user.id, 'PASSWORD_RESET', 'User', user.id, ip);
  return NextResponse.json({ ok: true });
}
