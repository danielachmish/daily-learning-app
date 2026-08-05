'use client';

import { useEffect, useState } from 'react';

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

      <SectionTitle>משתמשים</SectionTitle>
      <TileRow>
        <Tile label="סך משתמשים" value={summary.totalUsers} />
        <Tile label="מנויים פעילים" value={summary.activeSubscriptions} />
        <Tile label="חדשים היום" value={summary.newUsersToday} />
        <Tile label="חדשים החודש" value={summary.newUsersThisMonth} />
      </TileRow>

      <SectionTitle>לימוד</SectionTitle>
      <TileRow>
        <Tile label="למדו היום" value={summary.learnedToday} />
        <Tile label="למדו השבוע" value={summary.learnedThisWeek} />
        <Tile label="למדו החודש" value={summary.learnedThisMonth} />
      </TileRow>

      <SectionTitle>הקדשות</SectionTitle>
      <TileRow>
        <Tile label="הקדשות היום" value={summary.dedicationsToday} />
        <Tile label="הקדשות החודש" value={summary.dedicationsThisMonth} />
        <Tile label="ממתינות לאישור" value={summary.pendingDedications} />
      </TileRow>

      <SectionTitle>הכנסות החודש</SectionTitle>
      <TileRow>
        <Tile label="ממנויים" value={`₪${summary.monthSubscriptionRevenue.toLocaleString()}`} />
        <Tile label="מהקדשות" value={`₪${summary.monthDedicationRevenue.toLocaleString()}`} />
        <Tile label="סה״כ" value={`₪${summary.monthTotalRevenue.toLocaleString()}`} />
      </TileRow>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h2>;
}

function TileRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-4">{children}</div>;
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[160px] rounded-xl border border-line bg-paper-50 p-4">
      <p className="text-2xl font-extrabold text-ink-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
