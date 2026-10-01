import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma, DEMO_MODE } from './db';
import { cache } from 'react';

const SECRET = () => new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-secret-change-me');
export const SESSION_COOKIE = 'ge_session';
export const CART_COOKIE = 'ge_cart';
export const REF_COOKIE = 'ge_ref';

export type SessionPayload = { userId: string; role: string; name: string };

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT(p).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(SECRET());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSessionCookie(p: SessionPayload) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(p), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
});

export async function getCurrentUser() {
  const s = await getSession();
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.userId }, include: { techProfile: true, addresses: true } });
}

export async function requireRole(...roles: string[]) {
  const s = await getSession();
  if (!s || !roles.includes(s.role)) throw new Error('UNAUTHORIZED');
  return s;
}

export const isAdmin = (role?: string | null) => role === 'ADMIN' || role === 'SUPER_ADMIN';
export const isStaff = (role?: string | null) => isAdmin(role) || role === 'TECHNICIAN';

export const hashPw = (pw: string) => bcrypt.hash(pw, 10);
export const checkPw = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export function assertDemoMode() {
  if (!DEMO_MODE) throw new Error('LIVE_MODE — destructive demo action blocked');
}
