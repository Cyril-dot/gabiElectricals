import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/notify';
import { staff, fail } from '@/lib/ops-api';
import { ServiceSchema } from '../route';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const parsed = ServiceSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid service update.');
  const d = parsed.data as Record<string, unknown>;
  if (d.includes) d.includes = JSON.stringify(d.includes);
  if (d.urgencyJson) d.urgencyJson = JSON.stringify(d.urgencyJson);
  if (d.name) d.name = d.name; // slug intentionally kept stable for existing bookings
  const s = await prisma.service.update({ where: { id }, data: d as never }).catch(() => null);
  if (!s) return fail('Service not found.', 404);
  await recordActivity(g.user.userId, 'SERVICE_UPDATED', 'Service', id);
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await staff(req, ['ADMIN', 'SUPER_ADMIN']);
  if ('res' in g) return g.res;
  const { id } = await ctx.params;
  const used = await prisma.booking.count({ where: { serviceId: id } });
  if (used > 0) {
    await prisma.service.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true, note: `Service has ${used} bookings — deactivated instead of deleted.` });
  }
  await prisma.service.delete({ where: { id } }).catch(() => null);
  await recordActivity(g.user.userId, 'SERVICE_DELETED', 'Service', id);
  return NextResponse.json({ ok: true });
}
