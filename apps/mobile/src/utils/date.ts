/** Formats a Date as "YYYY-MM-DD" (matches Postgres `date` columns), in local time. */
export function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Adds `delta` days to a "YYYY-MM-DD" string and returns a new "YYYY-MM-DD" string. */
export function addDays(dateStr: string, delta: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + delta);
  return toDateOnlyString(date);
}

/** First and last "YYYY-MM-DD" of the given month (month is 0-indexed, like Date). */
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = toDateOnlyString(new Date(year, month, 1));
  const end = toDateOnlyString(new Date(year, month + 1, 0));
  return { start, end };
}

/**
 * Builds a calendar grid for the given month as a flat array of "YYYY-MM-DD"
 * strings (or null for the leading/trailing padding cells), always a
 * multiple of 7 so it can be chunked into weeks.
 */
export function getMonthMatrix(year: number, month: number): (string | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay(); // 0 = Sunday

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(toDateOnlyString(new Date(year, month, day)));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}
