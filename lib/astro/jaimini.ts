// Jaimini: a second opinion that reads signs rather than planets.
//
//   Chara karakas  The seven planets ranked by degree within their signs. The highest is the
//                  atmakaraka (the self), then amatyakaraka (career), bhratrukaraka (siblings,
//                  mentors), matrukaraka (mother, home), putrakaraka (children, learning),
//                  gnatikaraka (rivals, obstacles) and darakaraka (spouse).
//   Rasi drishti   Signs look at signs: a movable sign sees the fixed signs except the one next
//                  to it; a fixed sign sees the movable signs except the one next to it; dual
//                  signs see each other. A planet shares the sight of the sign it sits in.
//   Arudha pada    The image a house throws: count from the house to its lord, and the same
//                  again from the lord. If that lands on the house itself, take the 10th from
//                  it; if on the 7th from the house, take the 4th. The arudha of the 1st is the
//                  arudha lagna (how the world sees you); that of the 12th is the upapada (spouse).
//   Chara dasa     Periods belong to signs and last one to twelve years.
//
// Chara dasa is worked here the way K. N. Rao teaches it, the version most widely used:
//   - The first dasa is the lagna sign. The order runs forward through the zodiac when the
//     9th from the lagna is Mesham, Rishabam, Mithunam, Thulam, Viruchigam or Dhanusu, and
//     backward otherwise.
//   - Length: count from the sign to the sign holding its lord, forward for those six signs
//     and backward for the other six, and take one less. A lord in its own sign gives twelve.
//   - Viruchigam is co-ruled by Sevvai and Ketu, Kumbam by Sani and Rahu. If one of the two is
//     in the sign, count to the other; if both are in it, twelve years; otherwise count to the
//     stronger: the one joined by more planets, then the one in a dual over a fixed over a
//     movable sign, then the one giving more years.
//   - Sub-periods: twelve equal parts, in the same direction as the dasas, beginning with the
//     sign after the dasa sign and ending with the dasa sign itself.
// Other teachers (Raghava Bhatta, Nilakantha, P. V. R. Narasimha Rao) differ on several of
// these points, which is why this is offered as a cross-check and not as a verdict.

import { houseTopic, Natal, ordinal } from "./chart";
import { houseFrom, PLANET_INFO, PlanetId, PLANETS, RASI, signOf } from "./constants";
import { MS_DAY } from "./time";
import { navamsaSign } from "./vargas";

const NAME = (p: PlanetId) => PLANET_INFO[p].ta;
const YEAR_MS = 365.25 * MS_DAY;
const SEVEN: PlanetId[] = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa"];

// ---- Chara karakas ------------------------------------------------------------------------------

export type KarakaKey = "AK" | "AmK" | "BK" | "MK" | "PK" | "GK" | "DK";
export const KARAKA_ORDER: KarakaKey[] = ["AK", "AmK", "BK", "MK", "PK", "GK", "DK"];
export const KARAKA_INFO: Record<KarakaKey, { name: string; stands: string }> = {
  AK: { name: "Atmakaraka", stands: "the self and its deepest aim" },
  AmK: { name: "Amatyakaraka", stands: "career, the one who carries out the aim" },
  BK: { name: "Bhratrukaraka", stands: "siblings, teachers and guides" },
  MK: { name: "Matrukaraka", stands: "mother, home and schooling" },
  PK: { name: "Putrakaraka", stands: "children, students and creative work" },
  GK: { name: "Gnatikaraka", stands: "rivals, illness and obstacles" },
  DK: { name: "Darakaraka", stands: "spouse and close partners" },
};

export interface Karaka {
  key: KarakaKey;
  planet: PlanetId;
  degree: number;
  sign: number;
  navamsa: number;
}

export function charaKarakas(n: Natal): Record<KarakaKey, Karaka> {
  const ranked = [...SEVEN].sort((a, b) => (n.positions[b] % 30) - (n.positions[a] % 30));
  const out = {} as Record<KarakaKey, Karaka>;
  KARAKA_ORDER.forEach((key, i) => {
    const planet = ranked[i];
    out[key] = { key, planet, degree: n.positions[planet] % 30, sign: signOf(n.positions[planet]), navamsa: navamsaSign(n.positions[planet]) };
  });
  return out;
}

// ---- Rasi drishti -------------------------------------------------------------------------------

/** 0 movable, 1 fixed, 2 dual. */
export const modality = (sign: number) => sign % 3;

/** True if `from` looks at `to` by sign aspect. */
export function rasiSees(from: number, to: number): boolean {
  if (from === to) return false;
  const a = modality(from);
  const b = modality(to);
  if (a === 2) return b === 2;
  if (a === 0) return b === 1 && to !== (from + 1) % 12;
  return b === 0 && to !== (from + 11) % 12;
}

// ---- Arudha padas -------------------------------------------------------------------------------

export interface Arudha {
  house: number;
  sign: number;
  lord: PlanetId;
  /** Set when one of the two exceptions moved the pada. */
  moved: boolean;
}

export const ARUDHA_NAME: Record<number, string> = {
  1: "Arudha lagna (AL): how the world sees you",
  2: "Dhana pada (A2): the look of your wealth",
  3: "Vikrama pada (A3): visible effort and skill",
  4: "Matru pada (A4): home, vehicles, property seen",
  5: "Mantra pada (A5): following, students, repute for judgement",
  6: "Shatru pada (A6): visible rivals and service",
  7: "Dara pada (A7): partners and dealings",
  8: "Mrityu pada (A8): reverses that show",
  9: "Bhagya pada (A9): visible luck and patrons",
  10: "Rajya pada (A10): the standing of your work",
  11: "Labha pada (A11): visible gains",
  12: "Upapada (UL): the spouse and the marriage itself",
};

export function arudhaPadas(n: Natal): Arudha[] {
  const out: Arudha[] = [];
  for (let h = 1; h <= 12; h++) {
    const houseSign = (n.lagnaSign + h - 1) % 12;
    const lord = RASI[houseSign].lord;
    const lordSign = signOf(n.positions[lord]);
    const count = (lordSign - houseSign + 12) % 12;
    let sign = (lordSign + count) % 12;
    let moved = false;
    const back = houseFrom(houseSign, sign);
    if (back === 1) { sign = (houseSign + 9) % 12; moved = true; }
    else if (back === 7) { sign = (houseSign + 3) % 12; moved = true; }
    out.push({ house: h, sign, lord, moved });
  }
  return out;
}

// ---- Chara dasa ---------------------------------------------------------------------------------

const FORWARD_SIGNS = [0, 1, 2, 6, 7, 8];
const isForward = (sign: number) => FORWARD_SIGNS.includes(sign);

function countTo(sign: number, lordSign: number): number {
  // Counting includes both ends; the years are one less.
  const steps = isForward(sign) ? (lordSign - sign + 12) % 12 : (sign - lordSign + 12) % 12;
  return steps === 0 ? 12 : steps;
}

function dasaLord(n: Natal, sign: number): { lord: PlanetId; years: number; note: string } {
  const pair: [PlanetId, PlanetId] | null = sign === 7 ? ["Ma", "Ke"] : sign === 10 ? ["Sa", "Ra"] : null;
  const where = (p: PlanetId) => signOf(n.positions[p]);
  if (!pair) {
    const lord = RASI[sign].lord;
    const years = countTo(sign, where(lord));
    return { lord, years, note: where(lord) === sign ? `${NAME(lord)} is in its own sign, which gives the full twelve` : `counted ${isForward(sign) ? "forward" : "backward"} to ${NAME(lord)} in ${RASI[where(lord)].ta}` };
  }
  const [a, b] = pair;
  const inA = where(a) === sign;
  const inB = where(b) === sign;
  if (inA && inB) return { lord: a, years: 12, note: `both lords, ${NAME(a)} and ${NAME(b)}, are in the sign, which gives the full twelve` };
  if (inA) return { lord: b, years: countTo(sign, where(b)), note: `${NAME(a)} is in the sign itself, so the count goes to its co-lord ${NAME(b)} in ${RASI[where(b)].ta}` };
  if (inB) return { lord: a, years: countTo(sign, where(a)), note: `${NAME(b)} is in the sign itself, so the count goes to its co-lord ${NAME(a)} in ${RASI[where(a)].ta}` };
  const company = (p: PlanetId) => PLANETS.filter((q) => q !== p && where(q) === where(p)).length;
  const rank = (p: PlanetId) => [company(p), [0, 1, 2][modality(where(p))], countTo(sign, where(p))];
  const ra = rank(a);
  const rb = rank(b);
  let pick = a;
  let reason = "";
  for (let i = 0; i < 3; i++) {
    if (ra[i] !== rb[i]) {
      pick = ra[i] > rb[i] ? a : b;
      reason = ["it is joined by more planets", "it is in the stronger kind of sign", "it gives the longer count"][i];
      break;
    }
  }
  const other = pick === a ? b : a;
  return { lord: pick, years: countTo(sign, where(pick)), note: `of the co-lords ${NAME(a)} and ${NAME(b)}, ${NAME(pick)} is taken${reason ? ` because ${reason}` : ""} (not ${NAME(other)}); counted ${isForward(sign) ? "forward" : "backward"} to ${RASI[where(pick)].ta}` };
}

export interface CharaPeriod {
  sign: number;
  start: Date;
  end: Date;
  years: number;
  lord: PlanetId;
  note: string;
  cycle: 1 | 2;
}

export interface CharaDasa {
  forward: boolean;
  periods: CharaPeriod[];
}

export function charaDasa(n: Natal): CharaDasa {
  const forward = isForward((n.lagnaSign + 8) % 12);
  const periods: CharaPeriod[] = [];
  let at = n.birth.getTime();
  for (const cycle of [1, 2] as const) {
    for (let i = 0; i < 12; i++) {
      const sign = (n.lagnaSign + (forward ? i : 12 - i)) % 12;
      const d = dasaLord(n, sign);
      // In the second round each sign gets what is left of twelve.
      const years = cycle === 1 ? d.years : 12 - d.years;
      if (years <= 0) continue;
      const end = at + years * YEAR_MS;
      periods.push({ sign, start: new Date(at), end: new Date(end), years, lord: d.lord, note: d.note, cycle });
      at = end;
    }
  }
  return { forward, periods };
}

export interface CharaSub {
  sign: number;
  start: Date;
  end: Date;
}

export function charaSubs(d: CharaDasa, p: CharaPeriod): CharaSub[] {
  const len = (p.end.getTime() - p.start.getTime()) / 12;
  const out: CharaSub[] = [];
  for (let i = 1; i <= 12; i++) {
    const sign = (p.sign + (d.forward ? i : 12 - i) + 12) % 12;
    out.push({ sign, start: new Date(p.start.getTime() + (i - 1) * len), end: new Date(p.start.getTime() + i * len) });
  }
  return out;
}

export function charaAt(d: CharaDasa, t: Date): { dasa: CharaPeriod; sub: CharaSub } | null {
  const dasa = d.periods.find((p) => t >= p.start && t < p.end);
  if (!dasa) return null;
  const sub = charaSubs(d, dasa).find((s) => t >= s.start && t < s.end)!;
  return { dasa, sub };
}

// ---- The whole picture ----------------------------------------------------------------------------

export interface Jaimini {
  karakas: Record<KarakaKey, Karaka>;
  /** Karaka role of each of the seven planets. */
  roleOf: Partial<Record<PlanetId, KarakaKey>>;
  karakamsa: number; // navamsa sign of the atmakaraka
  padas: Arudha[];
  al: number;
  ul: number;
  dasa: CharaDasa;
}

const cache = new WeakMap<Natal, Jaimini>();

export function jaimini(n: Natal): Jaimini {
  const hit = cache.get(n);
  if (hit) return hit;
  const karakas = charaKarakas(n);
  const roleOf: Partial<Record<PlanetId, KarakaKey>> = {};
  for (const k of KARAKA_ORDER) roleOf[karakas[k].planet] = k;
  const padas = arudhaPadas(n);
  const j: Jaimini = { karakas, roleOf, karakamsa: karakas.AK.navamsa, padas, al: padas[0].sign, ul: padas[11].sign, dasa: charaDasa(n) };
  cache.set(n, j);
  return j;
}

/** Planets in a sign, and planets whose signs look at it. */
export function signLinks(n: Natal, sign: number): { inside: PlanetId[]; seeing: PlanetId[] } {
  const inside = PLANETS.filter((p) => signOf(n.positions[p]) === sign);
  const seeing = PLANETS.filter((p) => rasiSees(signOf(n.positions[p]), sign));
  return { inside, seeing };
}

// ---- Does a chara period back a topic? -----------------------------------------------------------

export type Topic = "career" | "marriage";
export interface Support {
  score: number;
  level: "strong" | "some" | "silent";
  reasons: string[];
}

/** Points a single sign earns for a topic, with the reasons in words. */
function signSupport(n: Natal, j: Jaimini, sign: number, topic: Topic, role: "dasa" | "sub-period"): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const add = (w: number, text: string) => { score += w; reasons.push(`${RASI[sign].ta} ${role}: ${text}`); };
  const { inside, seeing } = signLinks(n, sign);
  const has = (p: PlanetId) => inside.includes(p);
  const sees = (p: PlanetId) => seeing.includes(p);
  const tenth = (sign + 9) % 12;
  const seventh = (sign + 6) % 12;
  const at = (target: number) => signLinks(n, target);

  if (topic === "career") {
    const amk = j.karakas.AmK.planet;
    const ak = j.karakas.AK.planet;
    if (has(amk)) add(2, `it holds your amatyakaraka ${NAME(amk)}`);
    else if (sees(amk)) add(1, `your amatyakaraka ${NAME(amk)} looks at it`);
    if (has(ak)) add(1, `it holds your atmakaraka ${NAME(ak)}`);
    if (sign === (n.lagnaSign + 9) % 12) add(1.5, "it is your 10th house");
    if (sign === j.padas[9].sign) add(1.5, "it is your rajya pada (A10)");
    if (sign === j.al) add(1, "it is your arudha lagna");
    const t10 = at(tenth);
    if (t10.inside.includes(amk) || t10.inside.includes(ak)) add(1.5, `the 10th from it (${RASI[tenth].ta}) holds ${t10.inside.includes(amk) ? "the amatyakaraka" : "the atmakaraka"}`);
    else if (t10.seeing.includes(amk)) add(0.75, `the amatyakaraka looks at the 10th from it (${RASI[tenth].ta})`);
    if (sign === (n.lagnaSign + 10) % 12) add(0.75, "it is your 11th house of gains");
    const gk = j.karakas.GK.planet;
    if (has(gk)) { score -= 0.75; reasons.push(`${RASI[sign].ta} ${role}: it also holds the gnatikaraka ${NAME(gk)}, which brings competition`); }
  } else {
    const dk = j.karakas.DK.planet;
    if (has(dk)) add(2, `it holds your darakaraka ${NAME(dk)}`);
    else if (sees(dk)) add(1, `your darakaraka ${NAME(dk)} looks at it`);
    if (sign === j.karakas.DK.navamsa) add(1.5, `it is the navamsa sign of your darakaraka ${NAME(dk)}`);
    if (sign === j.ul) add(1.5, "it is your upapada (UL)");
    if (sign === (j.ul + 6) % 12) add(0.75, "it is the 7th from your upapada");
    if (sign === (n.lagnaSign + 6) % 12) add(1.5, "it is your 7th house");
    if (sign === j.padas[6].sign) add(1, "it is your dara pada (A7)");
    if (has("Ve")) add(0.75, "Sukran sits in it");
    const t7 = at(seventh);
    if (t7.inside.includes(dk)) add(1.5, `the 7th from it (${RASI[seventh].ta}) holds the darakaraka`);
    else if (t7.seeing.includes(dk)) add(0.5, `the darakaraka looks at the 7th from it (${RASI[seventh].ta})`);
  }
  return { score, reasons };
}

export function charaSupport(n: Natal, j: Jaimini, t: Date, topic: Topic): (Support & { dasa: CharaPeriod; sub: CharaSub }) | null {
  const run = charaAt(j.dasa, t);
  if (!run) return null;
  const a = signSupport(n, j, run.dasa.sign, topic, "dasa");
  const b = run.sub.sign === run.dasa.sign ? { score: a.score * 0.5, reasons: ["The sub-period is the dasa sign's own, which repeats its message"] } : signSupport(n, j, run.sub.sign, topic, "sub-period");
  // The sub-period dates the event inside the dasa, so it counts in full; the dasa sets the ground.
  const score = a.score * 0.75 + b.score;
  const level: Support["level"] = score >= 3 ? "strong" : score >= 1.5 ? "some" : "silent";
  return { score: Math.round(score * 100) / 100, level, reasons: [...a.reasons, ...b.reasons], dasa: run.dasa, sub: run.sub };
}

/** A short reading of what a dasa sign brings forward. */
export function dasaReading(n: Natal, j: Jaimini, sign: number): string {
  const { inside, seeing } = signLinks(n, sign);
  const h = houseFrom(n.lagnaSign, sign);
  const hal = houseFrom(j.al, sign);
  const bits: string[] = [`Your ${ordinal(h)} house (${houseTopic(h)}), the ${ordinal(hal)} from the arudha lagna.`];
  const tag = (p: PlanetId) => (j.roleOf[p] ? `${NAME(p)} (${j.roleOf[p]})` : NAME(p));
  if (inside.length) bits.push(`Holds ${inside.map(tag).join(", ")}.`);
  if (seeing.length) bits.push(`Seen by ${seeing.map(tag).join(", ")}.`);
  const padas = j.padas.filter((p) => p.sign === sign).map((p) => (p.house === 1 ? "AL" : p.house === 12 ? "UL" : `A${p.house}`));
  if (padas.length) bits.push(`Carries ${padas.join(", ")}.`);
  if (sign === j.karakamsa) bits.push("It is your karakamsa.");
  return bits.join(" ");
}

// ---- Cross-check of a window found by the Vimshottari engines --------------------------------------

export interface CrossCheck {
  verdict: "agrees" | "partly" | "silent";
  /** Share of the window, 0..1, in which the chara periods back the topic at all. */
  share: number;
  /** The chara periods that fall in the window, strongest first. */
  spans: { dasa: number; sub: number; start: Date; end: Date; level: Support["level"]; score: number; reasons: string[] }[];
}

export function crossCheck(n: Natal, j: Jaimini, start: Date, end: Date, topic: Topic): CrossCheck {
  const spans: CrossCheck["spans"] = [];
  const step = 10 * MS_DAY;
  let backed = 0;
  let total = 0;
  for (let t = start.getTime(); t < end.getTime(); t += step) {
    const s = charaSupport(n, j, new Date(t), topic);
    if (!s) continue;
    total++;
    if (s.level !== "silent") backed++;
    const last = spans[spans.length - 1];
    if (last && last.dasa === s.dasa.sign && last.sub === s.sub.sign) continue;
    spans.push({
      dasa: s.dasa.sign,
      sub: s.sub.sign,
      start: new Date(Math.max(start.getTime(), s.sub.start.getTime())),
      end: new Date(Math.min(end.getTime(), s.sub.end.getTime())),
      level: s.level,
      score: s.score,
      reasons: s.reasons,
    });
  }
  const share = total ? backed / total : 0;
  const strong = spans.some((s) => s.level === "strong");
  const verdict: CrossCheck["verdict"] = (strong && share >= 0.34) || share >= 0.75 ? "agrees" : share > 0 ? "partly" : "silent";
  return { verdict, share, spans: [...spans].sort((a, b) => b.score - a.score) };
}
