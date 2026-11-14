// Everything that compares the sky now with the birth chart:
// tara bala, chandra bala, gochara, Chandra Naadi and degree contacts over natal planets.

import {
  formatDeg,
  houseFrom,
  nakOf,
  norm360,
  PLANET_INFO,
  PlanetId,
  PLANETS,
  RASI,
  signOf,
  TARA_MEANING,
  TARA_NAMES,
} from "./constants";
import { Natal, ordinal, rulesText, houseTopic } from "./chart";
import { allPositions, dailyMotion, Positions, siderealLongitude } from "./ephemeris";
import { nextSignChange } from "./panchang";
import { MS_DAY } from "./time";

export type Tone = "good" | "bad" | "neutral";

// ---- Tara bala --------------------------------------------------------------------------

export interface Tara {
  index: number; // 0..8
  name: string;
  meaning: string;
  tone: Tone;
}
const TARA_TONE: Tone[] = ["neutral", "good", "bad", "good", "bad", "good", "bad", "good", "good"];

export function taraBala(natalStar: number, transitStar: number): Tara {
  const index = (((transitStar - natalStar) % 27) + 27) % 9;
  return { index, name: TARA_NAMES[index], meaning: TARA_MEANING[index], tone: TARA_TONE[index] };
}

// ---- Chandra bala -----------------------------------------------------------------------

export interface ChandraBala {
  house: number; // transit Moon counted from natal Moon sign
  tone: Tone;
  note: string;
  chandrashtama: boolean;
}

const MOON_HOUSE_NOTE: Record<number, string> = {
  1: "Moon over your own rasi: you feel like yourself; fine for personal matters.",
  2: "Moon in the 2nd from your rasi: attention on money and speech; spend carefully.",
  3: "Moon in the 3rd: courage and effort flow; good for initiative.",
  4: "Moon in the 4th: restless at home; keep the day simple.",
  5: "Moon in the 5th: scattered thinking; double-check decisions.",
  6: "Moon in the 6th: you get the upper hand over rivals and pending problems.",
  7: "Moon in the 7th: good for people, meetings and agreements.",
  8: "Chandrashtamam: Moon in the 8th from your rasi. Keep a low profile and postpone anything important.",
  9: "Moon in the 9th: reflective; progress is slower than it looks.",
  10: "Moon in the 10th: work gets noticed; good for career moves.",
  11: "Moon in the 11th: the gains house. Good for money, asks and results.",
  12: "Moon in the 12th: expenses and low energy; avoid new commitments.",
};

export function chandraBala(natalMoonSign: number, transitMoonSign: number, waxing: boolean): ChandraBala {
  const house = houseFrom(natalMoonSign, transitMoonSign);
  let tone: Tone = [1, 3, 6, 7, 10, 11].includes(house) ? "good" : [4, 8, 12].includes(house) ? "bad" : "neutral";
  // 2, 5 and 9 are counted as acceptable while the Moon is waxing.
  if ([2, 5, 9].includes(house) && !waxing) tone = "bad";
  return { house, tone, note: MOON_HOUSE_NOTE[house], chandrashtama: house === 8 };
}

// ---- Gochara: each planet's transit house from the natal Moon ------------------------------

const GOOD_FROM_MOON: Record<PlanetId, number[]> = {
  Su: [3, 6, 10, 11],
  Mo: [1, 3, 6, 7, 10, 11],
  Ma: [3, 6, 11],
  Me: [2, 4, 6, 8, 10, 11],
  Ju: [2, 5, 7, 9, 11],
  Ve: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  Sa: [3, 6, 11],
  Ra: [3, 6, 10, 11],
  Ke: [3, 6, 10, 11],
};

export interface Gochara {
  planet: PlanetId;
  longitude: number;
  sign: number;
  retro: boolean;
  fromMoon: number;
  fromLagna: number;
  tone: Tone;
  until: Date; // when it leaves this sign
  note: string;
}

export function gochara(n: Natal, t: Date, pos: Positions = allPositions(t)): Gochara[] {
  return PLANETS.map((p) => {
    const sign = signOf(pos[p]);
    const fromMoon = houseFrom(n.moonSign, sign);
    const fromLagna = houseFrom(n.lagnaSign, sign);
    const good = GOOD_FROM_MOON[p].includes(fromMoon);
    const retro = p === "Ra" || p === "Ke" ? true : p === "Su" || p === "Mo" ? false : dailyMotion(p, t) < 0;
    return {
      planet: p,
      longitude: pos[p],
      sign,
      retro,
      fromMoon,
      fromLagna,
      tone: good ? "good" : "bad",
      until: nextSignChange(p, t),
      note: `${PLANET_INFO[p].en} in ${RASI[sign].ta}: ${ordinal(fromMoon)} from your Moon, ${ordinal(fromLagna)} house from lagna (${houseTopic(fromLagna)}).`,
    } as Gochara;
  });
}

export interface SaturnPhase {
  active: boolean;
  label: string;
  note: string;
}

export function saturnPhase(n: Natal, pos: Positions): SaturnPhase {
  const h = houseFrom(n.moonSign, signOf(pos.Sa));
  if (h === 12) return { active: true, label: "Elarai Sani, first phase", note: "Saturn is in the 12th from your Moon: the opening stretch of the 7½-year Saturn period. Expenses and restlessness rise; build habits rather than chase quick wins." };
  if (h === 1) return { active: true, label: "Elarai Sani, peak (Janma Sani)", note: "Saturn is over your Moon: the middle of the 7½-year Saturn period. Work is heavy and results come late; patience pays." };
  if (h === 2) return { active: true, label: "Elarai Sani, last phase", note: "Saturn is in the 2nd from your Moon: the closing stretch of the 7½-year Saturn period. Watch money and words; steady saving works." };
  if (h === 8) return { active: true, label: "Ashtama Sani", note: "Saturn is in the 8th from your Moon. Avoid big risks; keep health and paperwork in order." };
  if (h === 4) return { active: true, label: "Ardhashtama Sani", note: "Saturn is in the 4th from your Moon. Home and peace of mind need attention." };
  return { active: false, label: "No Saturn pressure period", note: `Saturn is in the ${ordinal(h)} from your Moon${[3, 6, 11].includes(h) ? ", one of its helpful places" : ""}.` };
}

// ---- Chandra Naadi: the transit Moon touching natal planets -------------------------------

export interface NaadiLink {
  planet: PlanetId;
  kind: "conjunct" | "opposite" | "aspect";
  tone: Tone;
  text: string;
}

// Signs (counted from the planet) that each natal planet aspects, besides the 7th.
const SPECIAL_ASPECT: Partial<Record<PlanetId, number[]>> = { Ma: [4, 8], Ju: [5, 9], Sa: [3, 10] };

const NAADI_THEME: Record<PlanetId, string> = {
  Su: "recognition, bosses and official matters come up",
  Mo: "you are back in your own emotional weather; instincts are sharp",
  Ma: "energy and impatience rise; channel it into hard tasks, not arguments",
  Me: "messages, documents, code and negotiations move",
  Ju: "guidance, luck and good sense are close at hand",
  Ve: "money, comfort and relationships get attention",
  Sa: "duty and delay; finish what is pending rather than start afresh",
  Ra: "restless ambition and unusual ideas; don't over-promise",
  Ke: "you may feel detached; good for research and clean-ups",
};

export function chandraNaadi(n: Natal, transitMoonSign: number): NaadiLink[] {
  const out: NaadiLink[] = [];
  for (const p of PLANETS) {
    const pSign = signOf(n.positions[p]);
    const count = houseFrom(pSign, transitMoonSign); // Moon's place counted from the natal planet
    let kind: NaadiLink["kind"] | null = null;
    if (count === 1) kind = "conjunct";
    else if (count === 7) kind = "opposite";
    else if (SPECIAL_ASPECT[p]?.includes(count)) kind = "aspect";
    if (!kind) continue;
    const benefic = PLANET_INFO[p].benefic;
    const tone: Tone = p === "Mo" ? "neutral" : benefic ? "good" : kind === "conjunct" ? "bad" : "neutral";
    const where = `${PLANET_INFO[p].en} in ${RASI[pSign].ta}`;
    const how =
      kind === "conjunct"
        ? `The Moon is passing over your natal ${where}`
        : kind === "opposite"
          ? `The Moon is opposite your natal ${where}`
          : `Your natal ${where} aspects today's Moon`;
    out.push({
      planet: p,
      kind,
      tone,
      text: `${how}. ${PLANET_INFO[p].en} ${rulesText(n, p)}: ${NAADI_THEME[p]}.`,
    });
  }
  return out;
}

// ---- Degree contacts: a transiting planet crossing a natal planet -------------------------

export interface Contact {
  transit: PlanetId;
  natal: PlanetId;
  orb: number; // degrees, signed (negative = still approaching)
  exact: boolean; // within the tight orb
  tone: Tone;
  text: string;
}

const ORB: Record<PlanetId, number> = { Su: 3, Mo: 6, Ma: 4, Me: 3, Ju: 5, Ve: 3, Sa: 5, Ra: 5, Ke: 5 };

const BRINGS: Record<PlanetId, string> = {
  Su: "puts a spotlight on",
  Mo: "stirs",
  Ma: "pushes and heats up",
  Me: "gets you talking and writing about",
  Ju: "expands and protects",
  Ve: "sweetens",
  Sa: "tests and slows",
  Ra: "amplifies and unsettles",
  Ke: "loosens your grip on",
};

function contactTone(t: PlanetId, nPlanet: PlanetId): Tone {
  const tb = PLANET_INFO[t].benefic;
  const nb = PLANET_INFO[nPlanet].benefic;
  if (t === "Su") return nb || nPlanet === "Su" ? "good" : "neutral";
  if (tb) return nb || nPlanet === "Su" ? "good" : "neutral";
  if (t === "Ma") return nPlanet === "Su" || nPlanet === "Ma" || nPlanet === "Ju" ? "neutral" : "bad";
  return "bad";
}

export function contacts(n: Natal, pos: Positions, t: Date): Contact[] {
  const out: Contact[] = [];
  for (const tp of PLANETS) {
    if (tp === "Mo") continue; // the Moon is handled by Chandra Naadi
    const motion = tp === "Ra" || tp === "Ke" ? -1 : dailyMotion(tp, t);
    for (const np of PLANETS) {
      let diff = norm360(pos[tp] - n.positions[np]);
      if (diff > 180) diff -= 360;
      const sameSign = signOf(pos[tp]) === signOf(n.positions[np]);
      if (!sameSign && Math.abs(diff) > ORB[tp]) continue;
      if (sameSign && Math.abs(diff) > 15) continue;
      const exact = Math.abs(diff) <= ORB[tp];
      const tone = contactTone(tp, np);
      const approaching = motion >= 0 ? diff < 0 : diff > 0;
      out.push({
        transit: tp,
        natal: np,
        orb: diff,
        exact,
        tone,
        text: `${PLANET_INFO[tp].en} ${exact ? "is right on" : "is near"} your natal ${PLANET_INFO[np].en} at ${formatDeg(n.positions[np])} ${RASI[signOf(n.positions[np])].ta} (${Math.abs(diff).toFixed(1)}° ${approaching ? "and closing" : "and separating"}). It ${BRINGS[tp]} ${PLANET_INFO[np].karaka.split(",")[0]} and what ${PLANET_INFO[np].en} ${rulesText(n, np)}.`,
      });
    }
  }
  return out.sort((a, b) => Number(b.exact) - Number(a.exact) || Math.abs(a.orb) - Math.abs(b.orb));
}

// ---- Upcoming sign changes ---------------------------------------------------------------

export interface Ingress {
  planet: PlanetId;
  date: Date;
  sign: number;
  fromMoon: number;
  fromLagna: number;
  tone: Tone;
}

/** Sign changes of the slower planets over the coming months. */
export function upcomingIngresses(n: Natal, from: Date, days = 400): Ingress[] {
  const out: Ingress[] = [];
  const end = from.getTime() + days * MS_DAY;
  for (const p of ["Su", "Ma", "Me", "Ju", "Ve", "Sa", "Ra"] as PlanetId[]) {
    let t = from;
    let guard = 0;
    while (guard++ < 40) {
      const next = nextSignChange(p, t);
      if (next.getTime() > end) break;
      const after = new Date(next.getTime() + 60000);
      const sign = signOf(siderealLongitude(p, after));
      const fromMoon = houseFrom(n.moonSign, sign);
      out.push({
        planet: p,
        date: next,
        sign,
        fromMoon,
        fromLagna: houseFrom(n.lagnaSign, sign),
        tone: GOOD_FROM_MOON[p].includes(fromMoon) ? "good" : "bad",
      });
      t = after;
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export const transitStar = (pos: Positions) => nakOf(pos.Mo);
