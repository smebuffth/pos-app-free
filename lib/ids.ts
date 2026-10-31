// IDs are generated in the app, never by the database (database.md, portable SQL).
export const newId = () => crypto.randomUUID();

// Receipt number: R + the Bangkok calendar date + a 4-digit daily sequence, e.g. R20261021-0001.
export const receiptNo = (bangkokDate: string, seq: number) => `R${bangkokDate.replaceAll("-", "")}-${String(seq).padStart(4, "0")}`;

// The calendar date in Asia/Bangkok, as YYYY-MM-DD.
export const bangkokDate = (at: Date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
