'use client';

import type { GenderTrack, Language } from '@daily-learning/shared';
import Link from 'next/link';
import { useRef, useState } from 'react';

import {
  DAY_PAGE_COUNT_WARNING_THRESHOLD,
  detectDayBoundaries,
  loadPdf,
  renderPageToFile,
  type DetectedDay,
} from '../../../../services/pdfImport';
import { createLesson, fetchLessonByDate, fetchLessonImages, uploadLessonImage } from '../../../../services/lessons';
import { createClient } from '../../../../services/supabase/client';

type Phase = 'select' | 'detecting' | 'preview' | 'importing' | 'done';

interface DayResult {
  day: DetectedDay;
  outcome: 'created' | 'skipped' | 'error';
  message?: string;
}

const ALREADY_EXISTS_MESSAGE = 'כבר קיים לימוד לתאריך זה עבור אותו מסלול ושפה.';

export default function ImportLessonsPage() {
  const [phase, setPhase] = useState<Phase>('select');
  const [track, setTrack] = useState<GenderTrack>('women');
  const [language, setLanguage] = useState<Language>('he');
  const [file, setFile] = useState<File | null>(null);
  const [pdf, setPdf] = useState<Awaited<ReturnType<typeof loadPdf>> | null>(null);
  const [days, setDays] = useState<DetectedDay[]>([]);
  const [frontMatterCount, setFrontMatterCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [results, setResults] = useState<DayResult[]>([]);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDetect() {
    if (!file) return;
    setPhase('detecting');
    setError(null);
    try {
      const loadedPdf = await loadPdf(file);
      const detection = await detectDayBoundaries(loadedPdf);
      setPdf(loadedPdf);
      setDays(detection.days);
      setFrontMatterCount(detection.frontMatterPageCount);
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'קריאת ה-PDF נכשלה.');
      setPhase('select');
    }
  }

  /**
   * Processes one day: create the lesson (or, on a retry, resume the one
   * already created from a previous partial attempt), then upload
   * whichever pages aren't already there. Checking for an existing lesson
   * FIRST — rather than always calling createLesson — is what makes
   * "retry failed days" actually recover a day that got as far as
   * creating the lesson row before its image upload failed: without this,
   * a retry would just hit the unique-date conflict and stop, leaving the
   * lesson permanently short a page with no way to notice.
   *
   * createLesson and uploadLessonImage already retry transient failures a
   * couple of times on their own (services/retry.ts), so reaching an
   * error here means it genuinely didn't recover, not just a single blip.
   */
  async function processDay(
    supabase: ReturnType<typeof createClient>,
    day: DetectedDay
  ): Promise<DayResult> {
    setProgress(`${day.dateLabel} — בודק אם הלימוד כבר קיים…`);
    const existing = await fetchLessonByDate(supabase, day.isoDate, track, language);
    if (existing.error) {
      return { day, outcome: 'error', message: existing.error };
    }

    let lessonId: string;
    let alreadyUploaded = 0;

    if (existing.data) {
      lessonId = existing.data.id;
      const { images, error: imagesError } = await fetchLessonImages(supabase, lessonId);
      if (imagesError) return { day, outcome: 'error', message: imagesError };
      alreadyUploaded = images.length;
    } else {
      setProgress(`${day.dateLabel} — יוצר לימוד…`);
      const created = await createLesson(supabase, {
        lessonDate: day.isoDate,
        hebrewDate: '',
        title: day.dateLabel.replace(/\//g, '.'),
        genderTrack: track,
        language,
        status: 'draft',
      });
      // The unique-date conflict is kept as a defensive fallback (e.g. a
      // race between two people importing at once) even though the
      // existence check above handles the normal retry case.
      if (created.error) {
        return {
          day,
          outcome: created.error === ALREADY_EXISTS_MESSAGE ? 'skipped' : 'error',
          message: created.error,
        };
      }
      lessonId = created.data!.id;
    }

    if (alreadyUploaded >= day.pageNumbers.length) {
      return { day, outcome: 'skipped', message: 'כל העמודים כבר הועלו.' };
    }

    for (let i = alreadyUploaded; i < day.pageNumbers.length; i++) {
      setProgress(`${day.dateLabel} — מעלה עמוד ${i + 1} מתוך ${day.pageNumbers.length}…`);
      const pageFile = await renderPageToFile(pdf!, day.pageNumbers[i], `${day.isoDate}-page-${i + 1}.png`);
      const uploadResult = await uploadLessonImage(supabase, lessonId, pageFile);
      if (uploadResult.error) {
        return { day, outcome: 'error', message: uploadResult.error };
      }
    }

    return {
      day,
      outcome: 'created',
      message: alreadyUploaded > 0 ? `הושלמו ${day.pageNumbers.length - alreadyUploaded} עמודים חסרים.` : undefined,
    };
  }

  /**
   * Runs processDay for a set of days and merges each outcome into
   * `results` as it completes (by isoDate, so a retry replaces the day's
   * previous failed entry instead of appending a duplicate).
   */
  async function processDays(daysToProcess: DetectedDay[]) {
    const supabase = createClient();
    setBatchTotal(daysToProcess.length);
    setBatchDone(0);
    for (const day of daysToProcess) {
      const result = await processDay(supabase, day);
      setResults((prev) => [...prev.filter((r) => r.day.isoDate !== day.isoDate), result]);
      setBatchDone((n) => n + 1);
    }
    setProgress('');
  }

  async function handleImport() {
    if (!pdf) return;
    setPhase('importing');
    setResults([]);
    await processDays(days);
    setPhase('done');
  }

  async function handleRetryFailed() {
    const failedDays = results.filter((r) => r.outcome === 'error').map((r) => r.day);
    if (failedDays.length === 0) return;
    setPhase('importing');
    await processDays(failedDays);
    setPhase('done');
  }

  const warnings = days.filter((d) => d.pageNumbers.length > DAY_PAGE_COUNT_WARNING_THRESHOLD);
  const failedCount = results.filter((r) => r.outcome === 'error').length;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-extrabold text-ink-900">ייבוא חוברת חודשית</h1>
      <p className="mb-6 text-sm text-slate-500">
        מעלים את קובץ ה-PDF של החוברת החודשית השלמה — המערכת מזהה אוטומטית את התאריך של כל יום (לפי תיבת
        התאריך שבפינת העמוד הראשון של כל יום) ויוצרת <strong>לימוד בטיוטה</strong> נפרד לכל יום, עם העמודים
        שלו בדיוק כפי שעוצבו. כלום לא מתפרסם אוטומטית — יש לעבור על כל לימוד ולפרסם אותו בנפרד.
      </p>

      {phase === 'select' && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">מסלול</label>
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value as GenderTrack)}
              className="w-full max-w-xs rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
            >
              <option value="women">נשים</option>
              <option value="men">גברים</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">שפה</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full max-w-xs rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
            >
              <option value="he">עברית</option>
              <option value="en">English</option>
            </select>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-fit rounded-full border border-teal-400 px-4 py-2 text-sm font-bold text-teal-600"
          >
            {file ? `נבחר: ${file.name}` : 'בחירת קובץ PDF'}
          </button>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="button"
            onClick={handleDetect}
            disabled={!file}
            className="w-fit rounded-full bg-teal-400 px-6 py-2 text-sm font-bold text-on-teal disabled:opacity-50"
          >
            זיהוי ימים
          </button>
        </div>
      )}

      {phase === 'detecting' && <p className="text-sm text-slate-500">קורא את ה-PDF ומזהה תאריכים…</p>}

      {phase === 'preview' && (
        <div>
          <p className="mb-3 text-sm text-ink-700">
            זוהו <strong>{days.length}</strong> ימים ({frontMatterCount > 0 && `דילוג על ${frontMatterCount} עמודי פתיח, `}
            מסלול: {track === 'women' ? 'נשים' : 'גברים'}, שפה: {language === 'he' ? 'עברית' : 'English'})
          </p>

          {warnings.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-500 bg-amber-100 p-3 text-sm text-ink-900">
              ⚠ {warnings.length} ימים עם מספר עמודים חריג — כנראה כוללים תוכן שאינו יומי (כמו נספח בסוף
              החוברת). כדאי לבדוק ולתקן אחרי הייבוא:
              <ul className="mt-1 list-inside list-disc">
                {warnings.map((w) => (
                  <li key={w.isoDate}>
                    {w.dateLabel}: {w.pageNumbers.length} עמודים
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-4 max-h-64 overflow-y-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-start text-slate-500">
                  <th className="py-2 pe-4 text-start font-medium">תאריך</th>
                  <th className="py-2 pe-4 text-start font-medium">עמודים</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.isoDate} className="border-b border-line">
                    <td className="py-1.5 pe-4">{d.dateLabel}</td>
                    <td className="py-1.5 pe-4">{d.pageNumbers.length}</td>
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
              ייבוא {days.length} ימים כטיוטה
            </button>
          </div>
        </div>
      )}

      {phase === 'importing' && (
        <div>
          <p className="mb-3 text-sm text-slate-500">{progress}</p>
          <p className="text-sm text-ink-700">
            הושלמו {batchDone} מתוך {batchTotal}…
          </p>
        </div>
      )}

      {phase === 'done' && (
        <div>
          <h2 className="mb-3 text-lg font-extrabold text-ink-900">הייבוא הושלם</h2>
          <ul className="space-y-1 text-sm">
            {results.map((r) => (
              <li key={r.day.isoDate}>
                {r.outcome === 'created' && (
                  <span className="text-success">
                    ✓ {r.day.dateLabel} — {r.message ? r.message : 'נוצר כטיוטה'}
                  </span>
                )}
                {r.outcome === 'skipped' && (
                  <span className="text-slate-500">
                    — {r.day.dateLabel} — {r.message ?? 'דולג (כבר קיים)'}
                  </span>
                )}
                {r.outcome === 'error' && (
                  <span className="text-danger">
                    ✗ {r.day.dateLabel} — שגיאה: {r.message}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {failedCount > 0 && (
            <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3">
              <p className="text-sm text-ink-700">
                {failedCount} {failedCount === 1 ? 'יום נכשל' : 'ימים נכשלו'} — כל כישלון נרשם גם
                ב<Link href="/logs" className="text-teal-600 hover:underline">
                  יומן הפעולות
                </Link>{' '}
                עם ההודעה המדויקת, גם אם תסגור/י את המסך הזה.
              </p>
              <button
                type="button"
                onClick={handleRetryFailed}
                className="mt-2 rounded-full border border-danger px-4 py-2 text-sm font-bold text-danger"
              >
                נסה שוב את הימים שנכשלו ({failedCount})
              </button>
            </div>
          )}

          <p className="mt-4 text-sm text-ink-700">
            כל הלימודים שנוצרו הם <strong>טיוטה</strong> — יש לעבור עליהם בעמוד הלימודים ולפרסם כל אחד בנפרד.
          </p>
        </div>
      )}
    </div>
  );
}
