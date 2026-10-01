import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const orderNo = sp.get('orderNo')?.trim().toUpperCase();
  const email = sp.get('email')?.trim().toLowerCase();
  if (!orderNo || !email) return NextResponse.json({ error: 'Order number and email are both required.' }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { events: { orderBy: { at: 'asc' } }, items: true, payments: { orderBy: { createdAt: 'desc' } } },
  });
  if (!order || order.email.toLowerCase() !== email) {
    return NextResponse.json({ error: 'No order matches that number and email. Check both and try again — or call us.' }, { status: 404 });
  }
  return NextResponse.json({
    orderNo: order.orderNo,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt,
    addrCity: order.addrCity,
    addrRegion: order.addrRegion,
    fulfilment: order.fulfilment,
    items: order.items.map(i => ({ name: i.name, qty: i.qty, price: i.price, image: i.image })),
    events: order.events.map(e => ({ status: e.status, note: e.note, at: e.at })),
    payment: order.payments[0] ? { reference: order.payments[0].reference, status: order.payments[0].status, method: order.payments[0].method } : null,
  });
}
