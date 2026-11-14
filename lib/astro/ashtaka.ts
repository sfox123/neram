// Ashtakavarga: each of the seven planets, and the lagna, gives a "bindu" (point) to certain
// signs counted from itself. Adding all of them gives the Sarvashtakavarga (SAV): 337 points
// spread over the twelve signs. A sign with many points carries transits well; a sign with
// few is weak ground. The tables are the standard Parashara ones.

import { PlanetId, signOf } from "./constants";
import { Natal } from "./chart";

type Source = "Su" | "Mo" | "Ma" | "Me" | "Ju" | "Ve" | "Sa" | "La";
const SOURCES: Source[] = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "La"];
type Target = Exclude<Source, "La">;

// BAV[target][source index] = houses, counted from the source, where the target gains a point.
const BAV: Record<Target, number[][]> = {
  Su: [[1, 2, 4, 7, 8, 9, 10, 11], [3, 6, 10, 11], [1, 2, 4, 7, 8, 9, 10, 11], [3, 5, 6, 9, 10, 11, 12], [5, 6, 9, 11], [6, 7, 12], [1, 2, 4, 7, 8, 9, 10, 11], [3, 4, 6, 10, 11, 12]],
  Mo: [[3, 6, 7, 8, 10, 11], [1, 3, 6, 7, 9, 10, 11], [2, 3, 5, 6, 10, 11], [1, 3, 4, 5, 7, 8, 10, 11], [1, 2, 4, 7, 8, 10, 11], [3, 4, 5, 7, 9, 10, 11], [3, 5, 6, 11], [3, 6, 10, 11]],
  Ma: [[3, 5, 6, 10, 11], [3, 6, 11], [1, 2, 4, 7, 8, 10, 11], [3, 5, 6, 11], [6, 10, 11, 12], [6, 8, 11, 12], [1, 4, 7, 8, 9, 10, 11], [1, 3, 6, 10, 11]],
  Me: [[5, 6, 9, 11, 12], [2, 4, 6, 8, 10, 11], [1, 2, 4, 7, 8, 9, 10, 11], [1, 3, 5, 6, 9, 10, 11, 12], [6, 8, 11, 12], [1, 2, 3, 4, 5, 8, 9, 11], [1, 2, 4, 7, 8, 9, 10, 11], [1, 2, 4, 6, 8, 10, 11]],
  Ju: [[1, 2, 3, 4, 7, 8, 9, 10, 11], [2, 5, 7, 9, 11], [1, 2, 4, 7, 8, 10, 11], [1, 2, 4, 5, 6, 9, 10, 11], [1, 2, 3, 4, 7, 8, 10, 11], [2, 5, 6, 9, 10, 11], [3, 5, 6, 12], [1, 2, 4, 5, 6, 7, 9, 10, 11]],
  Ve: [[8, 11, 12], [1, 2, 3, 4, 5, 8, 9, 11, 12], [3, 4, 6, 9, 11, 12], [3, 5, 6, 9, 11], [5, 8, 9, 10, 11], [1, 2, 3, 4, 5, 8, 9, 10, 11], [3, 4, 5, 8, 9, 10, 11], [1, 2, 3, 4, 5, 8, 9, 11]],
  Sa: [[1, 2, 4, 7, 8, 10, 11], [3, 6, 11], [3, 5, 6, 10, 11, 12], [6, 8, 9, 10, 11, 12], [5, 6, 11, 12], [6, 11, 12], [3, 5, 6, 11], [1, 3, 4, 6, 10, 11]],
};

export interface Ashtakavarga {
  /** Points each planet has in each sign (Mesham first). */
  bav: Record<Target, number[]>;
  /** Sarvashtakavarga: total points per sign; the twelve add up to 337. */
  sav: number[];
}

export function ashtakavarga(n: Natal): Ashtakavarga {
  const signOfSource = (s: Source) => (s === "La" ? n.lagnaSign : signOf(n.positions[s as PlanetId]));
  const bav = {} as Record<Target, number[]>;
  const sav = new Array(12).fill(0);
  for (const target of Object.keys(BAV) as Target[]) {
    const row = new Array(12).fill(0);
    BAV[target].forEach((houses, i) => {
      const from = signOfSource(SOURCES[i]);
      for (const h of houses) row[(from + h - 1) % 12] += 1;
    });
    bav[target] = row;
    for (let i = 0; i < 12; i++) sav[i] += row[i];
  }
  return { bav, sav };
}

export type SavGrade = "strong" | "fair" | "average" | "weak" | "poor";
/** 28 is the average (337 / 12). */
export function savGrade(points: number): SavGrade {
  if (points >= 32) return "strong";
  if (points >= 29) return "fair";
  if (points >= 26) return "average";
  if (points >= 23) return "weak";
  return "poor";
}
