// Thailand has no daylight saving time, so Asia/Bangkok is always UTC+07:00.
const OFFSET = "+07:00";

// Start of the first day and start of the day after the last day, both inclusive of a YYYY-MM-DD range.
export function bangkokRange(fromDate: string, toDate: string): { start: Date; end: Date } {
  const start = new Date(`${fromDate}T00:00:00${OFFSET}`);
  const end = new Date(new Date(`${toDate}T00:00:00${OFFSET}`).getTime() + 86_400_000);
  return { start, end };
}

// Adds whole days to a YYYY-MM-DD string, using calendar arithmetic (no time zone involved).
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export const isYmd = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
