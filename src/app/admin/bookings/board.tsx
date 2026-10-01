'use client';
import { useState } from 'react';
import { Badge, EmptyState, Field, Msg, api, bookTone, inputCls, labelCls, useMsg } from '@/components/ops/ui';
import { Icon } from '@/components/Icon';
import { ghs } from '@/lib/money';

type Bk = { id: string; bookingNo: string; date: string; timeSlot: string; status: string; urgency: string; region: string; city: string; landmark: string | null; gps: string | null; contactName: string; contactPhone: string; serviceName: string; techName: string | null; technicianId: string | null; price: number; description: string };
type Tech = { id: string; name: string; phone: string | null; rating: number; jobs: number; available: boolean };
type Blocked = { id: string; date: string; reason: string | null; serviceId: string | null };
type SlotCap = { id: string; serviceId: string | null; dayOfWeek: number; capacity: number; slots: string[] };
type Detail = Bk & {
  contactEmail: string | null; paymentMode: string; depositDue: number; rating: number | null; media: string[];
  cancelReason: string | null; createdAt: string; events: { status: string; note: string | null; at: string }[];
  payments: { reference: string; amount: number; status: string }[]; quote: { quoteNo: string; amount: number; status: string } | null;
  mapLat: number | null; mapLng: number | null;
};
type Props = { bookings: Bk[]; technicians: Tech[]; blocked: Blocked[]; slots: SlotCap[]; month: { year: number; month: number }; detail: Detail | null; view: 'calendar' | 'list' };

const FLOW = ['REQUESTED', 'CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function BookingsBoard(p: Props) {
  const [view, setView] = useState(p.view);
  const { msg, setMsg } = useMsg();
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<'board' | 'dates' | 'slots'>('board');
  const selTech = useState<string>('');

  async function run(key: string, url: string, body: unknown, method = 'PATCH', text = 'Done — refreshing…') {
    setBusy(key); setMsg(null);
    try { await api(url, { method, body: JSON.stringify(body) }); setMsg({ kind: 'ok', text }); setTimeout(() => location.reload(), 700); }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); setBusy(null); }
  }

  // ── month grid computed here (no deps) ──
  const { year, month } = p.month;
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = first.getDay();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const byDay = new Map<number, Bk[]>();
  for (const b of p.bookings) {
    const d = new Date(b.date).getDate();
    byDay.set(d, [...(byDay.get(d) ?? []), b]);
  }
  const blockedDays = new Set(p.blocked.map((b) => new Date(b.date).getDate()));
  const prev = `/admin/bookings?y=${month === 1 ? year - 1 : year}&m=${month === 1 ? 12 : month - 1}&view=${view}`;
  const next = `/admin/bookings?y=${month === 12 ? year + 1 : year}&m=${month === 12 ? 1 : month + 1}&view=${view}`;

  return (
    <main className="container-x py-8">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue">Operations</p>
          <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white">Bookings — {MON[month - 1]} {year}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={prev} className="btn-ghost px-3 py-1.5 text-xs">← Prev</a>
          <a href={`/admin/bookings?view=${view}`} className="btn-ghost px-3 py-1.5 text-xs">Today</a>
          <a href={next} className="btn-ghost px-3 py-1.5 text-xs">Next →</a>
        </div>
      </header>
      <div className="mb-4 flex flex-wrap gap-2">
        {(['board', 'dates', 'slots'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1.5 text-sm font-bold ${tab === t ? 'border-blue bg-blue text-white' : 'border-line text-soft'}`}>
            {t === 'board' ? 'Calendar & list' : t === 'dates' ? `Blocked dates (${p.blocked.length})` : `Slot capacity (${p.slots.length})`}
          </button>
        ))}
        {tab === 'board' && <button onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')} className="btn-gold ml-auto px-3 py-1.5 text-xs">{view === 'calendar' ? 'List view' : 'Calendar view'}</button>}
      </div>
      <Msg msg={msg} />

      {tab === 'board' && view === 'calendar' && (
        <div className="card overflow-x-auto p-3">
          <div className="grid min-w-[640px] grid-cols-7 gap-1.5">
            {DAYS.map((d) => <div key={d} className="py-1 text-center text-[11px] font-extrabold uppercase tracking-wide text-soft">{d}</div>)}
            {cells.map((day, i) => (
              <div key={i} className={`min-h-20 rounded-lg border p-1 ${day && blockedDays.has(day) ? 'border-danger/40 bg-danger/5' : day ? 'border-line bg-white dark:bg-navy-700' : 'border-transparent'}`}>
                {day && <>
                  <p className="text-[10px] font-bold text-soft">{day}</p>
                  {(byDay.get(day) ?? []).slice(0, 3).map((b) => (
                    <a key={b.id} href={`/admin/bookings?y=${year}&m=${month}&id=${b.id}`} title={`${b.timeSlot} ${b.contactName}`}
                      className={`mt-0.5 block truncate rounded px-1 py-0.5 text-[9px] font-bold text-white ${b.status === 'COMPLETED' || b.status === 'REVIEWED' ? 'bg-success' : b.status === 'CANCELLED' ? 'bg-danger' : b.status === 'REQUESTED' ? 'bg-warning' : 'bg-blue'}`}>
                      {b.timeSlot.slice(0, 5)} {b.contactName.split(' ')[0]}
                    </a>
                  ))}
                  {(byDay.get(day)?.length ?? 0) > 3 && <p className="text-[9px] text-soft">+{byDay.get(day)!.length - 3} more</p>}
                </>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'board' && view === 'list' && (
        <div className="grid gap-3">
          {p.bookings.map((b) => (
            <a key={b.id} href={`/admin/bookings?y=${year}&m=${month}&id=${b.id}`} className="card flex flex-wrap items-center gap-3 p-4 hover:border-blue">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-navy dark:text-white">{b.bookingNo} · {b.serviceName} <Badge tone={bookTone[b.status] ?? 'soft'}>{b.status}</Badge> {b.urgency !== 'STANDARD' && <Badge tone="warning">{b.urgency}</Badge>}</p>
                <p className="text-xs text-soft">{new Date(b.date).toLocaleDateString()} {b.timeSlot} · {b.city}, {b.region} · {b.contactName} ({b.contactPhone}) · {ghs(b.price)} · {b.techName ?? 'unassigned'}</p>
              </div>
              <span className="text-xs font-bold text-blue">Open →</span>
            </a>
          ))}
          {p.bookings.length === 0 && <EmptyState text="No bookings this month." />}
        </div>
      )}

      {tab === 'dates' && <BlockedDates blocked={p.blocked} busy={busy} run={run} />}
      {tab === 'slots' && <SlotEditor slots={p.slots} busy={busy} run={run} />}

      {p.detail && <DetailPanel d={p.detail} technicians={p.technicians} busy={busy} run={run} closeHref={`/admin/bookings?y=${year}&m=${month}&view=${view}`} selTech={selTech} />}
    </main>
  );
}

function DetailPanel({ d, technicians, busy, run, closeHref, selTech }: { d: Detail; technicians: Tech[]; busy: string | null; run: (k: string, url: string, body: unknown, method?: string, text?: string) => Promise<void>; closeHref: string; selTech: [string, (s: string) => void] }) {
  const [techId, setTechId] = selTech;
  const idx = FLOW.indexOf(d.status);
  const nextStatus = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
  const addr = `${d.city} ${d.landmark ?? ''} ${d.gps ?? ''}`.trim();
  return (
    <section id="detail" className="card mt-8 border-blue/40 p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-extrabold text-navy dark:text-white">{d.bookingNo}</h2>
        <Badge tone={bookTone[d.status] ?? 'soft'}>{d.status}</Badge>
        <a href={closeHref} className="btn-ghost ml-auto px-3 py-1.5 text-xs">Close</a>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-3 text-sm">
          <p className="font-bold text-navy dark:text-white">{d.serviceName} · {d.urgency} · {new Date(d.date).toLocaleDateString()} {d.timeSlot}</p>
          <p><span className="font-bold">{d.contactName}</span> — <a className="text-blue underline" href={`tel:${d.contactPhone}`}>{d.contactPhone}</a>{d.contactEmail ? ` · ${d.contactEmail}` : ''}</p>
          <p className="text-soft">{d.region} · {addr}</p>
          {d.gps && <a className="text-xs font-bold text-blue underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr + ' ' + d.gps)}`} target="_blank" rel="noreferrer">Open in Google Maps ({d.gps})</a>}
          <p className="rounded-lg bg-mist p-2 text-xs text-soft dark:bg-navy-700">{d.description}</p>
          <p>Price {ghs(d.price)} · mode {d.paymentMode} · deposit {ghs(d.depositDue)}{d.quote ? ` · quote ${d.quote.quoteNo} (${d.quote.status})` : ''}{d.rating ? <> · <Icon name="star" size={12} className="inline text-gold" />{d.rating}</> : ''}</p>
          {d.media.length > 0 && <div className="flex flex-wrap gap-2">{d.media.map((m) => <a key={m} href={m} target="_blank" rel="noreferrer"><img src={m} alt="job media" className="h-16 w-16 rounded-lg border border-line object-cover" /></a>)}</div>}
          <div>
            <p className={labelCls}>Assign technician</p>
            <div className="flex gap-2">
              <select className={inputCls} value={techId} onChange={(e) => setTechId(e.target.value)}>
                <option value="">Pick…</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.rating.toFixed(1)} rated · {t.jobs} jobs){t.available ? '' : ' — off'}</option>)}
              </select>
              <button disabled={!techId || busy !== null} className="btn-primary shrink-0 px-3 py-1.5 text-xs" onClick={() => run('assign', `/api/admin/bookings/${d.id}`, { technicianId: techId }, 'PATCH', 'Technician assigned + customer notified.')}>Assign</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {nextStatus && <button disabled={busy !== null} className="btn-gold px-3 py-1.5 text-xs" onClick={() => run('st', `/api/admin/bookings/${d.id}`, { status: nextStatus }, 'PATCH', `Moved to ${nextStatus}.`)}>Advance → {nextStatus.replace('_', ' ')}</button>}
            {d.status !== 'CANCELLED' && idx >= 0 && idx < 4 && (
              <button disabled={busy !== null} className="btn-ghost px-3 py-1.5 text-xs text-danger" onClick={() => { const note = window.prompt('Cancellation reason:'); if (note) run('cx', `/api/admin/bookings/${d.id}`, { status: 'CANCELLED', note }, 'PATCH', 'Cancelled.'); }}>Cancel booking</button>
            )}
          </div>
          {d.payments.length > 0 && (
            <div>
              <p className={labelCls}>Payments</p>
              {d.payments.map((pay) => <p key={pay.reference} className="text-xs">{pay.reference} · {ghs(pay.amount)} <Badge tone={pay.status === 'PAID' ? 'success' : 'warning'}>{pay.status}</Badge></p>)}
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <p className={labelCls}>Booking timeline</p>
          <ol className="space-y-2.5 border-l-2 border-line pl-4">
            {d.events.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue" />
                <p className="text-sm font-bold text-navy dark:text-white">{e.status.replace('_', ' ')} <span className="text-xs font-normal text-soft">{new Date(e.at).toLocaleString()}</span></p>
                {e.note && <p className="text-xs text-soft">{e.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function BlockedDates({ blocked, busy, run }: { blocked: Blocked[]; busy: string | null; run: (k: string, url: string, body: unknown, method?: string, text?: string) => Promise<void> }) {
  const [f, setF] = useState({ date: '', reason: '' });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card h-fit p-4">
        <h2 className="font-display mb-2 text-base font-bold text-navy dark:text-white">Block a date</h2>
        <div className="grid gap-3">
          <Field label="Date"><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Reason"><input className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Public holiday — Independence Day" /></Field>
          <button disabled={!f.date || busy !== null} className="btn-primary px-4 py-2 text-sm" onClick={() => run('bd', '/api/admin/blocked-dates', { date: new Date(`${f.date}T00:00:00`).toISOString(), reason: f.reason || undefined }, 'POST', 'Date blocked.')}>Block date</button>
        </div>
      </section>
      <div className="space-y-2">
        {blocked.map((b) => (
          <div key={b.id} className="card flex items-center gap-3 p-3">
            <p className="flex-1 text-sm font-bold text-navy dark:text-white">{new Date(b.date).toLocaleDateString('en-GH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} <Badge tone="danger">BLOCKED</Badge></p>
            <p className="max-w-48 truncate text-xs text-soft">{b.reason ?? '—'}</p>
            <button disabled={busy === b.id} className="btn-ghost px-2.5 py-1 text-xs" onClick={() => run(b.id, `/api/admin/blocked-dates?id=${b.id}`, {}, 'DELETE', 'Date unblocked.')}>Remove</button>
          </div>
        ))}
        {blocked.length === 0 && <EmptyState text="No blocked dates." />}
      </div>
    </div>
  );
}

function SlotEditor({ slots, busy, run }: { slots: SlotCap[]; busy: string | null; run: (k: string, url: string, body: unknown, method?: string, text?: string) => Promise<void> }) {
  const [f, setF] = useState({ id: '', day: '1', capacity: '3', slots: '08:00-10:00, 10:00-12:00, 14:00-16:00, 16:00-18:00' });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card h-fit p-4">
        <h2 className="font-display mb-2 text-base font-bold text-navy dark:text-white">{f.id ? 'Edit day template' : 'New day template'}</h2>
        <div className="grid gap-3">
          <Field label="Day of week"><select className={inputCls} value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })}>{DAYS.map((d, i) => <option key={d} value={String(i)}>{d}</option>)}</select></Field>
          <Field label="Capacity (bookings/day)"><input type="number" min="1" className={inputCls} value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></Field>
          <Field label="Slots (comma separated HH:MM-HH:MM)"><input className={inputCls} value={f.slots} onChange={(e) => setF({ ...f, slots: e.target.value })} /></Field>
          <div className="flex gap-2">
            <button disabled={busy !== null} className="btn-primary px-4 py-2 text-sm" onClick={() => run('sc', '/api/admin/slot-capacity', { id: f.id || undefined, dayOfWeek: Number(f.day), capacity: Number(f.capacity), slots: f.slots.split(',').map((s) => s.trim()).filter(Boolean) }, 'POST', 'Slot template saved.')}>{f.id ? 'Save' : 'Create'}</button>
            {f.id && <button className="btn-ghost px-4 py-2 text-sm" onClick={() => setF({ id: '', day: '1', capacity: '3', slots: '08:00-10:00, 10:00-12:00' })}>New</button>}
          </div>
        </div>
      </section>
      <div className="space-y-2">
        {slots.map((s) => (
          <div key={s.id} className="card flex flex-wrap items-center gap-2 p-3">
            <p className="text-sm font-bold text-navy dark:text-white">{DAYS[s.dayOfWeek]}</p>
            <p className="flex-1 text-xs text-soft">cap {s.capacity} · {s.slots.join(', ')}{s.serviceId ? ` · service-specific` : ' · all services'}</p>
            <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setF({ id: s.id, day: String(s.dayOfWeek), capacity: String(s.capacity), slots: s.slots.join(', ') })}>Edit</button>
            <button disabled={busy === s.id} className="btn-ghost px-2.5 py-1 text-xs text-danger" onClick={() => run(s.id, `/api/admin/slot-capacity?id=${s.id}`, {}, 'DELETE', 'Template removed.')}>Delete</button>
          </div>
        ))}
        {slots.length === 0 && <EmptyState text="No slot templates — bookings fall back to store defaults." />}
      </div>
    </div>
  );
}
