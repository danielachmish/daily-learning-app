'use client';

import type { GenderTrack, Language, UserProfile } from '@daily-learning/shared';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  fetchUserById,
  resetUserPassword,
  setAccountStatus,
  setFreeAccess,
  setRole,
  updateUserDetails,
} from '../../../../services/users';
import { createClient } from '../../../../services/supabase/client';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [genderTrack, setGenderTrack] = useState<GenderTrack>('men');
  const [language, setLanguage] = useState<Language>('he');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [justResetPassword, setJustResetPassword] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const result = await fetchUserById(supabase, id);
      if (result.error) setLoadError(result.error);
      if (result.data) {
        setFullName(result.data.full_name);
        setPhone(result.data.phone ?? '');
        setGenderTrack(result.data.gender_track);
        setLanguage(result.data.language);
      }
      setUser(result.data);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSaveDetails() {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      alert('שם מלא הוא שדה חובה.');
      return;
    }
    const trimmedPhone = phone.trim() || null;

    setSaving(true);
    const supabase = createClient();
    const result = await updateUserDetails(supabase, id, {
      fullName: trimmedName,
      phone: trimmedPhone,
      genderTrack,
      language,
    });
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setFullName(trimmedName);
    setPhone(trimmedPhone ?? '');
    setUser((prev) =>
      prev ? { ...prev, full_name: trimmedName, phone: trimmedPhone, gender_track: genderTrack, language } : prev
    );
  }

  function generateRandomPassword() {
    // A 6-digit numeric code — easy for an admin to read over the phone,
    // same format spirit as the phone-number passwords used elsewhere.
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setNewPassword(code);
    setJustResetPassword(null);
  }

  async function handleResetPassword() {
    if (!user) return;
    if (newPassword.length < 6) {
      alert('הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }
    if (!confirm(`לאפס את הסיסמה של ${user.full_name} לסיסמה החדשה שהוזנה?`)) return;

    setResettingPassword(true);
    const result = await resetUserPassword(id, newPassword);
    setResettingPassword(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setJustResetPassword(newPassword);
    setNewPassword('');
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

  async function handleToggleAdmin() {
    if (!user) return;
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMessage =
      nextRole === 'admin'
        ? `להפוך את ${user.full_name} למנהל/ת? תהיה לו/לה גישה מלאה לפאנל הניהול, כולל פרטי תשלומים.`
        : `להסיר את הרשאת המנהל של ${user.full_name}?`;
    if (!confirm(confirmMessage)) return;

    setBusy(true);
    const supabase = createClient();
    const result = await setRole(supabase, id, nextRole);
    setBusy(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setUser((prev) => (prev ? { ...prev, role: nextRole } : prev));
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

  const detailsChanged =
    !!user &&
    (fullName.trim() !== user.full_name ||
      (phone.trim() || null) !== (user.phone ?? null) ||
      genderTrack !== user.gender_track ||
      language !== user.language);

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
        <Row label="רצף נוכחי" value={String(user.current_streak)} />
        <Row label="שיא רצף" value={String(user.best_streak)} />
        <Row label="סך ימי לימוד" value={String(user.total_completed_days)} />
        <Row label="נרשם בתאריך" value={new Date(user.created_at).toLocaleDateString('he-IL')} />
        <Row label="הרשאה" value={user.role === 'admin' ? 'מנהל/ת' : 'משתמש/ת רגיל/ה'} />
      </dl>

      <div className="mb-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">שם מלא</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">טלפון</label>
          <input
            type="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          />
        </div>
      </div>

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
          {!user.track_confirmed && (
            <p className="mt-1 text-xs text-amber-500">מנוי מיובא — עדיין לא בחר מסלול באפליקציה.</p>
          )}
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
        onClick={handleSaveDetails}
        disabled={saving || !detailsChanged}
        className="mb-8 rounded-full bg-teal-400 px-4 py-2 text-sm font-bold text-on-teal disabled:opacity-50"
      >
        {saving ? 'שומר…' : 'שמור פרטים'}
      </button>

      <div className="mb-8 rounded-xl border border-line p-4">
        <h2 className="mb-1 text-sm font-bold text-ink-900">איפוס סיסמה</h2>
        <p className="mb-3 text-xs text-slate-500">
          קובע סיסמה חדשה ישירות, בלי לשלוח מייל — יש למסור אותה למשתמש/ת בעצמכם (טלפון, הודעה וכו׳).
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            dir="ltr"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setJustResetPassword(null);
            }}
            placeholder="סיסמה חדשה"
            className="flex-1 rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          />
          <button
            onClick={generateRandomPassword}
            className="rounded-full border border-slate-300 px-3 py-2 text-xs font-bold text-ink-700"
          >
            צור סיסמה אקראית
          </button>
        </div>
        <button
          onClick={handleResetPassword}
          disabled={resettingPassword || newPassword.length < 6}
          className="mt-3 rounded-full bg-teal-400 px-4 py-2 text-sm font-bold text-on-teal disabled:opacity-50"
        >
          {resettingPassword ? 'מאפס…' : 'אפס סיסמה'}
        </button>
        {justResetPassword && (
          <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            הסיסמה אופסה ל־<span dir="ltr" className="font-mono font-bold">{justResetPassword}</span> — מסרו אותה
            למשתמש/ת עכשיו, היא לא תוצג שוב.
          </p>
        )}
      </div>

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
        <button
          onClick={handleToggleAdmin}
          disabled={busy}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-ink-700 disabled:opacity-50"
        >
          {user.role === 'admin' ? 'הסר הרשאת מנהל' : 'הפוך למנהל'}
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
