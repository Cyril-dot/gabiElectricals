import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const Base = z.object({
  label: z.string().min(1).max(30).default('Home'),
  region: z.string().min(2).max(60),
  city: z.string().min(2).max(60),
  landmark: z.string().max(160).optional().or(z.literal('')),
  gps: z.string().max(20).optional().or(z.literal('')),
  phone: z.string().min(7).max(20),
  isDefault: z.boolean().default(false),
});
const CreateSchema = Base;
const PatchSchema = Base.extend({ id: z.string().min(1) }).partial();
const DeleteSchema = z.object({ id: z.string().min(1) });

async function authed() {
  const s = await getSession();
  if (!s) return null;
  return s;
}

/** /api/addresses — POST create | PATCH update | DELETE remove (one default per user) */
export async function POST(req: NextRequest) {
  const s = await authed();
  if (!s) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the address fields', issues: parsed.success ? [] : parsed.error.issues }, { status: 422 });
  const d = parsed.data;

  const count = await prisma.address.count({ where: { userId: s.userId } });
  const makeDefault = d.isDefault || count === 0;
  if (makeDefault) await prisma.address.updateMany({ where: { userId: s.userId }, data: { isDefault: false } });
  const addr = await prisma.address.create({
    data: { userId: s.userId, label: d.label, region: d.region, city: d.city, landmark: d.landmark || null, gps: d.gps?.toUpperCase() || null, phone: d.phone, isDefault: makeDefault },
  });
  await recordActivity(s.userId, 'ADDRESS_CREATED', 'ADDRESS', addr.id);
  return NextResponse.json({ ok: true, address: addr }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const s = await authed();
  if (!s) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) return NextResponse.json({ error: 'Invalid update' }, { status: 422 });
  const { id, ...d } = parsed.data;

  const existing = await prisma.address.findFirst({ where: { id, userId: s.userId } });
  if (!existing) return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  if (d.isDefault) await prisma.address.updateMany({ where: { userId: s.userId, NOT: { id } }, data: { isDefault: false } });
  const addr = await prisma.address.update({
    where: { id },
    data: {
      label: d.label, region: d.region, city: d.city,
      landmark: d.landmark, gps: d.gps?.toUpperCase(), phone: d.phone, isDefault: d.isDefault,
    },
  });
  await recordActivity(s.userId, 'ADDRESS_UPDATED', 'ADDRESS', id);
  return NextResponse.json({ ok: true, address: addr });
}

export async function DELETE(req: NextRequest) {
  const s = await authed();
  if (!s) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const parsed = DeleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'id required' }, { status: 422 });
  const existing = await prisma.address.findFirst({ where: { id: parsed.data.id, userId: s.userId } });
  if (!existing) return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  await prisma.address.delete({ where: { id: existing.id } });
  // if we removed the default, promote the newest remaining
  if (existing.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId: s.userId }, orderBy: { label: 'asc' } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  await recordActivity(s.userId, 'ADDRESS_DELETED', 'ADDRESS', existing.id);
  return NextResponse.json({ ok: true });
}
