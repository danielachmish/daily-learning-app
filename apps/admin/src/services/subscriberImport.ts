import * as XLSX from 'xlsx';

export interface ParsedSubscriber {
  fullName: string;
  email: string;
  /** Digits only — this is also what becomes the account's password (see bulk-invite route). */
  phone: string;
}

export interface ParseResult {
  subscribers: ParsedSubscriber[];
  totalRows: number;
  skippedRows: number;
  invalidPhoneRows: number;
  duplicateEmails: string[];
}

// Recognized header text per column, matched case-insensitively — lets
// the org's own file keep whatever header wording they already use
// (Hebrew or English) instead of forcing an exact template.
const NAME_HEADERS = ['שם מלא', 'שם', 'full name', 'name'];
const EMAIL_HEADERS = ['מייל', 'אימייל', 'דוא"ל', 'דואל', 'email', 'e-mail'];
const PHONE_HEADERS = ['טלפון', 'נייד', 'phone', 'mobile'];

// Supabase's own minimum password length — a phone number normalized to
// digits-only that's shorter than this can't become a valid password
// (extension-less landline typos, a cell missing digits, etc.).
const MIN_PASSWORD_LENGTH = 6;

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * Every Israeli phone number is 10 digits starting with 0. Excel silently
 * drops that leading zero whenever the phone column is formatted as a
 * Number instead of Text (0539228031 and 539228031 are the same number
 * arithmetically) — confirmed directly against a real uploaded file where
 * every number came through one digit short. Restoring it here matters
 * a lot: the phone becomes the account's password, so a password missing
 * its leading zero would never match what the person actually types.
 */
function normalizePhone(raw: unknown): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 9) return `0${digits}`;
  // Some sources store the country code instead of the leading 0
  // (e.g. "972539228031") — normalize that to the same local form.
  if (digits.length === 12 && digits.startsWith('972')) return `0${digits.slice(3)}`;
  return digits;
}

function findColumn(headerRow: unknown[], candidates: string[]): number {
  const normalized = headerRow.map(normalizeHeader);
  for (const candidate of candidates) {
    const index = normalized.indexOf(candidate.toLowerCase());
    if (index !== -1) return index;
  }
  return -1;
}

/**
 * Parses an admin-uploaded XLSX of existing subscribers (full name, email,
 * phone) into rows ready to bulk-create. Runs entirely client-side — no
 * file ever leaves the browser except one row at a time, already
 * validated, to the bulk-invite API route.
 *
 * Each subscriber logs in with their email as username and their own
 * phone number as password (no invite email, no password to distribute
 * individually — the org just needs to tell everyone once: "log in with
 * your email and your phone number"). The phone is normalized to digits
 * only here so "050-123-4567", "050 123 4567" and "0501234567" in the
 * file all become the exact same, predictable password.
 */
export async function parseSubscriberFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  if (rows.length === 0) {
    return { subscribers: [], totalRows: 0, skippedRows: 0, invalidPhoneRows: 0, duplicateEmails: [] };
  }

  const headerRow = rows[0];
  const nameIdx = findColumn(headerRow, NAME_HEADERS);
  const emailIdx = findColumn(headerRow, EMAIL_HEADERS);
  const phoneIdx = findColumn(headerRow, PHONE_HEADERS);

  if (nameIdx === -1 || emailIdx === -1 || phoneIdx === -1) {
    throw new Error(
      'לא נמצאו עמודות "שם מלא", "מייל" ו"טלפון" בקובץ. יש לוודא שהשורה הראשונה מכילה כותרות עמודות (הטלפון משמש כסיסמה, ולכן הוא שדה חובה).'
    );
  }

  const dataRows = rows.slice(1);
  const seenEmails = new Map<string, number>();
  const duplicateEmails: string[] = [];
  const subscribers: ParsedSubscriber[] = [];
  let skippedRows = 0;
  let invalidPhoneRows = 0;

  for (const row of dataRows) {
    const fullName = String(row[nameIdx] ?? '').trim();
    const email = String(row[emailIdx] ?? '').trim().toLowerCase();
    const phone = normalizePhone(row[phoneIdx]);

    if (!fullName || !email) {
      skippedRows += 1;
      continue;
    }
    if (phone.length < MIN_PASSWORD_LENGTH) {
      invalidPhoneRows += 1;
      continue;
    }

    const seenCount = seenEmails.get(email) ?? 0;
    seenEmails.set(email, seenCount + 1);
    if (seenCount === 1) duplicateEmails.push(email);
    if (seenCount >= 1) continue; // keep only the first occurrence

    subscribers.push({ fullName, email, phone });
  }

  return { subscribers, totalRows: dataRows.length, skippedRows, invalidPhoneRows, duplicateEmails };
}
