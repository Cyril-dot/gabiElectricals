import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
function icsDate(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}00Z`;
}
function fold(line: string): string {
  // RFC5545 75-octet folding
  const out: string[] = [];
  let s = line;
  out.push(s.slice(0, 75)); s = s.slice(75);
  while (s.length) { out.push(' ' + s.slice(0, 74)); s = s.slice(74); }
  return out.join('\r\n');
}

/** GET /booking/[bookingNo]/.ics — calendar download for the appointment slot */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ bookingNo: string; file: string }> }) {
  const { bookingNo, file } = await ctx.params;
  if (file !== '.ics') return new NextResponse('Not found', { status: 404 });

  const booking = await prisma.booking.findUnique({ where: { bookingNo }, include: { service: true } });
  if (!booking) return new NextResponse('Booking not found', { status: 404 });

  const [y, m, d] = booking.date.toISOString().slice(0, 10).split('-').map(Number);
  const [startH, startM] = booking.timeSlot.split('-')[0].split(':').map(Number);
  const endRaw = booking.timeSlot.split('-')[1] ?? '18:00';
  const [endH, endM] = endRaw.split(':').map(Number);
  const dtStart = new Date(y, m - 1, d, startH, startM);
  const dtEnd = new Date(y, m - 1, d, endH, endM);

  const dt = new Date(y, m - 1, d);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GabiElectricals//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.bookingNo}@gabielectricals`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(dtStart)}`,
    `DTEND:${icsDate(dtEnd)}`,
    fold(`SUMMARY:${icsEscape(`GabiElectricals — ${booking.service.name} (${booking.bookingNo})`)}`),
    fold(`DESCRIPTION:${icsEscape(`Booking ${booking.bookingNo}. Urgency: ${booking.urgency}. Location: ${booking.city}, ${booking.region}${booking.landmark ? `. Landmark: ${booking.landmark}` : ''}${booking.gps ? `. Ghana Post GPS: ${booking.gps}` : ''}. Job notes: ${booking.description} Contact: ${booking.contactName} ${booking.contactPhone}`)}`),
    fold(`LOCATION:${icsEscape(`${booking.city}, ${booking.region}${booking.gps ? ` (${booking.gps})` : ''}`)}`),
    `X-WR-CALNAME:GabiElectricals`,
    fold(`SERVICE:GabiElectricals - ${booking.service.name}`),
    `CATEGORIES:${icsEscape(booking.service.name)}`,
    `DAYOFWEEK:${DAY_NAMES[dt.getDay()]}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return new NextResponse(lines.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${booking.bookingNo}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
