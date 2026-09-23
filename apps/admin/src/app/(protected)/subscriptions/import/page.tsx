'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { retryAsync } from '../../../../services/retry';
import { parseSubscriberFile, type ParsedSubscriber } from '../../../../services/subscriberImport';

type Phase = 'select' | 'parsing' | 'preview' | 'importing' | 'done';

interface RowResult {
  subscriber: ParsedSubscriber;
  outcome: 'created' | 'skipped' | 'error';
  message?: string;
}

interface CreateResponse {
  id?: string;
  skipped?: boolean;
  error?: string;
}

async function createOne(subscriber: ParsedSubscriber): Promise<RowResult> {
  const attempt = await retryAsync<{ ok: boolean; data: CreateResponse }>(
    async () => {
      try {
        const resp = await fetch('/api/users/bulk-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: subscriber.fullName,
            email: subscriber.email,
            phone: subscriber.phone,
          }),
        });
        const data = (await resp.json()) as CreateResponse;
        return { ok: resp.ok, data };
      } catch {
        return { ok: false, data: { error: 'שגיאת תקשורת.' } };
      }
    },
    // Only retry a genuine network/communication failure — a real
    // validation error from the server (bad email, etc.) will just fail
    // identically a second time.
    (r) => !r.ok && r.data.error === 'שגיאת תקשורת.'
  );

  if (!attempt.ok) {
    return { subscriber, outcome: 'error', message: attempt.data.error ?? 'היצירה נכשלה.' };
  }
  if (attempt.data.skipped) {
    return { subscriber, outcome: 'skipped', message: 'כבר קיים חשבון עם המייל הזה.' };
  }
  return { subscriber, outcome: 'created' };
}

export default function ImportSubscribersPage() {
  const [phase, setPhase] = useState<Phase>('select');
  const [file, setFile] = useState<File | null>(null);
  const [subscribers, setSubscribers] = useState<ParsedSubscriber[]>([]);
  const [skippedRows, setSkippedRows] = useState(0);
  const [invalidPhoneRows, setInvalidPhoneRows] = useState(0);
  const [duplicateEmails, setDuplicateEmails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RowResult[]>([]);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleParse() {
    if (!file) return;
    setPhase('parsing');
    setError(null);
    try {
      const result = await parseSubscriberFile(file);
      if (result.subscribers.length === 0) {
        setError('לא נמצאו שורות תקינות בקובץ (עם שם מלא, מייל וטלפון תקין).');
        setPhase('select');
        return;
      }
      setSubscribers(result.subscribers);
      setSkippedRows(result.skippedRows);
      setInvalidPhoneRows(result.invalidPhoneRows);
      setDuplicateEmails(result.duplicateEmails);
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'קריאת הקובץ נכשלה.');
      setPhase('select');
    }
  }

  async function processSubscribers(toProcess: ParsedSubscriber[]) {
    setBatchTotal(toProcess.length);
    setBatchDone(0);
    for (const subscriber of toProcess) {
      const result = await createOne(subscriber);
      setResults((prev) => [...prev.filter((r) => r.subscriber.email !== subscriber.email), result]);
      setBatchDone((n) => n + 1);
    }
  }

  async function handleImport() {
    setPhase('importing');
    setResults([]);
    await processSubscribers(subscribers);
    setPhase('done');
  }

  async function handleRetryFailed() {
    const failed = results.filter((r) => r.outcome === 'error').map((r) => r.subscriber);
    if (failed.length === 0) return;
    setPhase('importing');
    await processSubscribers(failed);
    setPhase('done');
  }

  const createdCount = results.filter((r) => r.outcome === 'created').length;
  const skippedCount = results.filter((r) => r.outcome === 'skipped').length;
  const failedCount = results.filter((r) => r.outcome === 'error').length;

  return (
    <div className="max-w-2xl">
      <div className="mb-2 flex items-center gap-2">
        <Link href="/subscriptions" className="text-sm text-teal-600 hover:underline">
          מנויים
        </Link>
        <span className="text-sm text-slate-300">/</span>
        <h1 className="text-2xl font-extrabold text-ink-900">ייבוא מנויים מקובץ</h1>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        מעלים קובץ XLSX עם עמודות <strong>שם מלא</strong>, <strong>מייל</strong> ו<strong>טלפון</strong> (בכל
        סדר, השורה הראשונה חייבת להיות כותרות) — לכל שורה נוצר חשבון עם <strong>גישה חינמית קבועה</strong>,
        שם המשתמש הוא <strong>המייל</strong> והסיסמה היא <strong>מספר הטלפון</strong> (ספרות בלבד, בלי
        מקפים/רווחים). לא נשלח שום מייל — מספיק להודיע לכולם פעם אחת: &quot;נכנסים עם המייל שנרשמתם
        והסיסמה היא מספר הטלפון שלכם&quot;. את המסלול (גברים/נשים) והשפה כל אחד/ת בוחר/ת בעצמו/ה
        בכניסה הראשונה לאפליקציה.
      </p>

      {phase === 'select' && (
        <div className="flex flex-col gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-fit rounded-full border border-teal-400 px-4 py-2 text-sm font-bold text-teal-600"
          >
            {file ? `נבחר: ${file.name}` : 'בחירת קובץ XLSX'}
          </button>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="button"
            onClick={handleParse}
            disabled={!file}
            className="w-fit rounded-full bg-teal-400 px-6 py-2 text-sm font-bold text-on-teal disabled:opacity-50"
          >
            קריאת הקובץ
          </button>
        </div>
      )}

      {phase === 'parsing' && <p className="text-sm text-slate-500">קורא את הקובץ…</p>}

      {phase === 'preview' && (
        <div>
          <p className="mb-3 text-sm text-ink-700">
            נמצאו <strong>{subscribers.length}</strong> מנויים תקינים.
          </p>

          {skippedRows > 0 && (
            <p className="mb-2 text-sm text-slate-500">
              {skippedRows} שורות דולגו (חסר שם מלא או מייל).
            </p>
          )}
          {invalidPhoneRows > 0 && (
            <p className="mb-2 text-sm text-amber-500">
              {invalidPhoneRows} שורות דולגו — מספר הטלפון חסר או קצר מדי לשמש כסיסמה (פחות מ-6
              ספרות).
            </p>
          )}
          {duplicateEmails.length > 0 && (
            <p className="mb-2 text-sm text-amber-500">
              {duplicateEmails.length} כתובות מייל הופיעו יותר מפעם אחת בקובץ — נלקחה רק ההופעה
              הראשונה של כל אחת.
            </p>
          )}

          <div className="mb-4 max-h-64 overflow-y-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-start text-slate-500">
                  <th className="py-2 pe-4 text-start font-medium">שם מלא</th>
                  <th className="py-2 pe-4 text-start font-medium">מייל (שם משתמש)</th>
                  <th className="py-2 pe-4 text-start font-medium">טלפון (סיסמה)</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr key={s.email} className="border-b border-line">
                    <td className="py-1.5 pe-4">{s.fullName}</td>
                    <td className="py-1.5 pe-4">{s.email}</td>
                    <td className="py-1.5 pe-4">{s.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPhase('select')}
              className="rounded-full border border-line px-4 py-2 text-sm font-bold text-ink-700"
            >
              חזרה
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="rounded-full bg-teal-400 px-6 py-2 text-sm font-bold text-on-teal"
            >
              ייבוא {subscribers.length} מנויים בגישה חינמית
            </button>
          </div>
        </div>
      )}

      {phase === 'importing' && (
        <div>
          <p className="text-sm text-ink-700">
            יוצר חשבונות… הושלמו {batchDone} מתוך {batchTotal}
          </p>
        </div>
      )}

      {phase === 'done' && (
        <div>
          <h2 className="mb-3 text-lg font-extrabold text-ink-900">הייבוא הושלם</h2>
          <p className="mb-3 text-sm text-ink-700">
            <span className="text-success">{createdCount} נוצרו</span>
            {' · '}
            <span className="text-slate-500">{skippedCount} דולגו (כבר קיימים)</span>
            {' · '}
            <span className="text-danger">{failedCount} נכשלו</span>
          </p>

          {(failedCount > 0 || skippedCount > 0) && (
            <ul className="mb-4 max-h-64 space-y-1 overflow-y-auto text-sm">
              {results
                .filter((r) => r.outcome !== 'created')
                .map((r) => (
                  <li key={r.subscriber.email}>
                    {r.outcome === 'skipped' && (
                      <span className="text-slate-500">
                        — {r.subscriber.fullName} ({r.subscriber.email}) — {r.message}
                      </span>
                    )}
                    {r.outcome === 'error' && (
                      <span className="text-danger">
                        ✗ {r.subscriber.fullName} ({r.subscriber.email}) — שגיאה: {r.message}
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          )}

          {failedCount > 0 && (
            <div className="mb-4 rounded-xl border border-danger/30 bg-danger/5 p-3">
              <p className="text-sm text-ink-700">
                כל כישלון נרשם גם ב
                <Link href="/logs" className="text-teal-600 hover:underline">
                  יומן הפעולות
                </Link>{' '}
                עם ההודעה המדויקת.
              </p>
              <button
                type="button"
                onClick={handleRetryFailed}
                className="mt-2 rounded-full border border-danger px-4 py-2 text-sm font-bold text-danger"
              >
                נסה שוב את שנכשלו ({failedCount})
              </button>
            </div>
          )}

          <Link href="/subscriptions" className="text-sm text-teal-600 hover:underline">
            חזרה למנויים ↩
          </Link>
        </div>
      )}
    </div>
  );
}
