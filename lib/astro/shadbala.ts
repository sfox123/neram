// Shadbala: the six-fold strength of the seven planets, after Brihat Parashara Hora Shastra.
//
//   1. Sthana bala   position: exaltation, the seven divisional charts, odd or even sign,
//                    kendra or not, and the decanate.
//   2. Dig bala      direction: how near the planet is to the angle where it is strongest.
//   3. Kala bala     time: day or night, the lunar fortnight, the third of the day, the lords of
//                    the year, month, weekday and hour, and the declination (ayana).
//   4. Cheshta bala  motion: greatest when retrograde, least when fast and direct.
//   5. Naisargika    natural rank, fixed for every chart.
//   6. Drik bala     aspects received: benefic sight adds, malefic sight takes away.
//
// Strength is counted in virupas (shashtiamsas); 60 make one rupa. Each planet has its own
// pass mark. Rahu and Ketu are not part of the scheme.
//
// Choices where the schools differ, kept in one place:
//   - Saptavargaja values are Parashara's 45, 30, 20, 15, 10, 4, 2 (B. V. Raman uses 22.5,
//     15, 7.5, 3.75, 1.875 for the last five).
//   - The lords of the year and month are the weekday lords of the days on which the solar
//     year (Mesha sankranti) and the solar month (the Sun's last sign entry) began. The older
//     ahargana count from the epoch gives different lords for some births.
//   - Ayana bala uses the declination of the planet's ecliptic degree (kranti).
//   - Planetary war (yuddha bala) is not applied; the reading flags it when two planets are
//     within a degree so the figures can be taken with care.

import { Natal } from "./chart";
import { norm360, PlanetId, RASI, signOf, WEEKDAY_LORD } from "./constants";
import { ENEMIES, FRIENDS } from "./dignity";
import { declinationOf, meanLongitude, midheavenLongitude, siderealLongitude } from "./ephemeris";
import { frameContaining, horas, spanAt } from "./panchang";
import { MS_DAY } from "./time";
import { navamsaSign } from "./vargas";

export type Graha = "Su" | "Mo" | "Ma" | "Me" | "Ju" | "Ve" | "Sa";
export const GRAHAS: Graha[] = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa"];

/** Pass mark in rupas. */
export const REQUIRED: Record<Graha, number> = { Su: 6.5, Mo: 6, Ma: 5, Me: 7, Ju: 6.5, Ve: 5.5, Sa: 5 };
/** Pass marks for the single components, in virupas (Parashara). */
export const REQUIRED_PARTS: Record<Graha, { sthana: number; dig: number; kala: number; cheshta: number; ayana: number }> = {
  Su: { sthana: 165, dig: 35, kala: 112, cheshta: 50, ayana: 30 },
  Mo: { sthana: 133, dig: 50, kala: 100, cheshta: 30, ayana: 40 },
  Ma: { sthana: 96, dig: 30, kala: 67, cheshta: 40, ayana: 20 },
  Me: { sthana: 165, dig: 35, kala: 112, cheshta: 50, ayana: 30 },
  Ju: { sthana: 165, dig: 35, kala: 112, cheshta: 50, ayana: 30 },
  Ve: { sthana: 133, dig: 50, kala: 100, cheshta: 30, ayana: 40 },
  Sa: { sthana: 96, dig: 30, kala: 67, cheshta: 40, ayana: 20 },
};

const NAISARGIKA: Record<Graha, number> = { Su: 60, Mo: 51.43, Ve: 42.86, Ju: 34.29, Me: 25.71, Ma: 17.14, Sa: 8.57 };

// Exact exaltation degrees, as sidereal longitudes.
const EXALT_POINT: Record<Graha, number> = { Su: 10, Mo: 33, Ma: 298, Me: 165, Ju: 95, Ve: 357, Sa: 200 };

// Moolatrikona: sign and the degrees within it.
const MOOLA: Record<Graha, [number, number, number]> = {
  Su: [4, 0, 20], Mo: [1, 3, 30], Ma: [0, 0, 12], Me: [5, 15, 20], Ju: [8, 0, 10], Ve: [6, 0, 15], Sa: [10, 0, 20],
};

/** Shortest arc between two longitudes, 0..180. */
const arc = (a: number, b: number) => {
  const d = norm360(a - b);
  return d > 180 ? 360 - d : d;
};

// ---- The seven divisional charts (saptavarga) ---------------------------------------------------

function horaSign(lon: number): number {
  const sign = signOf(lon);
  const first = norm360(lon) % 30 < 15;
  const odd = sign % 2 === 0;
  // Odd signs: Sun's hora then Moon's. Even signs: Moon's then Sun's.
  return odd === first ? 4 : 3;
}
function drekkanaSign(lon: number): number {
  const part = Math.min(2, Math.floor((norm360(lon) % 30) / 10));
  return (signOf(lon) + part * 4) % 12;
}
function saptamsaSign(lon: number): number {
  const sign = signOf(lon);
  const part = Math.min(6, Math.floor(((norm360(lon) % 30) * 7) / 30 + 1e-9));
  return (sign + (sign % 2 === 0 ? 0 : 6) + part) % 12;
}
function dwadasamsaSign(lon: number): number {
  const part = Math.min(11, Math.floor((norm360(lon) % 30) / 2.5 + 1e-9));
  return (signOf(lon) + part) % 12;
}
function trimsamsaSign(lon: number): number {
  const sign = signOf(lon);
  const d = norm360(lon) % 30;
  if (sign % 2 === 0) return d < 5 ? 0 : d < 10 ? 10 : d < 18 ? 8 : d < 25 ? 2 : 6; // Mars, Saturn, Jupiter, Mercury, Venus
  return d < 5 ? 1 : d < 12 ? 5 : d < 20 ? 11 : d < 25 ? 9 : 7; // Venus, Mercury, Jupiter, Saturn, Mars
}

export const SAPTAVARGA: { key: string; name: string; sign: (lon: number) => number }[] = [
  { key: "D1", name: "Rasi", sign: signOf },
  { key: "D2", name: "Hora", sign: horaSign },
  { key: "D3", name: "Drekkana", sign: drekkanaSign },
  { key: "D7", name: "Saptamsa", sign: saptamsaSign },
  { key: "D9", name: "Navamsa", sign: navamsaSign },
  { key: "D12", name: "Dwadasamsa", sign: dwadasamsaSign },
  { key: "D30", name: "Trimsamsa", sign: trimsamsaSign },
];

export type Relation5 = "moolatrikona" | "own" | "great friend" | "friend" | "neutral" | "enemy" | "great enemy";
const RELATION_VIRUPA: Record<Relation5, number> = {
  moolatrikona: 45, own: 30, "great friend": 20, friend: 15, neutral: 10, enemy: 4, "great enemy": 2,
};

/** Five-fold (compound) relationship of `p` towards `lord`: natural friendship joined with the temporary one. */
function compound(n: Natal, p: Graha, lord: PlanetId): Relation5 {
  const natural = FRIENDS[p].includes(lord) ? 1 : ENEMIES[p].includes(lord) ? -1 : 0;
  // Planets in the 2nd, 3rd, 4th, 10th, 11th and 12th from a planet are its friends for this chart.
  const count = ((signOf(n.positions[lord]) - signOf(n.positions[p]) + 12) % 12) + 1;
  const temporary = [2, 3, 4, 10, 11, 12].includes(count) ? 1 : -1;
  const sum = natural + temporary;
  return sum === 2 ? "great friend" : sum === 1 ? "friend" : sum === 0 ? "neutral" : sum === -1 ? "enemy" : "great enemy";
}

// ---- Aspect value (sphuta drishti) ---------------------------------------------------------------

/** Strength, 0..60 (more for the special aspects), of the sight `from` throws on a point `angle` degrees ahead of it. */
function drishti(from: Graha, angle: number): number {
  const a = norm360(angle);
  let v = 0;
  if (a >= 30 && a < 60) v = (a - 30) / 2;
  else if (a >= 60 && a < 90) v = a - 60 + 15;
  else if (a >= 90 && a < 120) v = (120 - a) / 2 + 30;
  else if (a >= 120 && a < 150) v = 150 - a;
  else if (a >= 150 && a < 180) v = (a - 150) * 2;
  else if (a >= 180 && a <= 300) v = (300 - a) / 2;
  // Special full aspects of Mars (4th, 8th), Jupiter (5th, 9th) and Saturn (3rd, 10th).
  if (from === "Ma" && ((a >= 90 && a < 120) || (a >= 210 && a < 240))) v += 15;
  if (from === "Ju" && ((a >= 120 && a < 150) || (a >= 240 && a < 270))) v += 30;
  if (from === "Sa" && ((a >= 60 && a < 90) || (a >= 270 && a < 300))) v += 45;
  return Math.min(60, v);
}

// ---- Result ------------------------------------------------------------------------------------

export interface Part {
  label: string;
  value: number; // virupas
  note: string;
}

export interface PlanetBala {
  planet: Graha;
  sthana: number;
  dig: number;
  kala: number;
  cheshta: number;
  naisargika: number;
  drik: number;
  total: number; // virupas
  rupas: number;
  required: number; // rupas
  /** Total divided by the pass mark: 1 or more passes. */
  ratio: number;
  rank: number; // 1 = strongest by ratio
  parts: { sthana: Part[]; kala: Part[] };
  notes: { dig: string; cheshta: string; drik: string };
  /** Ishta and kashta phala (0..60): how much of the planet's result leans to the wanted and the unwanted. */
  ishta: number;
  kashta: number;
}

export interface Shadbala {
  planets: Record<Graha, PlanetBala>;
  order: Graha[]; // strongest first, by ratio
  yearLord: Graha;
  monthLord: Graha;
  dayLord: Graha;
  hourLord: Graha;
  dayBirth: boolean;
  /** Pairs within one degree of each other (planetary war), which this calculation does not adjust for. */
  wars: [Graha, Graha][];
  mercuryBenefic: boolean;
  moonBenefic: boolean;
}

const cache = new WeakMap<Natal, Shadbala>();

export function shadbala(n: Natal): Shadbala {
  const hit = cache.get(n);
  if (hit) return hit;
  const pos = n.positions;
  const place = n.profile.birthPlace;
  const t = n.birth;
  const lon = (p: Graha) => pos[p];

  // Benefic or malefic for this chart.
  const elong = norm360(pos.Mo - pos.Su);
  const moonBenefic = elong < 180; // waxing
  const NATURAL_MALEFIC: PlanetId[] = ["Su", "Ma", "Sa", "Ra", "Ke"];
  const mercuryBenefic = !NATURAL_MALEFIC.some((m) => signOf(pos[m]) === signOf(pos.Me));
  const benefic = (p: Graha) => p === "Ju" || p === "Ve" || (p === "Mo" && moonBenefic) || (p === "Me" && mercuryBenefic);

  // Day frame of the birth: sunrise, sunset, weekday, hora.
  const frame = frameContaining(t, place);
  const dayBirth = t >= frame.sunrise && t < frame.sunset;
  const dayLord = WEEKDAY_LORD[frame.weekday] as Graha;
  const hourLord = spanAt(horas(frame), t).value as Graha;
  const noon = frame.sunrise.getTime() + frame.dayLength / 2;
  const midnight = frame.sunset.getTime() + frame.nightLength / 2;
  const prevMidnight = midnight - MS_DAY;
  // Distance from true midnight, 0 (midnight) to 1 (noon).
  const fromMidnight = Math.min(Math.abs(t.getTime() - midnight), Math.abs(t.getTime() - prevMidnight));
  const unnata = Math.min(1, fromMidnight / Math.max(1, Math.abs(noon - prevMidnight)));

  // Lords of the solar year and solar month: the weekday on which each began at the birthplace.
  const weekdayLordAt = (d: Date) => WEEKDAY_LORD[frameContaining(d, place).weekday] as Graha;
  const sunSign = (d: Date) => signOf(siderealLongitude("Su", d));
  const lastEntry = (target: (s: number) => boolean) => {
    // Step back day by day to the latest day on which the Sun's sign met the test only after it.
    let hi = t.getTime();
    let lo = hi;
    for (let i = 0; i < 380; i++) {
      lo -= MS_DAY;
      if (!target(sunSign(new Date(lo)))) break;
      hi = lo;
    }
    while (hi - lo > 60000) {
      const mid = (lo + hi) / 2;
      if (target(sunSign(new Date(mid)))) hi = mid;
      else lo = mid;
    }
    return new Date(hi);
  };
  const birthSunSign = sunSign(t);
  const monthStart = lastEntry((s) => s === birthSunSign);
  // Walk back to the Sun's entry into Mesham: the signs from Mesham up to the birth sign.
  const yearStart = lastEntry((s) => s <= birthSunSign);
  const yearLord = weekdayLordAt(yearStart);
  const monthLord = weekdayLordAt(monthStart);

  const asc = n.lagna;
  const mc = midheavenLongitude(t, place.longitude);
  const POWERLESS: Record<Graha, { point: number; best: string }> = {
    Su: { point: mc + 180, best: "the 10th (south, overhead)" },
    Ma: { point: mc + 180, best: "the 10th (south, overhead)" },
    Ju: { point: asc + 180, best: "the 1st (east, the lagna)" },
    Me: { point: asc + 180, best: "the 1st (east, the lagna)" },
    Mo: { point: mc, best: "the 4th (north, underfoot)" },
    Ve: { point: mc, best: "the 4th (north, underfoot)" },
    Sa: { point: asc, best: "the 7th (west, the setting point)" },
  };

  const paksha = Math.min(elong, 360 - elong) / 3; // 0 at new moon, 60 at full
  const third = dayBirth
    ? Math.min(2, Math.floor(((t.getTime() - frame.sunrise.getTime()) / frame.dayLength) * 3))
    : Math.min(2, Math.floor(((t.getTime() - frame.sunset.getTime()) / frame.nightLength) * 3));
  const thirdLord: Graha = dayBirth ? (["Me", "Su", "Sa"] as Graha[])[third] : (["Mo", "Ve", "Ma"] as Graha[])[third];

  const out = {} as Record<Graha, PlanetBala>;
  for (const p of GRAHAS) {
    const sign = signOf(lon(p));
    const deg = norm360(lon(p)) % 30;

    // 1. Sthana bala
    const uchcha = (180 - arc(lon(p), EXALT_POINT[p])) / 3;
    let sapta = 0;
    const saptaBits: string[] = [];
    for (const v of SAPTAVARGA) {
      const vs = v.sign(lon(p));
      const lord = RASI[vs].lord;
      let rel: Relation5;
      if (v.key === "D1" && MOOLA[p][0] === vs && deg >= MOOLA[p][1] && deg < MOOLA[p][2]) rel = "moolatrikona";
      else if (lord === p) rel = "own";
      else rel = compound(n, p, lord);
      sapta += RELATION_VIRUPA[rel];
      saptaBits.push(`${v.name} ${RASI[vs].ta} (${rel})`);
    }
    const femaleLike = p === "Mo" || p === "Ve";
    const oddRasi = sign % 2 === 0;
    const oddNav = navamsaSign(lon(p)) % 2 === 0;
    const ojaRasi = (femaleLike ? !oddRasi : oddRasi) ? 15 : 0;
    const ojaNav = (femaleLike ? !oddNav : oddNav) ? 15 : 0;
    const house = n.house[p];
    const kendradi = [1, 4, 7, 10].includes(house) ? 60 : [2, 5, 8, 11].includes(house) ? 30 : 15;
    const decan = Math.min(2, Math.floor(deg / 10));
    const wantDecan = p === "Su" || p === "Ma" || p === "Ju" ? 0 : p === "Me" || p === "Sa" ? 1 : 2;
    const drekkana = decan === wantDecan ? 15 : 0;
    const sthanaParts: Part[] = [
      { label: "Uchcha (exaltation)", value: uchcha, note: `${arc(lon(p), EXALT_POINT[p]).toFixed(0)}° from its exaltation degree; 60 at the degree itself, 0 opposite it.` },
      { label: "Saptavargaja (seven charts)", value: sapta, note: saptaBits.join(", ") + "." },
      { label: "Ojayugma (odd or even)", value: ojaRasi + ojaNav, note: `${femaleLike ? "Wants even signs" : "Wants odd signs"}: rasi ${oddRasi ? "odd" : "even"}, navamsa ${oddNav ? "odd" : "even"}.` },
      { label: "Kendradi (angle)", value: kendradi, note: `In the ${house}${house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th"} house: ${kendradi === 60 ? "a kendra" : kendradi === 30 ? "a panapara (2, 5, 8, 11)" : "an apoklima (3, 6, 9, 12)"}.` },
      { label: "Drekkana (decanate)", value: drekkana, note: `In the ${["first", "second", "third"][decan]} decanate; it scores in the ${["first", "second", "third"][wantDecan]}.` },
    ];
    const sthana = sthanaParts.reduce((a, b) => a + b.value, 0);

    // 2. Dig bala
    const dig = arc(lon(p), POWERLESS[p].point) / 3;
    const digNote = `Strongest at ${POWERLESS[p].best}. It is ${(180 - arc(lon(p), POWERLESS[p].point)).toFixed(0)}° from that point.`;

    // 3. Kala bala
    const nathonnatha = p === "Me" ? 60 : p === "Su" || p === "Ju" || p === "Ve" ? 60 * unnata : 60 * (1 - unnata);
    const pakshaBala = (benefic(p) ? paksha : 60 - paksha) * (p === "Mo" ? 2 : 1);
    const tribhaga = p === "Ju" || p === thirdLord ? 60 : 0;
    const lords = (p === yearLord ? 15 : 0) + (p === monthLord ? 30 : 0) + (p === dayLord ? 45 : 0) + (p === hourLord ? 60 : 0);
    const dec = declinationOf(lon(p), t);
    const EPS = 23.45;
    const ayanaRaw =
      p === "Me" ? ((EPS + Math.abs(dec)) / (2 * EPS)) * 60
      : p === "Mo" || p === "Sa" ? ((EPS - dec) / (2 * EPS)) * 60
      : ((EPS + dec) / (2 * EPS)) * 60;
    const ayana = Math.max(0, Math.min(60, ayanaRaw));
    const kalaParts: Part[] = [
      { label: "Nathonnatha (day or night)", value: nathonnatha, note: p === "Me" ? "Budhan is strong at all hours." : p === "Su" || p === "Ju" || p === "Ve" ? "Strong at midday, weak at midnight." : "Strong at midnight, weak at midday." },
      { label: "Paksha (fortnight)", value: pakshaBala, note: `${benefic(p) ? "Counts as a benefic here, so it gains towards full moon" : "Counts as a malefic here, so it gains towards new moon"}${p === "Mo" ? "; the Moon's own share is doubled" : ""}.` },
      { label: "Tribhaga (third of the day)", value: tribhaga, note: p === "Ju" ? "Guru holds every third." : `Born in the ${["first", "second", "third"][third]} third of the ${dayBirth ? "day" : "night"}, which belongs to ${thirdLord}.` },
      { label: "Year, month, day and hour lords", value: lords, note: [p === yearLord ? "lord of the year (15)" : "", p === monthLord ? "lord of the month (30)" : "", p === dayLord ? "lord of the weekday (45)" : "", p === hourLord ? "lord of the hora (60)" : ""].filter(Boolean).join(", ") || "Holds none of the four at your birth." },
      { label: "Ayana (declination)", value: ayana * (p === "Su" ? 2 : 1), note: `Declination ${Math.abs(dec).toFixed(1)}° ${dec >= 0 ? "north" : "south"}. ${p === "Mo" || p === "Sa" ? "Gains in the south." : p === "Me" ? "Gains either way." : "Gains in the north."}${p === "Su" ? " The Sun's share is doubled." : ""}` },
    ];
    const kala = kalaParts.reduce((a, b) => a + b.value, 0);

    // 4. Cheshta bala
    let cheshta: number;
    let cheshtaNote: string;
    if (p === "Su") { cheshta = ayana; cheshtaNote = "The Sun never turns back; its ayana bala stands in for cheshta."; }
    else if (p === "Mo") { cheshta = paksha; cheshtaNote = "The Moon never turns back; its paksha bala stands in for cheshta."; }
    else {
      const meanSun = meanLongitude("Su", t);
      const inferior = p === "Me" || p === "Ve";
      const mean = inferior ? meanSun : meanLongitude(p, t);
      const apex = inferior ? meanLongitude(p, t) : meanSun; // seeghrocha
      const half = norm360(lon(p) - mean);
      const avg = norm360(mean + (half > 180 ? half - 360 : half) / 2);
      const kendra = arc(apex, avg);
      cheshta = kendra / 3;
      cheshtaNote = `${n.retro[p] ? "Retrograde at birth. " : ""}Cheshta kendra ${kendra.toFixed(0)}° of 180: ${kendra >= 135 ? "near its slowest or turning back, where it is brightest and strongest" : kendra >= 80 ? "at moderate speed" : "moving fast and direct, where this strength is lowest"}.`;
    }

    // 6. Drik bala
    let good = 0;
    let bad = 0;
    let special = 0;
    const seen: string[] = [];
    for (const a of GRAHAS) {
      if (a === p) continue;
      const v = drishti(a, lon(p) - lon(a));
      if (v <= 0) continue;
      if (benefic(a)) good += v;
      else bad += v;
      if (a === "Ju" || a === "Me") special += v;
      if (v >= 30) seen.push(`${a} ${benefic(a) ? "+" : "−"}${v.toFixed(0)}`);
    }
    const drik = (good - bad) / 4 + special;
    const drikNote = seen.length ? `Strong sight from ${seen.join(", ")}. A quarter of the net is taken, and the sight of Guru and Budhan is added whole.` : "No planet looks at it closely.";

    const naisargika = NAISARGIKA[p];
    const total = sthana + dig + kala + cheshta + naisargika + drik;
    const ishta = Math.sqrt(Math.max(0, uchcha) * Math.max(0, cheshta));
    const kashta = Math.sqrt(Math.max(0, 60 - uchcha) * Math.max(0, 60 - cheshta));
    out[p] = {
      planet: p, sthana, dig, kala, cheshta, naisargika, drik, total, rupas: total / 60, required: REQUIRED[p], ratio: total / 60 / REQUIRED[p], rank: 0,
      parts: { sthana: sthanaParts, kala: kalaParts },
      notes: { dig: digNote, cheshta: cheshtaNote, drik: drikNote },
      ishta, kashta,
    };
  }

  const order = [...GRAHAS].sort((a, b) => out[b].ratio - out[a].ratio);
  order.forEach((p, i) => (out[p].rank = i + 1));
  const wars: [Graha, Graha][] = [];
  const fighters: Graha[] = ["Ma", "Me", "Ju", "Ve", "Sa"];
  for (let i = 0; i < fighters.length; i++)
    for (let j = i + 1; j < fighters.length; j++) if (arc(lon(fighters[i]), lon(fighters[j])) < 1) wars.push([fighters[i], fighters[j]]);

  const result: Shadbala = { planets: out, order, yearLord, monthLord, dayLord, hourLord, dayBirth, wars, mercuryBenefic, moonBenefic };
  cache.set(n, result);
  return result;
}

export type BalaWord = "Very strong" | "Strong" | "Passes" | "Short" | "Weak";
export function balaWord(ratio: number): BalaWord {
  if (ratio >= 1.3) return "Very strong";
  if (ratio >= 1.1) return "Strong";
  if (ratio >= 1) return "Passes";
  if (ratio >= 0.85) return "Short";
  return "Weak";
}

/**
 * A small signed number (-1.5..+1.5) for use beside the other weights: how far a planet stands
 * above or below its own pass mark. Rahu and Ketu, which have no Shadbala, return 0.
 */
export function balaLean(s: Shadbala, p: PlanetId): number {
  if (p === "Ra" || p === "Ke") return 0;
  const r = s.planets[p as Graha].ratio;
  return Math.max(-1.5, Math.min(1.5, (r - 1) * 4));
}
