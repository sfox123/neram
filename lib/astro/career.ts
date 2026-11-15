// Thozhil: career.
//
// Three layers again:
//   1. Promise: the 10th house and its lord (profession and standing), the 6th (employment),
//      the 11th (gains), the lagna lord, the natural significators Suriyan (authority) and
//      Sani (work), the dasamsa, and Jaimini's amatyakaraka, the planet second in degree,
//      which names the kind of work.
//   2. Job or own venture: the 6th house of service weighed against the 7th house of trade,
//      with the 3rd (initiative), Rahu and the tie between the 2nd and 11th lords.
//   3. Timing: the periods of the 10th lord, planets in the 10th, the 6th and 11th lords and
//      the planets tied to them, sharpened when Guru or Sani cross or look at the 10th house,
//      its lord, the 6th or the 11th, and most when both touch the 10th together.
// A window is a stretch when career matters are more likely to move. Whether to move is a
// separate question, and skill and preparation still decide what a window is worth.

import { houseTopic, Natal, ordinal } from "./chart";
import { PLANET_INFO, PlanetId, PLANETS, RASI, signOf } from "./constants";
import { RunningDasha, runningDasha } from "./dasha";
import { aspects, Dignity, dignity, isCombust } from "./dignity";
import { siderealLongitude } from "./ephemeris";
import { MS_DAY } from "./time";
import { TravelLevel, TravelLine } from "./travel";
import { DIGNITY_SCORE, PLANET_CAREER, vargaStrength } from "./vargas";
import { findYogas } from "./yogas";

const NAME = (p: PlanetId) => PLANET_INFO[p].ta;
const KENDRA = [1, 4, 7, 10];
const TRINE = [5, 9];
const DUSTHANA = [6, 8, 12];
const BENEFIC: PlanetId[] = ["Ju", "Ve", "Me", "Mo"];
const dg = (d: Dignity) => (d === "exalted" ? ", exalted" : d === "own" ? ", in its own sign" : d === "debilitated" ? ", debilitated" : d === "friend" ? ", in a friend's sign" : d === "enemy" ? ", in an enemy's sign" : "");

export type CareerLean = "rise" | "change" | "venture";
export const LEAN_LABEL: Record<CareerLean, string> = { rise: "rise and recognition", change: "change of role or employer", venture: "own venture and clients" };

export interface CareerPlanet {
  planet: PlanetId;
  weight: number;
  reasons: string[];
  leans: CareerLean[];
}

export interface CareerField {
  planet: PlanetId;
  weight: number;
  why: string;
  field: string;
}

export type CareerWord = "Strong" | "Good" | "Moderate" | "Uneven";

export interface CareerPromise {
  score: number;
  word: CareerWord;
  summary: string;
  lines: TravelLine[];
  fields: CareerField[];
  /** 0..100: how far the chart leans to employment against own venture. */
  job: number;
  styleText: string;
  planets: Record<PlanetId, CareerPlanet>;
  amatyakaraka: PlanetId;
}

export function careerPromise(n: Natal): CareerPromise {
  const pos = n.positions;
  const s = (p: PlanetId) => signOf(pos[p]);
  const h = (p: PlanetId) => n.house[p];
  const amsa = vargaStrength(n);
  const sign10 = (n.lagnaSign + 9) % 12;
  const L1 = n.lordOf(1), L2 = n.lordOf(2), L3 = n.lordOf(3), L6 = n.lordOf(6), L7 = n.lordOf(7), L8 = n.lordOf(8), L10 = n.lordOf(10), L11 = n.lordOf(11);
  const lines: TravelLine[] = [];
  let score = 0;
  const add = (w: number, title: string, detail: string) => {
    score += w;
    lines.push({ title, detail, tone: w > 0.25 ? "good" : w < -0.25 ? "bad" : "neutral" });
  };
  const planets = {} as Record<PlanetId, CareerPlanet>;
  for (const p of PLANETS) planets[p] = { planet: p, weight: 0, reasons: [], leans: [] };
  const why = new Map<PlanetId, { w: number; text: string }[]>();
  const mark = (p: PlanetId, w: number, reason: string, ...leans: CareerLean[]) => {
    planets[p].weight += w;
    why.set(p, [...(why.get(p) ?? []), { w, text: reason }]);
    for (const l of leans) if (!planets[p].leans.includes(l)) planets[p].leans.push(l);
  };
  const fieldW = new Map<PlanetId, { w: number; why: string[] }>();
  const field = (p: PlanetId, w: number, reason: string) => {
    const f = fieldW.get(p) ?? { w: 0, why: [] };
    f.w += w;
    f.why.push(reason);
    fieldW.set(p, f);
  };
  const sees = (p: PlanetId, sign: number) => s(p) === sign || aspects(p, s(p), sign);
  const tied = (a: PlanetId, b: PlanetId) => a !== b && (s(a) === s(b) || (RASI[s(a)].lord === b && RASI[s(b)].lord === a) || aspects(a, s(a), s(b)) || aspects(b, s(b), s(a)));

  // 1. The 10th house.
  const in10 = PLANETS.filter((p) => h(p) === 10);
  const on10 = PLANETS.filter((p) => h(p) !== 10 && aspects(p, s(p), sign10));
  let w10 = 0;
  for (const p of in10) {
    const d = dignity(p, s(p));
    w10 += (p === "Ra" || p === "Ke" ? 0.5 : d === "exalted" || d === "own" ? 2.5 : d === "debilitated" ? -1 : 1) + (BENEFIC.includes(p) ? 0.5 : 0);
    mark(p, 3, "sits in your 10th house", "rise");
    field(p, 3, "in your 10th house");
  }
  for (const p of on10) {
    w10 += p === "Ju" ? 1 : p === "Sa" ? 0.5 : BENEFIC.includes(p) ? 0.5 : 0;
    mark(p, 1.5, "looks at your 10th house", "rise");
    field(p, 1.5, "looks at your 10th house");
  }
  add(
    w10,
    `${RASI[sign10].ta} on your 10th house`,
    `The 10th is profession, rank and what you are known for. ${in10.length ? `${in10.map((p) => `${NAME(p)}${p === "Ra" || p === "Ke" || !dg(dignity(p, s(p))) ? "" : ` (${dg(dignity(p, s(p))).slice(2)})`}`).join(" and ")} sit${in10.length === 1 ? "s" : ""} in it. ` : "No planet sits in it, so it is read from its lord. "}${on10.length ? `${on10.map(NAME).join(" and ")} look${on10.length === 1 ? "s" : ""} at it${on10.includes("Ju") ? "; Guru's sight brings trust and growth" : ""}${on10.includes("Sa") ? "; Sani's sight adds responsibility and a slow, durable climb" : ""}.` : ""}`,
  );

  // 2. The 10th lord.
  const d10 = dignity(L10, s(L10));
  const h10 = h(L10);
  add(
    DIGNITY_SCORE[d10] * 0.75 + (KENDRA.includes(h10) || TRINE.includes(h10) || h10 === 11 ? 1.5 : h10 === 2 ? 1 : DUSTHANA.includes(h10) ? -1 : 0) + (amsa[L10].d9 === "exalted" || amsa[L10].d9 === "own" || amsa[L10].vargottama ? 1 : amsa[L10].d9 === "debilitated" ? -1 : 0) + amsa[L10].career * 0.5,
    `10th lord ${NAME(L10)} in your ${ordinal(h10)} house`,
    `${NAME(L10)} carries the career. It is in ${RASI[s(L10)].ta}${dg(d10)}, the house of ${houseTopic(h10).split(/[,;]/)[0]}${h10 === 10 ? ": the lord in its own house, a career that stands on its own strength" : ""}. In the navamsa it is ${amsa[L10].d9 === "neutral" ? "ordinary" : amsa[L10].d9 === "own" ? "in its own sign" : amsa[L10].d9}, and in the dasamsa ${amsa[L10].d10 === "neutral" ? "ordinary" : amsa[L10].d10 === "own" ? "in its own sign" : amsa[L10].d10}.`,
  );
  mark(L10, 3, "10th lord", "rise");
  field(L10, 3, "your 10th lord");

  // 3. Employment and gains: the 6th and 11th lords.
  const d6 = dignity(L6, s(L6));
  const h6 = h(L6);
  add(
    (h6 === 10 || h6 === 11 || h6 === 6 ? 1 : DUSTHANA.includes(h6) && h6 !== 6 ? -0.5 : 0) + (d6 === "exalted" || d6 === "own" ? 0.5 : d6 === "debilitated" ? -0.5 : 0),
    `6th lord ${NAME(L6)} in your ${ordinal(h6)} house`,
    `The 6th is employment, daily work and competition. Its lord ${NAME(L6)} is in ${RASI[s(L6)].ta}${dg(d6)}${h6 === 11 ? ": service that turns into income" : h6 === 10 ? ": employment at the centre of the career" : ""}.${isCombust(L6, pos[L6], pos.Su) ? " It is combust, so credit for your work can go to others unless you document it." : ""}`,
  );
  mark(L6, 2, "6th lord (employment)", "change");
  field(L6, 1, "your 6th lord (daily work)");
  const d11 = dignity(L11, s(L11));
  add(
    (d11 === "exalted" || d11 === "own" ? 1 : d11 === "debilitated" ? -0.5 : 0) + (KENDRA.includes(h(L11)) || TRINE.includes(h(L11)) || h(L11) === 11 || h(L11) === 2 ? 0.75 : DUSTHANA.includes(h(L11)) ? -0.5 : 0),
    `11th lord ${NAME(L11)} in your ${ordinal(h(L11))} house`,
    `The 11th is gains, promotions and the network that brings them. ${NAME(L11)} is in ${RASI[s(L11)].ta}${dg(d11)}${h(L11) === 1 ? ": gains come through your own initiative and name" : ""}${amsa[L11].d9 === "debilitated" ? ", though it falls in the navamsa, so results come in bursts" : ""}.`,
  );
  mark(L11, 1.5, "11th lord (gains, promotion)", "rise");
  mark(L2, 1, "2nd lord (income)");

  // 4. Lagna lord and the natural significators.
  const d1 = dignity(L1, s(L1));
  const nb = findYogas(n).some((y) => y.id === `nb-${L1}`);
  add(
    (d1 === "exalted" || d1 === "own" ? 1 : d1 === "debilitated" ? (nb ? -0.25 : -1) : 0) + (KENDRA.includes(h(L1)) || TRINE.includes(h(L1)) ? 0.5 : DUSTHANA.includes(h(L1)) ? -0.5 : 0),
    `Lagna lord ${NAME(L1)} in your ${ordinal(h(L1))} house`,
    `The lagna lord is your own drive and staying power. ${NAME(L1)} is in ${RASI[s(L1)].ta}${dg(d1)}${d1 === "debilitated" && nb ? ", with the debilitation cancelled: a slow start and a later, harder-won rise" : ""}.`,
  );
  mark(L1, 1.5, "lagna lord", "rise");
  const su = dignity("Su", s("Su"));
  const sa = dignity("Sa", s("Sa"));
  add(
    (su === "exalted" || su === "own" ? 0.75 : su === "debilitated" ? -0.75 : 0) + (amsa.Su.career >= 1.5 ? 0.75 : 0) + (sa === "exalted" || sa === "own" ? 0.75 : 0) + (amsa.Sa.career >= 1.5 ? 0.75 : 0) + ([10, 11, 1].includes(h("Su")) ? 0.5 : 0),
    "Suriyan and Sani, the significators",
    `Suriyan stands for authority and recognition: in ${RASI[s("Su")].ta}, your ${ordinal(h("Su"))}${dg(su)}${amsa.Su.d10 === "exalted" ? ", and exalted in the dasamsa, which is strong for rank" : amsa.Su.d10 === "own" ? ", and in its own sign in the dasamsa" : ""}. Sani stands for work and endurance: in ${RASI[s("Sa")].ta}, your ${ordinal(h("Sa"))}${dg(sa)}${amsa.Sa.word === "Gains" ? ", recovering in the navamsa" : ""}.`,
  );
  mark("Su", 1, "significator of authority", "rise");
  if (L8 !== L1 && L8 !== L10) mark(L8, 1, "8th lord (sudden turns)", "change");
  for (const p of PLANETS) if (p !== "Ra" && p !== "Ke" && amsa[p].career >= 1.5) {
    mark(p, 1, `${amsa[p].d10 === "exalted" ? "exalted" : "in its own sign"} in the dasamsa`, "rise");
    field(p, 2, `${amsa[p].d10 === "exalted" ? "exalted" : "own sign"} in the dasamsa`);
  }

  // 5. Amatyakaraka: the planet second in degree within its sign (seven-planet scheme).
  const seven: PlanetId[] = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa"];
  const ranked = [...seven].sort((a, b) => (pos[b] % 30) - (pos[a] % 30));
  const amk = ranked[1];
  const dAmk = dignity(amk, s(amk));
  add(
    (dAmk === "exalted" || dAmk === "own" ? 1 : dAmk === "debilitated" ? -0.75 : 0.25) + (amsa[amk].d9 === "debilitated" ? -0.5 : amsa[amk].d9 === "exalted" || amsa[amk].d9 === "own" ? 0.5 : 0),
    `Amatyakaraka ${NAME(amk)}`,
    `In Jaimini's scheme the planet second in degree is the minister who carries out the soul's aims, and is read for the kind of work you do. Yours is ${NAME(amk)}, in ${RASI[s(amk)].ta}, your ${ordinal(h(amk))}${dg(dAmk)}: ${PLANET_CAREER[amk]}.${amsa[amk].d9 === "debilitated" ? " It falls in the navamsa, so this ability needs steady practice to stay sharp." : ""}`,
  );
  mark(amk, 2, "amatyakaraka (the career significator)", "rise");
  field(amk, 2.5, "your amatyakaraka");
  field(L1, 1, "your lagna lord");

  // 6. Yogas that bear on career.
  const careerYogas = findYogas(n).filter((y) => y.tone === "good" && (y.group === "Pancha Mahapurusha" || y.id.startsWith("yk-") || y.id === "amala" || y.id === "budhaditya") && y.planets.some((p) => [10, 1, 11].includes(h(p))));
  if (careerYogas.length) add(Math.min(2, careerYogas.length * 0.75), "Yogas that lift the career", `${careerYogas.map((y) => y.name).join(", ")}. Their timing and how to use them are on the Yogas page.`);

  // ---- Job or own venture ------------------------------------------------------------------
  let job = 0;
  let venture = 0;
  const jobWhy: string[] = [];
  const venWhy: string[] = [];
  if ([10, 11, 6].includes(h6)) { job += 1.25; jobWhy.push(`6th lord ${NAME(L6)} in your ${ordinal(h6)}`); }
  if (tied(L6, L10)) { job += 1.25; jobWhy.push("your 6th and 10th lords are tied"); }
  if (sees("Sa", sign10)) { job += 1; jobWhy.push("Sani's influence on the 10th, which suits institutions"); }
  if (KENDRA.includes(h("Sa")) || sa === "exalted" || sa === "own") { job += sa === "debilitated" ? 0.5 : 1; jobWhy.push(`Sani in your ${ordinal(h("Sa"))}`); }
  if (PLANETS.some((p) => h(p) === 6 && ["Sa", "Ma", "Su", "Ra"].includes(p))) { job += 1; jobWhy.push("a malefic in your 6th, good at winning within a system"); }
  const rahuHouse = h("Ra");
  if (rahuHouse === 7 || rahuHouse === 10) {
    const afflicted = (["Sa", "Ma"] as PlanetId[]).some((p) => p !== "Ra" && sees(p, s("Ra")));
    venture += afflicted ? 1 : 1.5;
    venWhy.push(`Rahu in your ${ordinal(rahuHouse)}${afflicted ? " (under a malefic's sight, so with friction)" : ""}`);
  }
  if (tied(L2, L11)) { venture += 1.5; venWhy.push("your 2nd and 11th lords are tied: wealth from self-directed work"); }
  if (h(L11) === 1 || h(L1) === 11) { venture += 1; venWhy.push("your 11th lord and lagna are joined: self-made gains"); }
  if (PLANETS.some((p) => h(p) === 3) || KENDRA.includes(h(L3)) || TRINE.includes(h(L3))) { venture += 0.75; venWhy.push("an active 3rd house or lord: initiative"); }
  if (sees("Me", sign10)) { venture += 1; venWhy.push("Budhan on the 10th: trade"); }
  if (h(L10) === 7 || h(L7) === 10 || tied(L7, L10)) { venture += 1.5; venWhy.push("your 7th and 10th lords are tied: career through clients"); }
  const s7 = DIGNITY_SCORE[dignity(L7, s(L7))] + (KENDRA.includes(h(L7)) || TRINE.includes(h(L7)) ? 0.5 : 0);
  const s6 = DIGNITY_SCORE[d6] + (KENDRA.includes(h6) || TRINE.includes(h6) ? 0.5 : 0);
  if (s7 - s6 >= 0.75) { venture += 1; venWhy.push("7th lord stronger than the 6th lord"); }
  else if (s6 - s7 >= 0.75) { job += 1; jobWhy.push("6th lord stronger than the 7th lord"); }
  mark(L7, 1.5, "7th lord (clients, partners, trade)", "venture");
  for (const p of PLANETS.filter((x) => h(x) === 7)) mark(p, 1.5, "sits in your 7th (clients and partners)", "venture");
  mark(L3, 1, "3rd lord (initiative)", "venture");
  mark("Ra", 1, "brings sudden moves", "change");
  const jobPct = Math.round((job / Math.max(1, job + venture)) * 100);
  const styleText =
    (jobPct >= 62 ? "The chart leans to employment: you do best inside an organisation, rising through it."
      : jobPct <= 38 ? "The chart leans to your own venture: clients and your own name suit you better than a hierarchy."
      : "The chart holds both. A job as the base and your own work alongside it suits you, and the balance can move towards your own work with time.") +
    ` For employment: ${jobWhy.join("; ") || "nothing strong"}. For own venture: ${venWhy.join("; ") || "nothing strong"}.`;

  for (const p of PLANETS) {
    planets[p].weight = Math.min(4, Math.round(planets[p].weight * 100) / 100);
    planets[p].reasons = (why.get(p) ?? []).sort((a, b) => b.w - a.w).map((x) => x.text);
  }
  const fields: CareerField[] = [...fieldW.entries()]
    .filter(([p]) => p !== "Ra" && p !== "Ke")
    .sort((a, b) => b[1].w - a[1].w)
    .slice(0, 5)
    .map(([p, f]) => ({ planet: p, weight: f.w, why: f.why.join(", "), field: PLANET_CAREER[p] }));

  const word: CareerWord = score >= 12 ? "Strong" : score >= 7.5 ? "Good" : score >= 3.5 ? "Moderate" : "Uneven";
  const summary =
    word === "Strong" ? "A career chart with real weight: the house of profession and its lord are both strong, and the rise is yours to work for."
    : word === "Good" ? "A good career chart: steady rise, with clear periods when it moves faster."
    : word === "Moderate" ? "A workable career chart: progress follows effort, and timing matters more than usual."
    : "The career factors are uneven: choose the field carefully and lean on the planets that are strong.";
  return { score: Math.round(score * 100) / 100, word, summary, lines, fields, job: jobPct, styleText, planets, amatyakaraka: amk };
}

// ---- Timing ---------------------------------------------------------------------------------------

export interface CareerMoment {
  t: Date;
  dasaPart: number;
  transitPart: number;
  total: number;
  level: TravelLevel;
  reasons: string[];
  leans: CareerLean[];
}

export interface CareerBaseline {
  raised: number;
  high: number;
  top: number;
}

export function careerAt(n: Natal, promise: CareerPromise, t: Date, base: CareerBaseline | null, run?: RunningDasha | null): CareerMoment {
  const reasons: string[] = [];
  const leanCount = new Map<CareerLean, number>();
  const lean = (l: CareerLean, w = 1) => leanCount.set(l, (leanCount.get(l) ?? 0) + w);
  let dasaPart = 0;
  const r = run === undefined ? runningDasha(n.mahas, t) : run;
  if (r) {
    const seen = new Set<PlanetId>();
    for (const [level, lord, mult] of [["dasa", r.maha.lord, 0.5], ["bhukti", r.bhukti.lord, 1], ["antaram", r.antaram.lord, 1]] as [string, PlanetId, number][]) {
      const cp = promise.planets[lord];
      if (cp.weight >= 1) {
        dasaPart += cp.weight * mult;
        if (cp.weight >= 2) reasons.push(seen.has(lord) ? `${NAME(lord)} also holds the ${level}` : `${NAME(lord)} ${level}: ${cp.reasons[0]}`);
        if (level !== "dasa") for (const l of cp.leans) lean(l, cp.weight / 2);
      }
      seen.add(lord);
    }
    // A change of bhukti is itself a signal of change.
    const edge = Math.min(Math.abs(t.getTime() - r.bhukti.start.getTime()), Math.abs(r.bhukti.end.getTime() - t.getTime())) / MS_DAY;
    if (edge <= 40) { dasaPart += 1; lean("change", 1.5); reasons.push("A change of bhukti falls within six weeks, which is itself a mark of change"); }
  }

  let transitPart = 0;
  const ju = signOf(siderealLongitude("Ju", t));
  const sa = signOf(siderealLongitude("Sa", t));
  const ra = signOf(siderealLongitude("Ra", t));
  const L10 = n.lordOf(10);
  const sign10 = (n.lagnaSign + 9) % 12;
  const sign6 = (n.lagnaSign + 5) % 12;
  const sign11 = (n.lagnaSign + 10) % 12;
  const touch = (p: "Ju" | "Sa", cur: number, sign: number) => (cur === sign ? "over" : aspects(p, cur, sign) ? "look" : null);
  const doubles: string[] = [];

  // The 10th house and its lord.
  const core: [number, string, number, number, number][] = [
    [sign10, "your 10th house", 2.5, 1.5, 1.25],
    [signOf(n.positions[L10]), `your 10th lord ${NAME(L10)}`, 1.5, 1.5, 1],
  ];
  const done = new Set<number>();
  for (const [sign, label, over, look, sat] of core) {
    if (done.has(sign)) continue;
    done.add(sign);
    const j = touch("Ju", ju, sign);
    const k = touch("Sa", sa, sign);
    if (j) { transitPart += j === "over" ? over : look; lean("rise", 1.5); reasons.push(j === "over" ? `Guru is crossing ${label}` : `Guru looks at ${label}`); }
    if (k) { transitPart += sat; lean("change", 1); reasons.push(k === "over" ? `Sani is crossing ${label}: restructuring and a heavier role` : `Sani looks at ${label}: more responsibility`); }
    if (j && k) doubles.push(label);
  }
  if (doubles.length) { transitPart += 2; lean("rise", 1); reasons.push(`Guru and Sani both touch ${doubles[0]} at once (double transit)`); }

  // Employment, gains and the self.
  const j6 = touch("Ju", ju, sign6);
  const k6 = touch("Sa", sa, sign6);
  if (j6) { transitPart += j6 === "over" ? 1 : 0.75; lean("change", 0.75); reasons.push(j6 === "over" ? "Guru is crossing your 6th house of employment" : "Guru looks at your 6th house of employment"); }
  if (k6) { transitPart += 0.75; lean("change", 1); reasons.push(k6 === "over" ? "Sani is crossing your 6th house: a change in daily work" : "Sani looks at your 6th house: a change in daily work"); }
  const j11 = touch("Ju", ju, sign11);
  if (j11) { transitPart += j11 === "over" ? 1.5 : 0.75; lean("rise", 1); reasons.push(j11 === "over" ? "Guru is crossing your 11th house of gains" : "Guru looks at your 11th house of gains"); }
  if (touch("Ju", ju, n.lagnaSign)) { transitPart += 1; lean("rise", 0.5); reasons.push(ju === n.lagnaSign ? "Guru is crossing your lagna" : "Guru looks at your lagna"); }
  if (ju === n.moonSign) { transitPart += 0.75; reasons.push("Guru is crossing your Moon sign"); }
  if (ju === signOf(n.positions.Su)) { transitPart += 0.75; lean("rise", 0.5); reasons.push("Guru is crossing your Suriyan"); }
  if (ra === sign10) { transitPart += 1.5; lean("change", 1); reasons.push("Rahu is crossing your 10th house: sudden moves and ambition"); }
  else if (ra === sign6) { transitPart += 0.75; lean("change", 0.75); reasons.push("Rahu is crossing your 6th house"); }

  const total = dasaPart + transitPart;
  const level: TravelLevel = !base ? "ordinary" : total >= base.high && dasaPart >= 3 && transitPart >= 2.5 ? "high" : total >= base.raised ? "raised" : "ordinary";
  const leans = [...leanCount.entries()].filter(([, w]) => w >= 1.5).sort((a, b) => b[1] - a[1]).map(([l]) => l);
  return { t, dasaPart: Math.round(dasaPart * 100) / 100, transitPart: Math.round(transitPart * 100) / 100, total: Math.round(total * 100) / 100, level, reasons, leans };
}

/** Rank against the working years, 21 to 60. */
export function careerBaseline(n: Natal, promise: CareerPromise): CareerBaseline {
  const start = n.birth.getTime() + 21 * 365.25 * MS_DAY;
  const totals: number[] = [];
  for (let i = 0; i < 39 * 24; i++) totals.push(careerAt(n, promise, new Date(start + i * 15.2 * MS_DAY), null).total);
  totals.sort((a, b) => a - b);
  const q = (f: number) => totals[Math.min(totals.length - 1, Math.floor(totals.length * f))];
  return { raised: q(0.6), high: q(0.84), top: q(0.95) };
}

export interface CareerWindow {
  start: Date;
  end: Date;
  level: TravelLevel;
  peak: number;
  strongest: { start: Date; end: Date }[];
  reasons: string[];
  leans: CareerLean[];
}

export function careerWindows(n: Natal, promise: CareerPromise, base: CareerBaseline, from: Date, years = 4, stepDays = 3): { samples: CareerMoment[]; windows: CareerWindow[] } {
  const samples: CareerMoment[] = [];
  const steps = Math.ceil((years * 365.25) / stepDays);
  for (let i = 0; i <= steps; i++) samples.push(careerAt(n, promise, new Date(from.getTime() + i * stepDays * MS_DAY), base));
  const windows: CareerWindow[] = [];
  let group: CareerMoment[] = [];
  const flush = () => {
    if (!group.length) return;
    const peak = Math.max(...group.map((m) => m.total));
    const strongest: { start: Date; end: Date }[] = [];
    for (const m of group) {
      if (m.total < base.top || m.level !== "high") continue;
      const last = strongest[strongest.length - 1];
      const end = new Date(m.t.getTime() + stepDays * MS_DAY);
      if (last && m.t.getTime() - last.end.getTime() <= stepDays * MS_DAY) last.end = end;
      else strongest.push({ start: m.t, end });
    }
    const counts = new Map<string, number>();
    for (const m of group) for (const r of m.reasons) counts.set(r, (counts.get(r) ?? 0) + 1);
    const reasons = [...counts.entries()].filter(([, c]) => c >= group.length * 0.34).sort((a, b) => b[1] - a[1]).map(([r]) => r);
    const lc = new Map<CareerLean, number>();
    for (const m of group) for (const l of m.leans) lc.set(l, (lc.get(l) ?? 0) + 1);
    const leans = [...lc.entries()].filter(([, c]) => c >= group.length * 0.4).sort((a, b) => b[1] - a[1]).map(([l]) => l);
    windows.push({ start: group[0].t, end: new Date(group[group.length - 1].t.getTime() + stepDays * MS_DAY), level: group[0].level, peak, strongest, reasons, leans });
    group = [];
  };
  for (const m of samples) {
    if (group.length && group[0].level !== m.level) flush();
    group.push(m);
  }
  flush();
  // Fold blips shorter than twelve days into the stretch before them, then join neighbours of one level.
  const smooth: CareerWindow[] = [];
  for (const w of windows) {
    const prev = smooth[smooth.length - 1];
    const short = w.end.getTime() - w.start.getTime() < 12 * MS_DAY;
    if (prev && (short || prev.level === w.level)) {
      prev.end = w.end;
      if (prev.level === w.level) {
        prev.peak = Math.max(prev.peak, w.peak);
        prev.strongest.push(...w.strongest);
        for (const r of w.reasons) if (!prev.reasons.includes(r)) prev.reasons.push(r);
        for (const l of w.leans) if (!prev.leans.includes(l)) prev.leans.push(l);
      }
    } else smooth.push({ ...w, strongest: [...w.strongest], reasons: [...w.reasons], leans: [...w.leans] });
  }
  return { samples, windows: smooth };
}
