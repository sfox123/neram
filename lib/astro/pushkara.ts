// Pushkara navamsa and pushkara bhaga.
//
// Pushkara means "that which nourishes". Two of the nine navamsas in every sign are pushkara,
// 24 of the 108 in all, each ruled by a benefic (Guru, Sukran, Chandran or Budhan):
//   fire signs   7th and 9th navamsa  20°00′–23°20′ (Thulam)   26°40′–30°00′ (Dhanusu)
//   earth signs  3rd and 5th navamsa   6°40′–10°00′ (Meenam)   13°20′–16°40′ (Rishabam)
//   air signs    6th and 8th navamsa  16°40′–20°00′ (Meenam)   23°20′–26°40′ (Rishabam)
//   water signs  1st and 3rd navamsa   0°00′–3°20′  (Kadagam)   6°40′–10°00′ (Kanni)
// A planet in one is nourished: it gives well even when the rasi chart shows it weak.
//
// Each sign also has one pushkara bhaga, a single degree of the same quality (Jataka
// Parijata 1.58): Mesham 21, Rishabam 14, Mithunam 18, Kadagam 8, Simmam 19, Kanni 9,
// Thulam 24, Viruchigam 11, Dhanusu 23, Makaram 14, Kumbam 19, Meenam 9.
//
// Three uses here: the birth chart (which planets are nourished), transits (a period lord
// passing through one), and above all muhurtha: the rising lagna and the Moon cross pushkara
// navamsas many times a day, and those minutes are the classical choice for fixing the
// moment of an important act.

import { Natal } from "./chart";
import { norm360, PLANET_INFO, PlanetId, PLANETS, RASI, signOf } from "./constants";
import { lagnaLongitude, siderealLongitude } from "./ephemeris";
import { DayFrame } from "./panchang";

/** Which two navamsas (0-based) of a sign are pushkara, by the sign's element. */
const PARTS: number[][] = [
  [6, 8], // fire: Mesham, Simmam, Dhanusu
  [2, 4], // earth: Rishabam, Kanni, Makaram
  [5, 7], // air: Mithunam, Thulam, Kumbam
  [0, 2], // water: Kadagam, Viruchigam, Meenam
];

/** The pushkara degree of each sign, Mesham first. */
export const PUSHKARA_BHAGA = [21, 14, 18, 8, 19, 9, 24, 11, 23, 14, 19, 9];
/** How far from the pushkara degree still counts, in degrees. */
export const BHAGA_ORB = 1;

export interface PushkaraHit {
  /** The navamsa sign the point falls in, which is the benefic's sign that nourishes it. */
  navamsa: number;
  ruler: PlanetId;
}

export function pushkaraNavamsa(lon: number): PushkaraHit | null {
  const l = norm360(lon);
  const sign = signOf(l);
  const part = Math.min(8, Math.floor(((l % 30) * 3) / 10 + 1e-9));
  if (!PARTS[sign % 4].includes(part)) return null;
  const navamsa = Math.floor((l * 3) / 10 + 1e-9) % 12;
  return { navamsa, ruler: RASI[navamsa].lord };
}

/** Distance in degrees from the sign's pushkara degree, or null if outside the orb. */
export function pushkaraBhaga(lon: number, orb = BHAGA_ORB): number | null {
  const l = norm360(lon);
  const d = Math.abs((l % 30) - PUSHKARA_BHAGA[signOf(l)]);
  return d <= orb ? d : null;
}

// ---- The birth chart ---------------------------------------------------------------------------

export interface NatalPushkara {
  key: PlanetId | "Lagna";
  name: string;
  lon: number;
  hit: PushkaraHit | null;
  bhaga: number | null;
}

export function natalPushkara(n: Natal): NatalPushkara[] {
  const rows: NatalPushkara[] = [];
  if (n.profile.timeConfirmed) rows.push({ key: "Lagna", name: "Lagna", lon: n.lagna, hit: pushkaraNavamsa(n.lagna), bhaga: pushkaraBhaga(n.lagna) });
  for (const p of PLANETS) rows.push({ key: p, name: PLANET_INFO[p].ta, lon: n.positions[p], hit: pushkaraNavamsa(n.positions[p]), bhaga: pushkaraBhaga(n.positions[p]) });
  return rows;
}

// ---- The day: when the rising lagna and the Moon are in a pushkara navamsa ----------------------

export interface PushkaraSpan {
  start: Date;
  end: Date;
  /** The sign the point is in (rising sign for the lagna, Moon's sign for the Moon). */
  sign: number;
  navamsa: number;
  ruler: PlanetId;
}

export interface DayPushkara {
  lagna: PushkaraSpan[];
  moon: PushkaraSpan[];
  /** Moments when the rising lagna stands exactly on a pushkara degree. */
  bhaga: { at: Date; sign: number; degree: number }[];
}

const cache = new Map<string, DayPushkara>();

function spans(lonAt: (ms: number) => number, from: number, to: number, stepMs: number): PushkaraSpan[] {
  const out: PushkaraSpan[] = [];
  const inside = (ms: number) => pushkaraNavamsa(lonAt(ms)) !== null;
  const edge = (a: number, b: number) => {
    // a and b differ in state; narrow to about two seconds
    let lo = a;
    let hi = b;
    const start = inside(a);
    while (hi - lo > 2000) {
      const mid = (lo + hi) / 2;
      if (inside(mid) === start) lo = mid;
      else hi = mid;
    }
    return hi;
  };
  let prevT = from;
  let prev = inside(from);
  let open: number | null = prev ? from : null;
  for (let t = from + stepMs; ; t += stepMs) {
    const tt = Math.min(t, to);
    const cur = inside(tt);
    if (cur !== prev) {
      const e = edge(prevT, tt);
      if (cur) open = e;
      else if (open !== null) {
        const mid = (open + e) / 2;
        const lon = lonAt(mid);
        const hit = pushkaraNavamsa(lon)!;
        out.push({ start: new Date(open), end: new Date(e), sign: signOf(lon), navamsa: hit.navamsa, ruler: hit.ruler });
        open = null;
      }
    }
    prev = cur;
    prevT = tt;
    if (tt >= to) break;
  }
  if (open !== null) {
    const lon = lonAt((open + to) / 2);
    const hit = pushkaraNavamsa(lon);
    if (hit) out.push({ start: new Date(open), end: new Date(to), sign: signOf(lon), navamsa: hit.navamsa, ruler: hit.ruler });
  }
  return out;
}

export function dayPushkara(frame: DayFrame): DayPushkara {
  const key = `${frame.dateKey}|${frame.place.latitude}|${frame.place.longitude}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const from = frame.sunrise.getTime();
  const to = frame.nextSunrise.getTime();
  const { latitude, longitude } = frame.place;
  const lagnaAt = (ms: number) => lagnaLongitude(new Date(ms), latitude, longitude);
  const moonAt = (ms: number) => siderealLongitude("Mo", new Date(ms));
  // A navamsa of lagna rises in roughly 8 to 15 minutes; of the Moon, in about six hours.
  const lagna = spans(lagnaAt, from, to, 3 * 60000);
  const moon = spans(moonAt, from, to, 20 * 60000);

  // The lagna on the exact pushkara degree of each sign that rises today.
  const bhaga: DayPushkara["bhaga"] = [];
  const stepMs = 4 * 60000;
  let prevT = from;
  let prevLon = lagnaAt(from);
  for (let t = from + stepMs; t <= to; t += stepMs) {
    const lon = lagnaAt(t);
    const sign = signOf(prevLon);
    const target = sign * 30 + PUSHKARA_BHAGA[sign];
    const a = prevLon;
    const b = signOf(lon) === sign ? lon : sign * 30 + 30; // stay inside the sign
    if (a <= target && target < b) {
      let lo = prevT;
      let hi = t;
      while (hi - lo > 2000) {
        const mid = (lo + hi) / 2;
        const ml = lagnaAt(mid);
        if (signOf(ml) === sign && ml < target) lo = mid;
        else hi = mid;
      }
      bhaga.push({ at: new Date(hi), sign, degree: PUSHKARA_BHAGA[sign] });
    }
    prevT = t;
    prevLon = lon;
  }
  const res = { lagna, moon, bhaga };
  if (cache.size > 400) cache.clear();
  cache.set(key, res);
  return res;
}

export const pushkaraAt = (list: PushkaraSpan[], t: Date) => list.find((s) => t >= s.start && t < s.end) ?? null;
