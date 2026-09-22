import * as XLSX from 'xlsx';

export interface ParsedSubscriber {
  fullName: string;
  email: string;
  phone: string;
}

export interface ParseResult {
  subscribers: ParsedSubscriber[];
  totalRows: number;
  skippedRows: number;
  duplicateEmails: string[];
}

// Recognized header text per column, matched case-insensitively — lets
// the org's own file keep whatever header wording they already use
// (Hebrew or English) instead of forcing an exact template.
const NAME_HEADERS = ['שם מלא', 'שם', 'full name', 'name'];
const EMAIL_HEADERS = ['מייל', 'אימייל', 'דוא"ל', 'דואל', 'email', 'e-mail'];
const PHONE_HEADERS = ['טלפון', 'נייד', 'phone', 'mobile'];

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
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
 * phone) into rows ready to bulk-invite. Runs entirely client-side — no
 * file ever leaves the browser except one row at a time, already
 * validated, to the bulk-invite API route.
 */
export async function parseSubscriberFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  if (rows.length === 0) {
    return { subscribers: [], totalRows: 0, skippedRows: 0, duplicateEmails: [] };
  }

  const headerRow = rows[0];
  const nameIdx = findColumn(headerRow, NAME_HEADERS);
  const emailIdx = findColumn(headerRow, EMAIL_HEADERS);
  const phoneIdx = findColumn(headerRow, PHONE_HEADERS);

  if (nameIdx === -1 || emailIdx === -1) {
    throw new Error(
      'לא נמצאו עמודות "שם מלא" ו"מייל" בקובץ. יש לוודא שהשורה הראשונה מכילה כותרות עמודות.'
    );
  }

  const dataRows = rows.slice(1);
  const seenEmails = new Map<string, number>();
  const duplicateEmails: string[] = [];
  const subscribers: ParsedSubscriber[] = [];
  let skippedRows = 0;

  for (const row of dataRows) {
    const fullName = String(row[nameIdx] ?? '').trim();
    const email = String(row[emailIdx] ?? '').trim().toLowerCase();
    const phone = phoneIdx !== -1 ? String(row[phoneIdx] ?? '').trim() : '';

    if (!fullName || !email) {
      skippedRows += 1;
      continue;
    }

    const seenCount = seenEmails.get(email) ?? 0;
    seenEmails.set(email, seenCount + 1);
    if (seenCount === 1) duplicateEmails.push(email);
    if (seenCount >= 1) continue; // keep only the first occurrence

    subscribers.push({ fullName, email, phone });
  }

  return { subscribers, totalRows: dataRows.length, skippedRows, duplicateEmails };
}
