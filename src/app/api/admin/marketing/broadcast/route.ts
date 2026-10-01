import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logNotify, recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';

const Schema = z.object({
  channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP']),
  subject: z.string().max(120).optional(),
  message: z.string().trim().min(10).max(1500),
  audience: z.enum(['SUBSCRIBERS', 'LEADS', 'CUSTOMERS']),
});

/** POST /api/admin/marketing/broadcast — demo-mode blast via logNotify (never really sends) */
export async function POST(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid broadcast.');
  const { channel, subject, message, audience } = parsed.data;

  let recipients: { to: string; userId?: string }[] = [];
  if (audience === 'SUBSCRIBERS') {
    const rows = await prisma.subscription.findMany({ where: { active: true }, take: 300, orderBy: { createdAt: 'desc' } });
    if (channel !== 'EMAIL') return fail('Subscribers only accept EMAIL broadcasts.');
    recipients = rows.map((r) => ({ to: r.email }));
  } else if (audience === 'LEADS') {
    const rows = await prisma.lead.findMany({ take: 300, orderBy: { createdAt: 'desc' } });
    recipients = rows.map((l) => ({ to: channel === 'EMAIL' ? l.email : l.phone ?? l.email })).filter((r) => !!r.to);
  } else {
    const rows = await prisma.user.findMany({ where: { role: 'CUSTOMER', active: true }, take: 300, select: { id: true, email: true, phone: true } });
    recipients = rows.map((u) => ({ to: channel === 'EMAIL' ? u.email : (u.phone ?? u.email), userId: u.id })).filter((r) => !!r.to);
  }
  if (recipients.length === 0) return fail('No recipients for this audience.');

  for (const r of recipients) {
    await logNotify(channel, r.to, subject ? `BROADCAST: ${subject}` : 'BROADCAST', message, r.userId);
  }
  await recordActivity(g.user.userId, 'MARKETING_BROADCAST', 'NotificationLog', undefined, undefined, { channel, audience, count: recipients.length });
  return NextResponse.json({ ok: true, sent: recipients.length, demoMode: true });
}
