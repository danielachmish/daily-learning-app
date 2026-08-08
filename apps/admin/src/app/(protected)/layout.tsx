import { redirect } from 'next/navigation';

import { AdminShell } from '../../components/AdminShell';
import { SignOutButton } from '../../components/SignOutButton';
import { createClient } from '../../services/supabase/server';

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

  return <AdminShell fullName={profile.full_name}>{children}</AdminShell>;
}
