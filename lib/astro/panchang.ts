// Daily panchangam: the five limbs with their end times, the sunrise-based day frame,
// and the fixed time divisions (Rahu kalam, hora, Gowri, Abhijit).

import {
  karanaName,
  NAK_SPAN,
  NAKSHATRA,
  norm360,
  PlanetId,
  RASI,
  signOf,
  TAMIL_MONTHS,
  TAMIL_YEARS,
  tithiName,
  WEEKDAY_LORD,
  YOGA_NAMES,
} from "./constants";
import { lagnaLongitude, siderealLongitude, sunTimesFrom, SunTimes } from "./ephemeris";
import { MS_DAY, MS_HOUR, parseDateKey, wallTime, zonedToUtc } from "./time";

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  tz: string;
}

export interface Span<T = string> {
  start: Date;
  end: Date;
  value: T;
}

// ---- The five limbs as continuous angles -------------------------------------------------

const moonSunDiff = (d: Date) => norm360(siderealLongitude("Mo", d) - siderealLongitude("Su", d));
const moonSunSum = (d: Date) => norm360(siderealLongitude("Mo", d) + siderealLongitude("Su", d));
const moonLon = (d: Date) => siderealLongitude("Mo", d);

export const tithiIndex = (d: Date) => Math.floor(moonSunDiff(d) / 12); // 0..29
export const nakIndex = (d: Date) => Math.floor(moonLon(d) / NAK_SPAN); // 0..26
export const yogaIndex = (d: Date) => Math.floor(moonSunSum(d) / NAK_SPAN); // 0..26
export const karanaIndex = (d: Date) => Math.floor(moonSunDiff(d) / 6); // 0..59
/** 0 = waxing (valarpirai), 1 = waning (theipirai). */
export const pakshaOf = (d: Date) => (tithiIndex(d) < 15 ? 0 : 1);

/** Find the next instant after `from` at which `index(t)` changes, to about 5 seconds. */
function nextChange(index: (d: Date) => number, from: Date, stepMs = MS_HOUR, limitMs = 40 * MS_DAY): Date {
  const start = index(from);
  let lo = from.getTime();
  let hi = lo;
  const limit = lo + limitMs;
  while (hi < limit) {
    hi += stepMs;
    if (index(new Date(hi)) !== start) break;
    lo = hi;
  }
  while (hi - lo > 5000) {
    const mid = (lo + hi) / 2;
    if (index(new Date(mid)) === start) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
}

function previousChange(index: (d: Date) => number, from: Date, stepMs = MS_HOUR, limitMs = 40 * MS_DAY): Date {
  const start = index(from);
  let hi = from.getTime();
  let lo = hi;
  const limit = hi - limitMs;
  while (lo > limit) {
    lo -= stepMs;
    if (index(new Date(lo)) !== start) break;
    hi = lo;
  }
  while (hi - lo > 5000) {
    const mid = (lo + hi) / 2;
    if (index(new Date(mid)) === start) hi = mid;
    else lo = mid;
  }
  return new Date(hi);
}

/** All values an index takes between two instants, each with its span. */
function spans(index: (d: Date) => number, from: Date, to: Date, stepMs = MS_HOUR): Span<number>[] {
  const out: Span<number>[] = [];
  let t = from;
  let guard = 0;
  while (t < to && guard++ < 20) {
    const end = nextChange(index, t, stepMs);
    out.push({ start: t, end, value: index(new Date(t.getTime() + 1000)) });
    t = end;
  }
  return out;
}

export const nextSignChange = (planet: PlanetId, from: Date) =>
  nextChange((d) => signOf(siderealLongitude(planet, d)), from, planet === "Mo" ? MS_HOUR : MS_DAY / 2, 3 * 366 * MS_DAY);

// ---- Day frame ---------------------------------------------------------------------------

export interface DayFrame extends SunTimes {
  place: Place;
  dateKey: string;
  weekday: number; // 0 = Sunday; the Hindu day runs sunrise to sunrise
  dayLength: number; // ms
  nightLength: number; // ms
}

/** Frame for the civil date (YYYY-MM-DD) in the place's own time zone. */
export function dayFrame(dateKey: string, place: Place): DayFrame {
  const { y, m, d } = parseDateKey(dateKey);
  const midnight = zonedToUtc(y, m, d, 0, 0, place.tz);
  const st = sunTimesFrom(midnight, place.latitude, place.longitude);
  const weekday = wallTime(st.sunrise, place.tz).weekday;
  return {
    ...st,
    place,
    dateKey,
    weekday,
    dayLength: st.sunset.getTime() - st.sunrise.getTime(),
    nightLength: st.nextSunrise.getTime() - st.sunset.getTime(),
  };
}

/** The frame whose sunrise-to-sunrise window contains `now`. */
export function frameContaining(now: Date, place: Place): DayFrame {
  const w = wallTime(now, place.tz);
  const key = `${w.y}-${String(w.m).padStart(2, "0")}-${String(w.d).padStart(2, "0")}`;
  const today = dayFrame(key, place);
  if (now >= today.sunrise) return today;
  const prev = new Date(Date.UTC(w.y, w.m - 1, w.d - 1, 12));
  const prevKey = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}-${String(prev.getUTCDate()).padStart(2, "0")}`;
  return dayFrame(prevKey, place);
}

// ---- Fixed divisions of the day ---------------------------------------------------------

// Which eighth of the daytime each period takes, Sunday..Saturday (1-based).
const RAHU_PART = [8, 2, 7, 5, 6, 4, 3];
const YAMA_PART = [5, 4, 3, 2, 1, 7, 6];
const GULIKA_PART = [7, 6, 5, 4, 3, 2, 1];

function eighth(frame: DayFrame, part: number): { start: Date; end: Date } {
  const len = frame.dayLength / 8;
  const s = frame.sunrise.getTime() + (part - 1) * len;
  return { start: new Date(s), end: new Date(s + len) };
}

// Hora lords run in the Chaldean order, starting from the weekday lord at sunrise.
const HORA_SEQ: PlanetId[] = ["Su", "Ve", "Me", "Mo", "Sa", "Ju", "Ma"];

export function horas(frame: DayFrame): Span<PlanetId>[] {
  const out: Span<PlanetId>[] = [];
  const startIdx = HORA_SEQ.indexOf(WEEKDAY_LORD[frame.weekday]);
  for (let i = 0; i < 24; i++) {
    const isDay = i < 12;
    const len = (isDay ? frame.dayLength : frame.nightLength) / 12;
    const base = isDay ? frame.sunrise.getTime() : frame.sunset.getTime();
    const k = isDay ? i : i - 12;
    out.push({
      start: new Date(base + k * len),
      end: new Date(base + (k + 1) * len),
      value: HORA_SEQ[(startIdx + i) % 7],
    });
  }
  return out;
}

export type GowriName = "Amirdha" | "Uthi" | "Laabam" | "Dhanam" | "Sugam" | "Rogam" | "Soram" | "Visham";
export const GOWRI_INFO: Record<GowriName, { good: boolean; meaning: string }> = {
  Amirdha: { good: true, meaning: "nectar, the best" },
  Uthi: { good: true, meaning: "work and effort pay" },
  Laabam: { good: true, meaning: "gain" },
  Dhanam: { good: true, meaning: "wealth" },
  Sugam: { good: true, meaning: "ease and comfort" },
  Rogam: { good: false, meaning: "illness" },
  Soram: { good: false, meaning: "theft, loss" },
  Visham: { good: false, meaning: "poison" },
};

// Gowri panchangam as printed in the Pambu panchangam (the table Drik Panchang follows).
const A: GowriName = "Amirdha", U: GowriName = "Uthi", L: GowriName = "Laabam", D: GowriName = "Dhanam";
const S: GowriName = "Sugam", R: GowriName = "Rogam", O: GowriName = "Soram", V: GowriName = "Visham";
const GOWRI_DAY: GowriName[][] = [
  [U, A, R, L, D, S, O, V],
  [A, V, R, L, D, S, O, U],
  [R, L, D, S, O, U, V, A],
  [L, D, S, O, V, U, A, R],
  [D, S, O, U, A, V, R, L],
  [S, O, U, V, A, R, L, D],
  [O, U, V, A, R, L, D, S],
];
const GOWRI_NIGHT: GowriName[][] = [
  [D, S, O, V, U, A, R, L],
  [S, O, U, A, V, R, L, D],
  [O, U, V, A, R, L, D, S],
  [U, A, R, L, D, S, O, V],
  [A, V, R, L, D, S, O, U],
  [R, L, D, S, O, U, V, A],
  [L, D, S, O, U, V, A, R],
];

export function gowri(frame: DayFrame): Span<GowriName>[] {
  const out: Span<GowriName>[] = [];
  for (let i = 0; i < 16; i++) {
    const isDay = i < 8;
    const len = (isDay ? frame.dayLength : frame.nightLength) / 8;
    const base = isDay ? frame.sunrise.getTime() : frame.sunset.getTime();
    const k = isDay ? i : i - 8;
    out.push({
      start: new Date(base + k * len),
      end: new Date(base + (k + 1) * len),
      value: (isDay ? GOWRI_DAY : GOWRI_NIGHT)[frame.weekday][k],
    });
  }
  return out;
}

// ---- Tamil calendar ---------------------------------------------------------------------

export interface TamilDate {
  month: string;
  day: number;
  year: string;
}

export function tamilDate(frame: DayFrame): TamilDate {
  const sunSign = (d: Date) => signOf(siderealLongitude("Su", d));
  // The month is fixed by the Sun's sign at sunset: if the Sun enters a sign before sunset,
  // that day is the 1st of the month.
  const ref = frame.sunset;
  const sign = sunSign(ref);
  const sankranti = previousChange(sunSign, ref, MS_DAY / 4, 40 * MS_DAY);
  // First day of the month: the civil date whose sunset comes after the sankranti.
  let first = dayFrame(wallKey(sankranti, frame.place.tz), frame.place);
  if (sankranti > first.sunset) first = dayFrame(shiftKey(first.dateKey, 1), frame.place);
  const day = Math.round((keyToUtcNoon(frame.dateKey) - keyToUtcNoon(first.dateKey)) / MS_DAY) + 1;
  // The year turns over when the Sun enters Mesham.
  const { y, m } = parseDateKey(frame.dateKey);
  // Dhanusu to Meenam fall in January to mid-April, which still belong to the previous Tamil year.
  const yearStart = m <= 4 && sign >= 8 ? y - 1 : y;
  const yearIdx = (((yearStart - 1987) % 60) + 60) % 60;
  return { month: TAMIL_MONTHS[sign], day, year: TAMIL_YEARS[yearIdx] };
}

function wallKey(d: Date, tz: string) {
  const w = wallTime(d, tz);
  return `${w.y}-${String(w.m).padStart(2, "0")}-${String(w.d).padStart(2, "0")}`;
}
function keyToUtcNoon(key: string) {
  const { y, m, d } = parseDateKey(key);
  return Date.UTC(y, m - 1, d, 12);
}
function shiftKey(key: string, days: number) {
  const t = new Date(keyToUtcNoon(key) + days * MS_DAY);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

// ---- The full day -----------------------------------------------------------------------

export interface Panchang {
  frame: DayFrame;
  tamil: TamilDate;
  tithi: Span<number>[];
  nakshatra: Span<number>[];
  yoga: Span<number>[];
  karana: Span<number>[];
  moonSign: Span<number>[];
  /** The sign rising on the eastern horizon (the lagna of the moment), about two hours each. */
  rising: Span<number>[];
  sunSign: number;
  /** Paksha at sunrise; this is the one Pancha Pakshi uses for the whole day. */
  paksha: 0 | 1;
  rahu: { start: Date; end: Date };
  yamagandam: { start: Date; end: Date };
  gulika: { start: Date; end: Date };
  abhijit: { start: Date; end: Date } | null;
  brahmaMuhurtham: { start: Date; end: Date };
  horas: Span<PlanetId>[];
  gowri: Span<GowriName>[];
}

const cache = new Map<string, Panchang>();

export function panchangFor(frame: DayFrame): Panchang {
  const key = `${frame.dateKey}|${frame.place.latitude}|${frame.place.longitude}|${frame.place.tz}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const from = frame.sunrise;
  const to = frame.nextSunrise;
  const muhurtaDay = frame.dayLength / 15;
  const muhurtaNight = frame.nightLength / 15;
  const p: Panchang = {
    frame,
    tamil: tamilDate(frame),
    tithi: spans(tithiIndex, from, to),
    nakshatra: spans(nakIndex, from, to),
    yoga: spans(yogaIndex, from, to),
    karana: spans(karanaIndex, from, to),
    moonSign: spans((d) => signOf(siderealLongitude("Mo", d)), from, to),
    rising: risingSpans(frame),
    sunSign: signOf(siderealLongitude("Su", from)),
    paksha: pakshaOf(from) as 0 | 1,
    rahu: eighth(frame, RAHU_PART[frame.weekday]),
    yamagandam: eighth(frame, YAMA_PART[frame.weekday]),
    gulika: eighth(frame, GULIKA_PART[frame.weekday]),
    // Abhijit is the 8th of the 15 daytime muhurtas; tradition leaves it out on Wednesdays.
    abhijit:
      frame.weekday === 3
        ? null
        : {
            start: new Date(frame.sunrise.getTime() + 7 * muhurtaDay),
            end: new Date(frame.sunrise.getTime() + 8 * muhurtaDay),
          },
    brahmaMuhurtham: {
      start: new Date(frame.nextSunrise.getTime() - 2 * muhurtaNight),
      end: new Date(frame.nextSunrise.getTime() - muhurtaNight),
    },
    horas: horas(frame),
    gowri: gowri(frame),
  };
  if (cache.size > 80) cache.clear();
  cache.set(key, p);
  return p;
}

function risingSpans(frame: DayFrame): Span<number>[] {
  const { latitude, longitude } = frame.place;
  const idx = (d: Date) => signOf(lagnaLongitude(d, latitude, longitude));
  const out: Span<number>[] = [];
  let t = frame.sunrise;
  let guard = 0;
  while (t < frame.nextSunrise && guard++ < 16) {
    const end = nextChange(idx, t, 10 * 60000, MS_DAY);
    out.push({ start: t, end, value: idx(new Date(t.getTime() + 1000)) });
    t = end;
  }
  return out;
}

export function spanAt<T>(list: Span<T>[], t: Date): Span<T> {
  return list.find((s) => t >= s.start && t < s.end) ?? list[list.length - 1];
}

export const within = (r: { start: Date; end: Date } | null, t: Date) => !!r && t >= r.start && t < r.end;

export const label = {
  tithi: (i: number) => `${i < 15 ? "Valarpirai" : "Theipirai"} ${tithiName(i)}`,
  tithiShort: (i: number) => tithiName(i),
  nak: (i: number) => NAKSHATRA[i].ta,
  yoga: (i: number) => YOGA_NAMES[i],
  karana: (i: number) => karanaName(i),
  rasi: (i: number) => RASI[i].ta,
};
