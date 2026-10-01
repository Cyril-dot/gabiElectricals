import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { ghs } from '@/lib/money';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import BookingActions from './BookingActions';
import PayPanel from './PayPanel';

export const dynamic = 'force-dynamic';

const parse = <T,>(raw: string, fb: T): T => { try { return JSON.parse(raw) as T; } catch { return fb; } };

type Props = { params: Promise<{ bookingNo: string }>; searchParams: Promise<{ pay?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookingNo } = await params;
  return { title: `Booking ${bookingNo} | GabiElectricals`, description: 'Track your electrical service booking status, reschedule or manage payment.' };
}

const CHAIN = ['REQUESTED', 'CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED'] as const;
const STEP_META: Record<string, { label: string; icon: string; blurb: string }> = {
  REQUESTED: { label: 'Requested', icon: '📝', blurb: 'Booking received — awaiting deposit/confirmation' },
  CONFIRMED: { label: 'Confirmed', icon: '✅', blurb: 'Slot locked in. You will get an SMS when a tech is assigned' },
  ASSIGNED: { label: 'Technician assigned', icon: '👷', blurb: 'Your certified electrician is scheduled — name & photo by SMS' },
  ON_THE_WAY: { label: 'On the way', icon: '🚐', blurb: 'Technician en route with tools and genuine parts' },
  IN_PROGRESS: { label: 'In progress', icon: '⚡', blurb: 'Work underway — tested before we close up' },
  COMPLETED: { label: 'Completed', icon: '🏁', blurb: 'Job done, warranty active. Rate your technician!' },
  REVIEWED: { label: 'Reviewed', icon: '⭐', blurb: 'Thanks for the review — it helps other customers' },
  CANCELLED: { label: 'Cancelled', icon: '✖️', blurb: 'This booking was cancelled' },
};

export default async function BookingPage({ params, searchParams }: Props) {
  const [{ bookingNo }, { pay }] = await Promise.all([params, searchParams]);
  const booking = await prisma.booking.findUnique({
    where: { bookingNo },
    include: {
      service: true,
      events: { orderBy: { at: 'asc' } },
      technician: { include: { user: { select: { name: true } } } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!booking) notFound();

  const [settings, session, capacityCheck] = await Promise.all([
    getSettings(),
    getSession(),
    (async () => {
      const { getAvailability } = await import('@/lib/booking');
      const today = new Date().toISOString().slice(0, 10);
      const days = await getAvailability(booking.service.slug, today, 14);
      return days.map(d => ({ date: d.date, blocked: d.blocked, reason: d.blockedReason, slots: d.slots.filter(s => s.remaining > 0).map(s => ({ slot: s.slot, remaining: s.remaining })) })).filter(d => !d.blocked && d.slots.length > 0);
    })(),
  ]);

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const qr = await QRCode.toDataURL(`${site}/booking/${booking.bookingNo}`, { width: 220, margin: 2, color: { dark: '#062E33', light: '#FFFFFF' } });

  const media = parse<string[]>(booking.media, []);
  const currentIndex = booking.status === 'CANCELLED' ? -1 : CHAIN.indexOf(booking.status as (typeof CHAIN)[number]);
  const doneStatuses = new Set(booking.events.map(e => e.status));
  const isOwner = !booking.userId || session?.userId === booking.userId || ['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(session?.role ?? '');
  const canPayPanel = !!pay && booking.payments.some(p => p.reference === pay) && booking.payments.find(p => p.reference === pay)?.status !== 'PAID';
  const icsHref = `/booking/${booking.bookingNo}/.ics`;

  const dateLabel = booking.date.toISOString().slice(0, 10);
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(booking.date).getDay()];

  return (
    <div className="bg-mist dark:bg-navy min-h-[70vh]">
      <div className="container-x py-6 md:py-10 max-w-3xl">
        {/* Success header */}
        <div className="card overflow-hidden">
          <div className={`px-5 py-6 md:px-7 ${booking.status === 'CANCELLED' ? 'bg-danger text-white' : 'bg-navy text-white'}`}>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">
              {booking.status === 'REQUESTED' ? 'Booking received' : booking.status === 'CANCELLED' ? 'Booking cancelled' : 'Booking'}
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold mt-1">#{booking.bookingNo}</h1>
            <p className="text-white/75 text-[13.5px] mt-1.5">
              {booking.service.name} · {dayName}, {new Date(booking.date).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })} · {booking.timeSlot}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-[12px] font-bold">
              <a href={icsHref} className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 transition-colors">📅 Add to calendar (.ics)</a>
              <span className="rounded-lg bg-white/10 px-3 py-1.5">{booking.urgency === 'STANDARD' ? 'Standard scheduling' : booking.urgency === 'URGENT' ? '🕐 Urgent' : '🚨 Emergency'}</span>
              <span className="rounded-lg bg-white/10 px-3 py-1.5">Pay mode: {booking.paymentMode}</span>
            </div>
          </div>

          <div className="p-5 md:p-7 grid md:grid-cols-[1fr_220px] gap-6">
            <div>
              <h2 className="font-display font-extrabold text-lg">Status</h2>
              <ol className="mt-4 space-y-0" aria-label="Booking progress">
                {CHAIN.map((st, i) => {
                  const reached = doneStatuses.has(st) || i <= currentIndex;
                  const current = st === booking.status;
                  const meta = STEP_META[st];
                  return (
                    <li key={st} className="relative flex gap-3 pb-5 last:pb-0">
                      {i < CHAIN.length - 1 && (
                        <span aria-hidden="true" className={`absolute left-[17px] top-8 bottom-0 w-0.5 ${reached && i < currentIndex ? 'bg-success' : 'bg-line'}`} />
                      )}
                      <span aria-hidden="true"
                        className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] border-2 ${
                          current ? 'bg-success border-success text-white ring-4 ring-success/20' :
                          reached ? 'bg-success/15 border-success' : 'bg-white border-line opacity-50'}`}>
                        {reached && !current ? '✓' : meta.icon}
                      </span>
                      <span className="min-w-0 pt-1">
                        <span className={`block text-[13.5px] font-bold ${current ? 'text-success' : reached ? '' : 'text-soft'}`}>
                          {meta.label}{current && <span className="ml-2 text-[10.5px] uppercase tracking-wide bg-success/15 text-success rounded-md px-1.5 py-0.5">Current</span>}
                        </span>
                        <span className="block text-[12px] text-soft mt-0.5">{meta.blurb}</span>
                        {booking.events.filter(e => e.status === st).slice(-1)[0]?.note && (
                          <span className="block text-[11.5px] text-soft/90 italic mt-0.5">
                            {booking.events.filter(e => e.status === st).slice(-1)[0]!.note}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
                {booking.status === 'CANCELLED' && (
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/15 border-2 border-danger text-danger text-[13px] font-black">✖</span>
                    <span className="pt-1">
                      <span className="block text-[13.5px] font-bold text-danger">Cancelled</span>
                      <span className="block text-[12px] text-soft mt-0.5">{booking.cancelReason ?? 'No reason recorded'}</span>
                    </span>
                  </li>
                )}
              </ol>
            </div>

            {/* QR + tech */}
            <div className="space-y-4">
              <figure className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt={`QR code linking to booking ${booking.bookingNo}`} className="w-full max-w-[200px] mx-auto rounded-xl border border-line bg-white p-1.5" />
                <figcaption className="text-[11px] text-soft mt-2">Scan to open this booking — share it with the technician at the gate.</figcaption>
              </figure>
              {booking.technician && (
                <div className="card p-4">
                  <p className="text-[11px] font-black uppercase tracking-wide text-soft">Your technician</p>
                  <p className="font-bold text-[14px] mt-1">👷 {booking.technician.user.name}</p>
                  <p className="text-[12px] text-soft mt-0.5">Rated {booking.technician.rating.toFixed(1)}★ · {booking.technician.jobsCompleted} jobs done</p>
                </div>
              )}
              <div className="card p-4 text-[12.5px] space-y-1.5">
                <p className="font-black uppercase text-[11px] tracking-wide text-soft">Job</p>
                <p>{booking.description}</p>
                <p className="text-soft pt-1 border-t border-line">{booking.city}, {booking.region}{booking.landmark ? ` · ${booking.landmark}` : ''}{booking.gps ? ` · GPS ${booking.gps}` : ''}</p>
                {media.length > 0 && (
                  <div className="pt-1">
                    <p className="font-black uppercase text-[11px] tracking-wide text-soft mb-1.5">Media</p>
                    <div className="flex flex-wrap gap-1.5">
                      {media.map(m => (/\.(mp4|mov|webm)$/i.test(m)
                        ? <a key={m} href={m} className="h-12 w-16 rounded-lg bg-navy text-white flex items-center justify-center text-[10px] font-bold" target="_blank" rel="noreferrer">🎞</a>
                        :   <a key={m} href={m} target="_blank" rel="noreferrer"><img src={m} alt="Booking attachment" className="h-12 w-16 rounded-lg object-cover border border-line" /></a>))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t border-line p-5 md:p-7 grid sm:grid-cols-2 gap-4">
            <div className="text-[13.5px] space-y-1.5">
              <div className="flex justify-between"><span className="text-soft">Base ({booking.service.name})</span><span>{ghs(booking.service.basePrice)}</span></div>
              {booking.price > booking.service.basePrice && (
                <div className="flex justify-between"><span className="text-soft">Urgency surcharge</span><span className="text-danger">+{ghs(booking.price - booking.service.basePrice)}</span></div>
              )}
              <div className="flex justify-between font-extrabold text-[15px] pt-1 border-t border-line"><span>Agreed job price</span><span>{ghs(booking.price)}</span></div>
              <div className="flex justify-between text-[12.5px]"><span className="text-soft">Deposit due ({booking.service.depositPct}%)</span><span>{ghs(booking.depositDue)}</span></div>
            </div>
            <div className="text-[13.5px] space-y-1.5">
              <p className="font-black uppercase text-[11px] tracking-wide text-soft mb-1">Payments</p>
              {booking.payments.length === 0 && <p className="text-soft italic text-[13px]">No payment recorded yet.</p>}
              {booking.payments.map(p => (
                <div key={p.id} className="flex justify-between items-center text-[13px]">
                  <span className="text-soft">{p.reference} · {p.method.replace('_', ' ')}</span>
                  <span className={`font-bold ${p.status === 'PAID' ? 'text-success' : p.status === 'FAILED' || p.status === 'EXPIRED' ? 'text-danger' : 'text-warning'}`}>
                    {ghs(p.amount)} {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {canPayPanel && <PayPanel reference={pay!} bookingNo={booking.bookingNo} amount={booking.payments.find(p => p.reference === pay)?.amount ?? booking.depositDue} />}

          {/* Actions */}
          <div className="border-t border-line p-5 md:p-7">
            <BookingActions
              bookingNo={booking.bookingNo}
              status={booking.status}
              date={dateLabel}
              timeSlot={booking.timeSlot}
              rescheduleCount={booking.rescheduleCount}
              rating={booking.rating}
              review={booking.review}
              canManage={isOwner}
              openDays={capacityCheck}
              contactPhone={booking.contactPhone}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-between gap-3 text-[13px]">
          <Link href="/services" className="btn-ghost px-4 py-2.5">Book another service</Link>
          <Link href="/account/bookings" className="btn-ghost px-4 py-2.5">My bookings →</Link>
          <a href={`https://wa.me/${settings.business.whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi about booking ${booking.bookingNo}:`)}`}
            target="_blank" rel="noreferrer" className="btn-primary px-4 py-2.5">💬 Chat with us</a>
        </div>
      </div>
    </div>
  );
}
