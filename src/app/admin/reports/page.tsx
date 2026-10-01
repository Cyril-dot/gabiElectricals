import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ghs } from '@/lib/money';
import { Icon, ICONS } from '../_ui';
import { parseRange, salesByDay, profitReport, servicesReport, referralsReport } from '../_reports';

export const dynamic = 'force-dynamic';

function Panel({ title, csvType, range, children }: { title: string; csvType: string; range: { from: Date; to: Date }; children: React.ReactNode }) {
  const qs = `type=${csvType}&from=${range.from.toISOString().slice(0, 10)}&to=${range.to.toISOString().slice(0, 10)}`;
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="font-display text-base font-extrabold text-navy dark:text-white">{title}</h2>
        <div className="flex items-center gap-2">
          <a href={`/api/admin/reports/export?${qs}`} className="btn-ghost px-3 py-1.5 text-xs"><Icon d={ICONS.download} className="h-4 w-4" /> Export CSV</a>
          <span className="hidden text-[11px] font-semibold text-soft sm:block">PDF: print this page</span>
        </div>
      </div>
      <div className="max-h-96 overflow-auto">{children}</div>
    </section>
  );
}

export default async function AdminReports({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch { redirect('/'); }
  const sp = await searchParams;
  const range = parseRange(sp);
  const [sales, profit, services, referrals] = await Promise.all([
    salesByDay(range), profitReport(range), servicesReport(range), referralsReport(range),
  ]);

  const table = 'w-full min-w-[520px] text-sm';
  const th = 'px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-soft';
  const td = 'px-4 py-2';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white md:text-3xl">Reports</h1>
          <p className="text-sm font-semibold text-soft">
            {range.from.toISOString().slice(0, 10)} → {range.to.toISOString().slice(0, 10)} · revenue {ghs(sales.reduce((s, r) => s + r.revenue, 0), { cents: false })} · profit {ghs(profit.profit, { cents: false })}
          </p>
        </div>
        <form className="flex flex-wrap items-end gap-2" action="/admin/reports">
          <div>
            <label className="mb-1 block text-[11px] font-extrabold uppercase text-soft">From</label>
            <input type="date" name="from" defaultValue={sp.from ?? range.from.toISOString().slice(0, 10)} className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold dark:bg-navy" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-extrabold uppercase text-soft">To</label>
            <input type="date" name="to" defaultValue={sp.to ?? range.to.toISOString().slice(0, 10)} className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold dark:bg-navy" />
          </div>
          <button className="btn-primary px-4 py-2 text-sm">Apply</button>
        </form>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Sales by day" csvType="sales" range={range}>
          <table className={table}>
            <thead className="sticky top-0 bg-mist"><tr><th className={th}>Day</th><th className={th}>Orders</th><th className={th}>Revenue</th></tr></thead>
            <tbody>
              {sales.map(r => (
                <tr key={r.day} className="border-b border-line last:border-0">
                  <td className={`${td} font-bold`}>{r.day}</td><td className={td}>{r.orders}</td><td className={`${td} font-extrabold`}>{ghs(r.revenue)}</td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan={3} className={`${td} py-6 text-center text-soft`}>No paid orders in range.</td></tr>}
            </tbody>
          </table>
        </Panel>

        <Panel title={`Profit (revenue ${ghs(profit.revenue)} − cost ${ghs(profit.cost)})`} csvType="profit" range={range}>
          <table className={table}>
            <thead className="sticky top-0 bg-mist"><tr><th className={th}>Item</th><th className={th}>Qty</th><th className={th}>Revenue</th><th className={th}>Cost</th><th className={th}>Profit</th></tr></thead>
            <tbody>
              {profit.rows.map((r, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className={`${td} max-w-[220px] truncate font-bold`}>{r.name}</td>
                  <td className={td}>{r.qty}</td><td className={td}>{ghs(r.revenue)}</td><td className={td}>{ghs(r.cost)}</td>
                  <td className={`${td} font-extrabold ${r.profit < 0 ? 'text-danger' : 'text-success'}`}>{ghs(r.profit)}</td>
                </tr>
              ))}
              {profit.rows.length === 0 && <tr><td colSpan={5} className={`${td} py-6 text-center text-soft`}>No order items in range.</td></tr>}
            </tbody>
          </table>
        </Panel>

        <Panel title={`Services — completed bookings (${services.count})`} csvType="services" range={range}>
          <table className={table}>
            <thead className="sticky top-0 bg-mist"><tr><th className={th}>Booking</th><th className={th}>Service</th><th className={th}>Technician</th><th className={th}>Price</th></tr></thead>
            <tbody>
              {services.rows.map(r => (
                <tr key={r.bookingNo} className="border-b border-line last:border-0">
                  <td className={`${td} font-mono font-bold`}>{r.bookingNo}</td><td className={td}>{r.service}</td><td className={td}>{r.tech}</td>
                  <td className={`${td} font-extrabold`}>{ghs(r.price)}</td>
                </tr>
              ))}
              {services.rows.length === 0 && <tr><td colSpan={4} className={`${td} py-6 text-center text-soft`}>No completed bookings in range.</td></tr>}
            </tbody>
          </table>
          {services.rows.length > 0 && <p className="border-t border-line px-4 py-2 text-sm font-extrabold">Total service revenue: {ghs(services.total)}</p>}
        </Panel>

        <Panel title="Referral leaderboard" csvType="referrals" range={range}>
          <table className={table}>
            <thead className="sticky top-0 bg-mist"><tr><th className={th}>Referrer</th><th className={th}>Code</th><th className={th}>Visits</th><th className={th}>Converted</th><th className={th}>Earned</th></tr></thead>
            <tbody>
              {referrals.map(r => (
                <tr key={r.code} className="border-b border-line last:border-0">
                  <td className={`${td} font-bold`}>{r.name}</td><td className={`${td} font-mono text-blue`}>{r.code}</td>
                  <td className={td}>{r.visits}</td><td className={td}>{r.converted}</td><td className={`${td} font-extrabold text-success`}>{ghs(r.earned)}</td>
                </tr>
              ))}
              {referrals.length === 0 && <tr><td colSpan={5} className={`${td} py-6 text-center text-soft`}>No referral activity in range.</td></tr>}
            </tbody>
          </table>
        </Panel>
      </div>

      <p className="text-center text-[11px] font-semibold text-soft no-print">For a signed PDF use the browser print dialog (⋯ → Print → Save as PDF) — every panel and the date range print cleanly.</p>
    </div>
  );
}
