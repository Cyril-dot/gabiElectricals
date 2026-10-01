'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

type OpenDay = { date: string; slots: { slot: string; remaining: number }[] };
type Props = {
  bookingNo: string;
  status: string;
  date: string;
  timeSlot: string;
  rescheduleCount: number;
  rating: number | null;
  review: string | null;
  canManage: boolean;
  openDays: OpenDay[];
  contactPhone: string;
};

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function fmt(iso: string) { const [y, m, d] = iso.split('-').map(Number); return `${WD[new Date(y, m - 1, d).getDay()]} ${d}/${m}`; }

export default function BookingActions(p: Props) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<'none' | 'reschedule' | 'cancel' | 'review'>('none');
  const [busy, setBusy] = useState(false);

  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [stars, setStars] = useState(p.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [reviewText, setReviewText] = useState(p.review ?? '');

  const canReschedule = ['REQUESTED', 'CONFIRMED'].includes(p.status) && p.rescheduleCount < 3 && p.canManage;
  const canCancel = ['REQUESTED', 'CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS'].includes(p.status) && p.canManage;
  const canReview = p.status === 'COMPLETED' && p.canManage;

  const days = p.openDays.filter(d => d.date !== p.date); // simple: allow other dates (24h rule enforced server-side)

  async function call(url: string, method: string, body: object) {
    setBusy(true);
    try {
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast(j.error ?? 'Something went wrong', 'err'); return; }
      toast(
        method === 'POST' && url.includes('reschedule') ? `Moved to ${fmt(newDate)} ${newSlot} ✓` :
        url.includes('cancel') ? (j.flagged ? 'Booking cancelled — flagged for review (after dispatch)' : 'Booking cancelled — no charge ✓') :
        'Thanks for rating your technician! ⭐',
        'ok'
      );
      setTab('none'); setNewDate(''); setNewSlot(''); setCancelReason('');
      router.refresh();
    } catch { toast('Network error — try again', 'err'); }
    finally { setBusy(false); }
  }

  return (
    <section aria-label="Manage booking">
      <h2 className="font-display font-extrabold text-lg mb-3">Manage this booking</h2>

      {!p.canManage && (
        <p className="text-[13px] text-soft mb-3">Sign in with the account that made this booking to reschedule or cancel — or call us.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {canReschedule && <button onClick={() => setTab(tab === 'reschedule' ? 'none' : 'reschedule')} className="btn-ghost px-4 py-2 text-[13px]" aria-expanded={tab === 'reschedule'}>📅 Reschedule ({3 - p.rescheduleCount} left)</button>}
        {canCancel && <button onClick={() => setTab(tab === 'cancel' ? 'none' : 'cancel')} className="btn-ghost px-4 py-2 text-[13px] text-danger border-danger/30" aria-expanded={tab === 'cancel'}>✖ Cancel booking</button>}
        {p.status === 'COMPLETED' && !canReview && <span className="text-[12px] text-soft self-center">Review closes once the team follows up.</span>}
      </div>

      {/* Reschedule panel */}
      {tab === 'reschedule' && canReschedule && (
        <div className="mt-4 rounded-xl border border-line bg-mist dark:bg-navy-700 p-4">
          <p className="text-[13px] font-bold mb-1">Pick a new date &amp; slot</p>
          <p className="text-[11.5px] text-soft mb-3">Must be at least 24 hours from now. Free while no technician is assigned. Current: {fmt(p.date)} {p.timeSlot}</p>
          {days.length === 0 ? <p className="text-[13px] text-soft">No open dates right now — try again later or call.</p> : (
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="sr-only" htmlFor="rs-date">New date</label>
              <select id="rs-date" className="rounded-xl border border-line bg-white px-3 py-2 text-[13px] sm:w-48"
                value={newDate} onChange={e => { setNewDate(e.target.value); setNewSlot(''); }}>
                <option value="">Choose date…</option>
                {days.map(d => <option key={d.date} value={d.date}>{fmt(d.date)} — {d.slots.length} slots</option>)}
              </select>
              {newDate && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="New time slot">
                  {days.find(d => d.date === newDate)?.slots.map(s => (
                    <button key={s.slot} onClick={() => setNewSlot(s.slot)} aria-pressed={newSlot === s.slot}
                      className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-bold ${newSlot === s.slot ? 'bg-blue text-white border-blue' : 'bg-white border-line hover:border-blue'}`}>
                      {s.slot} <span className="opacity-60">({s.remaining})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button disabled={!newDate || !newSlot || busy} onClick={() => call(`/api/bookings/${p.bookingNo}/reschedule`, 'POST', { date: newDate, timeSlot: newSlot })}
            className="btn-primary mt-3 px-5 py-2 text-[13px]">{busy ? 'Saving…' : 'Confirm new slot'}</button>
        </div>
      )}

      {/* Cancel panel */}
      {tab === 'cancel' && canCancel && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-[13px] font-bold text-danger mb-1">Cancel booking {p.bookingNo}</p>
          <p className="text-[12px] text-soft mb-3">
            {['REQUESTED', 'CONFIRMED'].includes(p.status)
              ? 'Free cancellation — no technician assigned yet. Any deposit transfers to a future booking.'
              : '⚠️ A technician has already been dispatched — cancelling now is flagged and a call-out fee may apply.'}
          </p>
          <label htmlFor="cancel-reason" className="block text-[12px] font-bold mb-1">Reason (helps us improve)</label>
          <textarea id="cancel-reason" rows={2} value={cancelReason} onChange={e => setCancelReason(e.target.value)}
            placeholder="e.g. Plans changed, already fixed by someone else…"
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px]" />
          <button disabled={cancelReason.trim().length < 3 || busy} onClick={() => call(`/api/bookings/${p.bookingNo}/cancel`, 'POST', { reason: cancelReason.trim() })}
            className="btn mt-3 px-5 py-2 text-[13px] bg-danger text-white rounded-[10px] font-bold hover:opacity-90">
            {busy ? 'Cancelling…' : 'Yes, cancel this booking'}
          </button>
        </div>
      )}

      {/* Review panel */}
      {canReview && (
        <div className="mt-4 rounded-xl border border-gold/40 bg-gold/5 p-4">
          <h3 className="font-bold text-[14px]">Rate your service ⭐</h3>
          <p className="text-[12px] text-soft mb-2">How did your technician do? It takes 15 seconds and keeps our standard high.</p>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating from 1 to 5 stars">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                onClick={() => setStars(n)}
                className={`text-2xl transition-transform hover:scale-110 ${(hover || stars) >= n ? 'grayscale-0' : 'opacity-30 grayscale'}`}>⭐</button>
            ))}
          </div>
          <label htmlFor="rvw" className="block text-[12px] font-bold mt-2 mb-1">Comments</label>
          <textarea id="rvw" rows={2} value={reviewText} onChange={e => setReviewText(e.target.value)}
            placeholder="On time? Tidy? Explained things well?" className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px]" />
          <button disabled={!stars || reviewText.trim().length < 1 || busy}
            onClick={() => call(`/api/bookings/${p.bookingNo}/review`, 'PATCH', { rating: stars, review: reviewText.trim() })}
            className="btn-gold mt-2 px-5 py-2 text-[13px]">{busy ? 'Saving…' : 'Submit review'}</button>
        </div>
      )}

      {p.status === 'REVIEWED' && (
        <div className="mt-3 rounded-xl bg-success/10 border border-success/30 p-3 text-[13px] text-success font-bold">
          ✓ You rated this job {p.rating}★{p.review ? ` — “${p.review.slice(0, 80)}”` : ''}. Thank you!
        </div>
      )}
    </section>
  );
}
