import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Logo } from '../../components/Logo';
import { SignOutButton } from '../../components/SignOutButton';
import { createClient } from '../../services/supabase/server';

const NAV_LINKS = [
  { href: '/', label: 'דשבורד' },
  { href: '/users', label: 'משתמשים' },
  { href: '/subscriptions', label: 'מנויים' },
  { href: '/lessons', label: 'לימודים' },
  { href: '/dedications', label: 'הקדשות' },
  { href: '/settings', label: 'הגדרות' },
  { href: '/reports', label: 'דוחות' },
];

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-xl font-semibold text-danger">אין לך הרשאת גישה לפאנל הניהול</h1>
        <p className="text-sm text-slate-500">חשבון זה אינו מוגדר כמנהל.</p>
        <SignOutButton />
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <aside className="flex w-56 flex-col gap-1 border-e border-line bg-paper-50 p-4">
        <div className="mb-5 flex items-center gap-2 px-1">
          <Logo size={28} />
          <span className="text-sm font-extrabold text-ink-900">לימוד יומי</span>
        </div>
        <p className="mb-4 truncate text-sm font-medium text-slate-500">{profile.full_name}</p>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-teal-100 hover:text-teal-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <SignOutButton />
      </aside>
      <main className="flex-1 bg-paper-0 p-8">{children}</main>
    </div>
  );
}
