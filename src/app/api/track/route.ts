import { NextResponse } from 'next/server';
import { z } from 'zod';
import { trackEvent } from '@/lib/notify';

const Schema = z.object({
  type: z.string().min(2).max(40),
  payload: z.record(z.string(), z.unknown()).optional(),
  value: z.number().finite().min(0).max(1_000_000).optional(),
  sessionId: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  const { type, payload, value, sessionId } = parsed.data;
  await trackEvent(type, payload ?? {}, value, sessionId);
  return NextResponse.json({ ok: true });
}
