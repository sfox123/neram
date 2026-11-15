// Amsa (divisional) charts: Navamsa (D9) and Dasamsa (D10), and vargottama.
//
// Navamsa: each sign is cut into nine parts of 3°20′, counted on from Mesham without a break,
// so the navamsa sign is the same thing as the star quarter (pada). It is read for the inner
// person and for the real strength behind each planet's rasi position.
// Dasamsa: each sign is cut into ten parts of 3°. For an odd sign the count starts from the
// sign itself; for an even sign, from the ninth sign from it (Parashara). It is read for work,
// rank and standing.
// Vargottama: a planet (or the lagna) in the same sign in rasi and navamsa.
//
// Both charts are always read against the rasi chart, never alone. Their lagnas move one sign
// for every 12 to 14 minutes of birth time, so the app also works out how far the recorded
// birth time is from the nearest change.

import { houseTopic, Natal, ordinal } from "./chart";
import { houseFrom, norm360, PLANET_INFO, PlanetId, PLANETS, RASI, signOf } from "./constants";
import { Dignity, dignity } from "./dignity";
import { lagnaLongitude } from "./ephemeris";
import { pushkaraBhaga, PushkaraHit, pushkaraNavamsa } from "./pushkara";

export type VargaKind = "D9" | "D10";

export function navamsaSign(lon: number): number {
  return Math.floor((norm360(lon) * 3) / 10 + 1e-9) % 12;
}

export function dasamsaSign(lon: number): number {
  const l = norm360(lon);
  const sign = signOf(l);
  const part = Math.min(9, Math.floor((l % 30) / 3 + 1e-9));
  const oddSign = sign % 2 === 0; // Mesham is index 0 and is an odd sign
  return (sign + (oddSign ? 0 : 8) + part) % 12;
}

export const vargaSign = (kind: VargaKind, lon: number) => (kind === "D9" ? navamsaSign(lon) : dasamsaSign(lon));

export interface VargaPlanet {
  planet: PlanetId;
  d1Sign: number;
  d1Dignity: Dignity;
  sign: number;
  house: number;
  dignity: Dignity;
  /** Same sign as in the rasi chart. In the navamsa this is vargottama. */
  sameSign: boolean;
}

export interface Varga {
  kind: VargaKind;
  lagnaSign: number;
  lagnaSameSign: boolean;
  planets: Record<PlanetId, VargaPlanet>;
  signs: Record<PlanetId, number>;
  lordOf: (house: number) => PlanetId;
  inHouse: (house: number) => PlanetId[];
}

export function buildVarga(n: Natal, kind: VargaKind, lagnaOverride?: number): Varga {
  const lagnaSign = lagnaOverride ?? vargaSign(kind, n.lagna);
  const planets = {} as Record<PlanetId, VargaPlanet>;
  const signs = {} as Record<PlanetId, number>;
  for (const p of PLANETS) {
    const d1Sign = signOf(n.positions[p]);
    const sign = vargaSign(kind, n.positions[p]);
    signs[p] = sign;
    planets[p] = { planet: p, d1Sign, d1Dignity: dignity(p, d1Sign), sign, house: houseFrom(lagnaSign, sign), dignity: dignity(p, sign), sameSign: sign === d1Sign };
  }
  return {
    kind,
    lagnaSign,
    lagnaSameSign: lagnaSign === n.lagnaSign,
    planets,
    signs,
    lordOf: (h) => RASI[(lagnaSign + h - 1) % 12].lord,
    inHouse: (h) => PLANETS.filter((p) => planets[p].house === h),
  };
}

// ---- How firm is the amsa lagna? ------------------------------------------------------------

export interface LagnaWindow {
  sign: number;
  /** The amsa lagna stays this sign for births between these two clock times. */
  from: Date;
  to: Date;
  secondsBefore: number;
  secondsAfter: number;
  prevSign: number;
  nextSign: number;
  /** True when the recorded minute is within two minutes of a change. */
  fragile: boolean;
}

export function lagnaWindow(n: Natal, kind: VargaKind): LagnaWindow {
  const { latitude, longitude } = n.profile.birthPlace;
  const at = (ms: number) => vargaSign(kind, lagnaLongitude(new Date(ms), latitude, longitude));
  const t0 = n.birth.getTime();
  const sign = at(t0);
  const edge = (dir: 1 | -1) => {
    let lo = 0;
    let hi = 0;
    for (let s = 20; s <= 3600; s += 20) {
      if (at(t0 + dir * s * 1000) !== sign) { hi = s; break; }
      lo = s;
    }
    if (!hi) return { seconds: 3600, other: sign };
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (at(t0 + dir * mid * 1000) === sign) lo = mid;
      else hi = mid;
    }
    return { seconds: hi, other: at(t0 + dir * (hi + 1) * 1000) };
  };
  const before = edge(-1);
  const after = edge(1);
  return {
    sign,
    from: new Date(t0 - before.seconds * 1000),
    to: new Date(t0 + after.seconds * 1000),
    secondsBefore: before.seconds,
    secondsAfter: after.seconds,
    prevSign: before.other,
    nextSign: after.other,
    fragile: Math.min(before.seconds, after.seconds) < 120,
  };
}

// ---- Strength across the three charts ----------------------------------------------------------

export const DIGNITY_SCORE: Record<Dignity, number> = { exalted: 2, own: 1.5, friend: 0.5, neutral: 0, enemy: -0.5, debilitated: -2 };

export type VargaWord = "Confirmed" | "Gains" | "Holds" | "Slips" | "Falls";

export interface VargaStrength {
  planet: PlanetId;
  vargottama: boolean;
  d1: Dignity;
  d9: Dignity;
  d10: Dignity;
  /** Inner strength: navamsa dignity plus vargottama, about -2..+3. */
  inner: number;
  /** Career strength: dasamsa dignity, about -2..+2. */
  career: number;
  word: VargaWord;
  note: string;
  /** In one of the 24 pushkara navamsas. */
  pushkara: PushkaraHit | null;
  /** Distance from the sign's pushkara degree, if within a degree of it. */
  bhaga: number | null;
}

const NODE: PlanetId[] = ["Ra", "Ke"];

export function vargaStrength(n: Natal): Record<PlanetId, VargaStrength> {
  const d9 = buildVarga(n, "D9");
  const d10 = buildVarga(n, "D10");
  const out = {} as Record<PlanetId, VargaStrength>;
  for (const p of PLANETS) {
    const a = d9.planets[p];
    const b = d10.planets[p];
    const node = NODE.includes(p);
    const v1 = DIGNITY_SCORE[a.d1Dignity];
    const v9 = DIGNITY_SCORE[a.dignity];
    const inner = node ? (a.sameSign ? 1 : 0) : v9 + (a.sameSign ? (a.dignity === "debilitated" ? 0 : 1) : 0);
    const career = node ? 0 : DIGNITY_SCORE[b.dignity];
    let word: VargaWord;
    let note: string;
    if (a.sameSign) {
      word = a.dignity === "debilitated" ? "Holds" : "Confirmed";
      note = a.dignity === "debilitated"
        ? "Vargottama, but in its debilitation sign in both charts: steady, yet it still needs the cancellation shown under Yogas."
        : "Vargottama: the same sign in rasi and navamsa, so it behaves the same inside and out and can be relied on.";
    } else if (node) {
      word = "Holds";
      note = `Takes its colour from ${RASI[a.sign].ta}'s lord in the navamsa.`;
    } else if (a.dignity === "exalted" || a.dignity === "own") {
      word = v1 >= 1.5 ? "Confirmed" : "Gains";
      note = v1 >= 1.5
        ? `Strong in rasi and ${a.dignity === "exalted" ? "exalted" : "in its own sign"} in navamsa: the promise is fully backed.`
        : `${a.dignity === "exalted" ? "Exalted" : "In its own sign"} in navamsa: stronger than the rasi chart shows, and it improves with age.`;
    } else if (a.dignity === "debilitated") {
      word = "Falls";
      note = v1 >= 1.5
        ? "Strong in rasi but debilitated in navamsa: the promise is real, but delivery is uneven and needs deliberate effort."
        : "Debilitated in navamsa: gives less than the rasi chart suggests.";
    } else if (v9 - v1 >= 1) {
      word = "Gains";
      note = "Better placed in navamsa than in rasi: it recovers strength over time.";
    } else if (v1 - v9 >= 1.5) {
      word = "Slips";
      note = "Less comfortable in navamsa than in rasi: good, but a notch below how it first looks.";
    } else {
      word = "Holds";
      note = "About the same standing in both charts.";
    }
    if (!node && (b.dignity === "exalted" || b.dignity === "own")) note += ` ${b.dignity === "exalted" ? "Exalted" : "In its own sign"} in the dasamsa${a.dignity === "exalted" || a.dignity === "own" ? " too" : ""}: strong for career.`;
    if (!node && b.dignity === "debilitated") note += " Debilitated in the dasamsa: its career matters need extra pushing.";
    const pushkara = pushkaraNavamsa(n.positions[p]);
    const bhaga = pushkaraBhaga(n.positions[p]);
    if (pushkara) note += ` In a pushkara navamsa (${RASI[pushkara.navamsa].ta}): nourished, so it gives well and steadily.`;
    else if (bhaga !== null) note += " On its sign's pushkara degree, which adds some of the same nourishment.";
    const lift = (pushkara ? 0.75 : 0) + (bhaga !== null ? 0.25 : 0);
    out[p] = { planet: p, vargottama: a.sameSign, d1: a.d1Dignity, d9: a.dignity, d10: b.dignity, inner: inner + lift, career, word, note, pushkara, bhaga };
  }
  return out;
}

// ---- Atmakaraka (Jaimini): the planet furthest along in its sign ----------------------------------

export function atmakaraka(n: Natal): { planet: PlanetId; degree: number; karakamsa: number } {
  const seven: PlanetId[] = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa"];
  const planet = seven.reduce((a, b) => (n.positions[b] % 30 > n.positions[a] % 30 ? b : a));
  return { planet, degree: n.positions[planet] % 30, karakamsa: navamsaSign(n.positions[planet]) };
}

// ---- Reading tables ------------------------------------------------------------------------------

/** The inner person shown by the navamsa lagna sign. */
export const NAVAMSA_NATURE: string[] = [
  "Direct, quick to act and impatient with delay. Under the surface you want to be first and to do it yourself.",
  "Steady and loyal, with a strong need for comfort and security. You change slowly and hold on to what you value.",
  "Curious and restless, always trading ideas. You need variety and conversation to feel alive.",
  "Caring and protective, moved by feeling more than you show. You attach deeply to your people and your home, and your moods rise and fall like tides.",
  "Proud and warm, with a need to be respected. You give generously and want your work to be seen.",
  "Careful and exacting, a quiet perfectionist. You show care by fixing things and worry about getting them right.",
  "Fair-minded and relationship-centred. You look for balance, dislike ugliness and conflict, and decide better with a partner.",
  "Intense and private, with strong will. You test people before trusting them and do not forget.",
  "Principled and optimistic, a seeker. You need meaning and freedom, and you speak your mind.",
  "Serious and ambitious underneath. You measure yourself by what you have built and carry duty willingly.",
  "Independent and idea-driven. You care about people in general, keep some distance in particular, and think for yourself.",
  "Gentle, imaginative and giving. You absorb the mood around you and need time alone to come back to yourself.",
];

/** The working style shown by the dasamsa lagna sign. */
export const DASAMSA_STYLE: string[] = [
  "You lead from the front and work best starting things. Initiative, speed and independence define your career; routine drains you.",
  "You build patiently and for the long term. Stability, finance and tangible results suit you; you outlast faster starters.",
  "You work through communication, versatility and networks. Several roles or skills at once is normal for you.",
  "You work as a carer and protector of a team or a public. Trust and belonging matter more to you than title.",
  "You work for recognition and command. You need authority, visibility and room to direct.",
  "You work through precision, analysis and service. Being the one who gets the details right is your route up.",
  "You work through partnership, negotiation and taste. You rise with other people, not alone.",
  "You work through depth, research and handling what others avoid. Crisis and hidden problems are where you prove yourself.",
  "You work through knowledge, advice and principle. Teaching, guiding and expanding into new territory suit you.",
  "You work through structure, responsibility and persistence. Slow, steady climbs inside organisations suit you.",
  "You work through ideas, systems and large networks. Technology, communities and reform suit you.",
  "You work through imagination, service and behind-the-scenes roles. Creative, healing or far-from-home work suits you.",
];

export const PLANET_CAREER: Record<PlanetId, string> = {
  Su: "leadership, administration, government and public roles",
  Mo: "work with the public, care, hospitality, food and anything people need daily",
  Ma: "engineering, hands-on technology, construction and land, sport, defence, surgery",
  Me: "software, data and analysis, writing, trade, accounts, communication",
  Ju: "teaching, advising, consulting, finance, law, research",
  Ve: "design, user experience, arts and media, luxury, hospitality, client relationships",
  Sa: "operations, infrastructure, large organisations, public service, long projects",
  Ra: "new technology, foreign links, unconventional or fast-growing fields",
  Ke: "research, specialist technical work, back-room and niche expertise",
};

export const DASAMSA_HOUSE: Record<number, string> = {
  1: "professional identity: how you carry yourself at work",
  2: "earning, and the resources the work builds",
  3: "initiative, skills, selling and short assignments",
  4: "base, office, property and institutions",
  5: "ideas, advice, creativity and following",
  6: "daily service, competition and problem-solving",
  7: "partners, clients and public dealing",
  8: "research, sudden change and other people's resources",
  9: "mentors, luck, teaching and foreign links",
  10: "rank, visible action and the peak of the career",
  11: "gains, networks and promotions",
  12: "work behind the scenes, abroad or in large closed institutions",
};

// ---- Readings ---------------------------------------------------------------------------------------

export interface AmsaLine {
  title: string;
  detail: string;
  tone: "good" | "bad" | "neutral";
}

const NAME = (p: PlanetId) => PLANET_INFO[p].ta;
const KENDRA = [1, 4, 7, 10];
const TRINE = [1, 5, 9];
const DUSTHANA = [6, 8, 12];
const dignityPhrase = (d: Dignity) =>
  d === "exalted" ? "exalted" : d === "own" ? "in its own sign" : d === "friend" ? "in a friend's sign" : d === "enemy" ? "in an enemy's sign" : d === "debilitated" ? "debilitated" : "in a neutral sign";
const houseTone = (h: number, d: Dignity): AmsaLine["tone"] =>
  d === "debilitated" || (DUSTHANA.includes(h) && d !== "exalted" && d !== "own") ? "bad" : KENDRA.includes(h) || TRINE.includes(h) || h === 11 || d === "exalted" || d === "own" ? "good" : "neutral";

const IN_SELF: Record<PlanetId, string> = {
  Su: "a need for dignity and to be in charge of your own life",
  Mo: "a soft, receptive core that reads other people quickly",
  Ma: "a fighter's energy at the centre of the personality",
  Me: "a quick, questioning mind that never quite switches off",
  Ju: "an inner teacher: you look for meaning and want to do right",
  Ve: "charm, a love of beauty and a wish for harmony",
  Sa: "an old head: reserve, patience and a sense of duty",
  Ra: "a hunger for more that keeps you reaching past where you are",
  Ke: "a detached streak: part of you stands apart and watches",
};

/** Navamsa: the inner person and the strength behind the rasi chart. */
export function navamsaReading(n: Natal, d9: Varga): AmsaLine[] {
  const out: AmsaLine[] = [];
  out.push({
    title: `${RASI[d9.lagnaSign].ta} navamsa lagna`,
    detail: NAVAMSA_NATURE[d9.lagnaSign] + (d9.lagnaSameSign ? " Your lagna is vargottama, the same sign in both charts: what people see is what you are, and your sense of self is hard to shake." : ` Your rasi lagna ${RASI[n.lagnaSign].ta} is the face you show; this is the person behind it.`),
    tone: d9.lagnaSameSign ? "good" : "neutral",
  });

  const lord = d9.lordOf(1);
  const lp = d9.planets[lord];
  out.push({
    title: `Its lord ${NAME(lord)} in the ${ordinal(lp.house)} of the navamsa`,
    detail: `${NAME(lord)} is ${dignityPhrase(lp.dignity)} in ${RASI[lp.sign].ta}. Your inner life turns towards ${houseTopic(lp.house)}.${DUSTHANA.includes(lp.house) ? " A hidden house: you work things out privately before showing them." : ""}`,
    tone: houseTone(lp.house, lp.dignity),
  });

  for (const p of d9.inHouse(1)) {
    const x = d9.planets[p];
    const weak = x.dignity === "debilitated";
    out.push({
      title: `${NAME(p)} in the navamsa lagna`,
      detail: `Adds ${IN_SELF[p]}.${weak ? ` It is debilitated here, so this force is strong but unsteady inside you: it can show as restlessness, irritation or pushing when waiting would serve better. Give it a physical or practical outlet every day.` : x.dignity === "exalted" || x.dignity === "own" ? " It is strong here, so this quality is a dependable part of you." : ""}`,
      tone: weak ? "bad" : x.dignity === "exalted" || x.dignity === "own" ? "good" : "neutral",
    });
  }

  const outlets = PLANETS.filter((p) => (KENDRA.includes(d9.planets[p].house) || TRINE.includes(d9.planets[p].house)) && d9.planets[p].house !== 1 && p !== "Ra" && p !== "Ke");
  if (outlets.length)
    out.push({
      title: "Where your inner strength comes out",
      detail: `Planets in the kendras and trines of the navamsa are its outlets: ${outlets.map((p) => `${NAME(p)} in the ${ordinal(d9.planets[p].house)} (${houseTopic(d9.planets[p].house).split(/[,;]/)[0]})${d9.planets[p].dignity === "exalted" ? ", exalted" : d9.planets[p].sameSign ? ", vargottama" : ""}`).join("; ")}.`,
      tone: "good",
    });

  const l1 = n.lordOf(1);
  const l1p = d9.planets[l1];
  out.push({
    title: `Your lagna lord ${NAME(l1)} in the navamsa`,
    detail: `${NAME(l1)} goes to ${RASI[l1p.sign].ta}, the ${ordinal(l1p.house)} of the navamsa, ${dignityPhrase(l1p.dignity)}. ${DUSTHANA.includes(l1p.house) ? "A lagna lord in the 6th, 8th or 12th of the navamsa asks for extra care of health and direction." : "It stays out of the 6th, 8th and 12th, which is what is wanted of a lagna lord here."}${l1p.dignity !== l1p.d1Dignity && DIGNITY_SCORE[l1p.dignity] > DIGNITY_SCORE[l1p.d1Dignity] ? " It is better placed here than in the rasi chart, so your footing improves with age." : ""}`,
    tone: DUSTHANA.includes(l1p.house) || l1p.dignity === "debilitated" ? "bad" : "good",
  });

  const ak = atmakaraka(n);
  const akHouse = houseFrom(d9.lagnaSign, ak.karakamsa);
  out.push({
    title: `Atmakaraka ${NAME(ak.planet)} in ${RASI[ak.karakamsa].ta} navamsa`,
    detail: `The planet furthest along in its sign (${Math.floor(ak.degree)}°${String(Math.floor((ak.degree % 1) * 60)).padStart(2, "0")}′) is the atmakaraka, the significator of the self; it is the same planet as your highest-degree planet on the Yogi page. Its navamsa sign is the karakamsa. Yours falls in the ${ordinal(akHouse)} house of the navamsa (${houseTopic(akHouse)}), which is where your deeper aim in life points.`,
    tone: KENDRA.includes(akHouse) || TRINE.includes(akHouse) ? "good" : DUSTHANA.includes(akHouse) ? "bad" : "neutral",
  });

  const l7 = d9.lordOf(7);
  const l7p = d9.planets[l7];
  const in7 = d9.inHouse(7);
  out.push({
    title: "Partnership: the 7th of the navamsa",
    detail: `${RASI[(d9.lagnaSign + 6) % 12].ta} is the 7th, ${in7.length ? `holding ${in7.map(NAME).join(" and ")}` : "with no planet in it"}. Its lord ${NAME(l7)} is ${dignityPhrase(l7p.dignity)} in the ${ordinal(l7p.house)}. The navamsa is the traditional chart for marriage; read this with the People page.`,
    tone: houseTone(l7p.house, l7p.dignity),
  });
  return out;
}

const careerTone = (h: number, d: Dignity): AmsaLine["tone"] =>
  d === "debilitated" || (h === 8 && d !== "exalted" && d !== "own") ? "bad" : d === "exalted" || d === "own" || KENDRA.includes(h) || TRINE.includes(h) || h === 11 || h === 2 ? "good" : "neutral";

/** Dasamsa: work, rank and standing. */
export function dasamsaReading(n: Natal, d10: Varga): AmsaLine[] {
  const out: AmsaLine[] = [];
  out.push({ title: `${RASI[d10.lagnaSign].ta} dasamsa lagna`, detail: DASAMSA_STYLE[d10.lagnaSign], tone: "neutral" });

  const lord = d10.lordOf(1);
  const lp = d10.planets[lord];
  const rasi10 = n.lordOf(10);
  out.push({
    title: `Its lord ${NAME(lord)} in the ${ordinal(lp.house)} of the dasamsa`,
    detail: `${NAME(lord)} is ${dignityPhrase(lp.dignity)} in ${RASI[lp.sign].ta}. Your working life centres on ${DASAMSA_HOUSE[lp.house]}.${lord === rasi10 ? ` ${NAME(lord)} also rules the 10th of your rasi chart, so the career on offer and the person you are at work are one and the same.` : ""}`,
    tone: careerTone(lp.house, lp.dignity),
  });

  for (const p of d10.inHouse(1))
    out.push({
      title: `${NAME(p)} in the dasamsa lagna`,
      detail: `${NAME(p)} is ${dignityPhrase(d10.planets[p].dignity)} here and stamps your professional identity with ${PLANET_CAREER[p]}.`,
      tone: d10.planets[p].dignity === "debilitated" ? "bad" : "good",
    });

  const in10 = d10.inHouse(10);
  const l10 = d10.lordOf(10);
  const l10p = d10.planets[l10];
  out.push({
    title: "The 10th of the dasamsa",
    detail: `${RASI[(d10.lagnaSign + 9) % 12].ta}, ${in10.length ? `holding ${in10.map(NAME).join(" and ")}: ${in10.map((p) => PLANET_CAREER[p]).join("; ")}` : "with no planet in it, so the peak of the career is read from its lord"}. Its lord ${NAME(l10)} is ${dignityPhrase(l10p.dignity)} in the ${ordinal(l10p.house)} (${DASAMSA_HOUSE[l10p.house]}).`,
    tone: careerTone(l10p.house, l10p.dignity),
  });

  const rp = d10.planets[rasi10];
  out.push({
    title: `Your rasi 10th lord ${NAME(rasi10)} in the dasamsa`,
    detail: `${NAME(rasi10)} goes to ${RASI[rp.sign].ta}, ${dignityPhrase(rp.dignity)}, in the ${ordinal(rp.house)} (${DASAMSA_HOUSE[rp.house]}).${rp.dignity === "exalted" || rp.dignity === "own" ? " The planet that promises your career is strong where the career is delivered." : rp.dignity === "debilitated" ? " The promise in the rasi chart loses force here; the career needs more pushing than the rasi chart suggests." : ""}${rp.house === 12 ? " The 12th points the work towards behind-the-scenes roles, foreign links or large institutions." : ""}`,
    tone: rp.dignity === "debilitated" ? "bad" : rp.dignity === "exalted" || rp.dignity === "own" ? "good" : careerTone(rp.house, rp.dignity),
  });

  const agents = PLANETS.filter((p) => KENDRA.includes(d10.planets[p].house) && d10.planets[p].house !== 1 && d10.planets[p].house !== 10);
  if (agents.length)
    out.push({
      title: "Other planets in the kendras",
      detail: `Planets in the 4th and 7th of the dasamsa also act for the career: ${agents.map((p) => `${NAME(p)} in the ${ordinal(d10.planets[p].house)} (${PLANET_CAREER[p]})`).join("; ")}.`,
      tone: "good",
    });

  const su = d10.planets.Su;
  const sa = d10.planets.Sa;
  out.push({
    title: "Suriyan and Sani, the career significators",
    detail: `Suriyan (authority) is ${dignityPhrase(su.dignity)} in the ${ordinal(su.house)}; Sani (work and staying power) is ${dignityPhrase(sa.dignity)} in the ${ordinal(sa.house)}.`,
    tone: su.dignity === "debilitated" || sa.dignity === "debilitated" ? "bad" : su.dignity === "exalted" || su.dignity === "own" || sa.dignity === "exalted" || sa.dignity === "own" ? "good" : "neutral",
  });
  return out;
}
