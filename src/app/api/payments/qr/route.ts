import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import QRCode from 'qrcode';
import { rateLimit, ipOf } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** GET /api/payments/qr?text=… → PNG data URL (dynamic payment QRs, 15-min payload) */
export async function GET(req: NextRequest) {
  const rl = rateLimit(`qr:${ipOf(req)}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const text = req.nextUrl.searchParams.get('text') ?? '';
  if (text.length < 6 || text.length > 1000 || !/^(https?:\/\/|gepay:)/.test(text)) {
    return NextResponse.json({ error: 'Invalid QR text.' }, { status: 400 });
  }
  const dataUrl = await QRCode.toDataURL(text, {
    width: 480,
    margin: 2,
    color: { dark: '#062E33', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  });
  return NextResponse.json({ dataUrl });
}
