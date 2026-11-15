// The annual chart: a one-year forecast laid over the birth chart.
//
// Two versions are worked out, the solar and the lunar:
//
//   Varshaphal (Tajika)  The year begins at the instant the Sun returns to the exact sidereal
//                        degree it held at birth, on or beside the birthday. A chart is cast for
//                        that instant. The muntha, a pointer that starts in the birth lagna and
//                        moves on one sign every year, marks the area of life in focus.
//   Tithi Pravesha       The year begins when the Sun is back in its birth sign and the Moon
//                        is at the same angle from it as at birth, so the same tithi is at the
//                        same fraction. Its date wanders by up to a few weeks from the birthday.
//                        The lord of the weekday on which it falls is the lord of the year
//                        (P. V. R. Narasimha Rao's teaching); the hora lord is next.
//
// Choices made here:
//   - Both charts are cast for where you are now, as return charts usually are.
//   - The Tajika year lord is properly chosen by a five-fold strength that needs the hadda
//     table; here the five office-bearers are ranked by sign dignity and nearness to
//     exaltation, and one that cannot see the year lagna by Tajika aspect is passed over.
//   - Mudda dasa (the year's own dasa) starts from the planet found by adding the completed
//     years to the birth star number, and shares the year out in Vimshottari proportion.

import { houseTopic, Natal, ordinal } from "./chart";
import { DASHA_YEARS, houseFrom, nakOf, NAKSHATRA, norm360, PLANET_INFO, PlanetId, PLANETS, RASI, signOf, WEEKDAY_LORD, WEEKDAYS, YOGA_NAMES, tithiName } from "./constants";
import { Dignity, dignity } from "./dignity";
import { allPositions, dailyMotion, lagnaLongitude, Positions, siderealLongitude } from "./ephemeris";
import { frameContaining, horas, Place, spanAt } from "./panchang";
import { MS_DAY } from "./time";

const SIDEREAL_YEAR = 365.256363;
const SYNODIC_MONTH = 29.530589;
const NAME = (p: PlanetId) => PLANET_INFO[p].ta;
const signed = (x: number) => {
  const d = norm360(x);
  return d > 180 ? d - 360 : d;
};

export type Tone = "good" | "bad" | "neutral";
export interface YearLine {
  title: string;
  detail: string;
  tone: Tone;
}

export interface ReturnChart {
  moment: Date;
  positions: Positions;
  retro: Record<PlanetId, boolean>;
  lagna: number;
  lagnaSign: number;
  /** House (1..12) of each planet from the year lagna. */
  house: Record<PlanetId, number>;
  dignity: Record<PlanetId, Dignity>;
}

function castChart(moment: Date, place: Place): ReturnChart {
  const positions = allPositions(moment);
  const lagna = lagnaLongitude(moment, place.latitude, place.longitude);
  const lagnaSign = signOf(lagna);
  const retro = {} as Record<PlanetId, boolean>;
  const house = {} as Record<PlanetId, number>;
  const dig = {} as Record<PlanetId, Dignity>;
  for (const p of PLANETS) {
    retro[p] = p === "Ra" || p === "Ke" ? true : p === "Su" || p === "Mo" ? false : dailyMotion(p, moment) < 0;
    house[p] = houseFrom(lagnaSign, signOf(positions[p]));
    dig[p] = dignity(p, signOf(positions[p]));
  }
  return { moment, positions, retro, lagna, lagnaSign, house, dignity: dig };
}

// ---- Solar return -------------------------------------------------------------------------------

/** The instant the Sun returns to its birth degree for the `k`th time (k = 0 is the birth itself). */
export function solarReturn(n: Natal, k: number): Date {
  if (k === 0) return n.birth;
  let t = n.birth.getTime() + k * SIDEREAL_YEAR * MS_DAY;
  for (let i = 0; i < 6; i++) {
    const diff = signed(n.positions.Su - siderealLongitude("Su", new Date(t)));
    t += (diff / 0.98565) * MS_DAY;
    if (Math.abs(diff) < 1e-6) break;
  }
  return new Date(t);
}

/** Completed years at `t`: the number of the solar return most recently passed. */
export function completedYears(n: Natal, t: Date): number {
  let k = Math.max(0, Math.floor((t.getTime() - n.birth.getTime()) / (SIDEREAL_YEAR * MS_DAY)));
  while (k > 0 && solarReturn(n, k) > t) k--;
  while (solarReturn(n, k + 1) <= t) k++;
  return k;
}

// Tajika aspects by sign count: 3, 5, 9, 11 are friendly, 1, 4, 7, 10 are hostile, 2, 6, 8, 12 see nothing.
export type TajikaAspect = "friendly" | "hostile" | "none";
export function tajikaAspect(fromSign: number, toSign: number): TajikaAspect {
  const c = houseFrom(fromSign, toSign);
  if ([3, 5, 9, 11].includes(c)) return "friendly";
  if ([1, 4, 7, 10].includes(c)) return "hostile";
  return "none";
}

// Tri-rasi lords of the year lagna, by sign, for a year that begins by day and by night.
const TRIRASI_DAY: PlanetId[] = ["Su", "Ve", "Sa", "Ve", "Ju", "Mo", "Me", "Ma", "Sa", "Ma", "Ju", "Mo"];
const TRIRASI_NIGHT: PlanetId[] = ["Ju", "Mo", "Me", "Ma", "Su", "Ve", "Sa", "Ve", "Sa", "Ma", "Ju", "Mo"];

const EXALT_POINT: Partial<Record<PlanetId, number>> = { Su: 10, Mo: 33, Ma: 298, Me: 165, Ju: 95, Ve: 357, Sa: 200 };
const DIGNITY_POINTS: Record<Dignity, number> = { exalted: 5, own: 4, friend: 2.5, neutral: 1.5, enemy: 0.75, debilitated: 0 };

export interface OfficeBearer {
  office: string;
  planet: PlanetId;
  strength: number;
  aspect: TajikaAspect;
  note: string;
}

const MUNTHA_HOUSE: Record<number, { tone: Tone; text: string }> = {
  1: { tone: "good", text: "on the year lagna: a year of fresh starts, better health and more say over your own direction" },
  2: { tone: "good", text: "in the 2nd: money, savings and family matters take the front seat and tend to grow with steady effort" },
  3: { tone: "good", text: "in the 3rd: courage, skills, writing and short journeys; effort you put in yourself is what pays" },
  4: { tone: "bad", text: "in the 4th: home, property and peace of mind need care; avoid uprooting things without need" },
  5: { tone: "good", text: "in the 5th: learning, ideas, advice and good judgement; a favourable year for study and plans" },
  6: { tone: "bad", text: "in the 6th: opposition, debts and health niggles ask for attention; win by routine, not by force" },
  7: { tone: "bad", text: "in the 7th: partners, clients and travel bring demands; keep agreements clear and written" },
  8: { tone: "bad", text: "in the 8th: the hardest place for it. Delays, hidden costs and upsets; keep risk low and health checked" },
  9: { tone: "good", text: "in the 9th: luck, mentors, higher study and long journeys; one of its best places" },
  10: { tone: "good", text: "in the 10th: work, rank and recognition; one of its best places for career moves" },
  11: { tone: "good", text: "in the 11th: gains, income and wishes met; the best place for money and results" },
  12: { tone: "bad", text: "in the 12th: expenses, distance and withdrawal; good for foreign matters and inner work, poor for saving" },
};

export interface MuddaPeriod {
  lord: PlanetId;
  start: Date;
  end: Date;
}

// Order used for the mudda dasa count.
const MUDDA_ORDER: PlanetId[] = ["Su", "Mo", "Ma", "Ra", "Ju", "Sa", "Me", "Ke", "Ve"];

export interface Varshaphal {
  /** Completed years at the start of this year (your age during it). */
  age: number;
  start: Date;
  end: Date;
  chart: ReturnChart;
  muntha: number; // sign
  munthaLord: PlanetId;
  munthaHouseYear: number; // from the year lagna
  munthaHouseBirth: number; // from the birth lagna
  bearers: OfficeBearer[];
  yearLord: PlanetId;
  dayStart: boolean;
  mudda: MuddaPeriod[];
  lines: YearLine[];
}

export function varshaphal(n: Natal, k: number, place: Place = n.profile.here): Varshaphal {
  const start = solarReturn(n, k);
  const end = solarReturn(n, k + 1);
  const chart = castChart(start, place);
  const muntha = (n.lagnaSign + k) % 12;
  const munthaLord = RASI[muntha].lord;
  const munthaHouseYear = houseFrom(chart.lagnaSign, muntha);
  const munthaHouseBirth = houseFrom(n.lagnaSign, muntha);

  const frame = frameContaining(start, place);
  const dayStart = start >= frame.sunrise && start < frame.sunset;

  const strengthOf = (p: PlanetId) => {
    const lon = chart.positions[p];
    const ex = EXALT_POINT[p];
    const uchcha = ex === undefined ? 0 : (180 - Math.abs(signed(lon - ex))) / 180; // 0..1
    const h = chart.house[p];
    const place = [1, 4, 7, 10].includes(h) ? 1 : [5, 9, 11, 2].includes(h) ? 0.6 : [3].includes(h) ? 0.3 : 0;
    return DIGNITY_POINTS[chart.dignity[p]] + uchcha * 2 + place + (chart.retro[p] && p !== "Ra" && p !== "Ke" ? -0.25 : 0);
  };
  const candidates: [string, PlanetId][] = [
    ["Muntha lord", munthaLord],
    ["Birth lagna lord", n.lordOf(1)],
    ["Year lagna lord", RASI[chart.lagnaSign].lord],
    ["Tri-rasi lord", (dayStart ? TRIRASI_DAY : TRIRASI_NIGHT)[chart.lagnaSign]],
    [dayStart ? "Lord of the Sun's sign (day)" : "Lord of the Moon's sign (night)", RASI[signOf(dayStart ? chart.positions.Su : chart.positions.Mo)].lord],
  ];
  const bearers: OfficeBearer[] = candidates.map(([office, planet]) => {
    const aspect = tajikaAspect(signOf(chart.positions[planet]), chart.lagnaSign);
    return {
      office,
      planet,
      strength: Math.round(strengthOf(planet) * 100) / 100,
      aspect,
      note: `${NAME(planet)} is in ${RASI[signOf(chart.positions[planet])].ta}, the ${ordinal(chart.house[planet])} of the year${chart.dignity[planet] === "neutral" ? "" : `, ${chart.dignity[planet] === "own" ? "in its own sign" : chart.dignity[planet] === "friend" ? "in a friend's sign" : chart.dignity[planet] === "enemy" ? "in an enemy's sign" : chart.dignity[planet]}`}; ${aspect === "none" ? "it does not see the year lagna" : `it sees the year lagna (${aspect})`}.`,
    };
  });
  const seeing = bearers.filter((b) => b.aspect !== "none");
  const pool = seeing.length ? seeing : bearers.filter((b) => b.office === "Muntha lord");
  const yearLord = [...pool].sort((a, b) => b.strength - a.strength)[0].planet;

  // Mudda dasa.
  const first = (((n.star + 1 + k - 2) % 9) + 9) % 9; // remainder 1 = Sun ... 0 = Venus
  const startIdx = (first + 8) % 9;
  const span = end.getTime() - start.getTime();
  const mudda: MuddaPeriod[] = [];
  let at = start.getTime();
  for (let i = 0; i < 9; i++) {
    const lord = MUDDA_ORDER[(startIdx + i) % 9];
    const len = (span * DASHA_YEARS[lord]) / 120;
    mudda.push({ lord, start: new Date(at), end: new Date(at + len) });
    at += len;
  }

  // Reading.
  const lines: YearLine[] = [];
  const mh = MUNTHA_HOUSE[munthaHouseYear];
  lines.push({
    title: `Muntha in ${RASI[muntha].ta}`,
    detail: `The muntha has moved ${k} sign${k === 1 ? "" : "s"} on from your birth lagna and now sits in ${RASI[muntha].ta}: your ${ordinal(munthaHouseBirth)} house by birth (${houseTopic(munthaHouseBirth)}), and ${mh.text}.`,
    tone: mh.tone,
  });
  const mlHouse = chart.house[munthaLord];
  const mlGood = [1, 2, 3, 5, 9, 10, 11].includes(mlHouse) && chart.dignity[munthaLord] !== "debilitated";
  const mlBad = [6, 8, 12].includes(mlHouse) || chart.dignity[munthaLord] === "debilitated";
  lines.push({
    title: `Muntha lord ${NAME(munthaLord)}`,
    detail: `${NAME(munthaLord)} rules the muntha sign and is in ${RASI[signOf(chart.positions[munthaLord])].ta}, the ${ordinal(mlHouse)} of the year chart${chart.dignity[munthaLord] === "exalted" || chart.dignity[munthaLord] === "own" ? ", strong by sign" : chart.dignity[munthaLord] === "debilitated" ? ", weak by sign" : ""}${chart.retro[munthaLord] && munthaLord !== "Ra" && munthaLord !== "Ke" ? ", retrograde" : ""}. ${mlGood ? "It can deliver what the muntha points to." : mlBad ? "It is poorly placed, so the muntha's matters come with friction and delay." : "It gives middling support."}`,
    tone: mlGood ? "good" : mlBad ? "bad" : "neutral",
  });
  const lagHouse = houseFrom(n.lagnaSign, chart.lagnaSign);
  const lagBad = [6, 8, 12].includes(lagHouse);
  lines.push({
    title: `Year lagna ${RASI[chart.lagnaSign].ta}`,
    detail: `${RASI[chart.lagnaSign].ta} rises at the return. It is your ${ordinal(lagHouse)} house by birth, so the year is lived through ${houseTopic(lagHouse)}${lagHouse === 1 ? ". The birth lagna rising again marks a year that repeats the themes of the birth chart strongly, for good and ill" : lagBad ? ". A hidden house rising asks for more care with health, costs and opposition" : ""}.`,
    tone: lagBad ? "bad" : [1, 5, 9, 10, 11].includes(lagHouse) ? "good" : "neutral",
  });
  const yl = bearers.find((b) => b.planet === yearLord)!;
  const ylHouse = chart.house[yearLord];
  const ylGood = ![6, 8, 12].includes(ylHouse) && chart.dignity[yearLord] !== "debilitated";
  lines.push({
    title: `Likely lord of the year: ${NAME(yearLord)}`,
    detail: `Of the five office-bearers, ${NAME(yearLord)} (${yl.office.toLowerCase()}) is the strongest that sees the year lagna. ${PLANET_INFO[yearLord].en} signifies ${PLANET_INFO[yearLord].karaka}; in the year chart it is in the ${ordinal(ylHouse)} house (${houseTopic(ylHouse)}). ${ylGood ? "It is fit to carry the year." : "It is under strain, so the year asks for more effort than it returns."}`,
    tone: ylGood ? "good" : "bad",
  });
  const moonHouse = chart.house.Mo;
  lines.push({
    title: `Moon in the ${ordinal(moonHouse)} of the year`,
    detail: `The Moon at the return is in ${RASI[signOf(chart.positions.Mo)].ta}, the ${ordinal(moonHouse)} house of the year chart: ${[6, 8, 12].includes(moonHouse) ? "an uneasy place for the mind this year; keep routines and rest steady" : [1, 4, 7, 10, 5, 9, 11].includes(moonHouse) ? "a settled place for the mind this year" : "an ordinary place for the mind this year"}.`,
    tone: [6, 8, 12].includes(moonHouse) ? "bad" : [1, 4, 7, 10, 5, 9, 11].includes(moonHouse) ? "good" : "neutral",
  });

  return { age: k, start, end, chart, muntha, munthaLord, munthaHouseYear, munthaHouseBirth, bearers, yearLord, dayStart, mudda, lines };
}

// ---- Tithi Pravesha -----------------------------------------------------------------------------

const elongation = (t: Date) => norm360(siderealLongitude("Mo", t) - siderealLongitude("Su", t));

/** The lunar new year nearest the `k`th solar return: Sun in its birth sign, Moon at the birth angle from it. */
export function tithiPraveshaMoment(n: Natal, k: number): Date {
  const target = norm360(n.positions.Mo - n.positions.Su);
  const sunSign = signOf(n.positions.Su);
  const solve = (guess: number) => {
    let t = guess;
    for (let i = 0; i < 8; i++) {
      const diff = signed(target - elongation(new Date(t)));
      t += (diff / 12.1907) * MS_DAY;
      if (Math.abs(diff) < 1e-6) break;
    }
    return t;
  };
  const base = solve(solarReturn(n, k).getTime());
  const inSign = (t: number) => signOf(siderealLongitude("Su", new Date(t))) === sunSign;
  if (inSign(base)) return new Date(base);
  for (const shift of [-1, 1]) {
    const alt = solve(base + shift * SYNODIC_MONTH * MS_DAY);
    if (inSign(alt)) return new Date(alt);
  }
  return new Date(base);
}

export interface TithiPravesha {
  start: Date;
  end: Date;
  chart: ReturnChart;
  tithi: number; // 0..29
  weekday: number;
  yearLord: PlanetId; // weekday lord
  horaLord: PlanetId;
  star: number;
  yoga: number;
  /** Days from the solar return to this lunar one (negative when it comes first). */
  offsetDays: number;
  /** False in the rare year when the birth angle does not recur while the Sun is in its birth sign; the nearest recurrence is used. */
  sunInBirthSign: boolean;
  lines: YearLine[];
}

export function tithiPravesha(n: Natal, k: number, place: Place = n.profile.here): TithiPravesha {
  const start = tithiPraveshaMoment(n, k);
  const end = tithiPraveshaMoment(n, k + 1);
  const chart = castChart(start, place);
  const frame = frameContaining(start, place);
  const yearLord = WEEKDAY_LORD[frame.weekday];
  const horaLord = spanAt(horas(frame), start).value;
  const tithi = Math.floor(elongation(start) / 12 + 1e-9) % 30;
  const star = nakOf(chart.positions.Mo);
  const yoga = Math.floor(norm360(chart.positions.Mo + chart.positions.Su) / (360 / 27)) % 27;

  const lines: YearLine[] = [];
  const h = chart.house[yearLord];
  const d = chart.dignity[yearLord];
  const strong = (d === "exalted" || d === "own" || d === "friend") && ![6, 8, 12].includes(h);
  const weak = d === "debilitated" || [6, 8, 12].includes(h);
  lines.push({
    title: `Lord of the year: ${NAME(yearLord)}`,
    detail: `The lunar year opens on a ${WEEKDAYS[frame.weekday]}, so ${NAME(yearLord)} rules it. In the chart of that moment ${NAME(yearLord)} is in ${RASI[signOf(chart.positions[yearLord])].ta}, the ${ordinal(h)} house (${houseTopic(h)})${d === "neutral" ? "" : `, ${d === "own" ? "in its own sign" : d === "friend" ? "in a friend's sign" : d === "enemy" ? "in an enemy's sign" : d}`}. ${strong ? "A well-placed year lord: the year tends to go its way, most through that house." : weak ? "A strained year lord: expect the year's main matters to take more work, and lean on the hora lord below." : "A middling year lord: results follow effort."}`,
    tone: strong ? "good" : weak ? "bad" : "neutral",
  });
  const hh = chart.house[horaLord];
  lines.push({
    title: `Hora lord: ${NAME(horaLord)}`,
    detail: `The hour belongs to ${NAME(horaLord)}, the second voice of the year. It is in the ${ordinal(hh)} house of the chart (${houseTopic(hh)})${horaLord === yearLord ? "; with one planet holding both offices, its matters dominate the year" : ""}.`,
    tone: [6, 8, 12].includes(hh) ? "bad" : chart.dignity[horaLord] === "debilitated" ? "bad" : [1, 4, 5, 7, 9, 10, 11].includes(hh) ? "good" : "neutral",
  });
  const lagHouse = houseFrom(n.lagnaSign, chart.lagnaSign);
  lines.push({
    title: `Lagna of the lunar year: ${RASI[chart.lagnaSign].ta}`,
    detail: `${RASI[chart.lagnaSign].ta} rises, your ${ordinal(lagHouse)} house by birth, so the lunar year is coloured by ${houseTopic(lagHouse)}. Its lord ${NAME(RASI[chart.lagnaSign].lord)} is in the ${ordinal(chart.house[RASI[chart.lagnaSign].lord])} house of the chart.`,
    tone: [6, 8, 12].includes(lagHouse) ? "bad" : [1, 5, 9, 10, 11].includes(lagHouse) ? "good" : "neutral",
  });
  lines.push({
    title: `${NAKSHATRA[star].ta} star, ${YOGA_NAMES[yoga]} yoga`,
    detail: `The tithi is your birth tithi, ${tithi < 15 ? "Valarpirai" : "Theipirai"} ${tithiName(tithi)}, as it is every year. The Moon is in ${NAKSHATRA[star].ta} and the yoga is ${YOGA_NAMES[yoga]}; these two change each year and give the year its mood.`,
    tone: "neutral",
  });

  return { start, end, chart, tithi, weekday: frame.weekday, yearLord, horaLord, star, yoga, offsetDays: (start.getTime() - solarReturn(n, k).getTime()) / MS_DAY, sunInBirthSign: signOf(chart.positions.Su) === signOf(n.positions.Su), lines };
}

/** The lunar year running at `t`. */
export function tithiPraveshaAt(n: Natal, t: Date, place: Place = n.profile.here): { k: number; tp: TithiPravesha } {
  let k = completedYears(n, t);
  if (tithiPraveshaMoment(n, k) > t) k = Math.max(0, k - 1);
  else if (tithiPraveshaMoment(n, k + 1) <= t) k += 1;
  return { k, tp: tithiPravesha(n, k, place) };
}
