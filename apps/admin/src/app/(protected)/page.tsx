'use client';

import { useEffect, useState } from 'react';

import { BookIcon, HeartIcon, ShekelIcon, UsersIcon } from '../../components/DashboardIcons';
import { fetchDashboardSummary, type DashboardSummary } from '../../services/reports';
import { createClient } from '../../services/supabase/client';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    fetchDashboardSummary(supabase).then((result) => {
      if (result.error) setError(result.error);
      setSummary(result.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-sm text-slate-500">טוען…</p>;
  if (error || !summary) return <p className="text-sm text-danger">{error ?? 'שגיאה בטעינת הדשבורד.'}</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">דשבורד</h1>

      {/* Hero row — the handful of numbers worth seeing at a glance before
          scrolling into any category, each large enough to read instantly. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <HeroTile label="מנויים פעילים" value={summary.activeSubscriptions} tone="teal" />
        <HeroTile
          label="ממתינות לאישור"
          value={summary.pendingDedications}
          tone={summary.pendingDedications > 0 ? 'amber' : 'neutral'}
        />
        <HeroTile label="הכנסות החודש" value={`₪${summary.monthTotalRevenue.toLocaleString()}`} tone="success" />
      </div>

      <Section title="משתמשים" icon={<UsersIcon className="h-5 w-5" />} tone="teal">
        <Tile label="סך משתמשים" value={summary.totalUsers} />
        <Tile label="חדשים היום" value={summary.newUsersToday} />
        <Tile label="חדשים החודש" value={summary.newUsersThisMonth} />
      </Section>

      <Section title="לימוד" icon={<BookIcon className="h-5 w-5" />} tone="amber">
        <Tile label="למדו היום" value={summary.learnedToday} />
        <Tile label="למדו השבוע" value={summary.learnedThisWeek} />
        <Tile label="למדו החודש" value={summary.learnedThisMonth} />
      </Section>

      <Section title="הקדשות" icon={<HeartIcon className="h-5 w-5" />} tone="teal">
        <Tile label="הקדשות היום" value={summary.dedicationsToday} />
        <Tile label="הקדשות החודש" value={summary.dedicationsThisMonth} />
        <Tile label="ממתינות לאישור" value={summary.pendingDedications} highlight={summary.pendingDedications > 0} />
      </Section>

      <Section title="הכנסות החודש" icon={<ShekelIcon className="h-5 w-5" />} tone="success">
        <Tile label="ממנויים" value={`₪${summary.monthSubscriptionRevenue.toLocaleString()}`} />
        <Tile label="מהקדשות" value={`₪${summary.monthDedicationRevenue.toLocaleString()}`} />
        <Tile label="סה״כ" value={`₪${summary.monthTotalRevenue.toLocaleString()}`} />
      </Section>
    </div>
  );
}

type Tone = 'teal' | 'amber' | 'success' | 'neutral';

const HERO_TONE_CLASSES: Record<Tone, string> = {
  teal: 'bg-teal-100 text-teal-900',
  amber: 'bg-amber-100 text-amber-500',
  success: 'bg-success/10 text-success',
  neutral: 'bg-paper-50 text-ink-900 border border-line',
};

function HeroTile({ label, value, tone }: { label: string; value: string | number; tone: Tone }) {
  return (
    <div className={`rounded-2xl p-5 ${HERO_TONE_CLASSES[tone]}`}>
      <p className="text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-sm font-medium opacity-80">{label}</p>
    </div>
  );
}

const ICON_TONE_CLASSES: Record<Tone, string> = {
  teal: 'bg-teal-100 text-teal-600',
  amber: 'bg-amber-100 text-amber-500',
  success: 'bg-success/10 text-success',
  neutral: 'bg-slate-500/10 text-slate-500',
};

function Section({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ICON_TONE_CLASSES[tone]}`}>
          {icon}
        </span>
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function Tile({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? 'border-amber-500/40 bg-amber-100' : 'border-line bg-paper-50'
      }`}
    >
      <p className={`text-2xl font-extrabold ${highlight ? 'text-amber-500' : 'text-ink-900'}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
