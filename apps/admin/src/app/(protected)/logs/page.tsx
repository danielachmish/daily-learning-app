'use client';

import { useEffect, useState } from 'react';

import {
  ACTIVITY_LOG_PAGE_SIZE,
  fetchActivityLog,
  fetchDistinctActions,
  type ActivityLogEntry,
  type ActivityStatus,
} from '../../../services/activityLog';
import { createClient } from '../../../services/supabase/client';

/** Friendly Hebrew labels for known action codes — falls back to the raw
    code (e.g. "lesson.create") for anything not listed, so a new action
    added later never disappears, it's just less pretty until added here. */
const ACTION_LABELS: Record<string, string> = {
  'lesson.create': 'יצירת לימוד',
  'lesson.update': 'עדכון לימוד',
  'lesson.delete': 'מחיקת לימוד',
  'lesson.duplicate': 'שכפול לימוד',
  'lesson_image.upload': 'העלאת תמונה',
  'lesson_image.delete': 'מחיקת תמונה',
  'dedication.approved': 'אישור הקדשה',
  'dedication.rejected': 'דחיית הקדשה',
  'dedication.hidden': 'הסתרת הקדשה',
  'dedication.update_text': 'עדכון נוסח הקדשה',
  'subscription.extend': 'הארכת מנוי',
  'subscription.cancel': 'ביטול מנוי',
  'subscription.nedarim_freeze': 'הקפאת הוראת קבע',
  'subscription.nedarim_reactivate': 'הפעלת הוראת קבע מחדש',
  'subscription.nedarim_cancel': 'ביטול הוראת קבע',
  'user.create': 'יצירת משתמש',
  'user.bulk_import': 'יצירת מנוי מקובץ',
  'user.update_track_language': 'עדכון מסלול/שפה',
  'user.set_free_access': 'שינוי גישה חינמית',
  'user.set_account_status': 'שינוי סטטוס חשבון',
  'user.set_role': 'שינוי הרשאת מנהל',
  'dedication_option.create': 'יצירת אפשרות הקדשה',
  'dedication_option.update': 'עדכון אפשרות הקדשה',
  'dedication_option.delete': 'מחיקת אפשרות הקדשה',
  'settings.save_prices': 'שמירת מחירי מנוי',
  'settings.save_nedarim': 'שמירת הגדרות תשלומים',
  'settings.save_legal_content': 'שמירת מסמכים משפטיים',
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatMetadata(metadata: Record<string, unknown> | null): string | null {
  if (!metadata || Object.keys(metadata).length === 0) return null;
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
}

export default function ActivityLogPage() {
  const [status, setStatus] = useState<ActivityStatus | ''>('');
  const [action, setAction] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    fetchDistinctActions(supabase).then(setActions);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    fetchActivityLog(supabase, page, {
      status: status || undefined,
      action: action || undefined,
    }).then((result) => {
      if (!isMounted) return;
      if (result.error) setError(result.error);
      else if (result.data) {
        setEntries(result.data.entries);
        setTotalCount(result.data.totalCount);
      }
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [page, status, action]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ACTIVITY_LOG_PAGE_SIZE));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold text-ink-900">יומן פעולות</h1>
      <p className="mb-6 text-sm text-slate-500">
        כל פעולה שמתבצעת בפאנל הניהול (יצירה, עדכון, מחיקה, העלאת תמונה וכו׳) נרשמת כאן — גם כשהיא
        מצליחה וגם כשהיא נכשלת, עם הודעת השגיאה המדויקת. שימושי כדי לאתר בדיוק מה קרה ומתי, גם אחרי
        שהמסך שבו זה קרה כבר נסגר.
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as ActivityStatus | '');
          }}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        >
          <option value="">כל הסטטוסים</option>
          <option value="success">הצליח</option>
          <option value="error">נכשל</option>
        </select>
        <select
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        >
          <option value="">כל הפעולות</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </select>
        {(status || action) && (
          <button
            onClick={() => {
              setStatus('');
              setAction('');
              setPage(1);
            }}
            className="rounded-full px-3 py-1.5 text-sm text-slate-500 hover:bg-teal-100 hover:text-teal-600"
          >
            נקה סינון
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">טוען…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-500">לא נמצאו רשומות.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-start text-slate-500">
                  <th className="py-2 pe-4 text-start font-medium">זמן</th>
                  <th className="py-2 pe-4 text-start font-medium">פעולה</th>
                  <th className="py-2 pe-4 text-start font-medium">מבצע</th>
                  <th className="py-2 pe-4 text-start font-medium">סטטוס</th>
                  <th className="py-2 pe-4 text-start font-medium">פרטים</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-line align-top">
                    <td className="whitespace-nowrap py-2 pe-4 text-xs text-slate-300">
                      {new Date(entry.created_at).toLocaleString('he-IL')}
                    </td>
                    <td className="py-2 pe-4">{actionLabel(entry.action)}</td>
                    <td className="py-2 pe-4 text-xs text-slate-500">{entry.actor_email ?? '—'}</td>
                    <td className="py-2 pe-4">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="max-w-sm py-2 pe-4 text-xs text-slate-500">
                      {entry.status === 'error' && entry.message && (
                        <p className="text-danger">{entry.message}</p>
                      )}
                      {formatMetadata(entry.metadata) && <p>{formatMetadata(entry.metadata)}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-line bg-paper-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-ink-900">{actionLabel(entry.action)}</p>
                    <p className="text-xs text-slate-300">
                      {new Date(entry.created_at).toLocaleString('he-IL')}
                    </p>
                  </div>
                  <StatusBadge status={entry.status} />
                </div>
                {entry.actor_email && <p className="mt-2 text-xs text-slate-500">{entry.actor_email}</p>}
                {entry.status === 'error' && entry.message && (
                  <p className="mt-2 text-sm text-danger">{entry.message}</p>
                )}
                {formatMetadata(entry.metadata) && (
                  <p className="mt-2 text-xs text-slate-500">{formatMetadata(entry.metadata)}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {totalCount > 0 && (
        <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full border border-teal-400 px-3 py-1 text-teal-600 disabled:opacity-40"
          >
            הקודם
          </button>
          <span>
            עמוד {page} מתוך {totalPages} ({totalCount} רשומות)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-full border border-teal-400 px-3 py-1 text-teal-600 disabled:opacity-40"
          >
            הבא
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ActivityStatus }) {
  return status === 'error' ? (
    <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">נכשל</span>
  ) : (
    <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">הצליח</span>
  );
}
