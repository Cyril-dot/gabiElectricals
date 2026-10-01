import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { getCurrentUser } from '@/lib/auth';
import { HeaderClient } from './HeaderClient';

export async function Header() {
  const [cats, user, settings, bar] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, name: true, icon: true } }),
    getCurrentUser(),
    getSettings(),
    prisma.announcementBar.findFirst({ where: { active: true } }),
  ]);
  return <HeaderClient cats={cats} bar={bar} user={user ? { name: user.name, role: user.role } : null} biz={settings.business} />;
}
