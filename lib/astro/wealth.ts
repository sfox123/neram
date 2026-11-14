// Money outlook: the classical indicators for cash flow, day by day and over the longer run.
// These are traditional rules of thumb, not forecasts of actual income.

import { houseFrom, NAKSHATRA, DASHA_ORDER, PLANET_INFO, PlanetId, RASI, signOf, WEEKDAY_LORD } from "./constants";
import { Natal, ordinal } from "./chart";
import { DashaPeriod, subPeriods } from "./dasha";
import { aspects } from "./dignity";
import { siderealLongitude } from "./ephemeris";
import { DayFrame, panchangFor, spanAt } from "./panchang";
import { chandraBala, taraBala, Tone, upcomingIngresses, Ingress } from "./transits";
import { induReading } from "./indu";
import { starRelation, yogiInfo } from "./yogi";

export interface MoneySignal {
  tone: Tone;
  text: string;
  weight: number;
}

export interface MoneyDay {
  frame: DayFrame;
  score: number; // 0..100
  label: string;
  tone: Tone;
  signals: MoneySignal[];
}

export function moneyLords(n: Natal): { second: PlanetId; eleventh: PlanetId; fifth: PlanetId; ninth: PlanetId } {
  return { second: n.lordOf(2), eleventh: n.lordOf(11), fifth: n.lordOf(5), ninth: n.lordOf(9) };
}

export function moneyDay(n: Natal, frame: DayFrame): MoneyDay {
  const p = panchangFor(frame);
  const mid = new Date(frame.sunrise.getTime() + frame.dayLength / 2);
  const moonSign = spanAt(p.moonSign, mid).value;
  const star = spanAt(p.nakshatra, mid).value;
  const tithi = spanAt(p.tithi, mid).value;
  const useLagna = n.profile.timeConfirmed;
  const s: MoneySignal[] = [];
  const add = (weight: number, text: string) => s.push({ weight, text, tone: weight > 0 ? "good" : "bad" });

  const cb = chandraBala(n.moonSign, moonSign, tithi < 15);
  if (cb.house === 11) add(2.5, "Moon in the 11th from your rasi, the gains position.");
  if (cb.house === 2) add(1.5, "Moon in the 2nd from your rasi: money is on your mind; inflow is possible, so is spending.");
  if (cb.house === 8) add(-3, "Chandrashtamam: not a day for money decisions.");
  if (cb.house === 12) add(-1.5, "Moon in the 12th from your rasi: expenses.");

  if (useLagna) {
    const hl = houseFrom(n.lagnaSign, moonSign);
    if (hl === 2) add(3, "Moon in your 2nd house, the dhana sthana.");
    if (hl === 11) add(3, "Moon in your 11th house, the labha sthana.");
    if (hl === 9) add(1.5, "Moon in your 9th house of fortune.");
    if (hl === 5) add(1, "Moon in your 5th house: gains through ideas.");
    if (hl === 10) add(1, "Moon in your 10th house: income through work done today.");
    if (hl === 12) add(-2, "Moon in your 12th house of expenses.");
    if (hl === 8) add(-2, "Moon in your 8th house: unexpected costs.");
    if (hl === 6) add(-0.5, "Moon in your 6th house: bills and dues come up.");

    const { second, eleventh } = moneyLords(n);
    const starLord = DASHA_ORDER[star % 9];
    if (starLord === second || starLord === eleventh)
      add(1, `Moon in ${NAKSHATRA[star].ta}, a star of ${PLANET_INFO[starLord].en}, your ${starLord === second ? "2nd" : "11th"} lord.`);
    for (const lord of new Set([second, eleventh])) {
      if (lord !== "Mo" && signOf(n.positions[lord]) === moonSign)
        add(1.5, `Moon passes over your natal ${PLANET_INFO[lord].en}, your ${lord === second ? "2nd" : "11th"} lord.`);
    }
    const dayLord = WEEKDAY_LORD[frame.weekday];
    if (dayLord === second || dayLord === eleventh) add(1, `${PLANET_INFO[dayLord].en}'s weekday; ${PLANET_INFO[dayLord].en} is one of your money lords.`);
    if (n.induLagna === moonSign) add(2, `Moon crosses your Indu lagna (${RASI[n.induLagna].ta}), the wealth ascendant.`);
    // Slow benefics on the Indu lagna colour the whole stretch they stay.
    const guru = signOf(siderealLongitude("Ju", mid));
    const sukran = signOf(siderealLongitude("Ve", mid));
    if (guru === n.induLagna) add(1.5, "Guru is crossing your Indu lagna: the strongest transit for money in that method.");
    else if (aspects("Ju", guru, n.induLagna)) add(0.8, "Guru is looking at your Indu lagna.");
    if (sukran === n.induLagna) add(1, "Sukran is crossing your Indu lagna: good weeks for receipts.");
  }
  for (const k of ["Ju", "Ve"] as PlanetId[]) {
    if (signOf(n.positions[k]) === moonSign) add(1.2, `Moon passes over your natal ${PLANET_INFO[k].en}, a natural significator of wealth.`);
  }

  const rel = starRelation(yogiInfo(n), star);
  if (rel === "yoga-tara") add(2.5, `Moon in ${NAKSHATRA[star].ta}, your yoga tara: the month's best day for receiving.`);
  else if (rel === "yogi-star") add(1.2, `Moon in ${NAKSHATRA[star].ta}, a star of your Yogi.`);
  else if (rel === "avayoga-tara") add(-2, `Moon in ${NAKSHATRA[star].ta}, your avayoga tara: money gets stuck today.`);
  else if (rel === "avayogi-star") add(-1, `Moon in ${NAKSHATRA[star].ta}, a star of your Avayogi.`);

  const tara = taraBala(n.star, star);
  const taraW = [0, 2.5, -1.5, 1, -1.5, 1.5, -2.5, 1, 1][tara.index];
  if (taraW !== 0) add(taraW, `${tara.name} tara (${tara.meaning}).`);

  if (tithi === 29) add(-1, "Amavasai: not for new financial commitments.");
  else if ([4, 9, 14].includes((tithi % 15) + 1)) add(-0.5, "Rikta tithi: avoid lending or new commitments.");

  const total = s.reduce((a, x) => a + x.weight, 0);
  const score = Math.round(Math.max(0, Math.min(100, 50 + total * 5.5)));
  const label =
    score >= 72 ? "Strong inflow signs" : score >= 60 ? "Favourable" : score >= 43 ? "Neutral" : score >= 30 ? "Guard spending" : "Hold money decisions";
  s.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  return { frame, score, label, tone: score >= 60 ? "good" : score < 43 ? "bad" : "neutral", signals: s };
}

export interface MoneyPeriod {
  period: DashaPeriod;
  parent: DashaPeriod;
  reasons: string[];
}

/** Coming bhukti and antaram periods whose lords are tied to money in this chart. */
export function moneyPeriods(n: Natal, from: Date, years = 4): MoneyPeriod[] {
  if (!n.profile.timeConfirmed) return [];
  const out: MoneyPeriod[] = [];
  const indu = induReading(n);
  const end = from.getTime() + years * 365.25 * 86400000;
  const why = (lord: PlanetId): string[] => {
    const r: string[] = [];
    const rules = n.rules[lord];
    if (rules.includes(2)) r.push("2nd lord (savings)");
    if (rules.includes(11)) r.push("11th lord (income)");
    if (rules.includes(9)) r.push("9th lord (fortune)");
    if (rules.includes(5)) r.push("5th lord (merit, speculation)");
    if (rules.includes(10)) r.push("10th lord (career)");
    if ([2, 11].includes(n.house[lord])) r.push(`sits in your ${ordinal(n.house[lord])} house`);
    if (lord === indu.lord) r.push("lord of your Indu lagna");
    if (indu.producers.includes(lord)) r.push("sits well from your Indu lagna");
    return r;
  };
  for (const maha of n.mahas) {
    if (maha.end.getTime() < from.getTime() || maha.start.getTime() > end) continue;
    for (const bh of subPeriods(maha)) {
      if (bh.end.getTime() < from.getTime() || bh.start.getTime() > end) continue;
      const rb = why(bh.lord);
      if (rb.some((x) => x.startsWith("2nd") || x.startsWith("11th") || x.startsWith("sits") || x.startsWith("lord of your Indu"))) out.push({ period: bh, parent: maha, reasons: rb });
      for (const an of subPeriods(bh)) {
        if (an.end.getTime() < from.getTime() || an.start.getTime() > from.getTime() + 548 * 86400000) continue;
        const ra = why(an.lord);
        if (ra.some((x) => x.startsWith("2nd") || x.startsWith("11th") || x.startsWith("sits") || x.startsWith("lord of your Indu"))) out.push({ period: an, parent: bh, reasons: ra });
      }
    }
  }
  return out.sort((a, b) => a.period.start.getTime() - b.period.start.getTime());
}

/** Slow transits that matter for money: benefics entering wealth houses, malefics entering loss houses. */
export function moneyIngresses(n: Natal, from: Date): (Ingress & { text: string })[] {
  const useLagna = n.profile.timeConfirmed;
  return upcomingIngresses(n, from, 500)
    .map((i) => {
      const p = PLANET_INFO[i.planet].en;
      let text = "";
      if (i.planet === "Ju") {
        if ([2, 5, 9, 11].includes(i.fromMoon)) text = `${p} enters the ${ordinal(i.fromMoon)} from your Moon, one of its wealth-giving places.`;
        if (useLagna && [2, 11].includes(i.fromLagna)) text = `${p} enters your ${ordinal(i.fromLagna)} house: about a year of support for ${i.fromLagna === 2 ? "savings" : "income"}.` + (text ? " " + text : "");
        if (!text && [8, 12].includes(i.fromMoon)) text = `${p} enters the ${ordinal(i.fromMoon)} from your Moon: expenses rise, be conservative.`;
      } else if (i.planet === "Sa") {
        if (i.fromMoon === 11 || i.fromMoon === 3 || i.fromMoon === 6) text = `${p} enters the ${ordinal(i.fromMoon)} from your Moon: slow but lasting gains from steady work.`;
        if ([12, 1, 2].includes(i.fromMoon)) text = `${p} enters the ${ordinal(i.fromMoon)} from your Moon: an Elarai Sani phase; budget carefully.`;
        if (i.fromMoon === 8) text = `${p} enters the 8th from your Moon (Ashtama Sani): avoid financial risk.`;
      } else if (i.planet === "Ve" || i.planet === "Me") {
        if (useLagna && [2, 11].includes(i.fromLagna)) text = `${p} passes through your ${ordinal(i.fromLagna)} house for a few weeks: a good stretch for ${i.planet === "Ve" ? "receipts and purchases" : "deals, invoices and negotiations"}.`;
      } else if (i.planet === "Su") {
        if (useLagna && i.fromLagna === 11) text = `${p} lights up your 11th house for a month: recognition that can turn into income.`;
        if (useLagna && i.fromLagna === 2) text = `${p} is in your 2nd house for a month: attention on earnings and family finances.`;
      } else if (i.planet === "Ra") {
        if (useLagna && [2, 11].includes(i.fromLagna)) text = `Rahu enters your ${ordinal(i.fromLagna)} house: unconventional or sudden money matters for 18 months.`;
      }
      return { ...i, text };
    })
    .filter((i) => i.text);
}
