import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Icon, ICONS, fmtDateTime } from '../_ui';

export const dynamic = 'force-dynamic';

const PAGE = 40;

const CH_COLOR: Record<string, string> = { SMS: 'bg-blue/10 text-blue', EMAIL: 'bg-gold/20 text-gold-dark', WHATSAPP: 'bg-success/15 text-success', PUSH: 'bg-navy text-white' };

export default async function AdminNotifications({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  try { await requireRole('ADMIN', 'SUPER_ADMIN'); } catch { redirect('/'); }
  const sp = await searchParams;
  const tab = sp.tab === 'activity' ? 'activity' : 'notifications';
  const type = (sp.type ?? '').trim();
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1);

  const build = (over: Record<string, string>) => {
    const p = new URLSearchParams({ tab, type, page: String(page), ...over });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    if (!over.page) p.delete('page');
    return `/admin/notifications?${p.toString()}`;
  };

  const [notifTypes, actTypes] = await Promise.all([
    prisma.notificationLog.groupBy({ by: ['channel'], _count: { _all: true } }),
    prisma.activityLog.groupBy({ by: ['action'], _count: { _all: true }, orderBy: { _count: { action: 'desc' } }, take: 12 }),
  ]);

  const [notifs, activities, notifTotal, actTotal] = await Promise.all([
    tab === 'notifications'
      ? prisma.notificationLog.findMany({
        where: { ...(type ? { channel: type } : {}) },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE, take: PAGE,
      })
      : Promise.resolve([]),
    tab === 'activity'
      ? prisma.activityLog.findMany({
        where: { ...(type ? { action: type } : {}) },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE, take: PAGE,
      })
      : Promise.resolve([]),
    type ? prisma.notificationLog.count({ where: { channel: type } }) : prisma.notificationLog.count(),
    type ? prisma.activityLog.count({ where: { action: type } }) : prisma.activityLog.count(),
  ]);

  const total = tab === 'notifications' ? notifTotal : actTotal;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const typeOptions = tab === 'notifications' ? notifTypes.map(t => t.channel) : actTypes.map(t => t.action);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white md:text-3xl">Notification Log</h1>
        <p className="text-sm font-semibold text-soft">Every SMS / email / WhatsApp the system would send (demo mode logs instead of sending) and the admin activity trail.</p>
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="flex overflow-hidden rounded-xl border border-line">
          {(['notifications', 'activity'] as const).map(t => (
            <Link key={t} href={build({ tab: t, type: '', page: '1' })}
              className={`px-4 py-2 text-xs font-extrabold uppercase ${tab === t ? 'bg-navy text-white dark:bg-blue' : 'bg-white text-soft hover:text-blue dark:bg-navy'}`}>
              {t === 'notifications' ? 'Messages' : 'Activity'}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link href={build({ type: '', page: '1' })} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${!type ? 'bg-blue text-white' : 'border border-line bg-white text-soft dark:bg-navy'}`}>All</Link>
          {typeOptions.map(t => (
            <Link key={t} href={build({ type: t, page: '1' })}
              className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${type === t ? 'bg-blue text-white' : 'border border-line bg-white text-soft hover:text-blue dark:bg-navy'}`}>
              {t.replaceAll('_', ' ')}
            </Link>
          ))}
        </div>
        <span className="ml-auto text-xs font-bold text-soft">{total} records · page {page}/{pages}</span>
      </div>

      <div className="space-y-2">
        {tab === 'notifications' && notifs.map(n => (
          <div key={n.id} className="card flex flex-wrap items-center gap-3 px-4 py-3">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${CH_COLOR[n.channel] ?? 'bg-mist text-soft'}`}>{n.channel}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{n.template?.replaceAll('_', ' ') ?? 'Message'} <span className="font-mono text-xs font-semibold text-soft">→ {n.to}</span></p>
              <p className="line-clamp-2 text-xs text-soft">{n.body}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${n.status === 'LOGGED' ? 'bg-warning/15 text-warning' : n.status === 'SENT' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>{n.status}</span>
            <span className="whitespace-nowrap text-xs text-soft">{fmtDateTime(n.createdAt)}</span>
          </div>
        ))}
        {tab === 'activity' && activities.map(a => (
          <div key={a.id} className="card flex flex-wrap items-center gap-3 px-4 py-3">
            <Icon d={ICONS.overview} className="h-4 w-4 text-soft" />
            <p className="text-sm font-extrabold">{a.action.replaceAll('_', ' ')}</p>
            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-soft">
              {a.user?.name ?? 'system'}{a.entity ? ` · ${a.entity}${a.entityId ? ` ${String(a.entityId).slice(0, 10)}` : ''}` : ''}
              {Object.keys(JSON.parse(a.metaJson || '{}')).length ? ` · ${a.metaJson.slice(0, 90)}` : ''}
            </p>
            <span className="font-mono text-[11px] text-soft">{a.ip ?? '—'}</span>
            <span className="whitespace-nowrap text-xs text-soft">{fmtDateTime(a.createdAt)}</span>
          </div>
        ))}
        {(tab === 'notifications' ? notifs : activities).length === 0 && (
          <div className="card p-8 text-center text-sm font-semibold text-soft">Nothing logged{type ? ` for “${type}”` : ''} yet.</div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-1 text-xs font-bold text-soft">
          <Link href={build({ page: String(Math.max(1, page - 1)) })} className="btn-ghost px-2 py-1">‹</Link>
          {page}/{pages}
          <Link href={build({ page: String(Math.min(pages, page + 1)) })} className="btn-ghost px-2 py-1">›</Link>
        </div>
      )}
    </div>
  );
}
