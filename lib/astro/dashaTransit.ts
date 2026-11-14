// The running dasa, bhukti and antaram lords in the current sky (gocharam).
//
// The birth chart says what a period lord promises (the houses it rules and sits in). Its
// transit says how well it can deliver right now. Each lord is judged on: the dignity of the
// sign it is passing through, its own Ashtakavarga points in that sign, the house it is
// crossing from lagna and from the Moon, combustion, Guru's and Sani's transits over its
// birth position, and the star it is in against your yoga and avayoga taras.

import { ashtakavarga } from "./ashtaka";
import { houseTopic, Natal, ordinal } from "./chart";
import { houseFrom, nakOf, NAKSHATRA, PLANET_INFO, PlanetId, RASI, signOf } from "./constants";
import { RunningDasha } from "./dasha";
import { aspects, Dignity, dignity, isCombust } from "./dignity";
import { Positions, siderealLongitude } from "./ephemeris";
import { nextSignChange } from "./panchang";
import { gochara, Tone } from "./transits";
import { starRelation, YogiInfo } from "./yogi";

export type PowerWord = "Strong" | "Supported" | "Mixed" | "Strained" | "Weak";

export interface LordPoint {
  label: string;
  detail: string;
  value: number;
}

export interface LordTransit {
  level: "dasa" | "bhukti" | "antaram";
  lord: PlanetId;
  sign: number;
  houseFromLagna: number;
  houseFromMoon: number;
  houseFromNatal: number;
  dignity: Dignity;
  retro: boolean;
  combust: boolean;
  /** Its own Ashtakavarga points in the transit sign (Rahu uses Sani's, Ketu uses Sevvai's). */
  bav: number;
  bavOf: PlanetId;
  star: number;
  points: LordPoint[];
  power: number;
  word: PowerWord;
  tone: Tone;
  until: Date;
  next: { sign: number; house: number; bav: number; better: boolean | null };
  summary: string;
}

const DIGNITY_VALUE: Record<Dignity, number> = { exalted: 2, own: 1.5, friend: 0.5, neutral: 0, enemy: -0.5, debilitated: -2 };
const DIGNITY_TEXT: Record<Dignity, string> = {
  exalted: "exalted here, at full strength",
  own: "in its own sign, comfortable and in command",
  friend: "in a friend's sign",
  neutral: "in a neutral sign",
  enemy: "in an enemy's sign, working against the grain",
  debilitated: "debilitated here, at its weakest",
};
const MALEFIC: PlanetId[] = ["Su", "Ma", "Sa", "Ra", "Ke"];

function bavValue(b: number): number {
  return b >= 6 ? 2 : b === 5 ? 1.5 : b === 4 ? 0.5 : b === 3 ? -0.5 : b === 2 ? -1.5 : -2;
}

export function powerWord(power: number): PowerWord {
  return power >= 3 ? "Strong" : power >= 1 ? "Supported" : power > -1 ? "Mixed" : power > -3 ? "Strained" : "Weak";
}

export function lordTransit(n: Natal, y: YogiInfo, level: LordTransit["level"], lord: PlanetId, pos: Positions, t: Date): LordTransit {
  const g = gochara(n, t, pos).find((x) => x.planet === lord)!;
  const sign = g.sign;
  const bavOf: PlanetId = lord === "Ra" ? "Sa" : lord === "Ke" ? "Ma" : lord;
  const table = ashtakavarga(n).bav as Record<string, number[]>;
  const bav = table[bavOf][sign];
  const dig = dignity(lord, sign);
  const combust = isCombust(lord, pos[lord], pos.Su);
  const natalSign = signOf(n.positions[lord]);
  const houseFromNatal = houseFrom(natalSign, sign);
  const star = nakOf(pos[lord]);
  const name = PLANET_INFO[lord].ta;
  const points: LordPoint[] = [];

  if (lord !== "Ra" && lord !== "Ke")
    points.push({ label: `${RASI[sign].ta}: ${dig}`, detail: `${name} is ${DIGNITY_TEXT[dig]}.`, value: DIGNITY_VALUE[dig] });
  else points.push({ label: `${RASI[sign].ta}: ${dig}`, detail: `${name} takes on the nature of ${PLANET_INFO[RASI[sign].lord].ta}, lord of the sign it crosses.`, value: DIGNITY_VALUE[dig] / 2 });

  points.push({
    label: `${bav} of 8 Ashtakavarga points`,
    detail: `${lord === bavOf ? name : `${name} is read through ${PLANET_INFO[bavOf].ta}, which`} has ${bav} points in ${RASI[sign].ta}. Four or more means the sign receives it well.`,
    value: bavValue(bav),
  });

  const hl = g.fromLagna;
  const hv = [1, 4, 5, 7, 9, 10, 11].includes(hl) ? 1 : hl === 2 ? 0.5 : hl === 3 ? (MALEFIC.includes(lord) ? 0.5 : 0) : hl === 6 ? (MALEFIC.includes(lord) ? 0.5 : -1) : -1;
  points.push({ label: `Crossing your ${ordinal(hl)} house`, detail: `Its results come through ${houseTopic(hl)}.${hv < 0 ? " A hidden house: effort is spent out of sight." : ""}`, value: hv });

  points.push({ label: `${ordinal(g.fromMoon)} from your Moon`, detail: g.tone === "good" ? "A helpful gochara place for this planet." : "Not one of this planet's helpful gochara places.", value: g.tone === "good" ? 1 : -0.75 });

  if (combust) points.push({ label: "Combust", detail: `${name} is too close to the Sun to act for itself for now.`, value: -1.5 });
  if (g.retro && lord !== "Ra" && lord !== "Ke")
    points.push({ label: "Retrograde", detail: "Re-doing and second attempts work better than fresh starts in its matters.", value: 0 });

  if (lord !== "Ju") {
    const js = signOf(pos.Ju);
    if (js === natalSign) points.push({ label: "Guru over its birth place", detail: `Transit Guru is passing over your natal ${name}: a clear opening for what this period promises.`, value: 1.25 });
    else if (aspects("Ju", js, natalSign)) points.push({ label: "Guru looks at its birth place", detail: `Transit Guru's sight falls on your natal ${name}, which supports the period.`, value: 1 });
  }
  if (lord !== "Sa") {
    const ss = signOf(pos.Sa);
    if (ss === natalSign) points.push({ label: "Sani over its birth place", detail: `Transit Sani is pressing on your natal ${name}: results come, but slowly and with extra work.`, value: -0.75 });
  }
  if (houseFromNatal === 1 && lord !== "Mo") points.push({ label: "Back at its birth place", detail: `${name} has returned to the sign it held at your birth, which renews what it stands for.`, value: 0.5 });
  if ([6, 8, 12].includes(houseFromNatal)) points.push({ label: `${ordinal(houseFromNatal)} from its birth place`, detail: "Out of step with its own birth position; expect some friction in delivery.", value: -0.5 });

  const rel = starRelation(y, star);
  if (rel === "yoga-tara") points.push({ label: `In your yoga tara ${NAKSHATRA[star].ta}`, detail: "Passing through your luckiest star.", value: 1 });
  else if (rel === "yogi-star") points.push({ label: `In ${NAKSHATRA[star].ta}, a star of your Yogi`, detail: "A star ruled by your Yogi planet.", value: 0.5 });
  else if (rel === "avayoga-tara") points.push({ label: `In your avayoga tara ${NAKSHATRA[star].ta}`, detail: "Passing through the star that applies the brake.", value: -1 });
  else if (rel === "avayogi-star") points.push({ label: `In ${NAKSHATRA[star].ta}, a star of your Avayogi`, detail: "A star ruled by your Avayogi planet.", value: -0.5 });

  const power = Math.round(points.reduce((a, p) => a + p.value, 0) * 4) / 4;
  const word = powerWord(power);

  // What the next sign will be like.
  const until = nextSignChange(lord, t);
  const nextSign = signOf(siderealLongitude(lord, new Date(until.getTime() + 3600000)));
  const nextBav = table[bavOf][nextSign];
  const nextHouse = houseFrom(n.lagnaSign, nextSign);
  const curCore = (lord === "Ra" || lord === "Ke" ? DIGNITY_VALUE[dig] / 2 : DIGNITY_VALUE[dig]) + bavValue(bav);
  const nd = dignity(lord, nextSign);
  const nextCore = (lord === "Ra" || lord === "Ke" ? DIGNITY_VALUE[nd] / 2 : DIGNITY_VALUE[nd]) + bavValue(nextBav);
  const better = Math.abs(nextCore - curCore) < 0.5 ? null : nextCore > curCore;

  const rules = n.rules[lord];
  const promise = rules.length ? `rules your ${rules.map(ordinal).join(" and ")} (${rules.map((r) => houseTopic(r).split(",")[0]).join("; ")})` : `acts for ${PLANET_INFO[RASI[natalSign].lord].ta}, lord of the sign it sits in`;
  const delivery =
    word === "Strong" ? "and the sky backs it fully, so what the period promises can be asked for directly"
    : word === "Supported" ? "and the sky is on its side, so its matters move with ordinary effort"
    : word === "Mixed" ? "and the sky neither helps nor blocks it: results follow the effort you put in"
    : word === "Strained" ? "but it is under strain in the sky, so its matters move slowly; prepare more than you push"
    : "but it is weak in the sky for now, so hold its bigger plans until it changes sign";
  const summary = `${name} ${promise}, sits in your ${ordinal(n.house[lord])} house at birth, ${delivery}.`;

  return {
    level, lord, sign, houseFromLagna: hl, houseFromMoon: g.fromMoon, houseFromNatal, dignity: dig, retro: g.retro, combust, bav, bavOf, star,
    points, power, word, tone: power >= 1 ? "good" : power <= -1 ? "bad" : "neutral",
    until, next: { sign: nextSign, house: nextHouse, bav: nextBav, better }, summary,
  };
}

export interface PairNote {
  title: string;
  detail: string;
  tone: Tone;
}

/** How two period lords stand to each other, at birth and in the sky now. */
export function lordPair(n: Natal, a: PlanetId, b: PlanetId, pos: Positions): PairNote | null {
  if (a === b) return { title: `${PLANET_INFO[a].ta} runs both levels`, detail: "The same planet holds both periods, so its own nature shows undiluted: its strengths and its weak spots are both louder.", tone: "neutral" };
  const natal = houseFrom(signOf(n.positions[a]), signOf(n.positions[b]));
  const now = houseFrom(signOf(pos[a]), signOf(pos[b]));
  const judge = (h: number): Tone => ([6, 8, 12].includes(h) || h === 2 ? ([6, 8].includes(h) ? "bad" : h === 12 ? "bad" : "neutral") : "good");
  const tn = judge(natal);
  const tt = judge(now);
  const A = PLANET_INFO[a].ta;
  const B = PLANET_INFO[b].ta;
  const text = (h: number, when: string) =>
    [6, 8].includes(h) ? `${B} is ${ordinal(h)} from ${A} ${when}, the 6/8 position: the two pull in different directions`
    : h === 12 ? `${B} is 12th from ${A} ${when}: the sub-period spends what the main period builds`
    : h === 2 ? `${B} is 2nd from ${A} ${when}: the sub-period feeds on the main period's resources`
    : h === 7 ? `${B} is opposite ${A} ${when}: they face each other and work as partners`
    : [1].includes(h) ? `${B} is with ${A} ${when}: they act as one`
    : [5, 9].includes(h) ? `${B} is in a trine from ${A} ${when}: an easy, lucky flow between them`
    : [4, 10].includes(h) ? `${B} is in a kendra from ${A} ${when}: they push each other to act`
    : `${B} is ${ordinal(h)} from ${A} ${when}: a growth position`;
  const tone: Tone = tn === "bad" && tt !== "good" ? "bad" : tn === "good" && tt !== "bad" ? "good" : tt === "bad" && tn !== "good" ? "bad" : "neutral";
  return { title: `${A} and ${B} together`, detail: `${text(natal, "in your birth chart")}. ${text(now, "in the sky now")}.`, tone };
}

export interface DashaGocharam {
  lords: LordTransit[];
  pairs: PairNote[];
  /** Weighted power of the three lords, roughly -4..+4. */
  net: number;
  word: PowerWord;
}

export function dashaGocharam(n: Natal, y: YogiInfo, run: RunningDasha, pos: Positions, t: Date): DashaGocharam {
  const lords = [
    lordTransit(n, y, "dasa", run.maha.lord, pos, t),
    lordTransit(n, y, "bhukti", run.bhukti.lord, pos, t),
    lordTransit(n, y, "antaram", run.antaram.lord, pos, t),
  ];
  const pairs = [lordPair(n, run.maha.lord, run.bhukti.lord, pos), run.antaram.lord === run.maha.lord ? null : lordPair(n, run.bhukti.lord, run.antaram.lord, pos)].filter((x): x is PairNote => !!x);
  const net = lords[0].power * 0.3 + lords[1].power * 0.4 + lords[2].power * 0.3;
  return { lords, pairs, net: Math.round(net * 100) / 100, word: powerWord(net) };
}
