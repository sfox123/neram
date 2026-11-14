// Thirumanam: marriage.
//
// Read in the same three layers as travel:
//   1. Promise: the 7th house and its lord, Sukran (the significator of marriage in a man's
//      chart), the 2nd house of family, and the navamsa, which is the marriage chart proper.
//      Alongside it, the pace: Sani's sight on the 7th, its lord or Sukran, the nodes across
//      the lagna and 7th, and a 7th lord in a hidden house are the classical delay marks.
//   2. Timing: the periods of the 7th lord, planets in the 7th, Sukran and the planets tied to
//      them, sharpened when Guru crosses or looks at the 7th house, its lord, Sukran or the
//      lagna, and most of all when Guru and Sani touch the same one of these together (the
//      double transit). Guru balam, Guru in the 2nd, 5th, 7th, 9th or 11th from the Moon, is
//      the Tamil almanac's own test.
//   3. Sevvai dosham, checked from lagna, Moon and Sukran, with its cancellations.
// The windows are stretches when proposals and decisions are more likely to come to a head.
// They are not wedding dates.

import { houseTopic, Natal, ordinal } from "./chart";
import { houseFrom, PLANET_INFO, PlanetId, PLANETS, RASI, signOf } from "./constants";
import { RunningDasha, runningDasha } from "./dasha";
import { aspects, dignity, isCombust } from "./dignity";
import { siderealLongitude } from "./ephemeris";
import { MS_DAY } from "./time";
import { TravelLevel, TravelLine } from "./travel";
import { buildVarga, vargaStrength } from "./vargas";

const NAME = (p: PlanetId) => PLANET_INFO[p].ta;
const KENDRA = [1, 4, 7, 10];
const TRINE = [5, 9];
const DUSTHANA = [6, 8, 12];
const BENEFIC: PlanetId[] = ["Ju", "Ve", "Me", "Mo"];
const MALEFIC: PlanetId[] = ["Su", "Ma", "Sa", "Ra", "Ke"];

/** The partner's nature by the sign on the 7th house (rasi) or the 7th of the navamsa. */
const SPOUSE_SIGN: string[] = [
  "direct, energetic and independent; quick to act and quick to cool",
  "steady, loyal and fond of comfort; slow to change, good with money",
  "talkative, curious and youthful; needs variety and conversation",
  "caring, protective and home-loving; feels deeply and remembers everything",
  "proud, warm and generous; wants respect and to be noticed",
  "careful, practical and exacting; shows love by looking after details",
  "graceful, fair-minded and sociable; values harmony and good taste",
  "intense, private and strong-willed; loyal once trust is given",
  "principled, optimistic and outspoken; values learning and freedom",
  "serious, dutiful and hard-working; ambitious and dependable",
  "independent, thoughtful and a little detached; a friend first",
  "gentle, imaginative and giving; sensitive to mood and atmosphere",
];

/** Where the partner tends to come from, by the house the 7th lord sits in. */
const SEVENTH_LORD_IN: Record<number, string> = {
  1: "someone who comes to you, or whom you choose very much yourself; the marriage is central to who you become",
  2: "through the family circle, or a match the family takes a hand in; the marriage adds to the household and its resources",
  3: "through siblings, neighbours, short travel or communication; your own effort finds the match",
  4: "from a familiar home background; a family-minded partner, and comfort at home after marriage",
  5: "through romance, study or shared interests; a self-chosen bond",
  6: "through the workplace or service; the match needs patience and adjustment",
  7: "a strong, independent partner; the marriage stands on its own feet",
  8: "from an unexpected quarter; sudden developments, and the partner's resources matter",
  9: "from a distance, a different place or background, or through teachers and elders; fortune rises after marriage",
  10: "through work or public life; a career-minded partner",
  11: "through friends and networks; gains through the partner",
  12: "from far away or abroad; a marriage with a foreign or distant element",
};

const SPOUSE_PLANET: Record<PlanetId, string> = {
  Su: "dignified, principled and used to leading",
  Mo: "caring, changeable and emotionally expressive",
  Ma: "energetic, practical and direct",
  Me: "intelligent, witty and good with words or numbers",
  Ju: "educated, principled and wise; an adviser by nature",
  Ve: "charming, artistic and affectionate",
  Sa: "mature, serious and hard-working; possibly older in years or outlook",
  Ra: "unconventional, ambitious and from a different background",
  Ke: "quiet, inward and spiritually inclined",
};

// ---- Sevvai dosham -----------------------------------------------------------------------------

export interface SevvaiDosham {
  from: { ref: "lagna" | "Moon" | "Sukran"; house: number }[];
  cancels: string[];
  verdict: "none" | "cancelled" | "mild" | "present";
  text: string;
}

export function sevvaiDosham(n: Natal): SevvaiDosham {
  const ms = signOf(n.positions.Ma);
  const refs: [SevvaiDosham["from"][number]["ref"], number][] = [["lagna", n.lagnaSign], ["Moon", n.moonSign], ["Sukran", signOf(n.positions.Ve)]];
  const from = refs.map(([ref, sign]) => ({ ref, house: houseFrom(sign, ms) })).filter((x) => [1, 2, 4, 7, 8, 12].includes(x.house));
  const cancels: string[] = [];
  const dig = dignity("Ma", ms);
  if (dig === "exalted") cancels.push(`Sevvai is exalted in ${RASI[ms].ta}`);
  if (dig === "own") cancels.push(`Sevvai is in its own sign ${RASI[ms].ta}`);
  const js = signOf(n.positions.Ju);
  if (js === ms) cancels.push("Guru sits with Sevvai");
  else if (aspects("Ju", js, ms)) cancels.push("Guru looks at Sevvai");
  const bs = signOf(n.positions.Me);
  if (bs === ms || aspects("Me", bs, ms)) cancels.push("Budhan is with or looks at Sevvai");
  const softeners = (["Sa", "Ra", "Ke"] as PlanetId[]).filter((p) => signOf(n.positions[p]) === ms || aspects(p, signOf(n.positions[p]), ms));
  const strong = cancels.length > 0;
  const verdict: SevvaiDosham["verdict"] = !from.length ? "none" : strong ? "cancelled" : from.length === 1 || softeners.length ? "mild" : "present";
  const where = from.map((x) => `${ordinal(x.house)} from ${x.ref === "lagna" ? "your lagna" : x.ref === "Moon" ? "your Moon" : "Sukran"}`).join(", ");
  const text =
    verdict === "none" ? "Sevvai is not in the 1st, 2nd, 4th, 7th, 8th or 12th from your lagna, Moon or Sukran. No Sevvai dosham."
    : verdict === "cancelled" ? `By placement it is there: Sevvai is ${where}. But ${cancels.join(", and ")}, which is the first of the classical cancellations: a dignified Sevvai protects, it does not disturb. Treat it as cancelled; a matchmaker may still want the other chart to carry a similar Sevvai.`
    : verdict === "mild" ? `Sevvai is ${where}.${softeners.length ? ` ${softeners.map(NAME).join(" and ")} with or looking at Sevvai is counted by some authorities as easing it.` : ""} A mild dosham: best matched with a chart that has the same.`
    : `Sevvai is ${where}, with none of the main cancellations. By tradition this is matched with a partner whose chart carries the same dosham.`;
  return { from, cancels, verdict, text };
}

// ---- Promise -----------------------------------------------------------------------------------

export type MarriageWord = "Clear" | "Good" | "Mixed" | "Hard";
export type Pace = "early" | "usual" | "late";

export interface MarriagePlanet {
  planet: PlanetId;
  weight: number;
  reasons: string[];
}

export interface MarriagePromise {
  score: number;
  word: MarriageWord;
  delay: number;
  pace: Pace;
  paceText: string;
  summary: string;
  lines: TravelLine[];
  delayLines: TravelLine[];
  partner: TravelLine[];
  /** 0..100: how far the chart leans to a self-chosen match against a family-arranged one. */
  love: number;
  kindText: string;
  dosham: SevvaiDosham;
  planets: Record<PlanetId, MarriagePlanet>;
  darakaraka: PlanetId;
}

export function marriagePromise(n: Natal): MarriagePromise {
  const pos = n.positions;
  const s = (p: PlanetId) => signOf(pos[p]);
  const h = (p: PlanetId) => n.house[p];
  const d9 = buildVarga(n, "D9");
  const amsa = vargaStrength(n);
  const sign7 = (n.lagnaSign + 6) % 12;
  const L1 = n.lordOf(1), L2 = n.lordOf(2), L5 = n.lordOf(5), L7 = n.lordOf(7), L11 = n.lordOf(11);
  const lines: TravelLine[] = [];
  const delayLines: TravelLine[] = [];
  let score = 0;
  let delay = 0;
  const add = (w: number, title: string, detail: string) => {
    score += w;
    lines.push({ title, detail, tone: w > 0.25 ? "good" : w < -0.25 ? "bad" : "neutral" });
  };
  const slow = (w: number, title: string, detail: string) => {
    delay += w;
    delayLines.push({ title, detail, tone: "bad" });
  };
  const planets = {} as Record<PlanetId, MarriagePlanet>;
  for (const p of PLANETS) planets[p] = { planet: p, weight: 0, reasons: [] };
  const why = new Map<PlanetId, { w: number; text: string }[]>();
  const mark = (p: PlanetId, w: number, reason: string) => {
    planets[p].weight += w;
    why.set(p, [...(why.get(p) ?? []), { w, text: reason }]);
  };
  const sees = (p: PlanetId, sign: number) => s(p) === sign || aspects(p, s(p), sign);

  // 1. Sukran, the significator.
  const vd = dignity("Ve", s("Ve"));
  const vCombust = isCombust("Ve", pos.Ve, pos.Su);
  const guruOnVenus = sees("Ju", s("Ve"));
  add(
    (vd === "exalted" ? 2 : vd === "own" ? 2 : vd === "debilitated" ? -2 : vd === "enemy" ? -0.5 : 0.5) + (amsa.Ve.d9 === "exalted" || amsa.Ve.d9 === "own" || amsa.Ve.vargottama ? 1 : amsa.Ve.d9 === "debilitated" ? -1 : 0) + (vCombust ? -1 : 0) + (guruOnVenus ? 1 : 0),
    `Sukran in ${RASI[s("Ve")].ta}, your ${ordinal(h("Ve"))} house`,
    `Sukran stands for marriage and the wife in a man's chart. It is ${vd === "own" ? "in its own sign" : vd === "neutral" ? "in a neutral sign" : vd === "friend" ? "in a friend's sign" : vd === "enemy" ? "in an enemy's sign" : vd}${amsa.Ve.d9 === "exalted" ? ", and exalted in the navamsa" : amsa.Ve.d9 === "own" ? ", and in its own sign in the navamsa" : amsa.Ve.vargottama ? ", and vargottama" : amsa.Ve.d9 === "debilitated" ? ", but debilitated in the navamsa" : ""}${vCombust ? ", though combust" : ""}.${guruOnVenus ? " Guru's sight falls on it, which protects the marriage." : ""}${vd === "own" || vd === "exalted" ? " A strong Sukran promises that marriage happens and that it brings comfort." : ""}`,
  );
  mark("Ve", 3, "significator of marriage");

  // 2. The 7th lord.
  const d7 = dignity(L7, s(L7));
  const h7 = h(L7);
  add(
    (d7 === "exalted" || d7 === "own" ? 1.5 : d7 === "debilitated" ? -1.5 : 0) + (KENDRA.includes(h7) || TRINE.includes(h7) || h7 === 11 ? 1.5 : h7 === 2 ? 1 : DUSTHANA.includes(h7) ? -1.5 : 0) + (amsa[L7].d9 === "exalted" || amsa[L7].d9 === "own" || amsa[L7].vargottama ? 0.75 : amsa[L7].d9 === "debilitated" ? -0.75 : 0),
    `7th lord ${NAME(L7)} in your ${ordinal(h7)} house`,
    `The 7th house is marriage and its lord carries it. ${NAME(L7)} is in ${RASI[s(L7)].ta}${d7 === "exalted" ? ", exalted" : d7 === "own" ? ", its own sign" : d7 === "debilitated" ? ", debilitated" : ""}, the house of ${houseTopic(h7).split(/[,;]/)[0]}: ${SEVENTH_LORD_IN[h7]}.`,
  );
  mark(L7, 3, "7th lord");
  const disp = RASI[s(L7)].lord;
  if (disp !== L7) mark(disp, 1, `lord of the sign your 7th lord sits in`);
  for (const p of PLANETS) if (p !== L7 && p !== "Ra" && p !== "Ke" && s(p) === s(L7)) mark(p, 1, `sits with your 7th lord`);

  // 3. The 7th house itself.
  const in7 = PLANETS.filter((p) => h(p) === 7);
  const lookers = PLANETS.filter((p) => h(p) !== 7 && aspects(p, s(p), sign7));
  const goodOn7 = [...in7, ...lookers].filter((p) => BENEFIC.includes(p));
  const badOn7 = [...in7, ...lookers].filter((p) => MALEFIC.includes(p));
  add(
    goodOn7.length * 1 - in7.filter((p) => MALEFIC.includes(p)).length * 1 - lookers.filter((p) => MALEFIC.includes(p)).length * 0.5,
    `${RASI[sign7].ta} on your 7th house`,
    `${in7.length ? `${in7.map(NAME).join(" and ")} sit${in7.length === 1 ? "s" : ""} in it` : "No planet sits in it"}${lookers.length ? `; ${lookers.map(NAME).join(" and ")} look${lookers.length === 1 ? "s" : ""} at it` : ""}. ${goodOn7.length ? `${goodOn7.map(NAME).join(" and ")} ${goodOn7.length === 1 ? "is a benefic influence" : "are benefic influences"}, which eases the marriage. ` : ""}${badOn7.length ? `${badOn7.map(NAME).join(" and ")} ${badOn7.length === 1 ? "is a hard influence" : "are hard influences"}: the marriage asks for patience and some adjustment on both sides.` : ""}`,
  );
  for (const p of in7) mark(p, 3, "sits in your 7th house");
  for (const p of lookers) mark(p, 1.5, "looks at your 7th house");

  // 4. The 2nd house: family.
  const d2 = dignity(L2, s(L2));
  const in2 = PLANETS.filter((p) => h(p) === 2);
  add(
    (in2.some((p) => BENEFIC.includes(p)) ? 0.75 : 0) + (KENDRA.includes(h(L2)) || TRINE.includes(h(L2)) ? 0.5 : DUSTHANA.includes(h(L2)) ? -0.5 : 0) + (d2 === "debilitated" ? -0.5 : d2 === "exalted" || d2 === "own" ? 0.5 : 0),
    `2nd house of family: lord ${NAME(L2)} in your ${ordinal(h(L2))}`,
    `The 2nd is the family you build. ${in2.length ? `${in2.map(NAME).join(" and ")} in it. ` : ""}Its lord ${NAME(L2)} is in ${RASI[s(L2)].ta}${d2 === "debilitated" ? ", debilitated" : d2 === "exalted" ? ", exalted" : d2 === "own" ? ", its own sign" : ""}${amsa[L2].word === "Gains" ? ", and recovers in the navamsa" : ""}.`,
  );
  mark(L2, 1.5, "2nd lord (family)");
  if (L1 !== L2) mark(L1, 1.5, "lagna lord");
  else mark(L1, 0, "also your lagna lord");
  mark(L11, 1, "11th lord (wishes fulfilled)");
  mark(L5, 0.5, "5th lord (affection)");

  // 5. The navamsa.
  const n7sign = (d9.lagnaSign + 6) % 12;
  const n7lord = d9.lordOf(7);
  const n7 = d9.planets[n7lord];
  const nIn7 = d9.inHouse(7);
  add(
    (n7.dignity === "exalted" || n7.dignity === "own" ? 1 : n7.dignity === "debilitated" ? -1 : 0) + (DUSTHANA.includes(n7.house) ? -0.75 : KENDRA.includes(n7.house) || TRINE.includes(n7.house) ? 0.75 : 0) + nIn7.filter((p) => BENEFIC.includes(p)).length * 0.75 - nIn7.filter((p) => ["Sa", "Ma", "Ra", "Ke"].includes(p)).length * 0.75,
    `Navamsa: ${RASI[n7sign].ta} on the 7th`,
    `The navamsa is the marriage chart proper. Its 7th is ${RASI[n7sign].ta}, ${nIn7.length ? `holding ${nIn7.map(NAME).join(" and ")}` : "with no planet in it"}. Its lord ${NAME(n7lord)} is in the ${ordinal(n7.house)} of the navamsa${n7.dignity === "exalted" ? ", exalted" : n7.dignity === "own" ? ", in its own sign" : n7.dignity === "debilitated" ? ", debilitated" : n7.dignity === "friend" ? ", in a friend's sign" : ""}. Sukran there is ${d9.planets.Ve.dignity === "exalted" ? "exalted" : d9.planets.Ve.dignity === "own" ? "in its own sign" : d9.planets.Ve.dignity === "debilitated" ? "debilitated" : "ordinary"}, in the ${ordinal(d9.planets.Ve.house)}.`,
  );
  mark(n7lord, 1.5, "lord of the 7th of the navamsa");

  // 6. Darakaraka: the planet with the lowest degree stands for the spouse (Jaimini).
  const seven: PlanetId[] = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa"];
  const dk = seven.reduce((a, b) => (pos[b] % 30 < pos[a] % 30 ? b : a));
  mark(dk, 2, "darakaraka (significator of the spouse)");

  // ---- Pace ------------------------------------------------------------------------------
  const saOn: string[] = [];
  if (sees("Sa", sign7)) saOn.push("your 7th house");
  if (L7 !== "Sa" && sees("Sa", s(L7))) saOn.push(`your 7th lord ${NAME(L7)}`);
  if (sees("Sa", s("Ve"))) saOn.push("Sukran");
  if (saOn.length) slow(Math.min(2, saOn.length), `Sani's sight on ${saOn.join(" and ")}`, "Sani's influence on the 7th house, its lord or Sukran is the commonest mark of a later marriage. It delays, and then gives a mature and lasting one; often in Sani's own periods, or after the late twenties.");
  if ([1, 7].includes(h("Ra"))) slow(1, `Rahu and Ketu across your lagna and 7th`, "The nodes on this axis make the route to marriage irregular: proposals that come close and fall through, or a match that is unusual in some way.");
  if (DUSTHANA.includes(h7)) slow(1, `7th lord in your ${ordinal(h7)}`, "A 7th lord in the 6th, 8th or 12th takes longer to deliver.");
  if (vCombust || vd === "debilitated") slow(1, "Sukran weakened", "A combust or debilitated Sukran slows matters of the heart.");
  const marsOn7 = sees("Ma", sign7);
  if (marsOn7) slow(0.5, "Sevvai's sight on your 7th house", "Sevvai on the 7th brings haste and friction into the search; decisions made in a hurry get undone.");
  const dosham = sevvaiDosham(n);
  if (dosham.verdict === "present") slow(1, "Sevvai dosham", "An uncancelled Sevvai dosham narrows the field to matching charts, which takes time.");
  const pace: Pace = delay >= 2.5 ? "late" : delay >= 1.25 ? "usual" : "early";
  const paceText =
    pace === "late" ? "Later than your peers: the late twenties to early thirties is the likelier stretch, and the delay is in the chart's favour."
    : pace === "usual" ? "In the usual years, with some waiting along the way."
    : "No classical delay marks: on time, or on the early side.";

  // ---- Love or arranged ---------------------------------------------------------------------
  let love = 0;
  let arranged = 0;
  const loveWhy: string[] = [];
  const arrWhy: string[] = [];
  if ([5, 7].includes(h("Ra"))) { love += 2; loveWhy.push(`Rahu in your ${ordinal(h("Ra"))}`); }
  const link57 = L5 !== L7 && (s(L5) === s(L7) || (aspects(L5, s(L5), s(L7)) || aspects(L7, s(L7), s(L5))) || h(L5) === 7 || h(L7) === 5);
  if (link57) { love += 2; loveWhy.push("your 5th and 7th lords are tied"); }
  if ([1, 5, 7].includes(h("Ve"))) { love += 1; loveWhy.push(`Sukran in your ${ordinal(h("Ve"))}`); }
  if (s("Ve") === s("Ma") || aspects("Ma", s("Ma"), s("Ve"))) { love += 1; loveWhy.push("Sevvai touches Sukran"); }
  if ([5, 7].includes(h("Mo"))) { love += 1; loveWhy.push(`Chandran in your ${ordinal(h("Mo"))}`); }
  if (saOn.length) { arranged += 1.5; arrWhy.push("Sani's influence on the marriage factors"); }
  if (h7 === 2 || h7 === 4 || h7 === 9) { arranged += 1.5; arrWhy.push(`7th lord in your ${ordinal(h7)}, a family house`); }
  if (guruOnVenus || sees("Ju", sign7)) { arranged += 1; arrWhy.push("Guru's influence, which brings elders' blessing"); }
  if (!link57) { arranged += 1; arrWhy.push("no tie between your 5th and 7th lords"); }
  const lovePct = Math.round((love / Math.max(1, love + arranged)) * 100);
  const kindText =
    (lovePct >= 60 ? "The chart leans to a self-chosen match" : lovePct <= 40 ? "The chart leans to a family-arranged match" : "The chart is evenly split between a self-chosen and an arranged match") +
    `. For arranged: ${arrWhy.join("; ") || "nothing strong"}. For self-chosen: ${loveWhy.join("; ") || "nothing strong"}.` +
    ([5, 7].includes(h("Ra")) && lovePct < 60 ? " Rahu in the 7th often shows as a partner from a different background, or one you find yourself and the family then approves." : "");

  // ---- The partner ---------------------------------------------------------------------------
  const partner: TravelLine[] = [];
  partner.push({ title: `${RASI[sign7].ta} on the 7th`, detail: `The sign of the 7th house describes the partner as you meet them: ${SPOUSE_SIGN[sign7]}.`, tone: "neutral" });
  for (const p of in7) partner.push({ title: `${NAME(p)} in the 7th`, detail: `Adds its own colour: ${SPOUSE_PLANET[p]}.${p === "Ra" ? " Foreign links, a different community or region, or simply an unusual story of how you met." : ""}`, tone: BENEFIC.includes(p) ? "good" : "neutral" });
  partner.push({ title: `7th lord ${NAME(L7)} in your ${ordinal(h7)}`, detail: `Where the match tends to come from: ${SEVENTH_LORD_IN[h7]}.`, tone: "neutral" });
  partner.push({ title: `${RASI[n7sign].ta} on the 7th of the navamsa`, detail: `The partner's inner character, as it shows after marriage: ${SPOUSE_SIGN[n7sign]}.`, tone: "neutral" });
  partner.push({ title: `Darakaraka ${NAME(dk)}`, detail: `The planet with the lowest degree in your chart stands for the spouse: ${SPOUSE_PLANET[dk]}.${amsa[dk].vargottama ? ` ${NAME(dk)} is vargottama, a steady and dependable signature.` : ""}`, tone: amsa[dk].vargottama || amsa[dk].d9 === "exalted" ? "good" : "neutral" });

  for (const p of PLANETS) {
    planets[p].weight = Math.min(4, Math.round(planets[p].weight * 100) / 100);
    planets[p].reasons = (why.get(p) ?? []).sort((a, b) => b.w - a.w).map((x) => x.text);
  }
  const word: MarriageWord = score >= 7 ? "Clear" : score >= 4 ? "Good" : score >= 1 ? "Mixed" : "Hard";
  const summary =
    (word === "Clear" ? "Marriage is clearly promised and well supported. "
      : word === "Good" ? "Marriage is promised, with ordinary ups and downs. "
      : word === "Mixed" ? "Marriage is promised but the supports are uneven; choosing well matters more than timing. "
      : "The marriage factors are under strain; careful matching and patience matter most. ") + paceText;
  return { score: Math.round(score * 100) / 100, word, delay, pace, paceText, summary, lines, delayLines, partner, love: lovePct, kindText, dosham, planets, darakaraka: dk };
}

// ---- Timing --------------------------------------------------------------------------------------

export interface MarriageMoment {
  t: Date;
  dasaPart: number;
  transitPart: number;
  total: number;
  level: TravelLevel;
  guruBalam: boolean;
  reasons: string[];
}

export interface MarriageBaseline {
  raised: number;
  high: number;
  /** The top twentieth of the marriageable years: the strongest stretches. */
  top: number;
}

export function marriageAt(n: Natal, promise: MarriagePromise, t: Date, base: MarriageBaseline | null, run?: RunningDasha | null): MarriageMoment {
  const reasons: string[] = [];
  let dasaPart = 0;
  const r = run === undefined ? runningDasha(n.mahas, t) : run;
  if (r) {
    const seen = new Set<PlanetId>();
    for (const [level, lord, mult] of [["dasa", r.maha.lord, 0.5], ["bhukti", r.bhukti.lord, 1], ["antaram", r.antaram.lord, 1]] as [string, PlanetId, number][]) {
      const mp = promise.planets[lord];
      if (mp.weight >= 1) {
        dasaPart += mp.weight * mult;
        if (mp.weight >= 2) reasons.push(seen.has(lord) ? `${NAME(lord)} also holds the ${level}` : `${NAME(lord)} ${level}: ${mp.reasons[0]}`);
      }
      seen.add(lord);
    }
  }

  let transitPart = 0;
  const ju = signOf(siderealLongitude("Ju", t));
  const sa = signOf(siderealLongitude("Sa", t));
  const L7 = n.lordOf(7);
  const targets: [number, string, number, number][] = [
    [(n.lagnaSign + 6) % 12, "your 7th house", 2.5, 1.5],
    [signOf(n.positions[L7]), `your 7th lord ${NAME(L7)}`, 1.5, 1.5],
    [signOf(n.positions.Ve), "your Sukran", 1.5, 1.5],
    [n.lagnaSign, "your lagna", 1, 1],
  ];
  const doubles: string[] = [];
  const done = new Set<number>();
  for (const [sign, label, over, look] of targets) {
    if (done.has(sign)) continue;
    done.add(sign);
    const j = ju === sign ? "over" : aspects("Ju", ju, sign) ? "look" : null;
    const k = sa === sign ? "over" : aspects("Sa", sa, sign) ? "look" : null;
    if (j) { transitPart += j === "over" ? over : look; reasons.push(j === "over" ? `Guru is crossing ${label}` : `Guru looks at ${label}`); }
    if (k) { transitPart += 0.75; reasons.push(k === "over" ? `Sani is crossing ${label}` : `Sani looks at ${label}`); }
    if (j && k) doubles.push(label);
  }
  if (doubles.length) { transitPart += 2; reasons.push(`Guru and Sani both touch ${doubles.join(" and ")} at once (double transit)`); }
  const gm = houseFrom(n.moonSign, ju);
  const guruBalam = [2, 5, 7, 9, 11].includes(gm);
  if (guruBalam) { transitPart += 1.5; reasons.push(`Guru balam: Guru is in the ${ordinal(gm)} from your Moon`); }

  const total = dasaPart + transitPart;
  const level: TravelLevel = !base ? "ordinary" : total >= base.high && dasaPart >= 3 && transitPart >= 3 ? "high" : total >= base.raised ? "raised" : "ordinary";
  return { t, dasaPart: Math.round(dasaPart * 100) / 100, transitPart: Math.round(transitPart * 100) / 100, total: Math.round(total * 100) / 100, level, guruBalam, reasons };
}

/** Rank against the marriageable years, 21 to 45, so that a long supportive dasa does not read high throughout. */
export function marriageBaseline(n: Natal, promise: MarriagePromise): MarriageBaseline {
  const start = n.birth.getTime() + 21 * 365.25 * MS_DAY;
  const totals: number[] = [];
  for (let i = 0; i < 24 * 24; i++) totals.push(marriageAt(n, promise, new Date(start + i * 15.2 * MS_DAY), null).total);
  totals.sort((a, b) => a - b);
  const q = (f: number) => totals[Math.min(totals.length - 1, Math.floor(totals.length * f))];
  return { raised: q(0.6), high: q(0.84), top: q(0.95) };
}

export interface MarriageWindow {
  start: Date;
  end: Date;
  level: TravelLevel;
  peak: number;
  /** Stretches inside the window that rank in the top twentieth of the marriageable years. */
  strongest: { start: Date; end: Date }[];
  guruBalam: number; // share of the window with Guru balam, 0..1
  reasons: string[];
}

export function marriageWindows(n: Natal, promise: MarriagePromise, base: MarriageBaseline, from: Date, years = 5, stepDays = 3): { samples: MarriageMoment[]; windows: MarriageWindow[] } {
  const samples: MarriageMoment[] = [];
  const steps = Math.ceil((years * 365.25) / stepDays);
  for (let i = 0; i <= steps; i++) samples.push(marriageAt(n, promise, new Date(from.getTime() + i * stepDays * MS_DAY), base));
  const windows: MarriageWindow[] = [];
  let group: MarriageMoment[] = [];
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
    windows.push({
      start: group[0].t,
      end: new Date(group[group.length - 1].t.getTime() + stepDays * MS_DAY),
      level: group[0].level,
      peak,
      strongest,
      guruBalam: group.filter((m) => m.guruBalam).length / group.length,
      reasons,
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

/** Stretches of Guru balam (Guru in the 2nd, 5th, 7th, 9th or 11th from the Moon) found in a run of samples. */
export function guruBalamSpans(samples: MarriageMoment[], stepDays = 3): { start: Date; end: Date }[] {
  const out: { start: Date; end: Date }[] = [];
  let open: { start: Date; end: Date } | null = null;
  for (const m of samples) {
    if (m.guruBalam) {
      if (!open) open = { start: m.t, end: m.t };
      open.end = new Date(m.t.getTime() + stepDays * MS_DAY);
    } else if (open) {
      out.push(open);
      open = null;
    }
  }
  if (open) out.push(open);
  return out;
}
