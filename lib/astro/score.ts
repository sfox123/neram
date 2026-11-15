// Turns all the separate techniques into one reading for a moment in time:
// a 0-100 score per kind of activity, the factors behind it, and a day timeline.
//
// The weights are a judgement about how much each tradition should count. They are kept
// in one place (this file) so they are easy to read and change.

import { DayPushkara, dayPushkara, pushkaraAt, PushkaraSpan } from "./pushkara";
import { TravelPromise, travelPromise } from "./travel";
import { InduReading, induReading, induWeight } from "./indu";
import { VargaStrength, vargaStrength } from "./vargas";
import { DashaGocharam, dashaGocharam } from "./dashaTransit";
import {
  BAD_YOGAS,
  NAKSHATRA,
  PLANET_INFO,
  PlanetId,
  RASI,
  STAR_NATURE_NOTE,
  StarNature,
  VERY_BAD_YOGAS,
  WEEKDAYS,
  houseFrom,
} from "./constants";
import { ashtakavarga, savGrade } from "./ashtaka";
import { starRelation, YogiInfo, yogiInfo } from "./yogi";
import { functionalRole, Natal, ordinal, rulesText } from "./chart";
import { runningDasha, RunningDasha } from "./dasha";
import { allPositions, Positions, siderealLongitude } from "./ephemeris";
import { ACTIVITY, BIRDS, PakshiDay, pakshiFor, PakshiSub, PakshiYama, pakshiAt } from "./pakshi";
import { DayFrame, GOWRI_INFO, GowriName, label, Panchang, panchangFor, Span, spanAt, within } from "./panchang";
import { fmtTime } from "./time";
import { chandraBala, ChandraBala, chandraNaadi, Contact, contacts, NaadiLink, Tara, taraBala, Tone } from "./transits";
import { balaLean, balaWord, Graha, Shadbala, shadbala } from "./shadbala";
import { DEFAULT_SCHOOL, describeHit, hitsOn, NatalPoint, natalPoints, SbcBaseline, sbcBaseline, SbcSchool, sbcScore, Thrower, throwers } from "./sbc";

export type ActivityKey = "overall" | "work" | "apply" | "start" | "money" | "people" | "travel";

export const ACTIVITIES: { key: Exclude<ActivityKey, "overall">; label: string; go: string; hold: string }[] = [
  { key: "work", label: "Focused work", go: "Do the hard, important work now.", hold: "Keep to light admin; don't force hard problems." },
  { key: "apply", label: "Apply or compete", go: "Submit applications, enter competitions, sit tests.", hold: "Hold submissions and competition entries." },
  { key: "start", label: "Start or sign", go: "Begin, launch or sign.", hold: "Don't begin, launch or sign anything new." },
  { key: "money", label: "Money matters", go: "Send invoices, ask about pay, make planned purchases.", hold: "Postpone payments and purchases whose timing you control." },
  { key: "people", label: "Meetings and asks", go: "Hold meetings, pitch, ask for favours.", hold: "Avoid big asks and difficult conversations." },
  { key: "travel", label: "Travel", go: "Set out on trips and errands.", hold: "Delay setting out if you can." },
];

export type Tier = "go" | "good" | "steady" | "hold" | "avoid";
export const TIER: Record<Tier, { word: string; tamil: string; line: string }> = {
  go: { word: "Go", tamil: "மிக நல்ல நேரம்", line: "A strong window. Use it for what matters most." },
  good: { word: "Good", tamil: "நல்ல நேரம்", line: "Favourable. Fine to act on important things." },
  steady: { word: "Steady", tamil: "சாதாரண நேரம்", line: "Ordinary time. Routine work is fine; save big moves for a better slot." },
  hold: { word: "Hold", tamil: "பொறுமை", line: "Weak time. Hold important work and wait for the next good window." },
  avoid: { word: "Wait", tamil: "தவிர்க்கவும்", line: "Poor time. Don't start, sign or decide anything now." },
};

export function tierOf(score: number): Tier {
  if (score >= 75) return "go";
  if (score >= 60) return "good";
  if (score >= 46) return "steady";
  if (score >= 34) return "hold";
  return "avoid";
}

type Effect = Record<ActivityKey, number>;
const KEYS: ActivityKey[] = ["overall", "work", "apply", "start", "money", "people", "travel"];
function eff(all: number, over: Partial<Effect> = {}): Effect {
  const e = {} as Effect;
  for (const k of KEYS) e[k] = over[k] ?? all;
  return e;
}

export interface Factor {
  id: string;
  source: string; // which tradition it comes from
  title: string;
  detail: string;
  tone: Tone;
  effect: Effect;
}

export interface Reading {
  time: Date;
  scores: Effect;
  tiers: Record<ActivityKey, Tier>;
  factors: Factor[];
  yama: PakshiYama;
  sub: PakshiSub;
  hora: Span<PlanetId>;
  gowri: Span<GowriName>;
  tithi: Span<number>;
  star: Span<number>;
  yoga: Span<number>;
  karana: Span<number>;
  moonSign: number;
  rising: Span<number>;
  tara: Tara;
  chandra: ChandraBala;
  inRahu: boolean;
  inYama: boolean;
  inGulika: boolean;
  inAbhijit: boolean;
}

/** Everything that stays fixed for one sunrise-to-sunrise day. */
export interface DayContext {
  natal: Natal;
  frame: DayFrame;
  panchang: Panchang;
  pakshi: PakshiDay;
  positions: Positions; // at local midday
  contacts: Contact[];
  dasha: RunningDasha | null;
  useLagna: boolean;
  /** Sarvashtakavarga points per sign; null until the birth time is known. */
  sav: number[] | null;
  /** Yogi, avayogi, karana nathan and the standing they give each planet. */
  yogi: YogiInfo;
  /** The running dasa, bhukti and antaram lords judged in the day's sky. */
  gocharam: DashaGocharam | null;
  /** Navamsa and dasamsa strength of each birth planet. */
  amsa: Record<PlanetId, VargaStrength> | null;
  /** The Indu lagna (wealth ascendant) reading. */
  indu: InduReading | null;
  /** What the birth chart says about travel, and which planets carry it. */
  travel: TravelPromise | null;
  /** When the rising lagna and the Moon are in a pushkara navamsa today. */
  pushkara: DayPushkara;
  /** Shadbala of the birth planets; null until the birth time is known. */
  bala: Shadbala | null;
  /** Sarvatobhadra chakra: your birth points, the day's lines from every planet but the Moon, and your year's yardstick. */
  sbc: { school: SbcSchool; points: NatalPoint[]; others: Thrower[]; baseline: SbcBaseline };
}

export function dayContext(natal: Natal, frame: DayFrame): DayContext {
  const panchang = panchangFor(frame);
  const mid = new Date(frame.sunrise.getTime() + frame.dayLength / 2);
  const positions = allPositions(mid);
  const dasha = runningDasha(natal.mahas, mid);
  const yogi = yogiInfo(natal);
  const useLagna = natal.profile.timeConfirmed;
  return {
    natal,
    frame,
    panchang,
    pakshi: pakshiFor(natal.bird, panchang),
    positions,
    contacts: contacts(natal, positions, mid),
    dasha,
    useLagna,
    sav: useLagna ? ashtakavarga(natal).sav : null,
    yogi,
    gocharam: useLagna && dasha ? dashaGocharam(natal, yogi, dasha, positions, mid) : null,
    amsa: useLagna ? vargaStrength(natal) : null,
    indu: useLagna ? induReading(natal) : null,
    travel: useLagna ? travelPromise(natal) : null,
    pushkara: dayPushkara(frame),
    bala: useLagna ? shadbala(natal) : null,
    sbc: sbcDay(natal, positions, mid),
  };
}

function sbcDay(natal: Natal, positions: Positions, mid: Date): DayContext["sbc"] {
  const school = natal.profile.sbcSchool ?? DEFAULT_SCHOOL;
  return {
    school,
    points: natalPoints(natal),
    // The Moon is added minute by minute in readAt; its tithi argument is not used for the others.
    others: throwers(positions, mid, 0, school, ["Su", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"]),
    baseline: sbcBaseline(natal, mid, school),
  };
}

// Sarvatobhadra chakra: malefic and benefic lines falling on your birth points, measured against your own year.
function sbcFactors(ctx: DayContext, t: Date, tithi: number): Factor[] {
  const moon = throwers({ ...ctx.positions, Mo: siderealLongitude("Mo", t) }, t, tithi, ctx.sbc.school, ["Mo"]);
  const score = sbcScore(hitsOn(ctx.sbc.points, [...ctx.sbc.others, ...moon]));
  const v = Math.max(-6, Math.min(5, score.value - ctx.sbc.baseline.median));
  if (Math.abs(v) < 1) return [];
  const list = (hits: typeof score.bad) => [...new Set(hits.map(describeHit))].join(", ");
  return [
    {
      id: "sbc",
      source: "Sarvatobhadra chakra",
      title: v < 0 ? `More of your birth points are pierced than usual (${new Set(score.bad.map((h) => h.point.key)).size} of ${ctx.sbc.points.length})` : "Fewer of your birth points are pierced than usual",
      detail:
        v < 0
          ? `Malefic lines on the board: ${list(score.bad) || "none"}${score.good.length ? `. Benefic lines: ${list(score.good)}` : ""}. That is heavier than your middle day this year, so go more carefully.`
          : `${score.bad.length ? `Malefic lines: ${list(score.bad)}` : "No malefic line touches your birth points"}${score.good.length ? `. Benefic lines: ${list(score.good)}` : ""}. That is lighter than your middle day this year.`,
      tone: v < 0 ? "bad" : "good",
      effect: eff(v, { start: v * 1.2, work: v * 0.7 }),
    },
  ];
}

// ---- Individual factor builders -----------------------------------------------------------

/** Pushkara navamsa: the Moon in one lifts the whole stretch; the rising lagna in one marks the minutes to act. */
function pushkaraFactors(ctx: DayContext, lagna: PushkaraSpan | null, moon: PushkaraSpan | null): Factor[] {
  const out: Factor[] = [];
  const n = ctx.natal;
  const tz = ctx.frame.place.tz;
  // A pushkara navamsa that falls in the 6th, 8th or 12th from your own lagna (or Moon) gives only half.
  const ref = ctx.useLagna ? n.lagnaSign : n.moonSign;
  const dim = (sign: number) => [6, 8, 12].includes(houseFrom(ref, sign));
  if (moon) {
    const half = dim(moon.navamsa);
    const v = half ? 1.25 : 2.5;
    out.push({
      id: "pushkara-moon",
      source: "Pushkara navamsa",
      title: "Moon in a pushkara navamsa",
      detail: `The Moon is in the ${RASI[moon.navamsa].ta} navamsa of ${RASI[moon.sign].ta} until ${fmtTime(moon.end, tz)}, one of the 24 nourishing navamsas: what is begun now is helped to grow${half ? `. ${RASI[moon.navamsa].ta} is a hidden house for you, so it counts at half` : ""}.`,
      tone: "good",
      effect: eff(v, { start: v + 1 }),
    });
  }
  if (lagna && ctx.useLagna) {
    const half = dim(lagna.navamsa);
    const k = half ? 0.5 : 1;
    out.push({
      id: "pushkara-lagna",
      source: "Pushkara navamsa",
      title: moon ? "Pushkara lagna, with the Moon in pushkara too" : "Pushkara lagna",
      detail: `The rising lagna is in the ${RASI[lagna.navamsa].ta} navamsa of ${RASI[lagna.sign].ta} from ${fmtTime(lagna.start, tz)} to ${fmtTime(lagna.end, tz)}. This is the classical choice of minutes for fixing the moment of an act: send, sign or set out inside it${moon ? ". With the Moon also in pushkara this is a double pushkara, the best of these windows" : ""}${half ? `. ${RASI[lagna.navamsa].ta} is a hidden house for you, so it counts at half` : ""}.`,
      tone: "good",
      effect: eff((2.5 + (moon ? 1.5 : 0)) * k, { start: (5 + (moon ? 1.5 : 0)) * k, apply: (4.5 + (moon ? 1.5 : 0)) * k, travel: (3.5 + (moon ? 1 : 0)) * k }),
    });
  }
  return out;
}

function pakshiFactors(ctx: DayContext, yama: PakshiYama, sub: PakshiSub): Factor[] {
  const p = sub.power;
  const c = p >= 0.34 ? (24 * (p - 0.34)) / 0.66 : (22 * (p - 0.34)) / 0.3;
  const rel = sub.relation === "friend" ? 2.5 : sub.relation === "enemy" ? -2.5 : 0;
  const v = c + rel;
  const bird = BIRDS[ctx.natal.bird];
  const main = ACTIVITY[yama.activity];
  const subAct = ACTIVITY[sub.activity];
  const holder = sub.relation === "self" ? "its own sub-period" : `${BIRDS[sub.bird].en}'s sub-period (${sub.relation})`;
  const out: Factor[] = [
    {
      id: "pakshi",
      source: "Pancha Pakshi",
      title: `${bird.ta} is ${main.en.toLowerCase()}, sub-period ${subAct.en.toLowerCase()}`,
      detail: `Your bird ${bird.ta} (${bird.tamil}) is in ${main.ta} (${main.tamil}) for this yama, inside ${holder} of ${subAct.ta}. Strength ${p.toFixed(2)} of 1. ${main.note}`,
      tone: v > 3 ? "good" : v < -3 ? "bad" : "neutral",
      effect: eff(v, { start: v * 1.15, work: v * 0.8 }),
    },
  ];
  if (ctx.pakshi.isPaduDay) {
    out.push({
      id: "padu",
      source: "Pancha Pakshi",
      title: "Padu pakshi day for your bird",
      detail: `On a ${ctx.pakshi.paksha === 0 ? "valarpirai" : "theipirai"} ${WEEKDAYS[ctx.frame.weekday]}, ${bird.ta} is the day's death bird. Even its ruling periods give less than usual; treat the best slots as merely workable.`,
      tone: "bad",
      effect: eff(-7, { start: -10 }),
    });
  }
  const ruler = yama.isDay ? ctx.pakshi.dayRuler : ctx.pakshi.nightRuler;
  if (ruler === ctx.natal.bird) {
    out.push({
      id: "oonpakshi",
      source: "Pancha Pakshi",
      title: `Your bird leads this ${yama.isDay ? "day" : "night"}`,
      detail: `${bird.ta} is the oon pakshi (leading bird) of this ${yama.isDay ? "daytime" : "night"}, so its periods carry extra weight.`,
      tone: "good",
      effect: eff(4),
    });
  }
  return out;
}

const HORA_BASE: Record<PlanetId, { e: Effect; note: string }> = {
  Su: { e: eff(-1, { apply: 5, people: 2, money: -2, start: -2, work: 1, travel: 0 }), note: "Suits authority, official applications and meeting seniors; not for money or new starts." },
  Mo: { e: eff(4, { people: 5, travel: 5, start: 3, money: 3, work: 2, apply: 3 }), note: "Suits people, travel and anything public-facing." },
  Ma: { e: eff(-5, { apply: 2, work: 1, start: -7, money: -5, people: -7, travel: -4 }), note: "Suits competition, engineering and physical effort; tempers run short." },
  Me: { e: eff(6, { work: 7, apply: 7, money: 6, people: 5, start: 4, travel: 3 }), note: "Suits writing, code, analysis, forms, exams and trade." },
  Ju: { e: eff(8, { work: 6, apply: 8, start: 9, money: 9, people: 7, travel: 6 }), note: "The most auspicious hora: money, learning, advice and beginnings." },
  Ve: { e: eff(7, { work: 4, apply: 4, start: 6, money: 9, people: 8, travel: 6 }), note: "Suits money, purchases, design, relationships and comfort." },
  Sa: { e: eff(-5, { work: 2, apply: -5, start: -8, money: -5, people: -6, travel: -5 }), note: "Suits slow, heavy, repetitive work; poor for starts and asks." },
  Ra: { e: eff(0), note: "" },
  Ke: { e: eff(0), note: "" },
};

function horaFactors(ctx: DayContext, hora: Span<PlanetId>, waxing: boolean): Factor[] {
  const lord = hora.value;
  const info = PLANET_INFO[lord];
  const base = { ...HORA_BASE[lord].e };
  if (lord === "Mo" && !waxing) for (const k of KEYS) base[k] -= 3;
  const subha = lord === "Ju" || lord === "Ve" || lord === "Me" || (lord === "Mo" && waxing);
  const out: Factor[] = [
    {
      id: "hora",
      source: "Hora",
      title: `${info.ta} hora${subha ? " (subha)" : ""}`,
      detail: `${info.en} hora until ${fmtTime(hora.end, ctx.frame.place.tz)}. ${HORA_BASE[lord].note}`,
      tone: base.overall > 2 ? "good" : base.overall < -2 ? "bad" : "neutral",
      effect: base,
    },
  ];
  if (ctx.useLagna) {
    const n = ctx.natal;
    const rules = n.rules[lord];
    const role = functionalRole(n, lord);
    const e = eff(0);
    const bits: string[] = [];
    if (role === "yogakaraka" || role === "good") {
      for (const k of KEYS) e[k] += 3;
      bits.push("a helpful planet for your lagna");
    } else if (role === "hard") {
      for (const k of KEYS) e[k] -= 3;
      bits.push("a difficult planet for your lagna");
    }
    if (rules.includes(2) || rules.includes(11)) {
      e.money += 5;
      bits.push("your money lord");
    }
    if (rules.includes(10)) {
      e.work += 3;
      e.apply += 3;
      bits.push("your career lord");
    }
    if (rules.includes(6)) {
      e.apply += 2;
      bits.push("lord of your competition house");
    }
    if (ctx.dasha && (ctx.dasha.bhukti.lord === lord || ctx.dasha.antaram.lord === lord)) {
      bits.push("also your running bhukti or antaram lord, so this hora is louder than usual");
    }
    if (bits.length) {
      out.push({
        id: "hora-personal",
        source: "Hora and your chart",
        title: `${info.ta} is ${bits[0]}`,
        detail: `${info.en} ${rulesText(n, lord)}. In this hora it is ${bits.join("; ")}.`,
        tone: e.overall > 0 || e.money > 0 ? "good" : e.overall < 0 ? "bad" : "neutral",
        effect: e,
      });
    }
  }
  return out;
}

const GOWRI_EFFECT: Record<GowriName, Effect> = {
  Amirdha: eff(8),
  Uthi: eff(5, { work: 8, apply: 7 }),
  Laabam: eff(6, { money: 10, apply: 6 }),
  Dhanam: eff(6, { money: 10 }),
  Sugam: eff(5, { people: 7, travel: 7 }),
  Rogam: eff(-7),
  Soram: eff(-6, { money: -10 }),
  Visham: eff(-8, { start: -10 }),
};

function fixedPeriodFactors(ctx: DayContext, t: Date, g: Span<GowriName>): Factor[] {
  const p = ctx.panchang;
  const tz = ctx.frame.place.tz;
  const out: Factor[] = [];
  if (within(p.rahu, t))
    out.push({
      id: "rahu",
      source: "Panchangam",
      title: "Rahu kalam",
      detail: `Rahu kalam runs until ${fmtTime(p.rahu.end, tz)}. Don't begin, sign, pay or set out; work already in progress can continue.`,
      tone: "bad",
      effect: eff(-12, { start: -22, travel: -18, money: -14, apply: -14, people: -10, work: -4 }),
    });
  if (within(p.yamagandam, t))
    out.push({
      id: "yama",
      source: "Panchangam",
      title: "Yamagandam",
      detail: `Yamagandam runs until ${fmtTime(p.yamagandam.end, tz)}. Things begun now tend to stall.`,
      tone: "bad",
      effect: eff(-7, { start: -12, travel: -10, money: -7, apply: -8, people: -5, work: -2 }),
    });
  if (within(p.gulika, t))
    out.push({
      id: "gulika",
      source: "Panchangam",
      title: "Kuligai",
      detail: `Kuligai runs until ${fmtTime(p.gulika.end, tz)}. What you do now tends to repeat: fine for saving or good habits, bad for borrowing or anything you want only once.`,
      tone: "neutral",
      effect: eff(-2, { start: -4, money: -3 }),
    });
  if (within(p.abhijit, t))
    out.push({
      id: "abhijit",
      source: "Panchangam",
      title: "Abhijit muhurtham",
      detail: `The midday victory muhurtham, until ${fmtTime(p.abhijit!.end, tz)}. It lifts most undertakings.`,
      tone: "good",
      effect: eff(8, { start: 10, apply: 10, money: 6, people: 6, work: 5, travel: 4 }),
    });
  const gi = GOWRI_INFO[g.value];
  out.push({
    id: "gowri",
    source: "Gowri panchangam",
    title: `${g.value} (${gi.good ? "nalla neram" : "avoid"})`,
    detail: `Gowri period ${g.value}, "${gi.meaning}", until ${fmtTime(g.end, tz)}.`,
    tone: gi.good ? "good" : "bad",
    effect: GOWRI_EFFECT[g.value],
  });
  return out;
}

const TARA_EFFECT: Effect[] = [
  eff(-2),
  eff(8, { money: 12 }),
  eff(-8),
  eff(7),
  eff(-8),
  eff(8, { apply: 12, work: 10 }),
  eff(-12, { start: -15 }),
  eff(7, { people: 10 }),
  eff(8, { people: 10 }),
];

const STAR_EFFECT: Record<StarNature, Effect> = {
  fixed: eff(3, { start: 6, travel: 0 }),
  movable: eff(2, { travel: 8, start: 2 }),
  swift: eff(4, { start: 6, money: 6, apply: 5, travel: 4 }),
  soft: eff(3, { people: 6, work: 3 }),
  fierce: eff(-3, { start: -6, apply: 2, people: -5 }),
  sharp: eff(-3, { start: -6, apply: 1, people: -5 }),
  mixed: eff(-1, { start: -3 }),
};

function moonFactors(ctx: DayContext, r: Pick<Reading, "tithi" | "star" | "yoga" | "karana" | "moonSign" | "tara" | "chandra">): Factor[] {
  const n = ctx.natal;
  const out: Factor[] = [];
  const tz = ctx.frame.place.tz;

  // Tara bala
  out.push({
    id: "tara",
    source: "Tara bala",
    title: `${r.tara.name} tara`,
    detail: `The Moon is in ${NAKSHATRA[r.star.value].ta} until ${fmtTime(r.star.end, tz)}. Counted from your star ${NAKSHATRA[n.star].ta} that is the ${r.tara.name} tara, the ${r.tara.meaning}.`,
    tone: r.tara.tone,
    effect: TARA_EFFECT[r.tara.index],
  });

  // Chandra bala
  const h = r.chandra.house;
  const ce =
    h === 8 ? eff(-18, { start: -25, work: -10 })
    : h === 12 ? eff(-8, { money: -10 })
    : h === 4 ? eff(-4)
    : h === 11 ? eff(6, { money: 10 })
    : h === 10 ? eff(6, { work: 9, apply: 9 })
    : h === 6 ? eff(6, { apply: 8 })
    : h === 7 ? eff(6, { people: 9 })
    : h === 3 ? eff(6, { work: 7 })
    : h === 1 ? eff(4)
    : r.chandra.tone === "bad" ? eff(-3)
    : eff(1);
  out.push({
    id: "chandra",
    source: "Chandra bala",
    title: r.chandra.chandrashtama ? "Chandrashtamam" : `Moon ${ordinal(h)} from your rasi`,
    detail: `Moon in ${RASI[r.moonSign].ta}. ${r.chandra.note}`,
    tone: r.chandra.tone,
    effect: ce,
  });

  // Moon's house from the lagna
  if (ctx.useLagna) {
    const hl = houseFrom(n.lagnaSign, r.moonSign);
    const le =
      hl === 2 ? eff(2, { money: 8 })
      : hl === 11 ? eff(3, { money: 8 })
      : hl === 10 ? eff(3, { work: 6, apply: 5 })
      : hl === 6 ? eff(1, { apply: 5 })
      : hl === 8 ? eff(-6)
      : hl === 12 ? eff(-4, { money: -8 })
      : hl === 9 || hl === 5 ? eff(3)
      : null;
    if (le)
      out.push({
        id: "moon-lagna",
        source: "Gochara from lagna",
        title: `Moon in your ${ordinal(hl)} house`,
        detail:
          hl === 2 ? "The Moon is crossing your dhana sthana (house of money)."
          : hl === 11 ? "The Moon is crossing your labha sthana (house of gains)."
          : hl === 10 ? "The Moon is crossing your house of career."
          : hl === 6 ? "The Moon is in your house of competition: you can outlast rivals."
          : hl === 8 ? "The Moon is in your 8th house: hidden snags; keep things simple."
          : hl === 12 ? "The Moon is in your house of expenses."
          : "The Moon is in a trine house: luck and good judgement are easier to find.",
        tone: le.overall > 0 ? "good" : "bad",
        effect: le,
      });
  }

  // Tithi
  const ti = r.tithi.value;
  const num = (ti % 15) + 1;
  let te: Effect | null = null;
  let tnote = "";
  if (ti === 29) { te = eff(-8, { start: -12 }); tnote = "Amavasai: for remembrance, not for beginnings."; }
  else if ([4, 9, 14].includes(num)) { te = eff(-5, { start: -8 }); tnote = "A rikta (empty) tithi: avoid beginnings."; }
  else if (num === 8) { te = eff(-3, { start: -5 }); tnote = "Ashtami: not chosen for auspicious starts."; }
  else if ([3, 13].includes(num)) { te = eff(3, { apply: 5 }); tnote = "A jaya (victory) tithi: good for contests."; }
  else if ([5, 10, 15].includes(num)) { te = eff(4); tnote = "A purna (full) tithi: good for most undertakings."; }
  else if ([2, 7, 12].includes(num)) { te = eff(2, { start: 4 }); tnote = "A bhadra tithi: good for steady, lasting work."; }
  else if ([1, 6, 11].includes(num)) { te = eff(2); tnote = "A nanda tithi: pleasant, good for enjoyable work."; }
  if (te)
    out.push({
      id: "tithi",
      source: "Tithi",
      title: label.tithi(ti),
      detail: `${tnote} Until ${fmtTime(r.tithi.end, tz)}.`,
      tone: te.overall > 0 ? "good" : "bad",
      effect: te,
    });

  // Star nature
  const nature = NAKSHATRA[r.star.value].nature;
  out.push({
    id: "star",
    source: "Nakshatra",
    title: `${NAKSHATRA[r.star.value].ta}, a ${nature} star`,
    detail: STAR_NATURE_NOTE[nature],
    tone: STAR_EFFECT[nature].overall > 0 ? "good" : STAR_EFFECT[nature].overall < -1 ? "bad" : "neutral",
    effect: STAR_EFFECT[nature],
  });

  // Yoga and karana
  if (BAD_YOGAS.has(r.yoga.value)) {
    const very = VERY_BAD_YOGAS.has(r.yoga.value);
    out.push({
      id: "yoga",
      source: "Yoga",
      title: `${label.yoga(r.yoga.value)} yoga`,
      detail: `${very ? "One of the two yogas avoided for all auspicious work" : "An inauspicious yoga"}, until ${fmtTime(r.yoga.end, tz)}.`,
      tone: "bad",
      effect: eff(very ? -8 : -4),
    });
  }
  const kn = label.karana(r.karana.value);
  if (kn === "Vishti")
    out.push({
      id: "karana",
      source: "Karana",
      title: "Vishti (Bhadra) karana",
      detail: `Vishti karana until ${fmtTime(r.karana.end, tz)}: avoid beginnings and travel.`,
      tone: "bad",
      effect: eff(-6, { start: -10, travel: -8 }),
    });
  return out;
}

// Ashtakavarga: how many points your chart gives the sign the Moon is crossing.
function savFactor(ctx: DayContext, moonSign: number): Factor[] {
  if (!ctx.sav) return [];
  const pts = ctx.sav[moonSign];
  const grade = savGrade(pts);
  if (grade === "average") return [];
  const v = grade === "strong" ? 5 : grade === "fair" ? 3 : grade === "weak" ? -3 : -5;
  return [
    {
      id: "sav",
      source: "Ashtakavarga",
      title: `Moon in a ${grade} sign of your chart (${pts} points)`,
      detail: `${RASI[moonSign].ta} holds ${pts} of the 337 Sarvashtakavarga points in your chart (28 is average). ${v > 0 ? "Transits through a well-supplied sign give more." : "Transits through a thin sign give less, whatever else looks good."}`,
      tone: v > 0 ? "good" : "bad",
      effect: eff(v),
    },
  ];
}

// Yogi and avayogi: the Moon's star, the hora lord's standing, and planets crossing the
// yoga tara or the avayoga tara.
const BENEFICS: PlanetId[] = ["Ju", "Ve", "Me"];
function yogiFactors(ctx: DayContext, star: Span<number>, hora: Span<PlanetId>): Factor[] {
  const y = ctx.yogi;
  const tz = ctx.frame.place.tz;
  const out: Factor[] = [];
  const yogiName = PLANET_INFO[y.yogi].ta;
  const avaName = PLANET_INFO[y.avayogi].ta;

  const rel = starRelation(y, star.value);
  const starName = NAKSHATRA[star.value].ta;
  if (rel === "yoga-tara")
    out.push({
      id: "yogi-moon",
      source: "Yogi",
      title: `Moon in your yoga tara, ${starName}`,
      detail: `The Moon is crossing ${starName}, the star of your yogi point, until ${fmtTime(star.end, tz)}. These are your luckiest hours of the month: begin, ask and receive.`,
      tone: "good",
      effect: eff(8, { money: 10, start: 9 }),
    });
  else if (rel === "yogi-star")
    out.push({
      id: "yogi-moon",
      source: "Yogi",
      title: `Moon in ${starName}, a star of your Yogi`,
      detail: `${starName} is ruled by ${yogiName}, your Yogi, so the day leans your way. Until ${fmtTime(star.end, tz)}.`,
      tone: "good",
      effect: eff(4, { money: 5 }),
    });
  else if (rel === "avayoga-tara")
    out.push({
      id: "yogi-moon",
      source: "Avayogi",
      title: `Moon in your avayoga tara, ${starName}`,
      detail: `The Moon is crossing ${starName}, the star of your avayogi point, until ${fmtTime(star.end, tz)}. Efforts meet a brake: keep to routine and hold new starts and money decisions.`,
      tone: "bad",
      effect: eff(-7, { start: -9, money: -8 }),
    });
  else if (rel === "avayogi-star")
    out.push({
      id: "yogi-moon",
      source: "Avayogi",
      title: `Moon in ${starName}, a star of your Avayogi`,
      detail: `${starName} is ruled by ${avaName}, your Avayogi, so things move with some drag. Until ${fmtTime(star.end, tz)}.`,
      tone: "bad",
      effect: eff(-3, { money: -4 }),
    });

  // The hora lord carries its birth standing into its hour.
  const st = y.standing[hora.value];
  if (st.boost !== 0) {
    const v = st.boost * 2;
    out.push({
      id: "yogi-hora",
      source: st.boost > 0 ? "Yogi" : "Avayogi",
      title: `${PLANET_INFO[hora.value].ta} ${st.reasons[0]}`,
      detail: `In your chart ${PLANET_INFO[hora.value].en} ${st.reasons.join(" and ")}, so its hora counts for ${st.boost > 0 ? "more" : "less"} than it would for someone else. Until ${fmtTime(hora.end, tz)}.`,
      tone: v > 0 ? "good" : "bad",
      effect: eff(v, { money: v + (hora.value === y.yogi ? 2 : 0) }),
    });
  }

  // Other planets sitting on the two stars today.
  let total = 0;
  for (const p of ["Su", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"] as PlanetId[]) {
    const s = Math.floor(ctx.positions[p] / (360 / 27));
    const favourable = BENEFICS.includes(p) || p === y.yogi || p === y.sahayogi;
    let v = 0;
    if (s === y.yogiStar) v = favourable ? 4 : p === "Su" ? 2 : 1;
    else if (s === y.avayogiStar) v = favourable ? -2 : -3;
    if (v === 0 || Math.abs(total + v) > 8) continue;
    total += v;
    out.push({
      id: `yogi-transit-${p}`,
      source: v > 0 ? "Yogi" : "Avayogi",
      title: `${PLANET_INFO[p].ta} is in your ${v > 0 ? "yoga" : "avayoga"} tara`,
      detail:
        v > 0
          ? `${PLANET_INFO[p].en} is transiting ${NAKSHATRA[y.yogiStar].ta}, your yoga tara. ${favourable ? "A favourable planet here gives with full weight" : "Even a hard planet is made useful here"}: ${PLANET_INFO[p].karaka.split(",").slice(0, 2).join(" and ")} go well for these weeks.`
          : `${PLANET_INFO[p].en} is transiting ${NAKSHATRA[y.avayogiStar].ta}, your avayoga tara: ${PLANET_INFO[p].karaka.split(",").slice(0, 2).join(" and ")} meet delays until it moves on.`,
      tone: v > 0 ? "good" : "bad",
      effect: eff(v),
    });
  }
  return out;
}

// The sign rising at the moment (the muhurtha lagna), judged from the birth lagna and rasi.
function risingFactors(ctx: DayContext, rising: Span<number>): Factor[] {
  if (!ctx.useLagna) return [];
  const n = ctx.natal;
  const tz = ctx.frame.place.tz;
  const h = houseFrom(n.lagnaSign, rising.value);
  const fromMoon = houseFrom(n.moonSign, rising.value);
  const name = RASI[rising.value].ta;
  const until = fmtTime(rising.end, tz);
  const e =
    h === 8 ? eff(-7, { start: -11, money: -8 })
    : h === 12 ? eff(-4, { money: -7 })
    : h === 6 ? eff(-2, { apply: 3 })
    : h === 11 ? eff(5, { money: 8, apply: 6 })
    : h === 10 ? eff(5, { work: 7, apply: 7 })
    : h === 1 ? eff(5, { start: 7 })
    : h === 5 || h === 9 ? eff(4, { apply: 6 })
    : h === 2 ? eff(2, { money: 7 })
    : h === 4 || h === 7 ? eff(2, { people: h === 7 ? 5 : 2 })
    : eff(1, { work: 3 });
  const note: Record<number, string> = {
    1: "your own lagna is rising: you act with your full weight; good for beginnings",
    2: "your 2nd house is rising: good for money and family matters",
    3: "your 3rd house is rising: good for effort, writing and short trips",
    4: "your 4th house is rising: settled; suits home and property matters",
    5: "your 5th house is rising: a trine, good for ideas, study and applications",
    6: "your 6th house is rising: fine for competing and clearing dues, not for partnerships",
    7: "your 7th house is rising: good for clients, partners and agreements",
    8: "your 8th house is rising: the muhurtha lagna to avoid for anything important",
    9: "your 9th house is rising: a trine, the luckiest rising sign for you",
    10: "your 10th house is rising: the best lagna for career moves and visibility",
    11: "your 11th house is rising: the lagna of gains; good for asks and money",
    12: "your 12th house is rising: effort leaks away; avoid commitments and spending",
  };
  const out: Factor[] = [
    {
      id: "rising",
      source: "Muhurtha lagna",
      title: `${name} lagna rising, your ${ordinal(h)} house`,
      detail: `${name} is on the eastern horizon until ${until}; ${note[h]}.`,
      tone: e.overall >= 3 ? "good" : e.overall < 0 ? "bad" : "neutral",
      effect: e,
    },
  ];
  if (fromMoon === 8 && h !== 8)
    out.push({
      id: "rising-moon",
      source: "Muhurtha lagna",
      title: `${name} rising is 8th from your rasi`,
      detail: `The rising sign is the 8th from ${RASI[n.moonSign].ta}, your rasi, which muhurtham rules also avoid for beginnings. Until ${until}.`,
      tone: "bad",
      effect: eff(-4, { start: -7 }),
    });
  return out;
}

function chartFactors(ctx: DayContext, naadi: NaadiLink[]): Factor[] {
  const out: Factor[] = [];
  // Chandra Naadi: Moon joining natal planets
  for (const l of naadi) {
    if (l.kind !== "conjunct" || l.planet === "Mo") continue;
    const p = l.planet;
    const e =
      p === "Ju" ? eff(5, { money: 7, apply: 6 })
      : p === "Ve" ? eff(4, { money: 7, people: 6 })
      : p === "Me" ? eff(4, { work: 6, apply: 6 })
      : p === "Su" ? eff(2, { apply: 4 })
      : p === "Ma" ? eff(-2, { people: -5, apply: 2 })
      : p === "Sa" ? eff(-4, { start: -6, work: 1 })
      : eff(-3);
    out.push({ id: `naadi-${p}`, source: "Chandra Naadi", title: `Moon over your natal ${PLANET_INFO[p].en}`, detail: l.text, tone: l.tone, effect: e });
  }
  // Exact contacts by the other planets
  let total = 0;
  for (const c of ctx.contacts) {
    if (!c.exact) continue;
    const v = c.tone === "good" ? 3 : c.tone === "bad" ? -3 : 0;
    if (v === 0 || Math.abs(total + v) > 6) continue;
    total += v;
    out.push({
      id: `contact-${c.transit}-${c.natal}`,
      source: "Transit over natal planet",
      title: `${PLANET_INFO[c.transit].en} on your natal ${PLANET_INFO[c.natal].en}`,
      detail: c.text,
      tone: c.tone,
      effect: eff(v),
    });
  }
  // Running periods as a quiet background
  if (ctx.useLagna && ctx.dasha) {
    const n = ctx.natal;
    const e = eff(0);
    const notes: string[] = [];
    for (const lord of [ctx.dasha.bhukti.lord, ctx.dasha.antaram.lord]) {
      const role = functionalRole(n, lord);
      const v = role === "yogakaraka" ? 2.5 : role === "good" ? 2 : role === "hard" ? -2 : 0;
      for (const k of KEYS) e[k] += v;
      if (n.rules[lord].includes(2) || n.rules[lord].includes(11)) { e.money += 3; notes.push(`${PLANET_INFO[lord].en} is a money lord`); }
      if (n.rules[lord].includes(10)) { e.work += 2; e.apply += 2; notes.push(`${PLANET_INFO[lord].en} rules your career house`); }
      // Yogi scheme: periods of the Yogi, the Sahayogi and planets in the yoga tara give more;
      // those of the Avayogi and planets in its stars give less.
      const st = ctx.yogi.standing[lord];
      if (st.boost !== 0) {
        for (const k of KEYS) e[k] += st.boost * 1.5;
        notes.push(`${PLANET_INFO[lord].en} ${st.reasons.join(" and ")}`);
      }
      // Travel: a period lord tied to the 9th, 12th, 3rd or 7th, or Rahu, favours setting out.
      if (ctx.travel) {
        const tw = ctx.travel.planets[lord].weight;
        if (tw >= 2.5) {
          e.travel += Math.min(2, tw * 0.5);
          notes.push(`${PLANET_INFO[lord].en} is one of your travel planets`);
        }
      }
      // Indu lagna: a period lord well placed from the wealth ascendant helps money; one in a thinning place holds it back.
      if (ctx.indu) {
        const w = induWeight(ctx.indu, lord);
        const v = Math.max(-1, Math.min(2, w * 0.75));
        e.money += v;
        if (lord === ctx.indu.lord) { e.money += 1; notes.push(`${PLANET_INFO[lord].en} is lord of your Indu lagna`); }
        else if (w >= 2) notes.push(`${PLANET_INFO[lord].en} sits well from your Indu lagna`);
      }
      // Shadbala: a period lord above its pass mark has the strength to deliver; one below it struggles to.
      if (ctx.bala) {
        const lean = balaLean(ctx.bala, lord);
        if (lean !== 0) {
          for (const k of KEYS) e[k] += lean * 0.6;
          const b = ctx.bala.planets[lord as Graha];
          if (Math.abs(lean) >= 0.4) notes.push(`${PLANET_INFO[lord].en} has ${b.rupas.toFixed(1)} rupas of Shadbala against the ${b.required} it needs (${balaWord(b.ratio).toLowerCase()})`);
        }
      }
      // Amsa strength: navamsa backs the period as a whole, dasamsa backs its work.
      const am = ctx.amsa?.[lord];
      if (am) {
        const inner = Math.max(-2, Math.min(2, am.inner)) * 0.6;
        for (const k of KEYS) e[k] += inner;
        e.work += am.career * 0.6;
        e.apply += am.career * 0.6;
        if (am.vargottama) notes.push(`${PLANET_INFO[lord].en} is vargottama`);
        else if (am.d9 === "exalted" || am.d9 === "debilitated") notes.push(`${PLANET_INFO[lord].en} is ${am.d9} in navamsa`);
        if (am.d10 === "exalted" || am.d10 === "debilitated") notes.push(`${PLANET_INFO[lord].en} is ${am.d10} in dasamsa`);
      }
    }
    // The same lords in today's sky: a period lord that is strong in transit delivers more.
    if (ctx.gocharam) {
      const v = Math.max(-4, Math.min(4, ctx.gocharam.net * 1.5));
      if (Math.abs(v) >= 0.5) {
        for (const k of KEYS) e[k] += v;
        notes.push(`in the sky now the period lords are ${ctx.gocharam.word.toLowerCase()} (${ctx.gocharam.lords.map((l) => `${PLANET_INFO[l.lord].en} ${l.word.toLowerCase()}`).filter((x, i, a) => a.indexOf(x) === i).join(", ")})`);
      }
    }
    if (KEYS.some((k) => e[k] !== 0))
      out.push({
        id: "dasha",
        source: "Dasa",
        title: `${PLANET_INFO[ctx.dasha.maha.lord].ta} dasa, ${PLANET_INFO[ctx.dasha.bhukti.lord].ta} bhukti, ${PLANET_INFO[ctx.dasha.antaram.lord].ta} antaram`,
        detail: `Background tone of the weeks you are in. ${notes.join("; ") || "The bhukti and antaram lords colour everything slightly."}.`,
        tone: e.overall > 0 || e.money > 0 ? "good" : e.overall < 0 ? "bad" : "neutral",
        effect: e,
      });
  }
  return out;
}

// ---- The reading --------------------------------------------------------------------------

export function readAt(ctx: DayContext, t: Date): Reading {
  const p = ctx.panchang;
  const { yama, sub } = pakshiAt(ctx.pakshi, t);
  const hora = spanAt(p.horas, t);
  const g = spanAt(p.gowri, t);
  const tithi = spanAt(p.tithi, t);
  const star = spanAt(p.nakshatra, t);
  const yoga = spanAt(p.yoga, t);
  const karana = spanAt(p.karana, t);
  const moonSign = spanAt(p.moonSign, t).value;
  const rising = spanAt(p.rising, t);
  const waxing = tithi.value < 15;
  const tara = taraBala(ctx.natal.star, star.value);
  const chandra = chandraBala(ctx.natal.moonSign, moonSign, waxing);
  const naadi = chandraNaadi(ctx.natal, moonSign);
  const pkLagna = ctx.useLagna ? pushkaraAt(ctx.pushkara.lagna, t) : null;
  const pkMoon = pushkaraAt(ctx.pushkara.moon, t);

  const factors = [
    ...pakshiFactors(ctx, yama, sub),
    ...horaFactors(ctx, hora, waxing),
    ...fixedPeriodFactors(ctx, t, g),
    ...moonFactors(ctx, { tithi, star, yoga, karana, moonSign, tara, chandra }),
    ...risingFactors(ctx, rising),
    ...pushkaraFactors(ctx, pkLagna, pkMoon),
    ...savFactor(ctx, moonSign),
    ...yogiFactors(ctx, star, hora),
    ...chartFactors(ctx, naadi),
    ...sbcFactors(ctx, t, tithi.value),
  ];

  // Every moment starts at 49. It was 50 before the pushkara factors were added: they only ever add,
  // about one point on average across a day, so the base is lowered by that to keep the tiers where they were.
  const scores = eff(49);
  for (const f of factors) for (const k of KEYS) scores[k] += f.effect[k];
  // Hard ceilings: some conditions should never read as a green light, however good the rest is.
  const base = sub.power < 0.09 || chandra.chandrashtama ? 52 : sub.power < 0.17 ? 62 : 100; // thresholds sit between the possible products
  const inRahu = within(p.rahu, t);
  const inYamagandam = within(p.yamagandam, t);
  const ceiling: Effect = eff(base);
  if (inRahu) Object.assign(ceiling, eff(Math.min(base, 55), { start: 40, travel: 45, apply: 52, money: 52, work: Math.min(base, 68) }));
  else if (inYamagandam) Object.assign(ceiling, eff(base, { start: Math.min(base, 55), travel: Math.min(base, 58) }));
  const tiers = {} as Record<ActivityKey, Tier>;
  for (const k of KEYS) {
    scores[k] = Math.round(Math.max(0, Math.min(ceiling[k], scores[k])));
    tiers[k] = tierOf(scores[k]);
  }
  factors.sort((a, b) => Math.abs(b.effect.overall) - Math.abs(a.effect.overall));

  return {
    time: t, scores, tiers, factors, yama, sub, hora, gowri: g, tithi, star, yoga, karana, moonSign, rising, tara, chandra,
    inRahu,
    inYama: inYamagandam,
    inGulika: within(p.gulika, t),
    inAbhijit: within(p.abhijit, t),
  };
}

// ---- Timeline ------------------------------------------------------------------------------

export interface Segment {
  start: Date;
  end: Date;
  reading: Reading;
}

export function timeline(ctx: DayContext): Segment[] {
  const p = ctx.panchang;
  const from = ctx.frame.sunrise.getTime();
  const to = ctx.frame.nextSunrise.getTime();
  const cuts = new Set<number>([from, to]);
  const add = (d: Date | undefined) => {
    if (!d) return;
    const t = Math.round(d.getTime() / 1000) * 1000;
    if (t > from && t < to) cuts.add(t);
  };
  for (const y of ctx.pakshi.yamas) for (const s of y.subs) { add(s.start); add(s.end); }
  for (const h of p.horas) add(h.start);
  for (const g of p.gowri) add(g.start);
  for (const r of [p.rahu, p.yamagandam, p.gulika, p.abhijit]) { add(r?.start); add(r?.end); }
  for (const list of [p.tithi, p.nakshatra, p.yoga, p.karana, p.moonSign]) for (const s of list) add(s.end);
  if (ctx.useLagna) for (const s of p.rising) add(s.end);
  if (ctx.useLagna) for (const s of ctx.pushkara.lagna) { add(s.start); add(s.end); }
  for (const s of ctx.pushkara.moon) { add(s.start); add(s.end); }
  const sorted = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (b - a < 30000) continue;
    out.push({ start: new Date(a), end: new Date(b), reading: readAt(ctx, new Date((a + b) / 2)) });
  }
  return out;
}

export interface Block {
  start: Date;
  end: Date;
  tier: Tier;
  score: number; // time-weighted average
  segments: Segment[];
}

/** Merge neighbouring segments that share a tier for one activity. */
export function blocks(segments: Segment[], key: ActivityKey): Block[] {
  const out: Block[] = [];
  for (const s of segments) {
    const tier = s.reading.tiers[key];
    const last = out[out.length - 1];
    if (last && last.tier === tier) {
      last.end = s.end;
      last.segments.push(s);
    } else out.push({ start: s.start, end: s.end, tier, score: 0, segments: [s] });
  }
  for (const b of out) {
    let w = 0;
    let sum = 0;
    for (const s of b.segments) {
      const d = s.end.getTime() - s.start.getTime();
      w += d;
      sum += d * s.reading.scores[key];
    }
    b.score = Math.round(sum / w);
  }
  return out;
}

/** The best stretches for an activity, at least `minMinutes` long. */
export function bestWindows(segments: Segment[], key: ActivityKey, after?: Date, minMinutes = 15, count = 4): Block[] {
  // Treat "go" and "good" as one favourable stretch so a window is not chopped up needlessly.
  const merged: Block[] = [];
  const BRIDGE_MS = 2 * 60000; // a blip shorter than this does not split a window
  for (const b of blocks(segments, key)) {
    const fav = b.tier === "go" || b.tier === "good";
    if (!fav && b.end.getTime() - b.start.getTime() < BRIDGE_MS) continue;
    const last = merged[merged.length - 1];
    if (fav && last && (last.tier === "go" || last.tier === "good") && b.start.getTime() - last.end.getTime() <= BRIDGE_MS) {
      const d1 = last.end.getTime() - last.start.getTime();
      const d2 = b.end.getTime() - b.start.getTime();
      last.score = Math.round((last.score * d1 + b.score * d2) / (d1 + d2));
      last.end = b.end;
      last.segments.push(...b.segments);
      last.tier = tierOf(last.score);
    } else merged.push({ ...b, segments: [...b.segments] });
  }
  return merged
    .filter((b) => (b.tier === "go" || b.tier === "good") && b.end.getTime() - b.start.getTime() >= minMinutes * 60000)
    .filter((b) => !after || b.end > after)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Stretches to keep clear of. */
export function worstWindows(segments: Segment[], after?: Date, count = 3): Block[] {
  return blocks(segments, "overall")
    .filter((b) => b.tier === "avoid" || b.tier === "hold")
    .filter((b) => b.end.getTime() - b.start.getTime() >= 15 * 60000)
    .filter((b) => !after || b.end > after)
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Next change of the overall tier after `t`. */
export function currentBlock(segments: Segment[], t: Date, key: ActivityKey = "overall"): Block | undefined {
  return blocks(segments, key).find((b) => t >= b.start && t < b.end);
}

export interface Advice {
  dos: string[];
  donts: string[];
}

export function advice(r: Reading): Advice {
  const dos: string[] = [];
  const donts: string[] = [];
  for (const a of ACTIVITIES) {
    const tier = r.tiers[a.key];
    if (tier === "go" || tier === "good") dos.push(a.go);
    else if (tier === "hold" || tier === "avoid") donts.push(a.hold);
  }
  if (r.chandra.chandrashtama) donts.unshift("Chandrashtamam today: keep a low profile, avoid arguments and big decisions.");
  if (r.inRahu) donts.unshift("Rahu kalam: wait before starting anything new.");
  if (r.sub.activity === "D" || r.yama.activity === "D") donts.push("Your bird is at its weakest: don't push your luck in contests or negotiations.");
  if (r.sub.activity === "S" && r.yama.activity === "S") dos.push("Use this low-energy stretch to plan, read or rest.");
  if (r.hora.value === "Sa" && r.tiers.work !== "avoid") dos.push("Saturn hora: clear backlog, documentation and repetitive tasks.");
  if (r.hora.value === "Me") dos.push("Budhan hora: write, code, analyse, fill in forms.");
  if (r.hora.value === "Ju" && r.tiers.overall !== "avoid") dos.push("Guru hora: ask for advice, learn, handle money matters.");
  if (dos.length === 0) dos.push("Keep to routine and prepare for the next good window.");
  return { dos: [...new Set(dos)].slice(0, 5), donts: [...new Set(donts)].slice(0, 5) };
}
