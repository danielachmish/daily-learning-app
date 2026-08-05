'use client';

import { useRouter } from 'next/navigation';

import { createClient } from '../services/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-slate-300 hover:text-ink-900"
    >
      התנתק/י
    </button>
  );
}
