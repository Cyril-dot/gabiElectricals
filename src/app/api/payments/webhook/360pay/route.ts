import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { refreshLibertePayPaymentStatus } from '@/lib/gateway';
import { extractLibertePayProviderRef } from '@/lib/360pay-webhook';
import { rateLimit, ipOf } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/webhook/360pay — LibertePay 360Pay callback ("doorbell").
 *
 * DOORBELL SECURITY MODEL: this callback is never trusted. It carries no
 * amounts and settles nothing by itself — whatever it claims about a
 * payment's state is ignored. All it can do is trigger the same sealed
 * re-query to LibertePay through the proxy chain that the customer-side
 * status route uses (`refreshLibertePayPaymentStatus`), and that re-query
 * is the only thing that can flip a payment to PAID/FAILED. A forged POST
 * can therefore at most cause a status check on a reference, and valid
 * references (GABI + 12 uppercase base36 chars, derived from a SHA-256
 * digest in gateway.ts) are unguessable in practice.
 *
 * Responses mirror the Paystack webhook's conventions: 200 { received: true }
 * for accepted, unknown-reference, and malformed-reference callbacks alike —
 * unknown references are not errors, and the response never leaks which
 * references exist. 400 is returned only for a body we cannot parse at all.
 *
 * GET is a liveness probe so the URL can be verified in a browser.
 */
export async function GET() {
  return NextResponse.json({ ok: true, service: 'gabielectricals-360pay-webhook' });
}

export async function POST(req: NextRequest) {
  // Callbacks are rare; 60/min/IP is generous headroom, not a tight gate.
  const rl = rateLimit(`360pay-webhook:${ipOf(req)}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` }, { status: 429 });

  const raw = await req.text().catch(() => '');
  if (!raw.trim()) return NextResponse.json({ error: 'Bad body' }, { status: 400 });

  let payload: unknown = null;
  let parsed = false;
  try {
    payload = JSON.parse(raw) as unknown;
    parsed = true;
  } catch {
    // Tolerate form-encoded callbacks (transaction_id=GABI…&…).
    if (raw.includes('=')) {
      payload = new URLSearchParams(raw);
      parsed = true;
    }
  }
  if (!parsed) return NextResponse.json({ error: 'Bad body' }, { status: 400 });

  const providerRef = extractLibertePayProviderRef(payload);
  if (!providerRef) return NextResponse.json({ received: true });

  const payment = await prisma.payment.findFirst({
    where: { provider: 'LIBERTEPAY360', metaJson: { contains: providerRef } },
    select: { id: true, status: true, provider: true, metaJson: true },
  });
  if (payment && payment.status === 'PENDING') {
    try {
      await refreshLibertePayPaymentStatus(payment);
    } catch {
      // The doorbell has rung; settlement is decided solely by the sealed
      // re-query inside refreshLibertePayPaymentStatus. A failure here
      // leaves the payment PENDING for the next poll/callback — it must
      // never surface as a webhook error or settle anything by itself.
    }
  }
  return NextResponse.json({ received: true });
}
