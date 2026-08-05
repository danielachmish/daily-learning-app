/** Formats a Date as "YYYY-MM-DD", in local time. */
export function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** First and last "YYYY-MM-DD" of the given month (month is 0-indexed, like Date). */
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = toDateOnlyString(new Date(year, month, 1));
  const end = toDateOnlyString(new Date(year, month + 1, 0));
  return { start, end };
}

/** "YYYY-MM-DD" for `daysAgo` days before today (0 = today). */
export function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateOnlyString(date);
}
