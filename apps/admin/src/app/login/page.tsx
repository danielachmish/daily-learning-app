'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Logo } from '../../components/Logo';
import { createClient } from '../../services/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('נא למלא אימייל וסיסמה.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace('/');
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-paper-0 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-line bg-paper-50 p-8 shadow-sm"
      >
        <div className="mb-6 flex items-center gap-3">
          <Logo size={36} />
          <h1 className="text-lg font-extrabold text-ink-900">כניסת מנהל</h1>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-500">
          אימייל
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          className="mb-4 w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
        />

        <label className="mb-1 block text-sm font-medium text-slate-500">
          סיסמה
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          className="mb-4 w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
        />

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-teal-400 px-4 py-2 text-sm font-bold text-on-teal disabled:opacity-60"
        >
          {submitting ? 'מתחבר/ת…' : 'התחבר/י'}
        </button>
      </form>
    </div>
  );
}
