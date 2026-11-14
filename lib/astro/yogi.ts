// Yogi, Avayogi and Sahayogi, the karana nathan, and the high / low degree planets.
//
// These are the birth-panchangam methods taught in the Tirupur S. Gopalakrishnan (GK) school:
//   Yogi point    = Sun + Moon + 93°20'. Its star is the yoga tara; the star lord is the Yogi,
//                   the planet that brings prosperity. The lord of the sign is the Sahayogi.
//   Avayogi point = Yogi point + 186°40'. Its star lord is the Avayogi, the planet that obstructs.
//   Karana nathan = the planet ruling the karana (half-tithi) of birth; it steers the person's
//                   actions, next in importance to the lagna lord.
//   HD and LD     = the planets at the highest and lowest degree within their signs. High-degree
//                   planets act quickly and "serve" the person; low-degree planets are slow and
//                   are the ones to worship (upasana).

import { Natal, ordinal } from "./chart";
import { DASHA_ORDER, formatDeg, karanaName, nakOf, NAKSHATRA, NAK_SPAN, norm360, PLANET_INFO, PlanetId, RASI, signOf } from "./constants";
import { siderealLongitude } from "./ephemeris";
import { nakIndex } from "./panchang";
import { MS_DAY, MS_HOUR } from "./time";

const SEVEN: PlanetId[] = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa"];
const starLord = (star: number) => DASHA_ORDER[star % 9];
const starsOf = (lord: PlanetId) => [0, 1, 2].map((k) => DASHA_ORDER.indexOf(lord) + 9 * k);

// Karana nathan table as given in Tamil sources (Dinakaran; Garaja is the Moon's).
const KARANA_LORD: Record<string, PlanetId> = {
  Bava: "Ma", Balava: "Ra", Kaulava: "Sa", Taitila: "Ve", Gara: "Mo", Vanija: "Su", Vishti: "Ke",
  Shakuni: "Sa", Chatushpada: "Ju", Naga: "Ra", Kimstughna: "Me",
};
const KARANA_NOTE: Record<string, { tamil: string; animal: string; deity: string }> = {
  Bava: { tamil: "பவம்", animal: "lion", deity: "Narasimhar; Indra is the presiding deity" },
  Balava: { tamil: "பாலவம்", animal: "tiger", deity: "Ayyappan; Prajapati is the presiding deity" },
  Kaulava: { tamil: "கௌலவம்", animal: "boar", deity: "Varaha Moorthy; Mitra is the presiding deity" },
  Taitila: { tamil: "தைதுலை", animal: "donkey", deity: "Jyeshta Devi; the Pitrus preside" },
  Gara: { tamil: "கரசை", animal: "elephant", deity: "Vinayagar; Bhumadevi is the presiding deity" },
  Vanija: { tamil: "வணிசை", animal: "bull", deity: "Nandi at a Shiva temple; Sri Devi (Lakshmi) is the presiding deity" },
  Vishti: { tamil: "பத்திரை", animal: "cock", deity: "Murugan; Yama is the presiding deity" },
  Shakuni: { tamil: "சகுனி", animal: "crow", deity: "Saneeswaran; Vishnu is the presiding deity" },
  Chatushpada: { tamil: "சதுஷ்பாதம்", animal: "dog", deity: "Bhairavar; Manibhadra presides" },
  Naga: { tamil: "நாகவம்", animal: "snake", deity: "Nagaraja" },
  Kimstughna: { tamil: "கிம்ஸ்துக்னம்", animal: "worm", deity: "Dhanvantari; Vayu is the presiding deity" },
};

// Deity commonly worshipped for each planet in Tamil practice.
export const PLANET_DEITY: Record<PlanetId, string> = {
  Su: "Shiva (and Surya)",
  Mo: "Ambal (Parvati)",
  Ma: "Murugan",
  Me: "Vishnu (Perumal)",
  Ju: "Dakshinamurthy",
  Ve: "Mahalakshmi",
  Sa: "Bhairavar (and Saneeswaran)",
  Ra: "Durga",
  Ke: "Vinayagar",
};

const EXALT: Partial<Record<PlanetId, number>> = { Su: 0, Mo: 1, Ma: 9, Me: 5, Ju: 3, Ve: 11, Sa: 6 };
const DEBIL: Partial<Record<PlanetId, number>> = { Su: 6, Mo: 7, Ma: 3, Me: 11, Ju: 9, Ve: 5, Sa: 0 };

export interface PlanetStanding {
  planet: PlanetId;
  boost: number; // -3..+3: how much the yogi scheme strengthens or weakens this planet
  reasons: string[];
}

export interface YogiInfo {
  yogiPoint: number;
  yogiStar: number;
  yogi: PlanetId;
  sahayogi: PlanetId;
  avayogiPoint: number;
  avayogiStar: number;
  avayogi: PlanetId;
  /** All three stars ruled by the yogi planet, and by the avayogi planet. */
  yogiStars: number[];
  avayogiStars: number[];
  lagnaInYogiStar: boolean;
  avayogiSoftened: string | null;
  karana: string;
  karanaTamil: string;
  karanaAnimal: string;
  karanaDeity: string;
  karanaLord: PlanetId;
  hd: PlanetId;
  ld: PlanetId;
  hdGroup: PlanetId[]; // 20° and above
  ldGroup: PlanetId[]; // below 10°
  degrees: { planet: PlanetId; degree: number }[]; // sorted high to low
  standing: Record<PlanetId, PlanetStanding>;
  upasana: { planet: PlanetId; deity: string };
  notes: string[];
}

export function yogiInfo(n: Natal): YogiInfo {
  const pos = n.positions;
  const yogiPoint = norm360(pos.Su + pos.Mo + 93 + 20 / 60);
  const yogiStar = nakOf(yogiPoint);
  const yogi = starLord(yogiStar);
  const sahayogi = RASI[signOf(yogiPoint)].lord;
  const avayogiPoint = norm360(yogiPoint + 186 + 40 / 60);
  const avayogiStar = nakOf(avayogiPoint);
  const avayogi = starLord(avayogiStar);
  const known = n.profile.timeConfirmed;

  const kName = karanaName(Math.floor(norm360(pos.Mo - pos.Su) / 6));
  const karanaLord = KARANA_LORD[kName];

  const degrees = SEVEN.map((p) => ({ planet: p, degree: pos[p] % 30 })).sort((a, b) => b.degree - a.degree);
  const hd = degrees[0].planet;
  const ld = degrees[degrees.length - 1].planet;

  // An avayogi hidden in the 6th, 8th or 12th, or debilitated, loses most of its sting.
  let avayogiSoftened: string | null = null;
  if (avayogi !== "Ra" && avayogi !== "Ke") {
    if (known && [6, 8, 12].includes(n.house[avayogi])) avayogiSoftened = `it sits in your ${ordinal(n.house[avayogi])} house, a hidden house, which turns its obstruction into unexpected gain`;
    else if (DEBIL[avayogi] === signOf(pos[avayogi])) avayogiSoftened = "it is debilitated, which cancels most of its harm";
  }

  const standing = {} as Record<PlanetId, PlanetStanding>;
  for (const p of Object.keys(pos) as PlanetId[]) {
    let boost = 0;
    const reasons: string[] = [];
    if (p === yogi) { boost += 2; reasons.push("is your Yogi"); }
    if (p === sahayogi && p !== yogi) { boost += 1; reasons.push("is your Sahayogi"); }
    if (p === avayogi) { boost -= avayogiSoftened ? 1 : 2; reasons.push(avayogiSoftened ? "is your Avayogi, softened" : "is your Avayogi"); }
    if (p === karanaLord) { boost += 0.5; reasons.push("is your karana nathan"); }
    const star = nakOf(pos[p]);
    if (star === yogiStar) { boost += 2; reasons.push(`sits in your yoga tara ${NAKSHATRA[star].ta}`); }
    else if (starLord(star) === yogi) { boost += 1; reasons.push(`sits in ${NAKSHATRA[star].ta}, a star of your Yogi`); }
    else if (star === avayogiStar) { boost -= 1.5; reasons.push(`sits in your avayoga tara ${NAKSHATRA[star].ta}`); }
    else if (starLord(star) === avayogi) { boost -= 1; reasons.push(`sits in ${NAKSHATRA[star].ta}, a star of your Avayogi`); }
    standing[p] = { planet: p, boost: Math.max(-3, Math.min(3, boost)), reasons };
  }

  const notes: string[] = [];
  const lagnaInYogiStar = known && nakOf(n.lagna) === yogiStar;
  if (lagnaInYogiStar) notes.push(`Your lagna itself rises in ${NAKSHATRA[yogiStar].ta}, your yoga tara. When the lagna's star belongs to the Yogi, the chart is counted as fortunate throughout life.`);
  else if (known && starLord(nakOf(n.lagna)) === avayogi) notes.push("Your lagna rises in a star of the Avayogi: results come only after obstruction, and remedies for the Avayogi matter more than usual.");
  if (known) {
    const yr = n.rules[yogi];
    if (yr.some((h) => [1, 5, 9, 2, 11].includes(h))) notes.push(`Your Yogi ${PLANET_INFO[yogi].ta} rules a favourable house (${yr.map(ordinal).join(" and ")}), so its promise is delivered without much obstruction.`);
    else if (yr.length && yr.every((h) => [6, 8, 12].includes(h))) notes.push(`Your Yogi ${PLANET_INFO[yogi].ta} rules only hidden houses (${yr.map(ordinal).join(" and ")}): its luck is reduced and others may enjoy part of your success.`);
    else if (yr.length) notes.push(`Your Yogi ${PLANET_INFO[yogi].ta} rules your ${yr.map(ordinal).join(" and ")} house and sits in the ${ordinal(n.house[yogi])}: it gives through those matters.`);
    if (n.rules[avayogi].includes(1)) notes.push("Your lagna lord is also the Avayogi: obstacles tend to come from your own decisions, but the lagna lord never abandons you and effort wins in the end.");
  }
  if (EXALT[avayogi] === signOf(pos[avayogi])) notes.push(`Your Avayogi ${PLANET_INFO[avayogi].ta} is exalted, which makes its obstruction stronger.`);
  if (avayogiSoftened) notes.push(`Your Avayogi ${PLANET_INFO[avayogi].ta} is softened: ${avayogiSoftened}.`);
  if (karanaLord === yogi) notes.push("Your karana nathan and your Yogi are the same planet: a combination counted as a great yoga, where action and luck pull together.");
  else if (signOf(pos[karanaLord]) === signOf(pos[yogi])) notes.push("Your karana nathan sits with your Yogi: action and luck pull together.");
  if (standing[karanaLord].boost < 0) notes.push(`Your karana nathan ${PLANET_INFO[karanaLord].ta} ${standing[karanaLord].reasons.filter((r) => r.includes("Avayogi") || r.includes("avayoga")).join(" and ")}: effort is sometimes not rewarded in proportion, so pace yourself in its periods.`);
  const sunDist = Math.abs(((pos[sahayogi] - yogiPoint + 540) % 360) - 180);
  if (sunDist < 3 && sahayogi !== yogi) notes.push(`Your Sahayogi ${PLANET_INFO[sahayogi].ta} is within ${sunDist.toFixed(1)}° of the yogi point.`);
  if (known && Math.abs(((n.lagna - yogiPoint + 540) % 360) - 180) <= 2)
    notes.push(`Your lagna degree (${formatDeg(n.lagna)} ${RASI[n.lagnaSign].ta}) is almost exactly your yogi point (${formatDeg(yogiPoint)}): you carry the lucky degree in your own person.`);
  for (const p of PLANETS_ON_POINT(pos, yogiPoint)) notes.push(`${PLANET_INFO[p].ta} sits at ${formatDeg(pos[p])} ${RASI[signOf(pos[p])].ta}, almost exactly on your yogi point (${formatDeg(yogiPoint)}): its matters are the luckiest in the chart.`);

  return {
    yogiPoint, yogiStar, yogi, sahayogi, avayogiPoint, avayogiStar, avayogi,
    yogiStars: starsOf(yogi),
    avayogiStars: starsOf(avayogi),
    lagnaInYogiStar,
    avayogiSoftened,
    karana: kName,
    karanaTamil: KARANA_NOTE[kName].tamil,
    karanaAnimal: KARANA_NOTE[kName].animal,
    karanaDeity: KARANA_NOTE[kName].deity,
    karanaLord,
    hd, ld,
    hdGroup: degrees.filter((d) => d.degree >= 20).map((d) => d.planet),
    ldGroup: degrees.filter((d) => d.degree < 10).map((d) => d.planet),
    degrees,
    standing,
    upasana: { planet: ld, deity: PLANET_DEITY[ld] },
    notes,
  };
}

function PLANETS_ON_POINT(pos: Record<PlanetId, number>, point: number): PlanetId[] {
  return (Object.keys(pos) as PlanetId[]).filter((p) => Math.abs(((pos[p] - point + 540) % 360) - 180) <= 2);
}

/** How the Moon's star at a given time relates to the yogi scheme. */
export type StarRelation = "yoga-tara" | "yogi-star" | "avayoga-tara" | "avayogi-star" | null;
export function starRelation(y: YogiInfo, star: number): StarRelation {
  if (star === y.yogiStar) return "yoga-tara";
  if (star === y.avayogiStar) return "avayoga-tara";
  if (y.yogiStars.includes(star)) return "yogi-star";
  if (y.avayogiStars.includes(star)) return "avayogi-star";
  return null;
}

export interface Pass {
  start: Date;
  end: Date;
  star: number;
  relation: Exclude<StarRelation, null>;
}

/** The Moon's coming passes through the yogi and avayogi stars. */
export function moonPasses(y: YogiInfo, from: Date, days = 45): Pass[] {
  const out: Pass[] = [];
  const limit = from.getTime() + days * MS_DAY;
  let t = from.getTime();
  let star = nakIndex(from);
  let start = t;
  while (t < limit) {
    t += MS_HOUR;
    const s = nakIndex(new Date(t));
    if (s === star) continue;
    // refine the change to the minute
    let lo = t - MS_HOUR;
    let hi = t;
    while (hi - lo > 60000) {
      const mid = (lo + hi) / 2;
      if (nakIndex(new Date(mid)) === star) lo = mid;
      else hi = mid;
    }
    const rel = starRelation(y, star);
    if (rel) out.push({ start: new Date(start), end: new Date(hi), star, relation: rel });
    star = s;
    start = hi;
    t = hi;
  }
  return out;
}

export interface PlanetPass {
  planet: PlanetId;
  start: Date;
  end: Date | null; // null if it is still there at the end of the search
  relation: "yoga-tara" | "avayoga-tara";
  ongoing: boolean;
}

/** When the other planets cross the yoga tara and the avayoga tara over the coming months. */
export function planetPasses(y: YogiInfo, from: Date, days = 400): PlanetPass[] {
  const out: PlanetPass[] = [];
  const which = (lon: number): "yoga-tara" | "avayoga-tara" | null => {
    const s = Math.floor(norm360(lon) / NAK_SPAN);
    return s === y.yogiStar ? "yoga-tara" : s === y.avayogiStar ? "avayoga-tara" : null;
  };
  for (const p of ["Su", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"] as PlanetId[]) {
    let open: PlanetPass | null = null;
    for (let d = 0; d <= days; d++) {
      const t = new Date(from.getTime() + d * MS_DAY);
      const rel = which(siderealLongitude(p, t));
      if (open && rel !== open.relation) {
        open.end = t;
        out.push(open);
        open = null;
      }
      if (!open && rel) open = { planet: p, start: t, end: null, relation: rel, ongoing: d === 0 };
    }
    if (open) out.push(open);
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
