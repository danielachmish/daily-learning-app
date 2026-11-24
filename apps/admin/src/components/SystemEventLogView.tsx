'use client';

import { useEffect, useState } from 'react';

import {
  APP_EVENT_PAGE_SIZE,
  fetchAppEvents,
  fetchAppEventsForReport,
  fetchDistinctEvents,
  fetchLast24hCounts,
  formatEventReport,
  formatEventsReport,
  type AppEventEntry,
  type AppEventFilters,
  type EventLevel,
  type EventPeriod,
  type EventSource,
} from '../services/appEventLog';
import { createClient } from '../services/supabase/client';
import { CopyButton } from './CopyButton';

/** Hebrew labels for known event codes; unknown codes show as-is. */
const EVENT_LABELS: Record<string, string> = {
  'auth.login_success': 'התחברות הצליחה',
  'auth.login_failed': 'התחברות נכשלה',
  'auth.register_success': 'הרשמה הצליחה',
  'auth.register_failed': 'הרשמה נכשלה',
  'auth.logout': 'התנתקות',
  'auth.signed_out_unexpectedly': 'נותק מהחשבון בלי שביקש',
  'auth.session_restore_failed': 'שחזור התחברות נכשל',
  'auth.profile_load_failed': 'טעינת פרופיל נכשלה',
  'profile.update_track_failed': 'שינוי מסלול נכשל',
  'admin.login_failed': 'כניסה לעמדת ניהול נכשלה',
  'payment.checkout_started': 'התחיל תשלום',
  'payment.checkout_failed': 'פתיחת תשלום נכשלה',
  'payment.card_rejected': 'כרטיס נדחה',
  'payment.paid': 'תשלום הושלם',
  'payment.failed': 'תשלום נכשל',
  'payment.confirm_timeout': 'שולם אך לא אושר במערכת',
  'subscription.canceled_by_user': 'משתמש ביטל מנוי',
  'subscription.cancel_failed': 'ביטול מנוי נכשל',
  'app.uncaught_error': 'שגיאה באפליקציה',
  'app.unhandled_rejection': 'שגיאה באפליקציה (async)',
  'app.fatal_error': 'קריסת אפליקציה',
  'app.render_crash': 'מסך קרס',
};

const SOURCE_LABELS: Record<EventSource, string> = {
  app: 'אפליקציה',
  server: 'שרת',
  admin: 'עמדת ניהול',
};

const PERIOD_LABELS: Record<EventPeriod, string> = {
  '1h': 'שעה אחרונה',
  '24h': '24 שעות',
  '7d': '7 ימים',
  '30d': '30 ימים',
  all: 'הכל',
};

function eventLabel(event: string): string {
  if (EVENT_LABELS[event]) return EVENT_LABELS[event];
  if (event.startsWith('server.')) return `שגיאת שרת: ${event.slice(7)}`;
  return event;
}

type LevelFilter = EventLevel | 'problems' | '';

const selectClass = 'rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900';

export function SystemEventLogView() {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('problems');
  const [source, setSource] = useState<EventSource | ''>('');
  const [event, setEvent] = useState('');
  const [period, setPeriod] = useState<EventPeriod>('7d');
  const [searchInput, setSearchInput] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<AppEventEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ errors: number; warnings: number; loginFailures: number } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);

  const filters: AppEventFilters = {
    level: levelFilter && levelFilter !== 'problems' ? levelFilter : undefined,
    levelGroup: levelFilter === 'problems' ? 'problems' : undefined,
    source: source || undefined,
    event: event || undefined,
    userSearch: userSearch || undefined,
    period,
  };

  // Debounce the email search so every keystroke isn't a query.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setUserSearch(searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const supabase = createClient();
    fetchDistinctEvents(supabase).then(setEvents);
    fetchLast24hCounts(supabase).then(setCounts);
  }, [reloadKey]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    fetchAppEvents(createClient(), page, filters).then((result) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, levelFilter, source, event, period, userSearch, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(totalCount / APP_EVENT_PAGE_SIZE));
  const hasFilters = levelFilter !== 'problems' || source || event || period !== '7d' || searchInput;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function buildBulkReport(): Promise<string> {
    const { entries: rows, error: fetchError } = await fetchAppEventsForReport(createClient(), filters);
    if (fetchError) return `שגיאה בשליפת הרשומות: ${fetchError}`;
    const parts = [
      `סינון: ${PERIOD_LABELS[period]}`,
      levelFilter === 'problems' ? 'שגיאות ואזהרות' : levelFilter ? `רמה ${levelFilter}` : 'כל הרמות',
      source ? `מקור ${source}` : null,
      event ? `אירוע ${event}` : null,
      userSearch ? `משתמש מכיל "${userSearch}"` : null,
    ].filter(Boolean);
    return formatEventsReport(rows, parts.join(', '));
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        כל מה שקורה למשתמשים: התחברויות והרשמות (כולל כישלונות), קריסות ושגיאות באפליקציה, תשלומים ותקלות
        בשרת. כשיש תקלה, לחצו על <b>העתק</b> ליד הרשומה (או על &quot;העתק את כל מה שמוצג&quot;) והדביקו
        ל-Claude. בדיווח יש את כל הפרטים הטכניים שצריך כדי לאתר ולתקן את הבעיה.
      </p>

      {counts && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <SummaryTile
            label="שגיאות ב-24 שעות"
            value={counts.errors}
            tone={counts.errors > 0 ? 'danger' : 'neutral'}
            onClick={() => {
              setLevelFilter('error');
              setPeriod('24h');
              setEvent('');
              setPage(1);
            }}
          />
          <SummaryTile
            label="אזהרות ב-24 שעות"
            value={counts.warnings}
            tone={counts.warnings > 0 ? 'warning' : 'neutral'}
            onClick={() => {
              setLevelFilter('warning');
              setPeriod('24h');
              setEvent('');
              setPage(1);
            }}
          />
          <SummaryTile
            label="התחברויות שנכשלו ב-24 שעות"
            value={counts.loginFailures}
            tone={counts.loginFailures > 0 ? 'warning' : 'neutral'}
            onClick={() => {
              setLevelFilter('');
              setPeriod('24h');
              setEvent('auth.login_failed');
              setPage(1);
            }}
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={levelFilter}
          onChange={(e) => {
            setPage(1);
            setLevelFilter(e.target.value as LevelFilter);
          }}
          className={selectClass}
        >
          <option value="problems">שגיאות ואזהרות</option>
          <option value="error">שגיאות בלבד</option>
          <option value="warning">אזהרות בלבד</option>
          <option value="info">מידע בלבד</option>
          <option value="">הכל (כולל פעולות תקינות)</option>
        </select>
        <select
          value={period}
          onChange={(e) => {
            setPage(1);
            setPeriod(e.target.value as EventPeriod);
          }}
          className={selectClass}
        >
          {(Object.keys(PERIOD_LABELS) as EventPeriod[]).map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABELS[p]}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => {
            setPage(1);
            setSource(e.target.value as EventSource | '');
          }}
          className={selectClass}
        >
          <option value="">כל המקורות</option>
          {(Object.keys(SOURCE_LABELS) as EventSource[]).map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={event}
          onChange={(e) => {
            setPage(1);
            setEvent(e.target.value);
          }}
          className={selectClass}
        >
          <option value="">כל האירועים</option>
          {events.map((ev) => (
            <option key={ev} value={ev}>
              {eventLabel(ev)}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="חיפוש לפי אימייל משתמש"
          className={`${selectClass} min-w-[200px]`}
        />
        {hasFilters && (
          <button
            onClick={() => {
              setLevelFilter('problems');
              setSource('');
              setEvent('');
              setPeriod('7d');
              setSearchInput('');
              setPage(1);
            }}
            className="rounded-full px-3 py-1.5 text-sm text-slate-500 hover:bg-teal-100 hover:text-teal-600"
          >
            נקה סינון
          </button>
        )}
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="rounded-full px-3 py-1.5 text-sm text-slate-500 hover:bg-teal-100 hover:text-teal-600"
        >
          ↻ רענן
        </button>
      </div>

      {totalCount > 0 && (
        <div className="mb-4">
          <CopyButton
            variant="primary"
            label={`העתק את כל מה שמוצג (עד 60 רשומות) לשליחה ל-Claude`}
            getText={buildBulkReport}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">טוען…</p>
      ) : error ? (
        <p className="text-sm text-danger">
          {error}
          {error.includes('app_event_log') && (
            <span className="block text-slate-500">
              (נראה שהטבלה עוד לא קיימת. צריך להריץ את המיגרציה 20261124120000_app_event_log.sql ב-Supabase.)
            </span>
          )}
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-500">לא נמצאו רשומות בטווח הזה. 👍</p>
      ) : (
        <div className="grid gap-2">
          {entries.map((entry) => {
            const isOpen = expanded.has(entry.id);
            return (
              <div key={entry.id} className="rounded-xl border border-line bg-paper-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => toggle(entry.id)} className="min-w-0 flex-1 text-start">
                    <div className="flex flex-wrap items-center gap-2">
                      <LevelBadge level={entry.level} />
                      <span className="font-bold text-ink-900">{eventLabel(entry.event)}</span>
                      <span className="text-xs text-slate-500">· {SOURCE_LABELS[entry.source]}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      <span>{new Date(entry.created_at).toLocaleString('he-IL')}</span>
                      {entry.user_email && <span dir="ltr">{entry.user_email}</span>}
                      {typeof entry.context?.platform === 'string' && <span>{entry.context.platform}</span>}
                      {typeof entry.context?.screen === 'string' && <span dir="ltr">{entry.context.screen}</span>}
                    </div>
                    {entry.message && (
                      <p
                        dir="auto"
                        className={`mt-1 text-sm ${entry.level === 'error' ? 'text-danger' : 'text-ink-700'} ${isOpen ? '' : 'line-clamp-2'}`}
                      >
                        {entry.message}
                      </p>
                    )}
                  </button>
                  <CopyButton getText={() => formatEventReport(entry)} />
                </div>
                {isOpen && entry.context && (
                  <pre
                    dir="ltr"
                    className="mt-2 max-h-80 overflow-auto rounded-lg bg-paper-0 p-3 text-start text-xs text-ink-700"
                  >
                    {JSON.stringify(entry.context, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
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

function LevelBadge({ level }: { level: EventLevel }) {
  if (level === 'error')
    return <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">שגיאה</span>;
  if (level === 'warning')
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-500">אזהרה</span>;
  return <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-600">מידע</span>;
}

function SummaryTile({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  tone: 'danger' | 'warning' | 'neutral';
  onClick: () => void;
}) {
  const color = tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-amber-500' : 'text-ink-900';
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-line bg-paper-50 p-3 text-start hover:border-teal-400"
    >
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </button>
  );
}
