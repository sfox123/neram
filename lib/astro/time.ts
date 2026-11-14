// Time-zone helpers built on Intl, so historical offsets (Colombo was UTC+6 in 1999) come out right.

const partsCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string) {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    partsCache.set(tz, f);
  }
  return f;
}

export interface WallTime {
  y: number;
  m: number; // 1..12
  d: number;
  hh: number;
  mm: number;
  ss: number;
  weekday: number; // 0 = Sunday
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function wallTime(date: Date, tz: string): WallTime {
  const parts = partsFormatter(tz).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    y: +get("year"),
    m: +get("month"),
    d: +get("day"),
    hh: +get("hour"),
    mm: +get("minute"),
    ss: +get("second"),
    weekday: WD.indexOf(get("weekday")),
  };
}

/** Offset of `tz` from UTC at the instant `date`, in minutes (east positive). */
export function tzOffsetMinutes(date: Date, tz: string): number {
  const w = wallTime(date, tz);
  const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.hh, w.mm, w.ss);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Convert a wall-clock time in `tz` to the UTC instant. */
export function zonedToUtc(y: number, m: number, d: number, hh: number, mm: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  let off = tzOffsetMinutes(new Date(guess), tz);
  let t = guess - off * 60000;
  off = tzOffsetMinutes(new Date(t), tz);
  t = guess - off * 60000;
  return new Date(t);
}

/** "2026-11-14" for the instant in the zone. */
export function dateKey(date: Date, tz: string): string {
  const w = wallTime(date, tz);
  return `${w.y}-${String(w.m).padStart(2, "0")}-${String(w.d).padStart(2, "0")}`;
}

export function parseDateKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

export function addDaysKey(key: string, days: number): string {
  const { y, m, d } = parseDateKey(key);
  const t = new Date(Date.UTC(y, m - 1, d + days, 12));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

export function fmtTime(date: Date, tz: string, withSeconds = false): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: true,
  })
    .format(date)
    .replace(" am", " am")
    .replace(" pm", " pm");
}

export function fmtDate(date: Date, tz: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...opts,
  }).format(date);
}

export function fmtDateLong(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function fmtDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export const MS_HOUR = 3600000;
export const MS_DAY = 86400000;

/** Like fmtDuration, but rolls hours into days past 24 h: "1 day 4 h", "2 days". */
export function fmtCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  if (totalMin < 24 * 60) return fmtDuration(ms);
  const days = Math.floor(totalMin / (24 * 60));
  const h = Math.floor((totalMin % (24 * 60)) / 60);
  const d = `${days} day${days === 1 ? "" : "s"}`;
  return h === 0 ? d : `${d} ${h} h`;
}
