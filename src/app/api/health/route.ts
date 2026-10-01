import { NextResponse } from 'next/server';
import { prisma, DEMO_MODE } from '@/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, demo: DEMO_MODE, time: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
