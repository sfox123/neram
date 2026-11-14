// Pancha Pakshi Sastram.
//
// Main-activity tables follow the traditional Tamil charts (the same ones printed as the
// vallooru / aanthai / kaagam / kozhi / mayil grids) and were cross-checked against two
// independent sources. Sub-period (sookshma) lengths follow the Tamil nazhigai values,
// which differ for waxing/waning and day/night.

import { DayFrame, Panchang } from "./panchang";

export type Bird = 0 | 1 | 2 | 3 | 4;
export const BIRDS = [
  { en: "Vulture", ta: "Vallooru", tamil: "வல்லூறு" },
  { en: "Owl", ta: "Aanthai", tamil: "ஆந்தை" },
  { en: "Crow", ta: "Kaagam", tamil: "காகம்" },
  { en: "Cock", ta: "Kozhi", tamil: "கோழி" },
  { en: "Peacock", ta: "Mayil", tamil: "மயில்" },
];

export type Activity = "R" | "E" | "W" | "S" | "D";
export const ACTIVITY: Record<Activity, { en: string; ta: string; tamil: string; strength: number; note: string }> = {
  R: { en: "Ruling", ta: "Arasu", tamil: "அரசு", strength: 1.0, note: "Full power. Lead, decide, ask, compete." },
  E: { en: "Eating", ta: "Oon", tamil: "ஊண்", strength: 0.8, note: "Gathering strength. Good for money, deals and steady progress." },
  W: { en: "Walking", ta: "Nadai", tamil: "நடை", strength: 0.6, note: "In motion. Routine work, errands, follow-ups." },
  S: { en: "Sleeping", ta: "Thuyil", tamil: "துயில்", strength: 0.4, note: "Low ebb. Plan, study, rest; don't push." },
  D: { en: "Dying", ta: "Saavu", tamil: "சாவு", strength: 0.2, note: "Weakest. Hold anything important." },
};

// Order in which every bird cycles through activities, by [paksha][day=0|night=1].
const ORDER: Activity[][][] = [
  [
    ["E", "W", "R", "S", "D"],
    ["E", "R", "D", "W", "S"],
  ],
  [
    ["E", "D", "S", "R", "W"],
    ["E", "S", "W", "D", "R"],
  ],
];

// Activity of [Vulture, Owl, Crow, Cock, Peacock] in the first yama, by [paksha][day|night][weekday].
const FIRST: string[][][] = [
  [
    ["EWRSD", "DEWRS", "EWRSD", "DEWRS", "SDEWR", "RSDEW", "WRSDE"],
    ["DRESW", "WDRES", "DRESW", "WDRES", "SWDRE", "ESWDR", "RESWD"],
  ],
  [
    ["WDRES", "SWDRE", "WDRES", "DRESW", "RESWD", "ESWDR", "SWDRE"],
    ["ERDWS", "DWSER", "ERDWS", "SERDW", "WSERD", "RDWSE", "DWSER"],
  ],
];

// Sub-period lengths in minutes of a 144-minute yama, by [paksha][day|night].
const SUB_MINUTES: Record<Activity, number>[][] = [
  [
    { E: 30, W: 36, R: 48, S: 18, D: 12 },
    { E: 30, R: 24, D: 36, W: 30, S: 24 },
  ],
  [
    { E: 48, W: 36, R: 18, S: 12, D: 30 },
    { E: 42, W: 42, R: 18, S: 18, D: 24 },
  ],
];

// Padu pakshi: the bird that is "dead" for the whole day, by [paksha][weekday].
const PADU: Bird[][] = [
  [1, 2, 3, 4, 0, 1, 0],
  [2, 1, 0, 4, 3, 4, 3],
];

const FRIENDS: Bird[][][] = [
  [[4, 1], [0, 2], [1, 3], [4, 2], [0, 3]],
  [[4, 2], [3, 2], [1, 0], [4, 1], [0, 3]],
];
const ENEMIES: Bird[][][] = [
  [[2, 3], [4, 3], [0, 4], [0, 1], [1, 2]],
  [[1, 3], [0, 4], [4, 3], [2, 0], [1, 2]],
];

export type Relation = "self" | "friend" | "enemy";
export function relation(paksha: 0 | 1, mine: Bird, other: Bird): Relation {
  if (mine === other) return "self";
  if (FRIENDS[paksha][mine].includes(other)) return "friend";
  if (ENEMIES[paksha][mine].includes(other)) return "enemy";
  return "friend";
}

/** Birth bird from the birth star (0..26) and the paksha at birth. */
export function birthBird(nakshatra: number, paksha: 0 | 1): Bird {
  const n = nakshatra + 1;
  const group = n <= 5 ? 0 : n <= 11 ? 1 : n <= 16 ? 2 : n <= 21 ? 3 : 4;
  return (paksha === 0 ? group : 4 - group) as Bird;
}

export interface PakshiSub {
  start: Date;
  end: Date;
  activity: Activity; // what the sub-period's bird is doing
  bird: Bird; // the bird that holds this sub-period
  relation: Relation;
  power: number; // main strength x sub strength, 0.04..1
}

export interface PakshiYama {
  start: Date;
  end: Date;
  isDay: boolean;
  index: number; // 0..4
  activity: Activity; // my bird's main activity
  subs: PakshiSub[];
}

export interface PakshiDay {
  bird: Bird;
  paksha: 0 | 1;
  weekday: number;
  yamas: PakshiYama[];
  paduBird: Bird;
  isPaduDay: boolean; // my bird is the death bird today
  dayRuler: Bird; // oon pakshi of the daytime
  nightRuler: Bird;
}

export function pakshiDay(bird: Bird, frame: DayFrame, paksha: 0 | 1): PakshiDay {
  const wd = frame.weekday;
  const yamas: PakshiYama[] = [];
  for (const dn of [0, 1] as const) {
    const order = ORDER[paksha][dn];
    const first = FIRST[paksha][dn][wd];
    const base = dn === 0 ? frame.sunrise.getTime() : frame.sunset.getTime();
    const len = (dn === 0 ? frame.dayLength : frame.nightLength) / 5;
    const minutes = SUB_MINUTES[paksha][dn];
    for (let k = 0; k < 5; k++) {
      // Each bird moves one step along the order with every yama.
      const actOf = (b: number) => order[(order.indexOf(first[b] as Activity) + k) % 5];
      const mine = actOf(bird);
      const start = base + k * len;
      const subs: PakshiSub[] = [];
      let t = start;
      for (let j = 0; j < 5; j++) {
        const act = order[(order.indexOf(mine) + j) % 5];
        const holder = [0, 1, 2, 3, 4].find((b) => actOf(b) === act) as Bird;
        const dur = (minutes[act] / 144) * len;
        subs.push({
          start: new Date(t),
          end: new Date(t + dur),
          activity: act,
          bird: holder,
          relation: relation(paksha, bird, holder),
          power: ACTIVITY[mine].strength * ACTIVITY[act].strength,
        });
        t += dur;
      }
      yamas.push({ start: new Date(start), end: new Date(start + len), isDay: dn === 0, index: k, activity: mine, subs });
    }
  }
  const ruler = (dn: 0 | 1) => FIRST[paksha][dn][wd].indexOf("E") as Bird;
  const paduBird = PADU[paksha][wd];
  return {
    bird,
    paksha,
    weekday: wd,
    yamas,
    paduBird,
    isPaduDay: paduBird === bird,
    dayRuler: ruler(0),
    nightRuler: ruler(1),
  };
}

export function pakshiFor(bird: Bird, p: Panchang): PakshiDay {
  return pakshiDay(bird, p.frame, p.paksha);
}

export function pakshiAt(day: PakshiDay, t: Date): { yama: PakshiYama; sub: PakshiSub } {
  const yama = day.yamas.find((y) => t >= y.start && t < y.end) ?? day.yamas[day.yamas.length - 1];
  const sub = yama.subs.find((s) => t >= s.start && t < s.end) ?? yama.subs[yama.subs.length - 1];
  return { yama, sub };
}

/** 1..10 rating in the style of the traditional strength tables. */
export function pakshiRating(sub: PakshiSub): number {
  const base = Math.round(sub.power * 10);
  const tweak = sub.relation === "friend" ? 1 : sub.relation === "enemy" ? -1 : 0;
  return Math.min(10, Math.max(1, base + tweak));
}
