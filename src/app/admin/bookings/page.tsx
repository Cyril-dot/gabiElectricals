import { prisma } from '@/lib/db';
import { BookingsBoard } from './board';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ y?: string; m?: string; id?: string; view?: string }> };

export default async function AdminBookingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.y) || now.getFullYear();
  const month = Math.min(12, Math.max(1, Number(sp.m) || now.getMonth() + 1));
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const [bookings, technicians, blocked, slots, detail] = await Promise.all([
    prisma.booking.findMany({
      where: { date: { gte: start, lte: end } },
      include: { service: { select: { name: true } }, technician: { include: { user: { select: { name: true } } } } },
      orderBy: { date: 'asc' },
      take: 400,
    }),
    prisma.technician.findMany({ include: { user: { select: { name: true, phone: true } } }, orderBy: { rating: 'desc' } }),
    prisma.blockedDate.findMany({ orderBy: { date: 'asc' } }),
    prisma.slotCapacity.findMany({ orderBy: { dayOfWeek: 'asc' } }),
    sp.id ? prisma.booking.findUnique({
      where: { id: sp.id },
      include: {
        service: { select: { name: true, slug: true } },
        technician: { include: { user: { select: { name: true, phone: true } } } },
        events: { orderBy: { at: 'asc' } },
        payments: { select: { id: true, reference: true, amount: true, status: true } },
        quote: { select: { quoteNo: true, amount: true, status: true } },
      },
    }) : null,
  ]);

  const ser = (b: typeof bookings[number]) => ({
    id: b.id, bookingNo: b.bookingNo, date: b.date.toISOString(), timeSlot: b.timeSlot, status: b.status, urgency: b.urgency,
    region: b.region, city: b.city, landmark: b.landmark, gps: b.gps, contactName: b.contactName, contactPhone: b.contactPhone,
    serviceName: b.service.name, techName: b.technician?.user.name ?? null, technicianId: b.technicianId, price: b.price, description: b.description,
  });

  const detailSer = detail && {
    ...ser({ ...detail, service: { name: detail.service.name }, technician: detail.technician }),
    contactEmail: detail.contactEmail, paymentMode: detail.paymentMode, depositDue: detail.depositDue, rating: detail.rating,
    media: safeArr(detail.media), cancelReason: detail.cancelReason, createdAt: detail.createdAt.toISOString(),
    events: detail.events.map((e) => ({ status: e.status, note: e.note, at: e.at.toISOString() })),
    payments: detail.payments.map((p) => ({ reference: p.reference, amount: p.amount, status: p.status })),
    quote: detail.quote ? { quoteNo: detail.quote.quoteNo, amount: detail.quote.amount, status: detail.quote.status } : null,
    mapLat: detail.mapLat, mapLng: detail.mapLng,
  };

  return (
    <BookingsBoard
      bookings={bookings.map(ser)}
      technicians={technicians.map((t) => ({ id: t.id, name: t.user.name, phone: t.user.phone, rating: t.rating, jobs: t.jobsCompleted, available: t.available }))}
      blocked={blocked.map((b) => ({ id: b.id, date: b.date.toISOString(), reason: b.reason, serviceId: b.serviceId }))}
      slots={slots.map((s) => ({ id: s.id, serviceId: s.serviceId, dayOfWeek: s.dayOfWeek, capacity: s.capacity, slots: safeArr(s.slotsJson) }))}
      month={{ year, month }}
      detail={detailSer ?? null}
      view={sp.view === 'list' ? 'list' : 'calendar'}
    />
  );
}

function safeArr(json: string): string[] {
  try { const a = JSON.parse(json); return Array.isArray(a) ? a.map(String) : []; } catch { return []; }
}
