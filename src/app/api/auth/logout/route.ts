import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export async function POST(req: Request) {
  await clearSession();
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return NextResponse.json({ ok: true });
  return NextResponse.redirect(new URL('/', req.url), 303);
}
