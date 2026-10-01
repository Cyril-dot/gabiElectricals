import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, DEMO_MODE } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logNotify } from '@/lib/notify';

const Schema = z.object({
  slug: z.string().min(1).max(120),
  email: z.string().trim().email(),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email so we can reach you.' }, { status: 400 });
  const { slug, email } = parsed.data;
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true, name: true, stock: true } });
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  const session = await getSession();
  await prisma.stockAlert.upsert({
    where: { productId_email: { productId: product.id, email: email.toLowerCase() } },
    create: { productId: product.id, email: email.toLowerCase(), userId: session?.userId },
    update: { userId: session?.userId },
  });
  if (DEMO_MODE) await logNotify('EMAIL', email, 'STOCK_ALERT', `Noted! We'll email you the moment "${product.name}" is back in stock at GabiElectricals.`);
  return NextResponse.json({ ok: true });
}
