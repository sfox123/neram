// The birth chart: positions, lagna, whole-sign houses, lordships and the derived
// reference points the rest of the app reads from.

import { houseFrom, nakOf, padaOf, PlanetId, PLANETS, RASI, signOf } from "./constants";
import { DashaPeriod, mahaDashas } from "./dasha";
import { allPositions, dailyMotion, lagnaLongitude, Positions } from "./ephemeris";
import { Bird, birthBird } from "./pakshi";
import { Place, tithiIndex } from "./panchang";
import { parseDateKey, zonedToUtc } from "./time";

export interface Profile {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM, wall clock at the birth place
  timeConfirmed: boolean;
  birthPlace: Place;
  here: Place; // where you are now; sets sunrise and all the time slots
  birdOverride: Bird | null;
}

export const DEFAULT_PROFILE: Profile = {
  name: "Shagar",
  birthDate: "1999-12-15",
  birthTime: "10:25",
  timeConfirmed: true,
  birthPlace: { name: "Colombo, Sri Lanka", latitude: 6.9271, longitude: 79.8612, tz: "Asia/Colombo" },
  here: { name: "Colombo, Sri Lanka", latitude: 6.9271, longitude: 79.8612, tz: "Asia/Colombo" },
  birdOverride: null,
};

export interface Natal {
  profile: Profile;
  birth: Date;
  positions: Positions;
  retro: Record<PlanetId, boolean>;
  lagna: number;
  lagnaSign: number;
  moonSign: number;
  star: number; // 0..26
  pada: number;
  tithi: number; // 0..29
  paksha: 0 | 1;
  bird: Bird;
  mahas: DashaPeriod[];
  induLagna: number; // sign index
  /** House (1..12) a planet sits in, counted from the lagna. */
  house: Record<PlanetId, number>;
  /** Houses each planet rules from the lagna (Rahu and Ketu rule none). */
  rules: Record<PlanetId, number[]>;
  lordOf: (house: number) => PlanetId;
}

export function buildNatal(profile: Profile): Natal {
  const { y, m, d } = parseDateKey(profile.birthDate);
  const [hh, mm] = profile.birthTime.split(":").map(Number);
  const birth = zonedToUtc(y, m, d, hh || 0, mm || 0, profile.birthPlace.tz);
  const positions = allPositions(birth);
  const lagna = lagnaLongitude(birth, profile.birthPlace.latitude, profile.birthPlace.longitude);
  const lagnaSign = signOf(lagna);
  const moonSign = signOf(positions.Mo);
  const star = nakOf(positions.Mo);
  const tithi = tithiIndex(birth);
  const paksha = (tithi < 15 ? 0 : 1) as 0 | 1;

  const retro = {} as Record<PlanetId, boolean>;
  const house = {} as Record<PlanetId, number>;
  const rules = {} as Record<PlanetId, number[]>;
  for (const p of PLANETS) {
    retro[p] = p === "Ra" || p === "Ke" ? true : p === "Su" || p === "Mo" ? false : dailyMotion(p, birth) < 0;
    house[p] = houseFrom(lagnaSign, signOf(positions[p]));
    rules[p] = [];
  }
  for (let h = 1; h <= 12; h++) rules[RASI[(lagnaSign + h - 1) % 12].lord].push(h);
  const lordOf = (h: number) => RASI[(lagnaSign + h - 1) % 12].lord;

  return {
    profile,
    birth,
    positions,
    retro,
    lagna,
    lagnaSign,
    moonSign,
    star,
    pada: padaOf(positions.Mo),
    tithi,
    paksha,
    bird: profile.birdOverride ?? birthBird(star, paksha),
    mahas: mahaDashas(birth, positions.Mo),
    induLagna: induLagna(lagnaSign, moonSign),
    house,
    rules,
    lordOf,
  };
}

// Indu lagna, the wealth ascendant: add the "kalas" of the 9th lords from lagna and Moon,
// cast out twelves, and count that many signs from the Moon.
const KALA: Partial<Record<PlanetId, number>> = { Su: 30, Mo: 16, Ma: 6, Me: 8, Ju: 10, Ve: 12, Sa: 1 };
function induLagna(lagnaSign: number, moonSign: number): number {
  const ninthLord = (from: number) => RASI[(from + 8) % 12].lord;
  const total = (KALA[ninthLord(lagnaSign)] ?? 0) + (KALA[ninthLord(moonSign)] ?? 0);
  const rem = total % 12 === 0 ? 12 : total % 12;
  return (moonSign + rem - 1) % 12;
}

const HOUSE_TOPIC: Record<number, string> = {
  1: "self and vitality",
  2: "money and savings",
  3: "effort, skills and courage",
  4: "home and peace of mind",
  5: "ideas, learning and speculation",
  6: "competition, debts and daily work",
  7: "partners and clients",
  8: "upheaval and hidden matters",
  9: "luck, mentors and long journeys",
  10: "career and status",
  11: "income and gains",
  12: "expenses and withdrawal",
};
export const houseTopic = (h: number) => HOUSE_TOPIC[h];

export type Role = "yogakaraka" | "good" | "neutral" | "mixed" | "hard";

/** How a planet behaves for this lagna, from the houses it rules. */
export function functionalRole(n: Natal, p: PlanetId): Role {
  const r = n.rules[p];
  if (r.length === 0) return "neutral";
  if (r.includes(1)) return "good"; // the lagna lord always works for you
  const trine = r.some((h) => h === 1 || h === 5 || h === 9);
  const kendra = r.some((h) => h === 4 || h === 7 || h === 10);
  const dusthana = r.some((h) => h === 6 || h === 8 || h === 12);
  if (trine && kendra) return "yogakaraka";
  if (trine && !dusthana) return "good";
  if (trine && dusthana) return "mixed";
  if (dusthana && r.every((h) => h === 6 || h === 8 || h === 12 || h === 3)) return "hard";
  if (dusthana) return "mixed";
  return "neutral";
}

export function rulesText(n: Natal, p: PlanetId): string {
  const r = n.rules[p];
  if (r.length === 0) return `sits in your ${ordinal(n.house[p])} house`;
  return `rules your ${r.map(ordinal).join(" and ")} (${r.map(houseTopic).join("; ")})`;
}

export function ordinal(nm: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = nm % 100;
  return nm + (s[(v - 20) % 10] || s[v] || s[0]);
}
