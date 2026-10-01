import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const now = new Date();
  const popups = await prisma.popup.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
  }).catch(() => []);
  const s = await getSession();
  const returning = !!s;
  const ua = '';
  const out = popups
    .filter(p => {
      try {
        const t = JSON.parse(p.targetingJson);
        if (t.visitor === 'NEW' && returning) return false;
        if (t.visitor === 'RETURNING' && !returning) return false;
        if (t.device && t.device !== 'ALL') {
          const isMobile = /android|iphone|mobile/i.test(ua);
          if (t.device === 'MOBILE' !== isMobile) return false;
        }
        if (Array.isArray(t.pages) && t.pages.length && !t.pages.some((pg: string) => pg === 'ALL')) return false;
        return true;
      } catch { return true; }
    })
    .map(p => ({
      id: p.id, kind: p.kind, headline: p.headline, body: p.body, buttonLabel: p.buttonLabel, buttonHref: p.buttonHref,
      couponCode: p.couponCode, whatsappBtn: p.whatsappBtn, captureLead: p.captureLead, bgColor: p.bgColor,
      textColor: p.textColor, accentColor: p.accentColor, frequency: p.frequency, priority: p.priority,
      targeting: (() => { try { return JSON.parse(p.targetingJson); } catch { return {}; } })(),
    }));
  return NextResponse.json(out);
}
