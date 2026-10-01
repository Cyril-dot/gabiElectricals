import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logNotify } from '@/lib/notify';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(9).max(17).optional(),
  subject: z.string().min(3).max(120).optional(),
  message: z.string().min(10).max(4000),
  business: z.string().max(160).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
  const d = parsed.data;
  await prisma.supportTicket.create({ data: { name: d.name, email: d.email, phone: d.phone, subject: d.subject || d.business || 'Wholesale / contractor pricing request', message: d.message, status: 'OPEN' } });
  await prisma.lead.create({ data: { email: d.email, phone: d.phone, name: d.name, source: d.subject ? 'CONTACT' : 'WHOLESALE', metaJson: JSON.stringify({ business: d.business }) } });
  await logNotify('EMAIL', 'hello@gabielectricals.com', 'SUPPORT_TICKET', `New ticket from ${d.name}: ${d.subject ?? 'wholesale request'}`);
  return NextResponse.json({ ok: true });
}
