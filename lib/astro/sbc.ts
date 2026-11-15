// Sarvatobhadra chakra: one 9 x 9 board that holds the 28 stars, the name sounds, the twelve
// signs, the five tithi groups and the seven weekdays. A planet sitting in a star throws three
// lines (vedha) across the board; whatever of yours lies on a line is "pierced" by that planet.
// A malefic piercing your birth star, rasi, tithi, weekday or name sound calls for caution in
// that area; a benefic doing the same supports it.
//
// Layout (east at the top, as the board is traditionally drawn):
//   - Outer ring: the 28 stars, seven a side, clockwise from Krittika on the east side. Abhijit
//     has its own cell between Uttara Ashadha and Shravana.
//   - The four diagonals: the sixteen vowels, four to an arm, dealt clockwise from the north-east.
//   - Second ring: twenty name consonants, five a side.
//   - Third ring: the twelve signs, three a side, from Rishabam in the east round to Mesham.
//   - Centre: Nanda, Bhadra, Jaya and Rikta tithis with their weekdays, and Purna in the middle.
//
// The lines, for a planet in a star on the rim:
//   - Front: straight across the board. It strikes only the star at the far end.
//   - Fore (left): the diagonal leaning the way the zodiac runs. It strikes every cell it crosses.
//   - Hind (right): the diagonal leaning the other way, striking every cell it crosses.
//
// Two schools differ on which lines a planet uses:
//   "motion"  the classical reading, and the default here: one line each. A retrograde planet
//             throws the hind line, a planet moving faster than its average the fore line, and
//             one at ordinary speed the front line. The Sun and Moon always throw the fore line;
//             Rahu and Ketu always the hind line.
//   "all"     every planet throws all three lines, always, as most chart software draws it.
// With all three lines most of your points are pierced by something on most days, so a bare
// count says little. The reading is therefore also ranked against your own year: how today
// compares with the twelve months around it.

import { Natal } from "./chart";
import { NAKSHATRA, norm360, PLANET_INFO, PlanetId, PLANETS, RASI, signOf, WEEKDAYS } from "./constants";
import { debilitated, exalted } from "./dignity";
import { allPositions, dailyMotion, Positions } from "./ephemeris";
import { frameContaining, tithiIndex } from "./panchang";
import { MS_DAY } from "./time";

export type SbcSchool = "all" | "motion";
export const DEFAULT_SCHOOL: SbcSchool = "motion";

export type CellKind = "star" | "vowel" | "consonant" | "sign" | "tithi";
export interface Cell {
  row: number;
  col: number;
  kind: CellKind;
  /** star: 0..27 in board order; sign: 0..11; tithi: 0..4 group; vowel and consonant: index into their lists. */
  index: number;
  label: string;
  sub?: string;
}

// Stars in board order: Krittika first, Abhijit after Uttara Ashadha.
// `nak` is the index in the ordinary 27-star list, or -1 for Abhijit.
const STAR_ORDER: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, -1, 21, 22, 23, 24, 25, 26, 0, 1];
export const starName = (boardIndex: number) => (STAR_ORDER[boardIndex] === -1 ? "Abhijit" : NAKSHATRA[STAR_ORDER[boardIndex]].ta);

export const VOWELS = ["a", "ā", "i", "ī", "u", "ū", "ṛ", "ṝ", "ḷ", "ḹ", "e", "ai", "o", "au", "aṃ", "aḥ"];
// East (top, left to right), south (right, top to bottom), west (bottom, right to left), north (left, bottom to top).
export const CONSONANTS = ["a", "va", "ka", "ha", "ḍa", "ma", "ṭa", "pa", "ra", "ta", "na", "ya", "bha", "ja", "kha", "ga", "sa", "da", "cha", "la"];
const TITHI_GROUPS = [
  { name: "Nanda", tithis: "1, 6, 11", days: [0, 2] },
  { name: "Bhadra", tithis: "2, 7, 12", days: [1, 3] },
  { name: "Jaya", tithis: "3, 8, 13", days: [4] },
  { name: "Rikta", tithis: "4, 9, 14", days: [5] },
  { name: "Purna", tithis: "5, 10, 15", days: [6] },
];
export const tithiGroupName = (g: number) => TITHI_GROUPS[g].name;

function buildBoard(): Cell[][] {
  const grid: (Cell | null)[][] = Array.from({ length: 9 }, () => new Array<Cell | null>(9).fill(null));
  const put = (row: number, col: number, kind: CellKind, index: number, label: string, sub?: string) => {
    grid[row][col] = { row, col, kind, index, label, sub };
  };
  // Walk a square ring clockwise, starting just after its top-left corner; returns the non-corner cells.
  const ring = (inset: number): [number, number][] => {
    const lo = inset;
    const hi = 8 - inset;
    const out: [number, number][] = [];
    for (let c = lo + 1; c < hi; c++) out.push([lo, c]);
    for (let r = lo + 1; r < hi; r++) out.push([r, hi]);
    for (let c = hi - 1; c > lo; c--) out.push([hi, c]);
    for (let r = hi - 1; r > lo; r--) out.push([r, lo]);
    return out;
  };
  ring(0).forEach(([r, c], i) => put(r, c, "star", i, starName(i)));
  ring(1).forEach(([r, c], i) => put(r, c, "consonant", i, CONSONANTS[i]));
  // Signs: Rishabam first in the east, Mesham last in the north.
  ring(2).forEach(([r, c], i) => put(r, c, "sign", (i + 1) % 12, RASI[(i + 1) % 12].ta));
  // Vowels on the diagonals: four rounds, each going NE, SE, SW, NW (top-left, top-right, bottom-right, bottom-left).
  for (let round = 0; round < 4; round++) {
    const lo = round;
    const hi = 8 - round;
    const corners: [number, number][] = [[lo, lo], [lo, hi], [hi, hi], [hi, lo]];
    corners.forEach(([r, c], j) => put(r, c, "vowel", round * 4 + j, VOWELS[round * 4 + j]));
  }
  // Centre cross.
  const days = (g: number) => TITHI_GROUPS[g].days.map((d) => WEEKDAYS[d].slice(0, 3)).join(", ");
  put(3, 4, "tithi", 0, "Nanda", days(0));
  put(4, 5, "tithi", 1, "Bhadra", days(1));
  put(5, 4, "tithi", 2, "Jaya", days(2));
  put(4, 3, "tithi", 3, "Rikta", days(3));
  put(4, 4, "tithi", 4, "Purna", days(4));
  return grid as Cell[][];
}

export const BOARD: Cell[][] = buildBoard();
const STAR_CELL: Cell[] = [];
for (const row of BOARD) for (const c of row) if (c.kind === "star") STAR_CELL[c.index] = c;

/** Board index (0..27) of the star holding a sidereal longitude, with Abhijit from 276°40′ to 280°53′20″. */
export function boardStar(lon: number): number {
  const l = norm360(lon);
  if (l >= 276 + 40 / 60 && l < 280 + 53 / 60 + 20 / 3600) return STAR_ORDER.indexOf(-1);
  return STAR_ORDER.indexOf(Math.floor(l / (360 / 27)));
}

export type LineKind = "front" | "fore" | "hind";

/** The cells struck by each of the three lines from a star on the rim. */
export function vedhaLines(star: number): Record<LineKind, Cell[]> {
  const { row, col } = STAR_CELL[star];
  // Inward direction and the clockwise direction along this side.
  let inward: [number, number];
  let along: [number, number];
  if (row === 0) { inward = [1, 0]; along = [0, 1]; }
  else if (col === 8) { inward = [0, -1]; along = [1, 0]; }
  else if (row === 8) { inward = [-1, 0]; along = [0, -1]; }
  else { inward = [0, 1]; along = [-1, 0]; }
  const walk = (dr: number, dc: number): Cell[] => {
    const out: Cell[] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r <= 8 && c >= 0 && c <= 8) {
      out.push(BOARD[r][c]);
      r += dr;
      c += dc;
    }
    return out;
  };
  const straight = walk(inward[0], inward[1]);
  return {
    front: straight.slice(-1),
    fore: walk(inward[0] + along[0], inward[1] + along[1]),
    hind: walk(inward[0] - along[0], inward[1] - along[1]),
  };
}

// ---- Your own points on the board -----------------------------------------------------------------

export type PointKey = "star" | "rasi" | "lagna" | "tithi" | "weekday" | "name";
export interface NatalPoint {
  key: PointKey;
  label: string;
  value: string;
  cell: Cell | null;
  /** What a piercing of this point touches. */
  area: string;
}

// The first sound of a name written in Latin letters, mapped to the board. Longest match first.
const SOUND_MAP: [RegExp, string][] = [
  [/^(sh|s|z|c(?=[eiy]))/, "sa"],
  [/^(chh|ch|c(?=h))/, "cha"],
  [/^kh/, "kha"],
  [/^(k|c|q|x)/, "ka"],
  [/^(gh|g)/, "ga"],
  [/^(jh|j)/, "ja"],
  [/^bh/, "bha"],
  [/^(b|v|w)/, "va"],
  [/^(ph|p|f)/, "pa"],
  [/^(th|t)/, "ta"],
  [/^(dh|d)/, "da"],
  [/^(n)/, "na"],
  [/^(m)/, "ma"],
  [/^(y)/, "ya"],
  [/^(r)/, "ra"],
  [/^(l)/, "la"],
  [/^(h)/, "ha"],
  [/^(aa|ā)/, "ā"],
  [/^(ai)/, "ai"],
  [/^(au)/, "au"],
  [/^(a)/, "a"],
  [/^(ee|ii|ī)/, "ī"],
  [/^(i)/, "i"],
  [/^(oo|uu|ū)/, "ū"],
  [/^(u)/, "u"],
  [/^(e)/, "e"],
  [/^(o)/, "o"],
];
/** Every sound a name can be set to: the twenty consonants and the plain vowels. */
export const NAME_SOUNDS = [...CONSONANTS.slice(1), "a", "ā", "i", "ī", "u", "ū", "e", "ai", "o", "au"];

export function nameSound(name: string): string | null {
  const s = name.trim().toLowerCase();
  if (!s) return null;
  for (const [re, sound] of SOUND_MAP) if (re.test(s)) return sound;
  return null;
}

function soundCell(sound: string | null): Cell | null {
  if (!sound) return null;
  // The consonant ring holds an "a" of its own (Krittika's); a name beginning with a vowel is read from the vowel cells.
  for (const row of BOARD) for (const c of row) if (c.kind === "consonant" && c.index > 0 && c.label === sound) return c;
  for (const row of BOARD) for (const c of row) if (c.kind === "vowel" && c.label === sound) return c;
  return null;
}
const findCell = (kind: CellKind, index: number) => {
  for (const row of BOARD) for (const c of row) if (c.kind === kind && c.index === index) return c;
  return null;
};

export function natalPoints(n: Natal): NatalPoint[] {
  const star = boardStar(n.positions.Mo);
  const group = (n.tithi % 15) % 5;
  const weekday = frameContaining(n.birth, n.profile.birthPlace).weekday;
  const dayGroup = TITHI_GROUPS.findIndex((g) => g.days.includes(weekday));
  const sound = n.profile.nameSound ?? nameSound(n.profile.name);
  const pts: NatalPoint[] = [
    { key: "star", label: "Birth star", value: starName(star), cell: STAR_CELL[star], area: "body, health and state of mind" },
    { key: "rasi", label: "Rasi", value: RASI[n.moonSign].ta, cell: findCell("sign", n.moonSign), area: "plans meeting obstacles" },
    { key: "tithi", label: "Birth tithi", value: `${TITHI_GROUPS[group].name} (${TITHI_GROUPS[group].tithis})`, cell: findCell("tithi", group), area: "nerves and confidence" },
    { key: "weekday", label: "Birth weekday", value: WEEKDAYS[weekday], cell: findCell("tithi", dayGroup), area: "day-to-day ease" },
    { key: "name", label: "Name sound", value: sound ?? "not set", cell: soundCell(sound), area: "money, name and standing" },
  ];
  if (n.profile.timeConfirmed) pts.splice(2, 0, { key: "lagna", label: "Lagna", value: RASI[n.lagnaSign].ta, cell: findCell("sign", n.lagnaSign), area: "your own direction and vitality" });
  return pts;
}

// ---- Transit over the board -----------------------------------------------------------------------

/** Average daily motion, used to call a planet fast or ordinary. */
const MEAN_MOTION: Partial<Record<PlanetId, number>> = { Ma: 0.524, Me: 0.986, Ju: 0.083, Ve: 0.986, Sa: 0.033 };

export interface Thrower {
  planet: PlanetId;
  star: number;
  malefic: boolean;
  retro: boolean;
  /** How hard it strikes: 1 ordinarily, more when retrograde or exalted, less when debilitated. */
  force: number;
  lines: LineKind[];
  cells: { cell: Cell; line: LineKind }[];
}

export interface Hit {
  point: NatalPoint;
  planet: PlanetId;
  line: LineKind;
  malefic: boolean;
  force: number;
}

export type SbcWord = "Clear" | "Lighter" | "Usual" | "Heavier";

export interface SbcReading {
  school: SbcSchool;
  points: NatalPoint[];
  throwers: Thrower[];
  hits: Hit[];
  /** Distinct birth points pierced by at least one malefic. */
  pierced: number;
  supported: number;
  /** Weighted pressure, and where it stands in your own year. */
  score: SbcScore;
  baseline: SbcBaseline;
  word: SbcWord;
  summary: string;
}

const SLOW: PlanetId[] = ["Ju", "Sa", "Ra", "Ke"];

/**
 * Where each planet's lines fall. `tithi` (0..29) is the running tithi, which decides whether the
 * Moon counts as a malefic: it does from Theipirai Ekadasi to Valarpirai Chaturthi.
 */
export function throwers(pos: Positions, t: Date, tithi: number, school: SbcSchool = DEFAULT_SCHOOL, only?: PlanetId[]): Thrower[] {
  const hard: PlanetId[] = ["Su", "Ma", "Sa", "Ra", "Ke"];
  const out: Thrower[] = [];
  for (const p of only ?? PLANETS) {
    const star = boardStar(pos[p]);
    const sign = signOf(pos[p]);
    const node = p === "Ra" || p === "Ke";
    const motion = node || p === "Su" || p === "Mo" ? 0 : dailyMotion(p, t);
    const retro = node || motion < 0;
    let malefic: boolean;
    if (p === "Mo") malefic = !(tithi >= 4 && tithi <= 24);
    else if (p === "Me") malefic = hard.some((h) => signOf(pos[h]) === sign);
    else malefic = hard.includes(p);
    let lines: LineKind[];
    if (school === "all") lines = ["front", "fore", "hind"];
    else if (p === "Su" || p === "Mo") lines = ["fore"];
    else if (retro) lines = ["hind"];
    else lines = [motion > (MEAN_MOTION[p] ?? 0) * 1.15 ? "fore" : "front"];
    const force = (retro && !node ? 1.5 : 1) * (exalted(p, sign) ? 1.5 : debilitated(p, sign) ? 0.5 : 1);
    const all = vedhaLines(star);
    const cells = lines.flatMap((line) => all[line].map((cell) => ({ cell, line })));
    out.push({ planet: p, star, malefic, retro, force, lines, cells });
  }
  return out;
}

export function hitsOn(points: NatalPoint[], list: Thrower[]): Hit[] {
  const out: Hit[] = [];
  for (const th of list)
    for (const pt of points) {
      if (!pt.cell) continue;
      // A planet sitting in the birth star itself pierces it too.
      const own = pt.key === "star" && pt.cell.index === th.star;
      const found = own ? { line: "front" as LineKind } : th.cells.find((c) => c.cell === pt.cell);
      if (found) out.push({ point: pt, planet: th.planet, line: found.line, malefic: th.malefic, force: th.force });
    }
  return out;
}

export function sbcReading(n: Natal, pos: Positions, t: Date, tithi: number, school: SbcSchool = n.profile.sbcSchool ?? DEFAULT_SCHOOL): SbcReading {
  const points = natalPoints(n);
  const list = throwers(pos, t, tithi, school);
  const hits = hitsOn(points, list);
  const piercedKeys = new Set(hits.filter((h) => h.malefic).map((h) => h.point.key));
  const supportedKeys = new Set(hits.filter((h) => !h.malefic).map((h) => h.point.key));
  const pierced = piercedKeys.size;
  const score = sbcScore(hits);
  const baseline = sbcBaseline(n, t, school);
  const word = sbcWord(score.value, pierced, baseline);
  const names = (keys: Set<PointKey>) => points.filter((p) => keys.has(p.key)).map((p) => p.label.toLowerCase()).join(", ");
  const versus = word === "Heavier" ? "That is heavier than three days in four of your year: keep to routine in those areas and take no avoidable risk." : word === "Usual" ? "That is about your usual load this year." : "That is lighter than three days in four of your year.";
  const summary =
    pierced === 0
      ? `No malefic line touches your birth points${supportedKeys.size ? `, and benefics support your ${names(supportedKeys)}` : ""}.`
      : `Malefics pierce ${pierced} of your ${points.length} birth points (${names(piercedKeys)})${supportedKeys.size ? `; benefics support your ${names(supportedKeys)}` : ""}. ${versus}`;
  return { school, points, throwers: list, hits, pierced, supported: supportedKeys.size, score, baseline, word, summary };
}

export function sbcWord(value: number, pierced: number, b: SbcBaseline): SbcWord {
  if (pierced === 0) return "Clear";
  if (value <= b.q25 && value < b.q75) return "Heavier";
  if (value >= b.q75) return "Lighter";
  return "Usual";
}

// ---- A number for the daily score -----------------------------------------------------------------

const POINT_WEIGHT: Record<PointKey, number> = { star: 2.2, rasi: 1.4, lagna: 1.2, tithi: 1, weekday: 0.8, name: 1.2 };

export interface SbcScore {
  value: number; // about -8..+4
  bad: Hit[];
  good: Hit[];
}

/**
 * Weighs a set of hits. The slow planets (Guru, Sani, Rahu, Ketu) stay on one star for weeks,
 * so they count at half: they set the background, while the Sun, Moon, Sevvai, Budhan and
 * Sukran grade the day.
 */
export function sbcScore(hits: Hit[]): SbcScore {
  let value = 0;
  const bad: Hit[] = [];
  const good: Hit[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    const id = `${h.planet}-${h.point.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const w = POINT_WEIGHT[h.point.key] * (SLOW.includes(h.planet) ? 0.5 : 1) * Math.min(1.5, h.force);
    if (h.malefic) { value -= w; bad.push(h); }
    else { value += w * 0.6; good.push(h); }
  }
  return { value: Math.max(-8, Math.min(4, value)), bad, good };
}

export const describeHit = (h: Hit) => `${PLANET_INFO[h.planet].ta} on your ${h.point.label.toLowerCase()}`;

// ---- Your own year as the yardstick ---------------------------------------------------------------

export interface SbcBaseline {
  q25: number;
  median: number;
  q75: number;
}

const baselines = new WeakMap<Natal, Map<string, SbcBaseline>>();

/** Quartiles of the pressure score over the twelve months around `t`, sampled every three days. */
export function sbcBaseline(n: Natal, t: Date, school: SbcSchool = n.profile.sbcSchool ?? DEFAULT_SCHOOL): SbcBaseline {
  // One yardstick per two-month block, so it is not rebuilt as the days pass.
  const block = Math.floor(t.getTime() / (61 * MS_DAY));
  const key = `${school}|${block}|${n.profile.nameSound ?? ""}`;
  let byKey = baselines.get(n);
  if (!byKey) baselines.set(n, (byKey = new Map()));
  const hit = byKey.get(key);
  if (hit) return hit;
  const points = natalPoints(n);
  const centre = (block + 0.5) * 61 * MS_DAY;
  const values: number[] = [];
  for (let i = -61; i <= 61; i++) {
    // An odd number of hours between samples so the Moon is caught at every part of the day.
    const at = new Date(centre + i * 3 * MS_DAY + (i % 8) * 3 * 3600000);
    values.push(sbcScore(hitsOn(points, throwers(allPositions(at), at, tithiIndex(at), school))).value);
  }
  values.sort((a, b) => a - b);
  const q = (f: number) => values[Math.min(values.length - 1, Math.floor(values.length * f))];
  const out = { q25: q(0.25), median: q(0.5), q75: q(0.75) };
  byKey.set(key, out);
  return out;
}
