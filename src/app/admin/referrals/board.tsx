'use client';
import { useState } from 'react';
import { Badge, EmptyState, Field, Msg, Tabs, api, inputCls, labelCls, tableWrap, tdCls, thCls, useMsg } from '@/components/ops/ui';
import { ghs } from '@/lib/money';

type Ref = { id: string; name: string; email: string; phone: string | null; code: string; walletCredit: number; tier: string | null; commissionPct: number | null; active: boolean; role: string; visits: number; conversions: number; earnings: number };
type Payout = { id: string; name: string; email: string; code: string; active: boolean; wallet: number; amount: number; method: string; momo: string; network: string; status: string; note: string | null; createdAt: string };
type App = { id: string; name: string; phone: string; email: string; audience: string; status: string; commissionPct: number; createdAt: string };
type Conv = { code: string; referrer: string; fingerprint: string | null; converted: boolean; at: string };
type Settings = { referrerReward: number; friendReward: number; minOrder: number; minPayout: number; affiliateDefaultPct: number };

export function ReferralsBoard({ referrers, leaderboard, conversions, payouts, apps, settings }: { referrers: Ref[]; leaderboard: Ref[]; conversions: Conv[]; payouts: Payout[]; apps: App[]; settings: Settings }) {
  const [tab, setTab] = useState<'referrers' | 'payouts' | 'apps' | 'settings'>('referrers');
  const { msg, setMsg } = useMsg();
  const [busy, setBusy] = useState<string | null>(null);
  const [s, setS] = useState({ ...settings });

  async function run(key: string, fn: () => Promise<unknown>, text: string) {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ kind: 'ok', text }); setTimeout(() => location.reload(), 600); }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); setBusy(null); }
  }
  const pending = payouts.filter((p) => p.status === 'PENDING');

  return (
    <main className="container-x py-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue">Programme</p>
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white">Referrals & affiliates</h1>
      </header>
      <Tabs
        tabs={[
          { id: 'referrers', label: 'Referrers', count: referrers.length },
          { id: 'payouts', label: 'Payouts', count: pending.length },
          { id: 'apps', label: 'Affiliate applications', count: apps.filter((a) => a.status === 'PENDING').length },
          { id: 'settings', label: 'Settings' },
        ]}
        active={tab}
        onChange={(t) => setTab(t as typeof tab)}
      />
      <Msg msg={msg} />

      {tab === 'referrers' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className={tableWrap}>
              <table className="w-full min-w-[620px]">
                <thead className="border-b border-line bg-mist"><tr>{['Referrer', 'Code', 'Visits', 'Conversions', 'Earnings', 'Wallet', 'Status', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                <tbody>{referrers.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 last:border-0">
                    <td className={tdCls}><span className="font-semibold">{r.name}</span><span className="block text-[10px] text-soft">{r.email}</span></td>
                    <td className={`${tdCls} font-mono text-xs font-bold text-blue`}>{r.code}</td>
                    <td className={tdCls}>{r.visits}</td>
                    <td className={`${tdCls} font-bold text-success`}>{r.conversions}</td>
                    <td className={tdCls}>{ghs(r.earnings)}</td>
                    <td className={`${tdCls} font-bold`}>{ghs(r.walletCredit)}</td>
                    <td className={tdCls}><Badge tone={r.active ? 'success' : 'danger'}>{r.active ? r.role : 'DISABLED'}</Badge>{r.tier && <span className="ml-1 text-[10px] text-gold-dark dark:text-gold">{r.tier}</span>}</td>
                    <td className={tdCls}>
                      <button disabled={busy === r.id} className={`btn-ghost px-2.5 py-1 text-xs ${r.active ? 'text-danger' : 'text-success'}`}
                        onClick={() => run(r.id, () => api(`/api/admin/referrals/users/${r.id}`, { method: 'PATCH', body: JSON.stringify({ active: !r.active }) }), r.active ? 'Referrer disabled — future attribution paused.' : 'Referrer re-enabled.')}>
                        {r.active ? 'Disable abuser' : 'Re-enable'}
                      </button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
              {referrers.length === 0 && <EmptyState text="No referral activity yet." />}
            </div>
            <section className="card mt-6 p-4">
              <h2 className="font-display mb-2 text-base font-bold text-navy dark:text-white">Recent referral visits / conversions</h2>
              <div className="space-y-1.5">
                {conversions.slice(0, 12).map((c, i) => (
                  <p key={i} className="text-xs text-soft"><Badge tone={c.converted ? 'success' : 'soft'}>{c.converted ? 'CONVERTED' : 'VISIT'}</Badge> <span className="font-mono">{c.code}</span> → {c.referrer} · {new Date(c.at).toLocaleDateString()} · fp {c.fingerprint?.slice(0, 14) ?? '—'}</p>
                ))}
                {conversions.length === 0 && <EmptyState text="No tracked visits." />}
              </div>
            </section>
          </div>
          <section className="card h-fit p-4">
            <h2 className="font-display mb-3 text-base font-bold text-navy dark:text-white">Leaderboard</h2>
            <ol className="space-y-2">
              {leaderboard.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${i === 0 ? 'bg-gold text-navy' : i < 3 ? 'bg-blue text-white' : 'bg-mist text-soft'}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-navy dark:text-white">{r.name}</p><p className="text-[10px] text-soft">{r.conversions} conversions · {ghs(r.earnings)}</p></div>
                  <span className="text-xs font-bold text-blue">{ghs(r.walletCredit)}</span>
                </li>
              ))}
              {leaderboard.length === 0 && <EmptyState text="Be the first — share /refer." />}
            </ol>
          </section>
        </div>
      )}

      {tab === 'payouts' && (
        <div className={tableWrap}>
          <table className="w-full min-w-[700px]">
            <thead className="border-b border-line bg-mist"><tr>{['Referrer', 'Amount', 'MoMo', 'Wallet', 'Status', 'Requested', 'Decision'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>{payouts.map((x) => (
              <tr key={x.id} className="border-b border-line/60 last:border-0">
                <td className={tdCls}><span className="font-semibold">{x.name}</span><span className="block text-[10px] text-soft">{x.code} · wallet {ghs(x.wallet)}</span></td>
                <td className={`${tdCls} font-bold`}>{ghs(x.amount)} <span className="text-[10px] font-normal text-soft">min {ghs(settings.minPayout)}</span></td>
                <td className={`${tdCls} text-xs`}>{x.network}<span className="block font-mono">{x.momo}</span></td>
                <td className={tdCls}>{x.wallet >= x.amount ? <Badge tone="success">funded</Badge> : <Badge tone="warning">short</Badge>}</td>
                <td className={tdCls}><Badge tone={x.status === 'PAID' ? 'success' : x.status === 'PENDING' ? 'warning' : 'danger'}>{x.status}</Badge>{x.note && <p className="mt-0.5 max-w-40 truncate text-[10px] text-soft" title={x.note}>{x.note}</p>}</td>
                <td className={`${tdCls} text-xs text-soft`}>{new Date(x.createdAt).toLocaleDateString()}</td>
                <td className={tdCls}>
                  {x.status === 'PENDING' ? (
                    <div className="flex gap-1.5">
                      <button disabled={busy === x.id} className="btn-primary px-2.5 py-1 text-xs" onClick={() => run(x.id, () => api(`/api/admin/payouts/${x.id}`, { method: 'POST', body: JSON.stringify({ action: 'APPROVE' }) }), `Payout marked PAID — ${x.name} notified.`)}>Approve</button>
                      <button disabled={busy === x.id} className="btn-ghost px-2.5 py-1 text-xs text-danger" onClick={() => { const note = window.prompt('Reject reason (also write "fraud" to claw back wallet credits):'); if (note) run(x.id, () => api(`/api/admin/payouts/${x.id}`, { method: 'POST', body: JSON.stringify({ action: 'REJECT', note }) }), 'Payout rejected.'); }}>Reject</button>
                    </div>
                  ) : <span className="text-xs text-soft">—</span>}
                </td>
              </tr>
            ))}</tbody>
          </table>
          {payouts.length === 0 && <EmptyState text="No payout requests." />}
        </div>
      )}

      {tab === 'apps' && (
        <div className="grid gap-3">
          {apps.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-navy dark:text-white">{a.name} <span className="font-normal text-soft">· {a.email} · {a.phone}</span></p>
                <p className="mt-0.5 text-xs text-soft">{a.audience}</p>
                <p className="text-[10px] text-soft">asked {a.commissionPct}% · applied {new Date(a.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge tone={a.status === 'APPROVED' ? 'success' : a.status === 'PENDING' ? 'warning' : 'danger'}>{a.status}</Badge>
              {a.status === 'PENDING' && (
                <div className="flex gap-1.5">
                  <button disabled={busy === a.id} className="btn-primary px-2.5 py-1 text-xs" onClick={() => run(a.id, () => api(`/api/admin/affiliate/${a.id}`, { method: 'POST', body: JSON.stringify({ action: 'APPROVE', commissionPct: a.commissionPct || settings.affiliateDefaultPct }) }), 'Approved — user is now AFFILIATE.')}>Approve</button>
                  <button disabled={busy === a.id} className="btn-ghost px-2.5 py-1 text-xs text-danger" onClick={() => run(a.id, () => api(`/api/admin/affiliate/${a.id}`, { method: 'POST', body: JSON.stringify({ action: 'REJECT' }) }), 'Rejected.')}>Reject</button>
                </div>
              )}
            </div>
          ))}
          {apps.length === 0 && <EmptyState text="No affiliate applications." />}
        </div>
      )}

      {tab === 'settings' && (
        <section className="card max-w-xl p-5">
          <h2 className="font-display mb-3 text-lg font-bold text-navy dark:text-white">Referral programme settings</h2>
          <p className="mb-4 text-xs text-soft">Saved to the Setting table (key: referral) via getSettings/setSetting.</p>
          <div className="grid grid-cols-2 gap-3">
            {([['referrerReward', 'Referrer reward (GHS)'], ['friendReward', 'Friend reward (GHS)'], ['minOrder', 'Min first order (GHS)'], ['minPayout', 'Min payout (GHS)'], ['affiliateDefaultPct', 'Affiliate default %']] as const).map(([k, label]) => (
              <Field key={k} label={label}><input type="number" min="0" step="0.5" className={inputCls} value={s[k]} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} /></Field>
            ))}
          </div>
          <button disabled={busy !== null} className="btn-gold mt-4 px-4 py-2 text-sm" onClick={() => run('set', () => api('/api/admin/referrals/settings', { method: 'POST', body: JSON.stringify(s) }), 'Referral settings saved.')}>Save settings</button>
        </section>
      )}
    </main>
  );
}
