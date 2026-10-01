import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { prisma, DEMO_MODE } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { recordActivity } from '@/lib/notify';
import { rateLimit, ipOf } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function wipeTransactional() {
  const wipe = [
    () => prisma.analyticsEvent.deleteMany(), () => prisma.abandonedCart.deleteMany(), () => prisma.supportTicket.deleteMany(),
    () => prisma.warrantyRegistration.deleteMany(), () => prisma.stockAlert.deleteMany(), () => prisma.compareItem.deleteMany(),
    () => prisma.wishlistItem.deleteMany(), () => prisma.cartLine.deleteMany(), () => prisma.referralVisit.deleteMany(),
    () => prisma.payoutRequest.deleteMany(), () => prisma.affiliateApplication.deleteMany(), () => prisma.ledgerEntry.deleteMany(),
    () => prisma.activityLog.deleteMany(), () => prisma.notificationLog.deleteMany(), () => prisma.uploadedFile.deleteMany(),
    () => prisma.subscription.deleteMany(), () => prisma.lead.deleteMany(), () => prisma.popup.deleteMany(),
    () => prisma.bundleItem.deleteMany(), () => prisma.bundle.deleteMany(), () => prisma.flashSale.deleteMany(),
    () => prisma.coupon.deleteMany(), () => prisma.paymentEvent.deleteMany(), () => prisma.payment.deleteMany(),
    () => prisma.paymentLink.deleteMany(), () => prisma.quote.deleteMany(), () => prisma.bookingEvent.deleteMany(),
    () => prisma.booking.deleteMany(), () => prisma.orderEvent.deleteMany(), () => prisma.orderItem.deleteMany(),
    () => prisma.order.deleteMany(), () => prisma.review.deleteMany(),
  ];
  for (const w of wipe) await w();
  await prisma.technician.updateMany({ data: { jobsCompleted: 0 } });
  await prisma.product.updateMany({ data: { soldCount: 0 } });
  await prisma.user.updateMany({ data: { walletCredit: 0 } });
}

export async function POST(req: Request) {
  let session;
  try { session = await requireRole('SUPER_ADMIN'); } catch {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }
  if (!DEMO_MODE) return NextResponse.json({ error: 'Destructive demo actions are disabled outside DEMO_MODE' }, { status: 403 });
  const ip = ipOf(req);
  const rl = rateLimit(`admin:demo:${ip}`, 2, 5 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Rate limited — retry in ${rl.retryAfterSec}s` }, { status: 429 });

  const parsed = await req.json().catch(() => ({}));
  const action = (parsed as { action?: string }).action;

  if (action === 'clear') {
    await wipeTransactional();
    await recordActivity(session.userId, 'DEMO_DATA_CLEARED', 'SYSTEM', undefined, ip);
    return NextResponse.json({ ok: true, message: 'Sample transactions cleared — catalog and users kept.' });
  }

  if (action === 'reset') {
    const bin = join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
    if (!existsSync(bin)) return NextResponse.json({ error: 'node_modules/.bin/tsx not found — run npm install first' }, { status: 500 });
    await recordActivity(session.userId, 'DEMO_DATA_RESET_STARTED', 'SYSTEM', undefined, ip);
    const child = spawn(bin, ['prisma/seed.ts'], { cwd: process.cwd(), shell: process.platform === 'win32', windowsHide: true });
    let out = '';
    child.stdout.on('data', (b: Buffer) => { out += b.toString(); out = out.slice(-4000); });
    child.stderr.on('data', (b: Buffer) => { out += b.toString(); out = out.slice(-4000); });
    const code = await new Promise<number>(res => child.on('close', c => res(c ?? 1)));
    if (code === 3) return NextResponse.json({ ok: false, busy: true, error: 'Another seed is running — try again in a minute.' }, { status: 409 });
    if (code !== 0) return NextResponse.json({ ok: false, error: `Seed exited ${code}`, log: out.slice(-800) }, { status: 500 });
    return NextResponse.json({ ok: true, message: 'Demo data fully reset.', log: out.split('\n').filter(l => l.includes('✓') || l.includes('✔')).slice(-6) });
  }

  return NextResponse.json({ error: 'action must be "reset" or "clear"' }, { status: 400 });
}
