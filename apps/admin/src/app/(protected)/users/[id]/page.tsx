'use client';

import type { GenderTrack, Language, UserProfile } from '@daily-learning/shared';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  fetchUserById,
  setAccountStatus,
  setFreeAccess,
  updateUserTrackAndLanguage,
} from '../../../../services/users';
import { createClient } from '../../../../services/supabase/client';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [genderTrack, setGenderTrack] = useState<GenderTrack>('men');
  const [language, setLanguage] = useState<Language>('he');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const result = await fetchUserById(supabase, id);
      if (result.error) setLoadError(result.error);
      if (result.data) {
        setGenderTrack(result.data.gender_track);
        setLanguage(result.data.language);
      }
      setUser(result.data);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSaveTrackLanguage() {
    setSaving(true);
    const supabase = createClient();
    const result = await updateUserTrackAndLanguage(supabase, id, genderTrack, language);
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setUser((prev) => (prev ? { ...prev, gender_track: genderTrack, language } : prev));
  }

  async function handleToggleFreeAccess() {
    if (!user) return;
    setBusy(true);
    const supabase = createClient();
    const result = await setFreeAccess(supabase, id, !user.free_access);
    setBusy(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setUser((prev) => (prev ? { ...prev, free_access: !prev.free_access } : prev));
  }

  async function handleToggleBlocked() {
    if (!user) return;
    const nextStatus = user.account_status === 'blocked' ? 'active' : 'blocked';
    if (nextStatus === 'blocked' && !confirm(`לחסום את ${user.full_name}?`)) return;

    setBusy(true);
    const supabase = createClient();
    const result = await setAccountStatus(supabase, id, nextStatus);
    setBusy(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setUser((prev) => (prev ? { ...prev, account_status: nextStatus } : prev));
  }

  if (loading) return <p className="text-sm text-slate-500">טוען…</p>;
  if (loadError || !user) return <p className="text-sm text-danger">{loadError ?? 'המשתמש לא נמצא.'}</p>;

  return (
    <div className="max-w-lg">
      <button onClick={() => router.push('/users')} className="mb-4 text-sm text-slate-500 hover:underline">
        ‹ חזרה לרשימה
      </button>

      <h1 className="mb-4 text-2xl font-extrabold text-ink-900">{user.full_name}</h1>

      <dl className="mb-6 space-y-2 text-sm">
        <Row label="אימייל" value={user.email} />
        <Row label="טלפון" value={user.phone ?? '—'} />
        <Row label="רצף נוכחי" value={String(user.current_streak)} />
        <Row label="שיא רצף" value={String(user.best_streak)} />
        <Row label="סך ימי לימוד" value={String(user.total_completed_days)} />
        <Row label="נרשם בתאריך" value={new Date(user.created_at).toLocaleDateString('he-IL')} />
      </dl>

      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-ink-700">מסלול</label>
          <select
            value={genderTrack}
            onChange={(e) => setGenderTrack(e.target.value as GenderTrack)}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          >
            <option value="men">גברים</option>
            <option value="women">נשים</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-ink-700">שפה</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          >
            <option value="he">עברית</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
      <button
        onClick={handleSaveTrackLanguage}
        disabled={saving || (genderTrack === user.gender_track && language === user.language)}
        className="mb-8 rounded-full bg-teal-400 px-4 py-2 text-sm font-bold text-on-teal disabled:opacity-50"
      >
        {saving ? 'שומר…' : 'שמור מסלול ושפה'}
      </button>

      <div className="flex gap-3">
        <button
          onClick={handleToggleFreeAccess}
          disabled={busy}
          className="rounded-full bg-teal-400 px-4 py-2 text-sm font-bold text-on-teal disabled:opacity-50"
        >
          {user.free_access ? 'בטל גישה חינמית' : 'הפעל גישה חינמית'}
        </button>
        <button
          onClick={handleToggleBlocked}
          disabled={busy}
          className={`rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${
            user.account_status === 'blocked' ? 'bg-success' : 'bg-danger'
          }`}
        >
          {user.account_status === 'blocked' ? 'בטל חסימה' : 'חסום משתמש'}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line py-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-ink-900">{value}</dd>
    </div>
  );
}
