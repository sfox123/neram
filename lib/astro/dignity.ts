// Planetary dignity, friendships, sight (graha drishti) and combustion.

import { houseFrom, norm360, PlanetId, RASI, signOf } from "./constants";

export const EXALT: Partial<Record<PlanetId, number>> = { Su: 0, Mo: 1, Ma: 9, Me: 5, Ju: 3, Ve: 11, Sa: 6 };
export const DEBIL: Partial<Record<PlanetId, number>> = { Su: 6, Mo: 7, Ma: 3, Me: 11, Ju: 9, Ve: 5, Sa: 0 };

export const FRIENDS: Record<string, PlanetId[]> = {
  Su: ["Mo", "Ma", "Ju"], Mo: ["Su", "Me"], Ma: ["Su", "Mo", "Ju"], Me: ["Su", "Ve"], Ju: ["Su", "Mo", "Ma"], Ve: ["Me", "Sa"], Sa: ["Me", "Ve"],
  Ra: ["Ve", "Sa"], Ke: ["Ve", "Sa"],
};
export const ENEMIES: Record<string, PlanetId[]> = {
  Su: ["Ve", "Sa"], Mo: [], Ma: ["Me"], Me: ["Mo"], Ju: ["Me", "Ve"], Ve: ["Su", "Mo"], Sa: ["Su", "Mo", "Ma"],
  Ra: ["Su", "Mo", "Ma"], Ke: ["Su", "Mo", "Ma"],
};

export const ownSign = (p: PlanetId, sign: number) => RASI[sign].lord === p;
export const exalted = (p: PlanetId, sign: number) => EXALT[p] === sign;
export const debilitated = (p: PlanetId, sign: number) => DEBIL[p] === sign;

export type Dignity = "exalted" | "own" | "friend" | "neutral" | "enemy" | "debilitated";
export function dignity(p: PlanetId, sign: number): Dignity {
  if (exalted(p, sign)) return "exalted";
  if (debilitated(p, sign)) return "debilitated";
  if (ownSign(p, sign)) return "own";
  const lord = RASI[sign].lord;
  if (FRIENDS[p]?.includes(lord)) return "friend";
  if (ENEMIES[p]?.includes(lord)) return "enemy";
  return "neutral";
}

// Signs each planet looks at, counted from its own sign.
const SIGHT: Record<PlanetId, number[]> = {
  Su: [7], Mo: [7], Ma: [4, 7, 8], Me: [7], Ju: [5, 7, 9], Ve: [7], Sa: [3, 7, 10], Ra: [], Ke: [],
};
/** True if a planet sitting in `fromSign` aspects `toSign` (conjunction not counted). */
export const aspects = (p: PlanetId, fromSign: number, toSign: number) => SIGHT[p].includes(houseFrom(fromSign, toSign));

// Degrees from the Sun within which a planet is combust (burnt, unable to act for itself).
const COMBUST: Partial<Record<PlanetId, number>> = { Mo: 12, Ma: 17, Me: 14, Ju: 11, Ve: 10, Sa: 15 };
export function isCombust(p: PlanetId, lon: number, sunLon: number): boolean {
  const orb = COMBUST[p];
  if (!orb) return false;
  const d = Math.abs(((norm360(lon - sunLon) + 180) % 360) - 180);
  return d <= orb;
}

export type Link = "conjunction" | "mutual aspect" | "exchange of signs" | null;
/** The strongest tie between two planets given their sidereal longitudes. */
export function link(a: PlanetId, aLon: number, b: PlanetId, bLon: number): Link {
  const sa = signOf(aLon);
  const sb = signOf(bLon);
  if (RASI[sa].lord === b && RASI[sb].lord === a && a !== b) return "exchange of signs";
  if (sa === sb) return "conjunction";
  if (aspects(a, sa, sb) && aspects(b, sb, sa)) return "mutual aspect";
  return null;
}
