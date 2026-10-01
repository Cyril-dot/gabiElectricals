import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail, slugify } from '@/lib/ops-api';

export const ServiceSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().min(10).max(4000),
  shortDesc: z.string().max(200).optional(),
  basePrice: z.number().min(0).max(1000000),
  depositPct: z.number().min(0).max(100).default(30),
  durationMins: z.number().int().min(15).max(1440).default(120),
  image: z.string().max(300).optional(),
  includes: z.array(z.string().max(120)).max(20).default([]),
  urgencyJson: z.object({ STANDARD: z.number().min(0), URGENT: z.number().min(0), EMERGENCY: z.number().min(0) }).default({ STANDARD: 0, URGENT: 0, EMERGENCY: 0 }),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(99).default(0),
});

/** POST /api/admin/services — create bookable service */
export async function POST(req: NextRequest) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const parsed = ServiceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid service.');
  const d = parsed.data;
  let slug = slugify(d.name);
  if (await prisma.service.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const s = await prisma.service.create({
    data: {
      slug, name: d.name, description: d.description, shortDesc: d.shortDesc || null, basePrice: d.basePrice,
      depositPct: d.depositPct, durationMins: d.durationMins, image: d.image || null,
      includes: JSON.stringify(d.includes), urgencyJson: JSON.stringify(d.urgencyJson), active: d.active, sortOrder: d.sortOrder,
    },
  });
  await recordActivity(g.user.userId, 'SERVICE_CREATED', 'Service', s.id);
  return NextResponse.json({ ok: true, id: s.id, slug: s.slug }, { status: 201 });
}
