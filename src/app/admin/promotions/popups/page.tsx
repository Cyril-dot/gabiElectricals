import { prisma } from '@/lib/db';
import { PopupBoard } from './board';

export const dynamic = 'force-dynamic';

export default async function AdminPopupsPage() {
  const [popups, coupons] = await Promise.all([
    prisma.popup.findMany({ orderBy: [{ active: 'desc' }, { priority: 'desc' }, { id: 'desc' }] }),
    prisma.coupon.findMany({ where: { active: true }, select: { code: true }, orderBy: { code: 'asc' }, take: 100 }),
  ]);
  return (
    <PopupBoard
      popups={popups.map((p) => ({
        id: p.id, name: p.name, kind: p.kind, headline: p.headline, body: p.body, image: p.image,
        buttonLabel: p.buttonLabel, buttonHref: p.buttonHref, couponCode: p.couponCode, whatsappBtn: p.whatsappBtn,
        captureLead: p.captureLead, bgColor: p.bgColor, textColor: p.textColor, accentColor: p.accentColor,
        targeting: safeTargeting(p.targetingJson), frequency: p.frequency, priority: p.priority, active: p.active,
        startsAt: p.startsAt?.toISOString() ?? null, endsAt: p.endsAt?.toISOString() ?? null,
        impressions: p.impressions, conversions: p.conversions,
      }))}
      couponCodes={coupons.map((c) => c.code)}
    />
  );
}

function safeTargeting(json: string) {
  try {
    const t = JSON.parse(json) as { pages?: string[]; visitor?: string; device?: string; delaySec?: number; scrollPct?: number };
    return { pages: t.pages ?? [], visitor: t.visitor ?? 'ALL', device: t.device ?? 'ALL', delaySec: t.delaySec, scrollPct: t.scrollPct };
  } catch {
    return { pages: [], visitor: 'ALL', device: 'ALL' };
  }
}
