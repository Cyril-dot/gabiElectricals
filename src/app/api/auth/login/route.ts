import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkPw, createSessionCookie } from '@/lib/auth';
import { recordActivity } from '@/lib/notify';
import { rateLimit, ipOf } from '@/lib/rate-limit';

const Schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: Request) {
  const ip = ipOf(req);
  const rl = rateLimit(`login:${ip}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` }, { status: 429 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.active || !(await checkPw(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Email or password is incorrect. New here? Create an account.' }, { status: 401 });
  }
  await createSessionCookie({ userId: user.id, role: user.role, name: user.name });
  await recordActivity(user.id, 'LOGIN', 'User', user.id, ip);
  return NextResponse.json({ ok: true, name: user.name, role: user.role });
}
