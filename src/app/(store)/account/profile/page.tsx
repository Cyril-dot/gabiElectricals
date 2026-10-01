import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import ProfileForm from './ProfileForm';

export const dynamic = 'force-dynamic';

export default async function AccountProfile() {
  const s = await getSession();
  if (!s) redirect('/login?next=/account/profile');
  const user = await prisma.user.findUnique({
    where: { id: s.userId },
    select: { name: true, email: true, phone: true, role: true, createdAt: true, referralCode: true, _count: { select: { orders: true, bookings: true } } },
  });
  if (!user) redirect('/login?next=/account/profile');

  return (
    <section aria-label="Profile settings" className="space-y-4 max-w-xl">
      <h2 className="font-display font-extrabold text-xl">Profile</h2>
      <ProfileForm initial={{ name: user.name, email: user.email, phone: user.phone ?? '' }} memberSince={user.createdAt.toISOString()} role={user.role} />

      <div className="card p-5 text-[12.5px] text-soft space-y-1">
        <p><b className="text-ink dark:text-white">{user._count.orders}</b> orders · <b className="text-ink dark:text-white">{user._count.bookings}</b> bookings · role <b className="text-ink dark:text-white">{user.role}</b></p>
        <p>Account created {user.createdAt.toLocaleDateString('en-GH', { dateStyle: 'long' })}. Referral code <b>{user.referralCode}</b>.</p>
        <p className="pt-2 border-t border-line">Delete your account or export your data? <a href="/contact" className="text-blue font-bold">Contact support</a>.</p>
      </div>
    </section>
  );
}
