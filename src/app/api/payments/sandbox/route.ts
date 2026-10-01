import { NextRequest, NextResponse } from 'next/server';
import { sandboxComplete } from '@/lib/gateway';
import { DEMO_MODE } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** POST /api/payments/sandbox { reference, outcome? } — demo "approve prompt" button. */
export async function POST(req: NextRequest) {
  if (!DEMO_MODE) return NextResponse.json({ error: 'Sandbox only available in demo mode' }, { status: 403 });
  const body = await req.json().catch(() => ({}) as { reference?: string; outcome?: 'success' | 'pending' | 'fail' });
  if (!body.reference) return NextResponse.json({ error: 'reference required' }, { status: 400 });
  const result = await sandboxComplete(body.reference, body.outcome);
  return NextResponse.json({ result });
}
