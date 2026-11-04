'use client';

import { useEffect, useRef, useState } from 'react';

import {
  APP_SHARE_LINK,
  DEFAULT_TEMPLATES,
  fetchMessageTemplates,
  PLACEHOLDERS,
  renderTemplate,
  saveMessageTemplates,
  type MessageTemplates,
} from '../services/messageTemplates';
import { createClient } from '../services/supabase/client';

/** Sample subscriber used only for the live preview. */
const SAMPLE = {
  name: 'ישראל ישראלי',
  link: APP_SHARE_LINK,
  email: 'israel@gmail.com',
  password: null,
};

/**
 * Editable WhatsApp/share texts (stored in the public `settings` table):
 * the access message sent from a user's admin page, and the message a
 * subscriber's "share" button in the app sends to a friend.
 */
export function MessageTemplatesSettings() {
  const [templates, setTemplates] = useState<MessageTemplates>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchMessageTemplates(createClient()).then((result) => {
      if (!isMounted) return;
      if (result.error) setError(result.error);
      if (result.data) setTemplates(result.data);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  function update(field: keyof MessageTemplates, value: string) {
    setTemplates((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!templates.accessMessage.trim() || !templates.appShareMessage.trim()) {
      setError('אי אפשר לשמור הודעה ריקה.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: saveError } = await saveMessageTemplates(createClient(), templates);
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setSaved(true);
  }

  if (loading) return <p className="mt-6 text-sm text-slate-500">טוען…</p>;

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-8">
      <TemplateField
        title="הודעת גישה למנוי"
        description='נשלחת בווצאפ מעמוד המנוי (כפתורי "ווצאפ" ו"ווצאפ ביזנס") כשפותחים לו גישה.'
        value={templates.accessMessage}
        onChange={(value) => update('accessMessage', value)}
        defaultValue={DEFAULT_TEMPLATES.accessMessage}
        placeholders={[PLACEHOLDERS.name, PLACEHOLDERS.link, PLACEHOLDERS.email, PLACEHOLDERS.password]}
        note={`שורה שיש בה ${PLACEHOLDERS.password} מופיעה רק אם איפסתם סיסמה באותו רגע, ואחרת נמחקת מההודעה.`}
        disabled={saving}
      />

      <TemplateField
        title="הודעת שיתוף מהאפליקציה"
        description='נשלחת כשמנוי לוחץ "שיתוף" באפליקציה כדי להזמין חבר. משתמשים שבחרו אנגלית מקבלים את הנוסח האנגלי הקבוע.'
        value={templates.appShareMessage}
        onChange={(value) => update('appShareMessage', value)}
        defaultValue={DEFAULT_TEMPLATES.appShareMessage}
        placeholders={[PLACEHOLDERS.link]}
        disabled={saving}
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-success">ההודעות נשמרו.</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-full bg-teal-400 px-6 py-2 text-sm font-bold text-on-teal disabled:opacity-60"
      >
        {saving ? 'שומר…' : 'שמירת ההודעות'}
      </button>
    </form>
  );
}

function TemplateField({
  title,
  description,
  value,
  onChange,
  defaultValue,
  placeholders,
  note,
  disabled,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  defaultValue: string;
  placeholders: string[];
  note?: string;
  disabled: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Inserts a placeholder at the cursor (or replaces the selection). */
  function insertPlaceholder(placeholder: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + placeholder + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + placeholder.length, start + placeholder.length);
    });
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-500">נוסח ההודעה</label>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            rows={8}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm leading-relaxed text-ink-900"
          />
          <p className="mt-1 text-xs text-slate-500">לחיצה מוסיפה לטקסט במקום הסמן:</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {placeholders.map((placeholder) => (
              <button
                key={placeholder}
                type="button"
                onClick={() => insertPlaceholder(placeholder)}
                disabled={disabled}
                className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-ink-900"
              >
                {placeholder}
              </button>
            ))}
          </div>
          {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
          {value !== defaultValue && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              disabled={disabled}
              className="mt-3 text-xs font-semibold text-teal-600 underline"
            >
              החזרה לנוסח ברירת המחדל
            </button>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-500">תצוגה מקדימה (מנוי לדוגמה)</label>
          <div className="min-h-40 rounded-lg bg-[#EFE7DD] p-3">
            <div className="max-w-xs whitespace-pre-wrap rounded-lg bg-[#E7FFDB] px-3 py-2 text-sm leading-relaxed text-ink-900 shadow-sm">
              {renderTemplate(value, SAMPLE) || ' '}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
