// Velinaadu: foreign travel.
//
// Three layers, as the tradition reads it:
//   1. Promise: does the birth chart point abroad at all? The 12th house (foreign lands),
//      the 9th (long journeys), the 3rd (short trips), the 7th (business and partners), Rahu
//      (the significator of everything foreign), movable and watery signs, the lagna lord's
//      tie to the 12th lord, and the 4th house (leaving home).
//   2. Timing: the periods of the planets tied to those houses (and of Rahu), sharpened when
//      Rahu, Guru or Sani cross or look at the 9th and 12th. A window counts as high only when
//      a supportive period and a supportive transit fall together.
//   3. The day: the classical rules for setting out (tara, the Moon's star, the weekday's
//      blocked direction).
// These give windows in which travel is more likely by tradition. They do not give flight dates.

import { atmakaraka } from "./vargas";
import { houseTopic, Natal, ordinal } from "./chart";
import { BAD_YOGAS, DASHA_ORDER, houseFrom, nakOf, NAKSHATRA, PLANET_INFO, PlanetId, PLANETS, RASI, signOf, WEEKDAYS } from "./constants";
import { RunningDasha, runningDasha } from "./dasha";
import { aspects } from "./dignity";
import { siderealLongitude } from "./ephemeris";
import { DayFrame, dayFrame, panchangFor, Place, spanAt } from "./panchang";
import { addDaysKey, MS_DAY } from "./time";
import { chandraBala, taraBala } from "./transits";
import { Varshaphal, varshaphal } from "./varsha";
import { charaAt, jaimini } from "./jaimini";

export type Purpose = "work" | "leisure" | "stay";
export type Tone3 = "good" | "bad" | "neutral";

export interface TravelLine {
  title: string;
  detail: string;
  tone: Tone3;
}

export interface TravelPlanet {
  planet: PlanetId;
  weight: number;
  reasons: string[];
  purposes: Purpose[];
}

export type PromiseWord = "Strong" | "Good" | "Moderate" | "Low";

export interface TravelPromise {
  score: number;
  word: PromiseWord;
  summary: string;
  lines: TravelLine[];
  /** 0..100 each. */
  purposes: Record<Purpose, number>;
  planets: Record<PlanetId, TravelPlanet>;
}

const MOVABLE = [0, 3, 6, 9];
const FIXED = [1, 4, 7, 10];
const WATERY = [3, 7, 11];
/** Kaatru rasi. Classical texts read water signs as sea voyages; air signs as journeys by air is a modern reading. */
const AIRY = [2, 6, 10];
const NAME = (p: PlanetId) => PLANET_INFO[p].ta;
/** The lord of the star a longitude falls in: a planet gives the results of its star lord. */
export const starLordOf = (lon: number): PlanetId => DASHA_ORDER[nakOf(lon) % 9];

/** Sara (movable), sthira (fixed) or ubhaya (dual), and the element where it bears on travel. */
export function signNature(sign: number): string {
  const kind = MOVABLE.includes(sign) ? "movable (sara)" : FIXED.includes(sign) ? "fixed (sthira)" : "dual (ubhaya)";
  const el = WATERY.includes(sign) ? ", a water sign (neer rasi)" : AIRY.includes(sign) ? ", an air sign (kaatru rasi)" : "";
  return `${kind}${el}`;
}
const KENDRA = [1, 4, 7, 10];
const TRINE = [5, 9];

export function travelPromise(n: Natal): TravelPromise {
  const pos = n.positions;
  const s = (p: PlanetId) => signOf(pos[p]);
  const h = (p: PlanetId) => n.house[p];
  const lines: TravelLine[] = [];
  let score = 0;
  const purpose: Record<Purpose, number> = { work: 0, leisure: 0, stay: 0 };
  const planets = {} as Record<PlanetId, TravelPlanet>;
  for (const p of PLANETS) planets[p] = { planet: p, weight: 0, reasons: [], purposes: [] };
  // Reasons are kept with their weight so each planet's strongest tie is listed first.
  const why = new Map<PlanetId, { w: number; r: string }[]>(PLANETS.map((p) => [p, []]));
  const mark = (p: PlanetId, w: number, reason: string, ...pu: Purpose[]) => {
    planets[p].weight += w;
    why.get(p)!.push({ w, r: reason });
    for (const x of pu) if (!planets[p].purposes.includes(x)) planets[p].purposes.push(x);
  };
  const add = (w: number, title: string, detail: string, pu: Partial<Record<Purpose, number>> = {}) => {
    score += w;
    lines.push({ title, detail, tone: w > 0 ? "good" : w < 0 ? "bad" : "neutral" });
    for (const k of Object.keys(pu) as Purpose[]) purpose[k] += pu[k]!;
  };
  const linked = (a: PlanetId, b: PlanetId): string | null => {
    if (a === b) return "the same planet";
    if (s(a) === s(b)) return "together in one sign";
    if (RASI[s(a)].lord === b && RASI[s(b)].lord === a) return "exchanging signs";
    if (aspects(a, s(a), s(b)) && aspects(b, s(b), s(a))) return "looking at each other";
    if (aspects(a, s(a), s(b))) return `${NAME(a)} looks at ${NAME(b)}`;
    if (aspects(b, s(b), s(a))) return `${NAME(b)} looks at ${NAME(a)}`;
    return null;
  };

  const L1 = n.lordOf(1), L3 = n.lordOf(3), L4 = n.lordOf(4), L5 = n.lordOf(5), L6 = n.lordOf(6), L7 = n.lordOf(7), L9 = n.lordOf(9), L10 = n.lordOf(10), L12 = n.lordOf(12);
  const sign12 = (n.lagnaSign + 11) % 12;
  const sign10 = (n.lagnaSign + 9) % 12;

  // 1. Movable and watery signs.
  const movers = PLANETS.filter((p) => MOVABLE.includes(s(p)));
  const lagnaMovable = MOVABLE.includes(n.lagnaSign);
  const count = movers.length + (lagnaMovable ? 1 : 0);
  if (count >= 5) add(2, `${movers.length} of 9 planets in movable signs`, `${movers.map(NAME).join(", ")}${lagnaMovable ? ", and your lagna itself," : ""} are in movable signs (Mesham, Kadagam, Thulam, Makaram). A chart weighted this way belongs to someone who does not stay put.`, { leisure: 8, work: 8 });
  else if (count >= 3) add(1, `${movers.length} planets in movable signs`, `${movers.map(NAME).join(", ")}${lagnaMovable ? " and your lagna" : ""} are in movable signs, a moderate pull towards travel.`, { leisure: 5, work: 5 });
  else add(0, "Few planets in movable signs", "Most of your planets are in fixed or dual signs, so movement comes from the houses and periods below, not from temperament.");

  // 2. Rahu, the significator of the foreign.
  const rh = h("Ra");
  if ([1, 3, 4, 7, 9, 12].includes(rh)) {
    const why: Record<number, string> = {
      1: "in the lagna: you are drawn to the foreign yourself",
      3: "in the 3rd: many short journeys",
      4: "in the 4th: pulled away from the birthplace",
      7: "in the 7th: foreign partners, clients and business ties, and travel that comes through other people",
      9: "in the 9th: long journeys and fortune far from home",
      12: "in the 12th: the classic placement for life abroad",
    };
    const strong = [7, 9, 12, 1].includes(rh);
    const best = MOVABLE.includes(s("Ra")) && WATERY.includes(s("Ra"));
    add(strong ? 2 : 1.5, `Rahu in your ${ordinal(rh)} house`, `Rahu is the significator of everything foreign, and it sits ${why[rh]}.${best ? ` It is in ${RASI[s("Ra")].ta}, both movable and watery, the strongest sign of all for crossing the sea.` : MOVABLE.includes(s("Ra")) || WATERY.includes(s("Ra")) ? ` ${RASI[s("Ra")].ta} is a ${MOVABLE.includes(s("Ra")) ? "movable" : "watery"} sign, which adds to it.` : ""}`, rh === 7 ? { work: 14, leisure: 4 } : rh === 12 || rh === 4 ? { stay: 16 } : rh === 3 ? { leisure: 10 } : { work: 6, leisure: 6, stay: 6 });
    if (best) score += 0.5;
    mark("Ra", 3 + (strong ? 0.5 : 0), `significator of foreign lands, in your ${ordinal(rh)}`, rh === 7 ? "work" : rh === 12 || rh === 4 ? "stay" : "leisure");
  } else {
    add(0, `Rahu in your ${ordinal(rh)} house`, "Rahu is not in one of the houses that point abroad, so it helps mainly in its own periods and transits.");
    mark("Ra", 2, "significator of foreign lands");
  }
  // Rahu's sign lord carries Rahu's results.
  const rahuLord = RASI[s("Ra")].lord;
  mark(rahuLord, 1, "lord of the sign Rahu sits in");

  // 3. The 12th house and its lord.
  const in12 = PLANETS.filter((p) => h(p) === 12);
  for (const p of in12) mark(p, 2.5, "sits in your 12th", "stay");
  const h12 = h(L12);
  const l12strong = KENDRA.includes(h12) || TRINE.includes(h12);
  const l12sees = aspects(L12, s(L12), sign12);
  add(
    (in12.length ? 1.5 : 0) + (l12strong ? 1.5 : [3, 12].includes(h12) ? 1 : 0) + (l12sees ? 1 : 0),
    `12th lord ${NAME(L12)} in your ${ordinal(h12)} house`,
    `The 12th is the house of foreign lands. ${in12.length ? `${in12.map(NAME).join(" and ")} sit${in12.length === 1 ? "s" : ""} in it. ` : "It is empty, so it is read from its lord. "}${NAME(L12)} is in ${RASI[s(L12)].ta}${l12strong ? ", a kendra or trine, which gives the house the strength to deliver" : ""}${MOVABLE.includes(s(L12)) ? ", a movable sign" : WATERY.includes(s(L12)) ? ", a watery sign" : ""}.${l12sees ? ` From there it looks back at its own 12th house, which keeps the matter alive.` : ""}`,
    { stay: l12strong ? 12 : 4, work: 4, leisure: 4 },
  );
  mark(L12, 3, "12th lord (foreign lands)", "stay");

  // 4. The 9th house and its lord.
  const in9 = PLANETS.filter((p) => h(p) === 9);
  for (const p of in9) mark(p, 2.5, "sits in your 9th", "leisure");
  const h9 = h(L9);
  const l9water = WATERY.includes(s(L9));
  add(
    (in9.length ? 1 : 0) + (l9water ? 1 : 0) + ([4, 12, 9, 3, 7].includes(h9) ? 1 : 0) + (KENDRA.includes(h9) || TRINE.includes(h9) || h9 === 11 ? 0.5 : 0),
    `9th lord ${NAME(L9)} in your ${ordinal(h9)} house`,
    `The 9th rules long journeys. ${in9.length ? `${in9.map(NAME).join(" and ")} sit${in9.length === 1 ? "s" : ""} in it. ` : ""}${NAME(L9)} is in ${RASI[s(L9)].ta}${l9water ? ", a watery sign, which is read as journeys across the sea" : ""}, in the house of ${houseTopic(h9).split(/[,;]/)[0]}${h9 === 11 ? ": long journeys that pay" : ""}.`,
    { leisure: 10, work: h9 === 11 || h9 === 10 || L9 === L6 ? 8 : 2 },
  );
  mark(L9, 2.5, "9th lord (long journeys)", "leisure");

  // 5. Lagna lord and the 12th lord.
  const l1 = linked(L1, L12);
  if ([12, 9, 7].includes(h(L1))) add(1.5, `Lagna lord ${NAME(L1)} in your ${ordinal(h(L1))} house`, "You carry yourself into foreign territory: the lagna lord sits in one of the houses of going abroad.", { stay: 10, work: 4 });
  if (l1 && L1 !== L12) {
    add(2, `Lagna lord ${NAME(L1)} tied to 12th lord ${NAME(L12)}`, `They are ${l1} in ${RASI[s(L1)].ta}${MOVABLE.includes(s(L1)) ? ", a movable sign" : ""}. The self joined to the lord of foreign lands is one of the main marks of going abroad, and of staying a while.`, { stay: 14, work: 4 });
    mark(L1, 1.5, "lagna lord, joined to the 12th lord", "stay");
  } else if (L1 === L12) add(2, `${NAME(L1)} rules both your lagna and your 12th`, "The self and foreign lands have one lord.", { stay: 14 });

  // 6. The 4th house: leaving home.
  const in4 = (["Sa", "Ra", "Ke"] as PlanetId[]).filter((p) => h(p) === 4);
  if (in4.length || h(L4) === 12) {
    add(1.5, in4.length ? `${in4.map(NAME).join(" and ")} in your 4th house` : `4th lord ${NAME(L4)} in your 12th`, `The 4th is home and homeland. ${in4.length ? `${in4.map(NAME).join(" and ")} there is read as living away from where you were born, at least for a time.` : "Its lord in the 12th is read as a stay abroad."}`, { stay: 16 });
    for (const p of in4) mark(p, 1, "sits in your 4th (leaving home)", "stay");
  }

  // 7. Work abroad: the 10th tied to the 12th, 9th or Rahu.
  const workLinks: string[] = [];
  for (const [far, label] of [[L12, "12th lord"], [L9, "9th lord"]] as [PlanetId, string][]) {
    const l = linked(L10, far);
    if (l && L10 !== far) workLinks.push(`10th lord ${NAME(L10)} and ${label} ${NAME(far)} are ${l}`);
    else if (L10 === far) workLinks.push(`${NAME(L10)} rules both the 10th and the ${label.split(" ")[0]}`);
    if (aspects(far, s(far), sign10) && !l) workLinks.push(`${label} ${NAME(far)} looks at your 10th house`);
  }
  if ([12, 9].includes(h(L10))) workLinks.push(`10th lord ${NAME(L10)} sits in your ${ordinal(h(L10))}`);
  if (h("Ra") === 10 || s("Ra") === s(L10)) workLinks.push("Rahu is tied to your 10th");
  if (L6 === L9 || L6 === L12) workLinks.push(`${NAME(L6)} rules both the 6th (employment) and the ${L6 === L9 ? "9th" : "12th"}`);
  if (workLinks.length) {
    add(Math.min(2.5, 1 + workLinks.length * 0.75), "Work is a route abroad", `${workLinks.join("; ")}. A tie between the house of career and the houses of foreign lands is read as travel, or a posting, on account of work.`, { work: 18 + workLinks.length * 6 });
    mark(L10, 1, "10th lord, tied to the foreign houses", "work");
    if (L6 === L9 || L6 === L12) mark(L6, 0.5, "also rules the 6th (employment)", "work");
  } else add(0, "No direct tie between career and foreign houses", "Your 10th lord is not joined to the 9th or 12th lords, so work travel depends on the periods below more than on a standing promise.");
  for (const p of PLANETS.filter((x) => h(x) === 10)) if (!planets[p].purposes.includes("work")) planets[p].purposes.push("work");

  // 8. The 7th: business and partners. The 3rd: short trips.
  for (const p of PLANETS.filter((x) => h(x) === 7 && x !== "Ra")) mark(p, 1.5, "sits in your 7th (travel through partners)", "work");
  mark(L7, 1.5, "7th lord (business travel, partners)", "work");
  for (const p of PLANETS.filter((x) => h(x) === 3)) mark(p, 1.5, "sits in your 3rd (short trips)", "leisure");
  mark(L3, 1.5, "3rd lord (short trips, visas and paperwork)", "leisure");
  const shortLong = L3 === L12 || L3 === L9 ? `${NAME(L3)} rules both the 3rd and the ${L3 === L12 ? "12th" : "9th"}` : linked(L3, L12) ? `3rd lord ${NAME(L3)} and 12th lord ${NAME(L12)} are ${linked(L3, L12)}` : linked(L3, L9) ? `3rd lord ${NAME(L3)} and 9th lord ${NAME(L9)} are ${linked(L3, L9)}` : null;
  const pleasure = linked(L5, L12) && L5 !== L12 ? `5th lord ${NAME(L5)} and 12th lord ${NAME(L12)}: ${linked(L5, L12)}` : linked(L5, L9) && L5 !== L9 ? `5th lord ${NAME(L5)} and 9th lord ${NAME(L9)}: ${linked(L5, L9)}` : null;
  if (shortLong || pleasure)
    add(1, "Short trips and sightseeing", `${[shortLong, pleasure].filter(Boolean).join("; ")}. The 3rd is short journeys and the 5th is enjoyment; tied to the 9th or 12th, short trips grow into longer ones and travel for pleasure is supported.`, { leisure: 20 });

  // 9. The Moon, significator of travel.
  mark("Mo", 1, "natural significator of travel");
  const mh = h("Mo");
  if ([8, 9, 12].includes(mh) || WATERY.includes(n.moonSign) || (MOVABLE.includes(n.moonSign) && KENDRA.includes(mh)))
    add(1, `Chandran in ${RASI[n.moonSign].ta}, your ${ordinal(mh)} house`, "The Moon is placed where it gives journeys: in a watery sign, a movable sign in a kendra, or the 8th, 9th or 12th.", { leisure: 10, stay: [9, 12].includes(mh) ? 8 : 0 });

  // 10. Jaimini: the atmakaraka in the 9th or 12th.
  const ak = atmakaraka(n).planet;
  if ([9, 12].includes(h(ak))) add(1, `Atmakaraka ${NAME(ak)} in your ${ordinal(h(ak))}`, "The significator of the self sits in a house of distant places.", { stay: 8 });

  // 11. Star lords. A planet gives the results of the lord of the star it sits in, so a planet in
  // one of Rahu's stars (Thiruvathirai, Swathi, Sathayam) carries Rahu's foreign results in its
  // own periods, and one in a star of the 12th or 9th lord carries theirs.
  const starOf = (p: PlanetId) => NAKSHATRA[nakOf(pos[p])].ta;
  const rahuStar = PLANETS.filter((p) => p !== "Ra" && p !== "Ke" && starLordOf(pos[p]) === "Ra");
  for (const p of PLANETS) {
    if (p === "Ra" || p === "Ke") continue;
    const sl = starLordOf(pos[p]);
    if (sl === "Ra") mark(p, 1.5, `sits in ${starOf(p)}, a star of Rahu, so its periods carry Rahu's foreign results`, ...planets.Ra.purposes);
    else if (sl === L12 && p !== L12) mark(p, 1, `sits in ${starOf(p)}, a star of the 12th lord ${NAME(L12)}`, "stay");
    else if (sl === L9 && p !== L9) mark(p, 1, `sits in ${starOf(p)}, a star of the 9th lord ${NAME(L9)}`, "leisure");
  }
  if (rahuStar.length) {
    const work = rahuStar.some((p) => n.rules[p].includes(10) || n.rules[p].includes(7));
    add(
      Math.min(1.5, 0.75 * rahuStar.length),
      `${rahuStar.map((p) => `${NAME(p)} in ${starOf(p)}`).join(", ")}: Rahu's star${rahuStar.length > 1 ? "s" : ""}`,
      `A planet gives the results of the lord of its star. ${rahuStar.map(NAME).join(" and ")} sit${rahuStar.length === 1 ? "s" : ""} in a star ruled by Rahu, the significator of the foreign, so ${rahuStar.length === 1 ? "its" : "their"} periods bring foreign contact even though ${rahuStar.length === 1 ? "it does" : "they do"} not rule a house of travel.${work ? ` ${rahuStar.filter((p) => n.rules[p].includes(10) || n.rules[p].includes(7)).map((p) => `${NAME(p)} rules your ${n.rules[p].filter((x) => x === 10 || x === 7).map(ordinal).join(" and ")}`).join("; ")}, so the contact comes through work.` : ""}`,
      work ? { work: 14 } : { leisure: 8, stay: 6 },
    );
  }

  // 12. Water and air signs. The tradition reads the water signs (neer rasi) as crossing the sea;
  // modern readers add the air signs (kaatru rasi) for journeys by air.
  const keyPlanets: [PlanetId, string][] = [];
  for (const [p, label] of [["Ra", "Rahu"], [L12, "12th lord"], [L9, "9th lord"], ["Mo", "the Moon"], [L10, "10th lord"]] as [PlanetId, string][])
    if (!keyPlanets.some(([q]) => q === p)) keyPlanets.push([p, label]);
  const wet = keyPlanets.filter(([p]) => WATERY.includes(s(p)));
  const airy = keyPlanets.filter(([p]) => AIRY.includes(s(p)));
  const say = (xs: [PlanetId, string][]) => xs.map(([p, l]) => `${l === "Rahu" || l === "the Moon" ? NAME(p) : `${l} ${NAME(p)}`} in ${RASI[s(p)].ta}`).join(", ");
  if (wet.length + airy.length >= 2)
    add(
      wet.length + airy.length >= 3 ? 1 : 0.5,
      "Water and air signs",
      `${[wet.length ? `In water signs (neer rasi), the classical mark of crossing the sea: ${say(wet)}.` : "", airy.length ? `In air signs (kaatru rasi), which modern readers take as journeys by air: ${say(airy)}.` : ""].filter(Boolean).join(" ")}`,
      { leisure: 6, work: 4 },
    );

  // Planets sitting with the 9th or 12th lord share in their periods.
  for (const p of PLANETS) {
    if (p === L12 || p === L9 || p === "Ra" || p === "Ke") continue;
    if (s(p) === s(L12) && planets[p].weight < 1.5) mark(p, 1, `sits with the 12th lord ${NAME(L12)}`);
    if (s(p) === s(L9) && planets[p].weight < 1.5) mark(p, 1, `sits with the 9th lord ${NAME(L9)}`);
  }
  if ([1, 7].includes(h("Ke")) || [3, 9, 12].includes(h("Ke"))) mark("Ke", [9, 12].includes(h("Ke")) ? 2 : 0.5, `on the Rahu axis, in your ${ordinal(h("Ke"))}`);
  for (const p of PLANETS) {
    planets[p].weight = Math.min(4, Math.round(planets[p].weight * 100) / 100);
    planets[p].reasons = why.get(p)!.sort((a, b) => b.w - a.w).map((x) => x.r);
  }

  const word: PromiseWord = score >= 11 ? "Strong" : score >= 7.5 ? "Good" : score >= 4 ? "Moderate" : "Low";
  const cap = (x: number) => Math.max(8, Math.min(100, Math.round(x)));
  const purposes: Record<Purpose, number> = { work: cap(purpose.work * 1.1), leisure: cap(purpose.leisure * 1.1), stay: cap(purpose.stay * 1.1) };
  const lead = (Object.keys(purposes) as Purpose[]).sort((a, b) => purposes[b] - purposes[a])[0];
  const leadText = lead === "work" ? "Work is the strongest route" : lead === "leisure" ? "Trips for their own sake are the strongest route" : "A longer stay away from home is the strongest theme";
  const summary =
    (word === "Strong" ? "Your chart points abroad clearly and in several independent ways. "
      : word === "Good" ? "Your chart supports foreign travel well. "
      : word === "Moderate" ? "Your chart allows foreign travel without insisting on it. "
      : "Your chart has few of the classical marks of foreign travel; trips happen through effort and the right period. ") + `${leadText}.`;
  return { score: Math.round(score * 100) / 100, word, summary, lines, purposes, planets };
}

// ---- Timing ---------------------------------------------------------------------------------

export type TravelLevel = "high" | "raised" | "ordinary";

/** One reason a moment leans towards travel, and the planet that carries it. */
export interface TravelFactor {
  text: string;
  w: number;
  planet: PlanetId | null;
  /** period: the dasa; year: the annual chart; slow: Rahu, Ketu, Guru, Sani; fast: Sun and the moving lords. */
  layer: "period" | "year" | "slow" | "fast";
}

export interface TravelMoment {
  t: Date;
  dasaPart: number;
  /** Annual chart (Tajika): muntha, lord of the year, mudda period. */
  yearPart: number;
  transitPart: number;
  /** Fast transits that move within weeks: they pick the stretch inside a longer window. */
  quickPart: number;
  total: number;
  level: TravelLevel;
  reasons: string[];
  factors: TravelFactor[];
  purposes: Purpose[];
  run: RunningDasha | null;
}

// Annual charts are costly to cast, and the timing samples ask for the same few dozen again and again.
const yearCache = new WeakMap<Natal, Map<number, Varshaphal>>();
const YEAR_DAYS = 365.2564;
function yearAt(n: Natal, t: Date): Varshaphal | null {
  if (t < n.birth) return null;
  let cache = yearCache.get(n);
  if (!cache) yearCache.set(n, (cache = new Map()));
  const get = (k: number) => {
    let v = cache.get(k);
    if (!v) cache.set(k, (v = varshaphal(n, k)));
    return v;
  };
  let k = Math.max(0, Math.floor((t.getTime() - n.birth.getTime()) / (YEAR_DAYS * MS_DAY)));
  for (let guard = 0; guard < 4; guard++) {
    const v = get(k);
    if (t < v.start && k > 0) k--;
    else if (t >= v.end) k++;
    else return v;
  }
  return get(k);
}

/** Where the line falls between ordinary, raised and high for this chart. */
export interface TravelBaseline {
  raised: number;
  high: number;
  /** Every sampled total of the adult life, ascending, for ranking a single moment. */
  sorted: number[];
}

/** Share of the adult life (0..100) that scores below `total`. */
export function travelRank(base: TravelBaseline, total: number): number {
  const xs = base.sorted;
  let lo = 0, hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < total) lo = mid + 1;
    else hi = mid;
  }
  return Math.round((lo / Math.max(1, xs.length)) * 100);
}

/**
 * A chart with a strong promise scores above any fixed line most of the time, which says
 * nothing about when. So each moment is ranked against the person's own adult life instead:
 * the top sixth of it counts as high, the next quarter as raised.
 */
export function travelBaseline(n: Natal, promise: TravelPromise): TravelBaseline {
  const start = n.birth.getTime() + 18 * 365.25 * MS_DAY;
  const totals: number[] = [];
  for (let i = 0; i < 52 * 24; i++) totals.push(travelAt(n, promise, new Date(start + i * 15.2 * MS_DAY), null, undefined).total);
  totals.sort((a, b) => a - b);
  const q = (f: number) => totals[Math.min(totals.length - 1, Math.floor(totals.length * f))];
  return { raised: q(0.6), high: q(0.84), sorted: totals };
}

const TRAVEL_HOUSES = [3, 9, 12];
const FAST: PlanetId[] = ["Su", "Me", "Ve", "Ma"];

export function travelAt(n: Natal, promise: TravelPromise, t: Date, base: TravelBaseline | null, run?: RunningDasha | null): TravelMoment {
  const factors: TravelFactor[] = [];
  const purposes = new Set<Purpose>();
  const parts = { period: 0, year: 0, slow: 0, fast: 0 };
  const push = (layer: TravelFactor["layer"], w: number, planet: PlanetId | null, text: string) => {
    parts[layer] += w;
    factors.push({ layer, w, planet, text });
  };
  const L12 = n.lordOf(12), L9 = n.lordOf(9), L10 = n.lordOf(10);
  const sign12 = (n.lagnaSign + 11) % 12;
  const sign9 = (n.lagnaSign + 8) % 12;
  const natalSign = (p: PlanetId) => signOf(n.positions[p]);

  // 1. The dasa, down to sookshma. Sookshma periods last days to weeks, the scale of a real trip.
  const r = run === undefined ? runningDasha(n.mahas, t) : run;
  if (r) {
    const seen = new Set<PlanetId>();
    for (const [level, lord, mult] of [["dasa", r.maha.lord, 0.5], ["bhukti", r.bhukti.lord, 1], ["antaram", r.antaram.lord, 1], ["sookshma", r.sookshma.lord, 0.6]] as [string, PlanetId, number][]) {
      const tp = promise.planets[lord];
      if (tp.weight >= 1) {
        const w = tp.weight * mult;
        const text = tp.weight < 1.5 ? "" : !seen.has(lord) ? `${NAME(lord)} ${level}: ${tp.reasons[0]}` : `${NAME(lord)} also holds the ${level}`;
        if (text) push("period", w, lord, text);
        else parts.period += w;
        if (tp.weight >= 1.5 && level !== "dasa") for (const p of tp.purposes) purposes.add(p);
      }
      seen.add(lord);
    }
  }

  // 2. The annual chart (Tajika): the muntha's house, the lord of the year and the mudda period.
  const v = yearAt(n, t);
  if (v) {
    const mh = v.munthaHouseBirth;
    if (TRAVEL_HOUSES.includes(mh))
      push("year", 0.75, RASI[v.muntha].lord, `Muntha in ${RASI[v.muntha].ta}, your ${ordinal(mh)} house: ${mh === 3 ? "a year of short journeys" : mh === 9 ? "a year of long journeys" : "a year that points abroad"}`);
    const yl = promise.planets[v.yearLord];
    if (yl.weight >= 2.5) push("year", 0.5, v.yearLord, `${NAME(v.yearLord)} is lord of this year's annual chart: ${yl.reasons[0]}`);
    const md = v.mudda.find((m) => t >= m.start && t < m.end);
    if (md && promise.planets[md.lord].weight >= 1.5) push("year", promise.planets[md.lord].weight * 0.4, md.lord, `${NAME(md.lord)} mudda period in the annual chart: ${promise.planets[md.lord].reasons[0]}`);
  }

  // 3. Slow transits: Rahu, Ketu, Guru and Sani over the 9th, 12th, lagna and the Moon.
  const pos = {} as Record<PlanetId, number>;
  for (const p of ["Su", "Me", "Ve", "Ma", "Ju", "Sa", "Ra"] as PlanetId[]) pos[p] = siderealLongitude(p, t);
  if (r) for (const p of [r.bhukti.lord, r.sookshma.lord]) if (pos[p] === undefined) pos[p] = siderealLongitude(p, t);
  const ra = signOf(pos.Ra);
  const ke = (ra + 6) % 12;
  const ju = signOf(pos.Ju);
  const sa = signOf(pos.Sa);
  const raSign = `${RASI[ra].ta}, ${AIRY.includes(ra) ? "an air sign" : WATERY.includes(ra) ? "a water sign" : MOVABLE.includes(ra) ? "a movable sign" : "its sign"}`;

  const rl = houseFrom(n.lagnaSign, ra);
  const rm = houseFrom(n.moonSign, ra);
  const kl = houseFrom(n.lagnaSign, ke);
  if (rl === 12) push("slow", 3, "Ra", `Rahu is crossing your 12th house (${raSign}), the strongest transit for going abroad`);
  else if (rl === 9) push("slow", 2.5, "Ra", `Rahu is crossing your 9th house of long journeys (${raSign})`);
  else if (rl === 1) push("slow", 2.5, "Ra", `Rahu is crossing your lagna (${raSign}), which stirs up a wish for the foreign and can spark a departure`);
  else if (rl === 7) push("slow", 1.5, "Ra", `Rahu is crossing your 7th house (${raSign}): foreign partners and clients`);
  else if (rl === 3) push("slow", 1.5, "Ra", `Rahu is crossing your 3rd house (${raSign}): short trips multiply`);
  if (kl === 12 || kl === 9) push("slow", 1.5, "Ke", `Ketu is crossing your ${ordinal(kl)} house`);
  if (rm === 12) push("slow", 1.5, "Ra", `Rahu is in the 12th from your Moon (${raSign})`);
  else if (rm === 1) push("slow", 1.5, "Ra", `Rahu is passing over your Moon (${raSign})`);
  else if (rm === 9) push("slow", 1, "Ra", `Rahu is in the 9th from your Moon (${raSign})`);
  for (const [lord, label] of [[L12, "12th"], [L9, "9th"]] as [PlanetId, string][])
    if (lord !== "Ra" && natalSign(lord) === ra) push("slow", 1, "Ra", `Rahu is passing over your ${label} lord ${NAME(lord)}`);

  const juHits: number[] = [];
  const saHits: number[] = [];
  for (const [sign, label] of [[sign12, "12th"], [sign9, "9th"]] as [number, string][]) {
    if (ju === sign) { juHits.push(sign); push("slow", 2, "Ju", `Guru is crossing your ${label} house`); }
    else if (aspects("Ju", ju, sign)) { juHits.push(sign); push("slow", 1, "Ju", `Guru looks at your ${label} house`); }
    if (sa === sign) { saHits.push(sign); push("slow", label === "12th" ? 1.5 : 1, "Sa", `Sani is crossing your ${label} house`); }
    else if (aspects("Sa", sa, sign)) { saHits.push(sign); push("slow", 0.75, "Sa", `Sani looks at your ${label} house`); }
  }
  const both = juHits.filter((x) => saHits.includes(x));
  if (both.length) push("slow", 1.5, null, `Guru and Sani both touch your ${both.map((x) => (x === sign12 ? "12th" : "9th")).join(" and ")} house at once (double transit)`);
  // Guru's touch on the natal 12th and 9th lords wakes them, as it wakes any planet it passes or sees.
  for (const [lord, label] of [[L12, "12th"], [L9, "9th"]] as [PlanetId, string][]) {
    if (lord === "Ra") continue;
    const at = natalSign(lord);
    if (ju === at || aspects("Ju", ju, at))
      push("slow", 0.75, "Ju", `Guru ${ju === at ? "passes over" : "looks at"} ${lord === "Ju" ? "its own birth place" : `${NAME(lord)}`} in ${RASI[at].ta}, your ${label} lord`);
  }

  // 4. Fast transits. The Sun is the month's timer; the moving 9th and 12th lords and the running
  // period lords show which weeks inside a longer window the trip falls in.
  const fastPart0 = parts.fast;
  const su = signOf(pos.Su);
  const sh = houseFrom(n.lagnaSign, su);
  if (sh === 9 || sh === 12) push("fast", 1, "Su", `Suriyan is crossing your ${ordinal(sh)} house this month`);
  else {
    const over = ([[L9, "9th lord"], [L12, "12th lord"], ["Ra", "Rahu"]] as [PlanetId, string][]).find(([p]) => p !== "Su" && natalSign(p) === su);
    if (over) push("fast", 0.75, "Su", `Suriyan is passing over your ${over[1] === "Rahu" ? "natal Rahu" : `${over[1]} ${NAME(over[0])}`} this month`);
  }
  for (const [lord, label] of [[L9, "9th"], [L12, "12th"]] as [PlanetId, string][]) {
    if (!FAST.includes(lord) || lord === "Su") continue;
    const ls = signOf(pos[lord]);
    const lh = houseFrom(n.lagnaSign, ls);
    if ([1, 3, 9, 10, 12].includes(lh)) push("fast", 0.75, lord, `Your ${label} lord ${NAME(lord)} is moving through your ${ordinal(lh)} house${lh === 10 ? ": journeys on account of work" : lh === 1 ? ": the journey comes to you" : ""}`);
    else if (ls === natalSign("Ra") || ls === natalSign(L10)) push("fast", 0.75, lord, `Your ${label} lord ${NAME(lord)} is passing over your ${ls === natalSign("Ra") ? "natal Rahu" : `10th lord ${NAME(L10)}`}`);
  }
  if (r) {
    let pl = 0;
    for (const [level, lord] of [["bhukti", r.bhukti.lord], ["sookshma", r.sookshma.lord]] as [string, PlanetId][]) {
      if (lord === "Ra" || lord === "Ke" || promise.planets[lord].weight < 1.5 || pl >= 1) continue;
      const ls = signOf(pos[lord]);
      const lh = houseFrom(n.lagnaSign, ls);
      if (MOVABLE.includes(ls) || TRAVEL_HOUSES.includes(lh)) {
        pl += 0.5;
        push("fast", 0.5, lord, `${NAME(lord)}, lord of the ${level}, is moving through ${RASI[ls].ta}, ${TRAVEL_HOUSES.includes(lh) ? `your ${ordinal(lh)} house` : "a movable sign"}${AIRY.includes(ls) ? " and an air sign" : WATERY.includes(ls) ? " and a water sign" : ""}`);
      }
    }
  }
  // The fast layer only sharpens; it cannot outweigh the slow ones.
  if (parts.fast - fastPart0 > 2.5) parts.fast = fastPart0 + 2.5;

  const total = parts.period + parts.year + parts.slow + parts.fast;
  // High needs a period and a transit together, and the fast planets to agree on the month: the slow
  // layers open a window that can last a year, the fast ones mark the weeks a trip actually happens in.
  // (Checked against a quiet decade with no trips: without the fast condition, twice as many of its
  // weeks read high.) Anything short of all three is only "raised".
  const level: TravelLevel =
    !base ? "ordinary"
    : total >= base.high && parts.period + parts.year >= 2.5 && parts.slow + parts.fast >= 2.5 && parts.fast >= 1.5 ? "high"
    : total >= base.raised ? "raised"
    : "ordinary";
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    t,
    dasaPart: r2(parts.period),
    yearPart: r2(parts.year),
    transitPart: r2(parts.slow),
    quickPart: r2(parts.fast),
    total: r2(total),
    level,
    reasons: factors.map((f) => f.text),
    factors,
    purposes: [...purposes],
    run: r,
  };
}

/** The planets carrying a set of moments, ranked by how much of the score each one supplied. */
export function travelDrivers(moments: TravelMoment[]): { planet: PlanetId; share: number; texts: string[] }[] {
  const sum = new Map<PlanetId, { w: number; texts: Map<string, number> }>();
  for (const m of moments)
    for (const f of m.factors) {
      if (!f.planet) continue;
      const e = sum.get(f.planet) ?? { w: 0, texts: new Map() };
      e.w += f.w;
      e.texts.set(f.text, (e.texts.get(f.text) ?? 0) + 1);
      sum.set(f.planet, e);
    }
  const total = [...sum.values()].reduce((a, e) => a + e.w, 0) || 1;
  return [...sum.entries()]
    .map(([planet, e]) => ({ planet, share: Math.round((e.w / total) * 100), texts: [...e.texts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t) }))
    .sort((a, b) => b.share - a.share);
}

export interface TravelWindow {
  start: Date;
  end: Date;
  level: TravelLevel;
  peak: number;
  /** The stretch inside the window where the signs are thickest. */
  peakStart: Date;
  peakEnd: Date;
  reasons: string[];
  purposes: Purpose[];
}

/**
 * Sample the next few years and join neighbouring samples of the same level into windows. The fast
 * transits can flick a sample across a line for a day or two; a run shorter than `minDays` is folded
 * into the window around it, and the samples take on the level of the window they end up in.
 */
export function travelWindows(n: Natal, promise: TravelPromise, base: TravelBaseline, from: Date, years = 3, stepDays = 2, minDays = 8): { samples: TravelMoment[]; windows: TravelWindow[] } {
  const samples: TravelMoment[] = [];
  const steps = Math.ceil((years * 365.25) / stepDays);
  for (let i = 0; i <= steps; i++) samples.push(travelAt(n, promise, new Date(from.getTime() + i * stepDays * MS_DAY), base));

  let runs: { level: TravelLevel; moments: TravelMoment[] }[] = [];
  for (const m of samples) {
    const last = runs[runs.length - 1];
    if (last && last.level === m.level) last.moments.push(m);
    else runs.push({ level: m.level, moments: [m] });
  }
  const minN = Math.max(1, Math.ceil(minDays / stepDays));
  for (let guard = samples.length; guard > 0 && runs.length > 1; guard--) {
    const i = runs.findIndex((r) => r.moments.length < minN);
    if (i < 0) break;
    const into = i === 0 ? 1 : i - 1;
    if (into < i) runs[into].moments.push(...runs[i].moments);
    else runs[into].moments.unshift(...runs[i].moments);
    runs.splice(i, 1);
    const joined: typeof runs = [];
    for (const r of runs) {
      const last = joined[joined.length - 1];
      if (last && last.level === r.level) last.moments.push(...r.moments);
      else joined.push(r);
    }
    runs = joined;
  }
  for (const r of runs) for (const m of r.moments) m.level = r.level;

  const windows: TravelWindow[] = [];
  let group: TravelMoment[] = [];
  const flush = () => {
    if (!group.length) return;
    const peak = Math.max(...group.map((m) => m.total));
    const top = group.filter((m) => m.total >= peak - 0.75);
    const counts = new Map<string, number>();
    for (const m of group) for (const r of m.reasons) counts.set(r, (counts.get(r) ?? 0) + 1);
    const reasons = [...counts.entries()].filter(([, c]) => c >= group.length * 0.34).sort((a, b) => b[1] - a[1]).map(([r]) => r);
    const pc = new Map<Purpose, number>();
    for (const m of group) for (const p of m.purposes) pc.set(p, (pc.get(p) ?? 0) + 1);
    const purposes = [...pc.entries()].filter(([, c]) => c >= group.length * 0.34).sort((a, b) => b[1] - a[1]).map(([p]) => p);
    windows.push({
      start: group[0].t,
      end: new Date(group[group.length - 1].t.getTime() + stepDays * MS_DAY),
      level: group[0].level,
      peak,
      peakStart: top[0].t,
      peakEnd: new Date(top[top.length - 1].t.getTime() + stepDays * MS_DAY),
      reasons,
      purposes,
    });
    group = [];
  };
  for (const m of samples) {
    if (group.length && group[0].level !== m.level) flush();
    group.push(m);
  }
  flush();
  return { samples, windows };
}

// ---- Checking a trip ---------------------------------------------------------------------------

export interface TripFactor {
  text: string;
  layer: TravelFactor["layer"];
  planet: PlanetId | null;
  /** Share of the trip's days on which it held, 0..1. */
  cover: number;
}

export interface TripCheck {
  start: Date;
  end: Date;
  days: TravelMoment[];
  /** The highest level any day of the trip reached, and on how many of its days. */
  level: TravelLevel;
  levelDays: number;
  /** Share of your adult life scoring below the trip's average day. */
  rank: number;
  drivers: ReturnType<typeof travelDrivers>;
  factors: TripFactor[];
  run: RunningDasha | null;
  year: { age: number; muntha: number; munthaHouse: number; yearLord: PlanetId; mudda: { lord: PlanetId; start: Date; end: Date } | null } | null;
  chara: { sign: number; house: number; sub: number; subHouse: number; start: Date; end: Date; subStart: Date; subEnd: Date } | null;
}

/** Read a stretch of dates: what was running, which planets carried it, and how it ranks in your life. */
export function travelTrip(n: Natal, promise: TravelPromise, base: TravelBaseline, start: Date, end: Date): TripCheck {
  const span = Math.max(0, end.getTime() - start.getTime());
  const count = Math.min(120, Math.max(1, Math.round(span / MS_DAY) + 1));
  const days: TravelMoment[] = [];
  for (let i = 0; i < count; i++) days.push(travelAt(n, promise, new Date(start.getTime() + (count === 1 ? 0 : (span * i) / (count - 1))), base));
  const rankOf: Record<TravelLevel, number> = { ordinary: 0, raised: 1, high: 2 };
  const level = days.reduce<TravelLevel>((a, m) => (rankOf[m.level] > rankOf[a] ? m.level : a), "ordinary");
  const avg = days.reduce((a, m) => a + m.total, 0) / days.length;

  const seen = new Map<string, TripFactor & { n: number }>();
  for (const m of days)
    for (const f of m.factors) {
      const e = seen.get(f.text) ?? { text: f.text, layer: f.layer, planet: f.planet, cover: 0, n: 0 };
      e.n += 1;
      seen.set(f.text, e);
    }
  const order: Record<TravelFactor["layer"], number> = { period: 0, year: 1, slow: 2, fast: 3 };
  const factors = [...seen.values()]
    .map(({ n: k, ...f }) => ({ ...f, cover: k / days.length }))
    .sort((a, b) => order[a.layer] - order[b.layer] || b.cover - a.cover);

  const mid = new Date(start.getTime() + span / 2);
  const v = yearAt(n, mid);
  const md = v?.mudda.find((m) => mid >= m.start && mid < m.end) ?? null;
  const ch = charaAt(jaimini(n).dasa, mid);
  return {
    start,
    end,
    days,
    level,
    levelDays: days.filter((m) => m.level === level).length,
    rank: travelRank(base, avg),
    drivers: travelDrivers(days),
    factors,
    run: days[0].run,
    year: v ? { age: v.age, muntha: v.muntha, munthaHouse: v.munthaHouseBirth, yearLord: v.yearLord, mudda: md } : null,
    chara: ch
      ? { sign: ch.dasa.sign, house: houseFrom(n.lagnaSign, ch.dasa.sign), sub: ch.sub.sign, subHouse: houseFrom(n.lagnaSign, ch.sub.sign), start: ch.dasa.start, end: ch.dasa.end, subStart: ch.sub.start, subEnd: ch.sub.end }
      : null,
  };
}

// ---- The day of departure ---------------------------------------------------------------------

export type Direction = "north" | "east" | "south" | "west";
export const DIRECTION_LABEL: Record<Direction, string> = { north: "North", east: "East", south: "South", west: "West" };
/** Vara soolai: the direction to avoid setting out in on each weekday (Sunday first). */
export const SOOLAI: Direction[] = ["west", "east", "north", "north", "south", "west", "east"];

export interface FlightDay {
  frame: DayFrame;
  score: number;
  tone: Tone3;
  star: number;
  good: string[];
  bad: string[];
  soolai: Direction;
  blocked: boolean;
}

/**
 * `at` reads the Moon at the actual moment of leaving instead of at midday. The weekday (and so the
 * soolai) follows the Tamil day, which runs from sunrise to sunrise: a 3am flight belongs to the
 * day before.
 */
export function flightDay(n: Natal, frame: DayFrame, direction: Direction | null, at?: Date): FlightDay {
  const p = panchangFor(frame);
  const noon = new Date(frame.sunrise.getTime() + frame.dayLength / 2);
  const mid = at && at >= frame.sunrise && at < frame.nextSunrise ? at : noon;
  const star = spanAt(p.nakshatra, mid).value;
  const moonSign = spanAt(p.moonSign, mid).value;
  const tithi = spanAt(p.tithi, mid).value;
  const yoga = spanAt(p.yoga, mid).value;
  const good: string[] = [];
  const bad: string[] = [];
  let x = 0;

  const nature = NAKSHATRA[star].nature;
  if (nature === "movable") { x += 2.5; good.push(`${NAKSHATRA[star].ta}, a movable star: the best kind for setting out`); }
  else if (nature === "swift") { x += 2; good.push(`${NAKSHATRA[star].ta}, a swift star: good for journeys`); }
  else if (nature === "soft") { x += 1.5; good.push(`${NAKSHATRA[star].ta}, a gentle star: good for journeys`); }
  else if (nature === "fierce" || nature === "sharp") { x -= 1.5; bad.push(`${NAKSHATRA[star].ta}, a ${nature} star: not for setting out`); }

  const tara = taraBala(n.star, star);
  if ([0, 2, 4, 6].includes(tara.index)) { x -= tara.index === 6 ? 3 : 2; bad.push(`${tara.name} tara from your star: journeys are avoided`); }
  else { x += [1, 5, 8].includes(tara.index) ? 2 : 1; good.push(`${tara.name} tara from your star`); }

  const cb = chandraBala(n.moonSign, moonSign, tithi < 15);
  if (cb.house === 8) { x -= 3.5; bad.push("Chandrashtamam: do not set out"); }
  else if (cb.house === 12) { x -= 1; bad.push("Moon in the 12th from your rasi"); }
  else if (cb.tone === "good") { x += 1; good.push(`Moon in the ${ordinal(cb.house)} from your rasi`); }
  if (n.profile.timeConfirmed) {
    const hl = houseFrom(n.lagnaSign, moonSign);
    if ([3, 9].includes(hl)) { x += 1; good.push(`Moon in your ${ordinal(hl)} house of journeys`); }
  }
  if (tithi === 29) { x -= 1.5; bad.push("Amavasai"); }
  else if ([4, 9, 14].includes((tithi % 15) + 1)) { x -= 1; bad.push("Rikta tithi (4th, 9th or 14th)"); }
  if (BAD_YOGAS.has(yoga)) { x -= 0.75; bad.push("An inauspicious yoga of the day"); }

  const soolai = SOOLAI[frame.weekday];
  const blocked = direction !== null && soolai === direction;
  if (blocked) { x -= 2.5; bad.push(`Soolai: ${WEEKDAYS[frame.weekday]} blocks travel towards the ${DIRECTION_LABEL[soolai].toLowerCase()}`); }

  const score = Math.round(Math.max(0, Math.min(100, 50 + x * 6.5)));
  return { frame, score, tone: score >= 66 ? "good" : score < 42 ? "bad" : "neutral", star, good, bad, soolai, blocked };
}

export function flightDays(n: Natal, place: Place, fromKey: string, days: number, direction: Direction | null): FlightDay[] {
  return Array.from({ length: days }, (_, i) => flightDay(n, dayFrame(addDaysKey(fromKey, i), place), direction));
}
