import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const zones = await prisma.deliveryZone.findMany({ where: { active: true }, orderBy: { fee: 'asc' } });
  return NextResponse.json(
    zones.map(z => ({
      id: z.id,
      name: z.name,
      regions: (() => { try { const v = JSON.parse(z.regions); return Array.isArray(v) ? v : []; } catch { return []; } })(),
      fee: z.fee,
      freeOver: z.freeOver,
      etaDays: z.etaDays,
    }))
  );
}
