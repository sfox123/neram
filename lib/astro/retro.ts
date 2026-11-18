// Vakram and vakra nivarthi: when the five star-planets turn retrograde and back to direct.
// The Sun and Moon never go retrograde, and Rahu and Ketu always are, so they are left out.

import { PlanetId, signOf } from "./constants";
import { dailyMotion, siderealLongitude } from "./ephemeris";
import { MS_DAY, MS_HOUR } from "./time";

export const RETRO_PLANETS: PlanetId[] = ["Me", "Ve", "Ma", "Ju", "Sa"];

/** One retrograde spell: from the station retrograde (vakram) to the station direct (vakra nivarthi). */
export interface RetroSpell {
  planet: PlanetId;
  /** Vakram: the planet stands still and turns back. */
  start: Date;
  /** Vakra nivarthi: it stands still again and resumes direct motion. */
  end: Date;
  startSign: number;
  endSign: number;
  /** True when `at` (the time asked about) falls inside the spell. */
  running: boolean;
}

export const isRetro = (p: PlanetId, t: Date) => dailyMotion(p, t) < 0;

/** The longest retrograde spell (Sani, about 140 days) with room to spare. */
const MAX_SPELL_MS = 200 * MS_DAY;
/** The longest direct stretch (Sevvai, about 24 months) with room to spare. */
const MAX_GAP_MS = 820 * MS_DAY;

/**
 * The next instant after `from` (or before it, when `dir` is -1) at which the planet's direction flips,
 * to the minute, or null within `limitMs`. A one-day step is safe: no spell or gap is shorter than three weeks.
 */
export function nextStation(p: PlanetId, from: Date, limitMs: number, dir: 1 | -1 = 1, stepMs = MS_DAY): Date | null {
  const state = isRetro(p, from);
  let near = from.getTime();
  let far = near;
  const limit = near + dir * limitMs;
  for (;;) {
    far = near + dir * stepMs;
    if (dir === 1 ? far > limit : far < limit) return null;
    if (isRetro(p, new Date(far)) !== state) break;
    near = far;
  }
  while (Math.abs(far - near) > 60000) {
    const mid = (near + far) / 2;
    if (isRetro(p, new Date(mid)) === state) near = mid;
    else far = mid;
  }
  // The station itself: forward, the first minute of the new direction; backward, the first minute of the current one.
  return new Date(dir === 1 ? far : near);
}

const signAt = (p: PlanetId, t: Date) => signOf(siderealLongitude(p, t));

function spell(p: PlanetId, start: Date, end: Date, at: Date): RetroSpell {
  return { planet: p, start, end, startSign: signAt(p, start), endSign: signAt(p, end), running: start <= at && at < end };
}

/** The spell running at `at`, or else the next one to begin within `aheadMs`. */
export function retroSpell(p: PlanetId, at: Date, aheadMs = MAX_GAP_MS): RetroSpell | null {
  if (isRetro(p, at)) {
    const start = nextStation(p, at, MAX_SPELL_MS, -1);
    const end = nextStation(p, at, MAX_SPELL_MS, 1);
    return start && end ? spell(p, start, end, at) : null;
  }
  const start = nextStation(p, at, aheadMs, 1);
  if (!start) return null;
  const end = nextStation(p, new Date(start.getTime() + MS_HOUR), MAX_SPELL_MS, 1);
  return end ? spell(p, start, end, at) : null;
}

/** Each planet's running or next spell: running ones first, then by how soon they begin. */
export function retroSpells(at: Date, aheadMs = MAX_GAP_MS): RetroSpell[] {
  return RETRO_PLANETS.map((p) => retroSpell(p, at, aheadMs))
    .filter((s): s is RetroSpell => s !== null)
    .sort((a, b) => Number(b.running) - Number(a.running) || (a.running ? a.end.getTime() - b.end.getTime() : a.start.getTime() - b.start.getTime()));
}

/** Spells that ended (vakra nivarthi) within the last `withinMs`, most recent first. */
export function recentlyDirect(at: Date, withinMs = 15 * MS_DAY): RetroSpell[] {
  const out: RetroSpell[] = [];
  for (const p of RETRO_PLANETS) {
    if (isRetro(p, at)) continue;
    const end = nextStation(p, at, withinMs, -1);
    if (!end) continue;
    const start = nextStation(p, new Date(end.getTime() - MS_HOUR), MAX_SPELL_MS, -1);
    if (start) out.push(spell(p, start, end, at));
  }
  return out.sort((a, b) => b.end.getTime() - a.end.getTime());
}

/** How far off a start is, in words that suit the distance: "3 days", "5 weeks", "about 18 months". */
export function fmtAhead(ms: number): string {
  const days = ms / MS_DAY;
  if (days < 21) return fmtDays(ms);
  if (days < 75) return `${Math.round(days / 7)} weeks`;
  return `about ${Math.round(days / 30.44)} months`;
}

/** Whole days, rounded: "24 days". */
export function fmtDays(ms: number): string {
  const d = Math.max(1, Math.round(ms / MS_DAY));
  return `${d} day${d === 1 ? "" : "s"}`;
}
