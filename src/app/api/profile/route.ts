import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession, hashPw, checkPw } from '@/lib/auth';
import { logNotify, recordActivity } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email().optional(),
  oldPassword: z.string().min(6).optional(),
  newPassword: z.string().min(8).max(100).optional(),
});

const GH_PHONE = /^(\+?233|0)(24|25|54|55|59|27|26|2\d|3\d)[0-9]{7}$/;

/** PATCH /api/profile — edit name/phone/email and change password */
export async function PATCH(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid profile data' }, { status: 422 });
  const { name, phone, email, oldPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: s.userId } });
  if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (name) data.name = name.trim();
  if (email) {
    const taken = await prisma.user.findFirst({ where: { email: email.toLowerCase(), NOT: { id: s.userId } } });
    if (taken) return NextResponse.json({ error: 'That email belongs to another account' }, { status: 409 });
    data.email = email.toLowerCase();
  }
  if (phone) {
    if (phone && !GH_PHONE.test(phone.replace(/\s/g, ''))) return NextResponse.json({ error: 'Enter a valid Ghana phone number' }, { status: 422 });
    data.phone = phone.replace(/\s/g, '');
  }

  if (newPassword) {
    if (!oldPassword) return NextResponse.json({ error: 'Enter your current password to change it' }, { status: 422 });
    const ok = await checkPw(oldPassword, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 422 });
    data.passwordHash = await hashPw(newPassword);
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 422 });

  const updated = await prisma.user.update({
    where: { id: s.userId },
    data,
    select: { id: true, name: true, email: true, phone: true },
  });
  await recordActivity(s.userId, newPassword ? 'PASSWORD_CHANGED' : 'PROFILE_UPDATED', 'USER', s.userId);
  if (newPassword) await logNotify('EMAIL', updated.email, 'SECURITY', 'Your GabiElectricals password was changed. If this was not you, contact us immediately.', s.userId);
  return NextResponse.json({ ok: true, user: updated });
}
