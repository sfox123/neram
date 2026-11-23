// Money outlook: the classical indicators for cash flow, day by day and over the longer run.
// These are traditional rules of thumb, not forecasts of actual income.

import { houseFrom, NAKSHATRA, DASHA_ORDER, PLANET_INFO, PlanetId, RASI, signOf, WEEKDAY_LORD, WEEKDAYS } from "./constants";
import { Natal, ordinal } from "./chart";
import { DashaPeriod, RunningDasha, runningDasha, subPeriods } from "./dasha";
import { aspects } from "./dignity";
import { dailyMotion, siderealLongitude } from "./ephemeris";
import { DayFrame, dayFrame, panchangFor, Place, spanAt } from "./panchang";
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

// ---- Money streams: bhavam, bhavadhipathi and karakan --------------------------------------------
//
// Each kind of money is read through three things, as the tradition does for any matter:
//   bhavam: the house that holds it (counted from the lagna, so it needs the birth time);
//   bhavadhipathi: the lord of that house, which changes with the lagna;
//   karakan: the fixed significator, the same for everyone (Guru for wealth, Sevvai for debt).
// A day leans towards a stream when the Moon moves through its houses or stars, when its lords
// hold the weekday or the running periods, and when its lords move through its houses.

export type StreamKey = "salary" | "clients" | "loan";

export interface StreamHouse {
  h: number;
  w: number;
  topic: string;
}

export interface MoneyStream {
  key: StreamKey;
  label: string;
  tamil: string;
  blurb: string;
  houses: StreamHouse[];
  /** Bhavadhipathis: the lords of the stream's houses in this chart. */
  lords: { p: PlanetId; houses: number[] }[];
  /** Karakas: the fixed significators, the same for every lagna. */
  karakas: { p: PlanetId; why: string }[];
}

const STREAM_SPEC: Record<StreamKey, { label: string; tamil: string; blurb: string; houses: StreamHouse[]; karakas: [PlanetId, string][] }> = {
  salary: {
    label: "Salary",
    tamil: "சம்பளம்",
    blurb: "Pay for service: the 10th (work), the 6th (employment, service to an employer), the 11th (income) and the 2nd (money in hand).",
    houses: [
      { h: 10, w: 2, topic: "work" },
      { h: 6, w: 1.5, topic: "service and employment" },
      { h: 11, w: 2, topic: "income" },
      { h: 2, w: 2, topic: "money in hand" },
    ],
    karakas: [
      ["Sa", "service and steady work"],
      ["Su", "the employer and authority"],
      ["Ju", "wealth (dhana karakan)"],
    ],
  },
  clients: {
    label: "Freelance and clients",
    tamil: "வாடிக்கையாளர் வரவு",
    blurb: "Money from clients, partners and trade: the 7th (clients, contracts, partners), the 10th (the work itself), the 11th (income) and the 3rd (your own effort, messages and invoices).",
    houses: [
      { h: 7, w: 2, topic: "clients, contracts and partners" },
      { h: 10, w: 1.5, topic: "work" },
      { h: 11, w: 2, topic: "income" },
      { h: 3, w: 1, topic: "your own effort, messages and invoices" },
    ],
    karakas: [
      ["Me", "trade, contracts and invoices"],
      ["Ju", "wealth (dhana karakan)"],
      ["Ra", "foreign clients and imports"],
    ],
  },
  loan: {
    label: "Loans and dues",
    tamil: "கடன்",
    blurb: "Borrowing and paying back: the 6th (runam, debt), the 8th (other people's money) and the 12th (money going out, repayment).",
    houses: [
      { h: 6, w: 2, topic: "debt (runam)" },
      { h: 8, w: 1, topic: "other people's money" },
      { h: 12, w: 1.5, topic: "money going out, repayment" },
    ],
    karakas: [
      ["Ma", "debt (runa karakan; the Runa Vimochana prayers for release from debt are addressed to Sevvai)"],
      ["Sa", "dues and delay"],
    ],
  },
};

export const STREAM_KEYS: StreamKey[] = ["salary", "clients", "loan"];

export function moneyStream(n: Natal, key: StreamKey): MoneyStream {
  const spec = STREAM_SPEC[key];
  const lords: MoneyStream["lords"] = [];
  for (const { h } of spec.houses) {
    const p = n.lordOf(h);
    const e = lords.find((l) => l.p === p);
    if (e) e.houses.push(h);
    else lords.push({ p, houses: [h] });
  }
  return { key, label: spec.label, tamil: spec.tamil, blurb: spec.blurb, houses: spec.houses, lords, karakas: spec.karakas.map(([p, why]) => ({ p, why })) };
}

const NAME = (p: PlanetId) => PLANET_INFO[p].ta;
const houseList = (hs: number[]) => hs.map(ordinal).join(" and ");

/** How a planet ties into a stream, in words, or null. */
function tieOf(st: MoneyStream, p: PlanetId): { w: number; text: string } | null {
  const lord = st.lords.find((l) => l.p === p);
  if (lord) return { w: 1, text: `lord of your ${houseList(lord.houses)} (${lord.houses.map((h) => st.houses.find((x) => x.h === h)!.topic).join("; ")})` };
  const kar = st.karakas.find((k) => k.p === p);
  if (kar) return { w: 0.65, text: `karakan of ${kar.why.split(" (")[0]}` };
  return null;
}

export interface DebtNote {
  act: "repay" | "borrow" | "lend";
  tone: Tone;
  text: string;
}

/** The traditional rules for the day itself on taking, giving and clearing loans. */
export function debtNotes(frame: DayFrame, n?: Natal): DebtNote[] {
  const p = panchangFor(frame);
  const mid = new Date(frame.sunrise.getTime() + frame.dayLength / 2);
  const star = spanAt(p.nakshatra, mid).value;
  const yoga = spanAt(p.yoga, mid).value;
  const out: DebtNote[] = [];
  if (frame.weekday === 2) {
    out.push({ act: "repay", tone: "good", text: "Tuesday, Sevvai's day: the traditional day to clear a debt, best in a Sevvai hora" });
    out.push({ act: "borrow", tone: "bad", text: "Tuesday: a loan taken on Sevvai's day is said to linger (\"do not borrow on a Tuesday\")" });
  }
  if (frame.weekday === 3) out.push({ act: "lend", tone: "bad", text: "Wednesday: money lent on Budhan's day is said to be slow to return (\"do not lend on a Wednesday\")" });
  const sunNext = signOf(siderealLongitude("Su", frame.nextSunrise));
  if (sunNext !== p.sunSign) out.push({ act: "borrow", tone: "bad", text: "The Sun changes sign today (a sankranti): the muhurta texts advise against taking a loan" });
  if (yoga === 10) out.push({ act: "borrow", tone: "bad", text: "Vriddhi yoga (growth): a debt taken today is said to grow" });
  if (star === 12 && frame.weekday === 0) out.push({ act: "borrow", tone: "bad", text: "Hastham on a Sunday: a loan taken today is said to stay in the family" });
  if (n) {
    const cb = chandraBala(n.moonSign, spanAt(p.moonSign, mid).value, spanAt(p.tithi, mid).value < 15);
    if (cb.house === 8) for (const act of ["repay", "borrow", "lend"] as const) out.push({ act, tone: "bad", text: "Chandrashtamam: leave money promises for another day" });
  }
  return out;
}

/** Sevvai horas in the daytime: the hours for paying back a debt. */
export function sevvaiHoras(frame: DayFrame): { start: Date; end: Date }[] {
  return panchangFor(frame).horas.filter((h, i) => i < 12 && h.value === "Ma").map((h) => ({ start: h.start, end: h.end }));
}

/** The running bhukti, antaram and sookshma lords that tie into a stream, in words. */
export function streamPeriods(n: Natal, st: MoneyStream, r: RunningDasha | null): string[] {
  if (!r) return [];
  const out: string[] = [];
  const seen = new Set<PlanetId>();
  for (const [level, lord] of [["dasa", r.maha.lord], ["bhukti", r.bhukti.lord], ["antaram", r.antaram.lord], ["sookshma", r.sookshma.lord]] as [string, PlanetId][]) {
    if (seen.has(lord)) continue;
    seen.add(lord);
    const lt = tieOf(st, lord);
    const sits = n.profile.timeConfirmed ? st.houses.find((x) => x.h === n.house[lord]) : undefined;
    if (lt) out.push(`Behind the day, ${NAME(lord)} ${level}: ${NAME(lord)} is ${lt.text}.`);
    else if (sits) out.push(`Behind the day, ${NAME(lord)} ${level}: ${NAME(lord)} sits in your ${ordinal(sits.h)} house (${sits.topic}).`);
  }
  return out;
}

// The typical day's total for a stream in this chart, so a score of 50 means an ordinary day.
// Three lunar months are enough for the Moon to cover every sign, star and tara several times.
const meanCache = new WeakMap<Natal, Partial<Record<StreamKey, number>>>();
function streamMean(n: Natal, key: StreamKey): number {
  let c = meanCache.get(n);
  if (!c) meanCache.set(n, (c = {}));
  if (c[key] === undefined) {
    // Read straight from the ephemeris at local noon: a full panchang per sample day is far slower.
    const st = moneyStream(n, key);
    const offsetH = n.profile.here.longitude / 15;
    let sum = 0;
    const N = 120;
    const y = new Date().getUTCFullYear();
    for (let i = 0; i < N; i++) {
      const day = Date.UTC(y, 0, 1) + Math.floor(i * 3.04) * 86400000;
      const t = new Date(day + (12 - offsetH) * 3600000);
      const mo = siderealLongitude("Mo", t);
      const su = siderealLongitude("Su", t);
      const tithi = Math.floor((((mo - su) % 360) + 360) % 360 / 12);
      const s = daySignals(n, st, key, { moonSign: signOf(mo), star: Math.floor((((mo % 360) + 360) % 360) / (360 / 27)), tithi, weekday: new Date(day).getUTCDay(), t });
      sum += s.reduce((a, x) => a + x.weight, 0);
    }
    c[key] = sum / N;
  }
  return c[key]!;
}

/** A day read for one stream. `at` reads the Moon at a given moment instead of midday. */
export function streamDay(n: Natal, frame: DayFrame, key: StreamKey, at?: Date, run?: RunningDasha | null): MoneyDay {
  const st = moneyStream(n, key);
  const p = panchangFor(frame);
  const noon = new Date(frame.sunrise.getTime() + frame.dayLength / 2);
  const t = at && at >= frame.sunrise && at < frame.nextSunrise ? at : noon;
  const s = daySignals(n, st, key, { moonSign: spanAt(p.moonSign, t).value, star: spanAt(p.nakshatra, t).value, tithi: spanAt(p.tithi, t).value, weekday: frame.weekday, t });
  const loan = key === "loan";

  // Everything above changes from day to day. The periods below hold for weeks or months, so they
  // are shown as the background of the day but kept out of its score (they would lift every day alike).
  const total = s.reduce((a, x) => a + x.weight, 0);
  const background = streamPeriods(n, st, run === undefined ? runningDasha(n.mahas, t) : run);
  for (const b of background) s.push({ weight: 0, text: b, tone: "neutral" });
  // Scored against your own typical day for this stream: 50 is an ordinary day.
  const score = Math.round(Math.max(0, Math.min(100, 50 + (total - streamMean(n, key)) * 6)));
  const label = loan
    ? score >= 66 ? "Loans and dues move" : score >= 50 ? "Dues are in view" : "Quiet for debts"
    : score >= 72 ? "Strong signs" : score >= 60 ? "Favourable" : score >= 43 ? "Neutral" : score >= 30 ? "Slow" : "Expect delay";
  s.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  return { frame, score, label, tone: score >= 60 ? "good" : score < 43 ? "bad" : "neutral", signals: s };
}

interface DayInput {
  moonSign: number;
  star: number;
  tithi: number;
  weekday: number;
  t: Date;
}

/** The day-to-day signals for a stream: the Moon, the weekday, the tara and the moving lords. */
function daySignals(n: Natal, st: MoneyStream, key: StreamKey, { moonSign, star, tithi, weekday, t }: DayInput): MoneySignal[] {
  const s: MoneySignal[] = [];
  const add = (weight: number, text: string) => s.push({ weight, text, tone: weight > 0 ? "good" : weight < 0 ? "bad" : "neutral" });
  const loan = key === "loan";

  // 1. The Moon in the stream's houses (bhavam).
  if (n.profile.timeConfirmed) {
    const hl = houseFrom(n.lagnaSign, moonSign);
    const sh = st.houses.find((x) => x.h === hl);
    if (sh) add(sh.w * 1.25, `Moon in your ${ordinal(hl)} house, the house of ${sh.topic}.`);
    else if (!loan && (hl === 12 || hl === 8)) add(-1.5, hl === 12 ? "Moon in your 12th house: money leaves more easily than it arrives." : "Moon in your 8th house: delays and unexpected costs.");
  }

  // 2. The Moon in a star of a lord or karakan, and passing over them.
  const sl = DASHA_ORDER[star % 9];
  const tie = tieOf(st, sl);
  if (tie) add(1.5 * tie.w, `Moon in ${NAKSHATRA[star].ta}, a star of ${NAME(sl)}, ${tie.text}.`);
  let over = 0;
  for (const q of new Set([...st.lords.map((l) => l.p), ...st.karakas.map((k) => k.p)])) {
    if (q === "Mo" || over >= 2) continue;
    if (signOf(n.positions[q]) === moonSign) {
      const tq = tieOf(st, q)!;
      over += 1;
      add(1.1 * tq.w, `Moon passes over your natal ${NAME(q)}, ${tq.text}.`);
    }
  }

  // 3. The weekday's lord.
  const dl = WEEKDAY_LORD[weekday];
  const dt = tieOf(st, dl);
  if (dt) add(dt.w, `${WEEKDAYS[weekday]}, ${NAME(dl)}'s day: ${NAME(dl)} is ${dt.text}.`);

  // 4. The Moon from your rasi, the tara and the tithi.
  const cb = chandraBala(n.moonSign, moonSign, tithi < 15);
  if (cb.house === 8) add(-2.5, "Chandrashtamam: promises slip and payments get delayed.");
  else if (cb.house === 12) add(-1, "Moon in the 12th from your rasi: outflow.");
  else if (cb.house === 11) add(1, "Moon in the 11th from your rasi, the gains position.");
  const tara = taraBala(n.star, star);
  const taraW = [0, 1.5, -1, 0.5, -1, 1, -1.5, 0.5, 0.5][tara.index];
  if (taraW !== 0) add(taraW, `${tara.name} tara (${tara.meaning}).`);
  if (tithi === 29) add(-1, "Amavasai: money moves slowly.");
  else if ([4, 9, 14].includes((tithi % 15) + 1)) add(-0.5, loan ? "Rikta tithi: avoid lending." : "Rikta (empty) tithi: receipts can come up short.");

  // 5. The stream's lords moving through its houses (weeks at a time).
  if (n.profile.timeConfirmed) {
    let moving = 0;
    for (const { p: q } of st.lords) {
      if (!["Su", "Me", "Ve", "Ma"].includes(q) || moving >= 1.2) continue;
      const qh = houseFrom(n.lagnaSign, signOf(siderealLongitude(q, t)));
      const sh = st.houses.find((x) => x.h === qh) ?? (qh === 11 && !loan ? { h: 11, topic: "income" } : null);
      if (sh) {
        moving += 0.6;
        add(0.6, `${NAME(q)}, ${tieOf(st, q)!.text}, is moving through your ${ordinal(qh)} house (${sh.topic}).`);
      }
    }
  }
  if (!loan && dailyMotion("Me", t) < 0) add(-1, "Budhan is retrograde: invoices, contracts and transfers stall or need redoing.");
  return s;
}

export interface StreamWindow {
  start: Date;
  end: Date;
  /** The sookshma lord, and the antaram it falls in. */
  lord: PlanetId;
  antaram: PlanetId;
  text: string;
  strong: boolean;
}

/**
 * The weeks ahead in which the running periods favour a stream: sookshmas whose lord is one of the
 * stream's lords or karakas. Strong when the antaram lord ties in as well.
 */
export function streamWindows(n: Natal, key: StreamKey, from: Date, days = 150): StreamWindow[] {
  const st = moneyStream(n, key);
  const end = from.getTime() + days * 86400000;
  const out: StreamWindow[] = [];
  const overlaps = (p: DashaPeriod) => p.end.getTime() > from.getTime() && p.start.getTime() < end;
  for (const maha of n.mahas.filter(overlaps))
    for (const bh of subPeriods(maha).filter(overlaps))
      for (const an of subPeriods(bh).filter(overlaps)) {
        const at = tieOf(st, an.lord);
        for (const sk of subPeriods(an).filter(overlaps)) {
          const t = tieOf(st, sk.lord);
          if (!t) continue;
          out.push({
            start: sk.start,
            end: sk.end,
            lord: sk.lord,
            antaram: an.lord,
            text: `${NAME(sk.lord)} sookshma: ${t.text}${at ? `; inside the ${NAME(an.lord)} antaram, ${at.text}` : ""}`,
            strong: !!at && t.w === 1,
          });
        }
      }
  return out;
}

// ---- Your money diary --------------------------------------------------------------------------------

/** Browser storage key for the diary; the Money page writes it and the bell reads it. */
export const MONEY_DIARY_KEY = "neram.money.diary.v1";

export type EntryKind = "salary" | "client" | "loan-in" | "repay" | "other";
export const ENTRY_LABEL: Record<EntryKind, string> = { salary: "Salary", client: "Client payment", "loan-in": "Loan taken", repay: "Loan repayment", other: "Other money" };
export const ENTRY_STREAM: Record<EntryKind, StreamKey | null> = { salary: "salary", client: "clients", "loan-in": "loan", repay: "loan", other: null };

export interface MoneyEntry {
  id: string;
  /** YYYY-MM-DD in your current place. */
  date: string;
  kind: EntryKind;
  amount?: number;
  /** For a loan taken: what has to be paid back. */
  owed?: number;
  note?: string;
  /** Promised or expected, not yet in hand. */
  expected?: boolean;
}

/** What is still owed across the diary: loans taken (their payback amount) less repayments. */
export function loanBalance(entries: MoneyEntry[]): { owed: number; repaid: number; left: number; open: MoneyEntry[] } {
  const taken = entries.filter((e) => e.kind === "loan-in");
  const owed = taken.reduce((a, e) => a + (e.owed ?? e.amount ?? 0), 0);
  const repaid = entries.filter((e) => e.kind === "repay" && !e.expected).reduce((a, e) => a + (e.amount ?? 0), 0);
  return { owed, repaid, left: Math.max(0, owed - repaid), open: owed > repaid ? taken : [] };
}

export interface RepayDay {
  frame: DayFrame;
  score: number;
  horas: { start: Date; end: Date }[];
  notes: DebtNote[];
}

/** Tuesdays in the coming weeks, read for clearing a debt, best first. Chandrashtamam Tuesdays are left out. */
export function repayDays(n: Natal, place: Place, fromKey: string, days = 70): RepayDay[] {
  const out: RepayDay[] = [];
  for (let i = 0; i < days; i++) {
    const [y, m, d] = fromKey.split("-").map(Number);
    const key = new Date(Date.UTC(y, m - 1, d) + i * 86400000).toISOString().slice(0, 10);
    const frame = dayFrame(key, place);
    if (frame.weekday !== 2) continue;
    const notes = debtNotes(frame, n).filter((x) => x.act === "repay");
    if (notes.some((x) => x.tone === "bad")) continue;
    out.push({ frame, score: streamDay(n, frame, "loan").score, horas: sevvaiHoras(frame), notes });
  }
  return out.sort((a, b) => b.score - a.score);
}

export interface PatternPlanet {
  planet: PlanetId;
  /** Days on which the Moon sat in this planet's stars. */
  days: number;
  /** What chance alone would give (3 stars of 27). */
  chance: number;
  tie: string | null;
}

export interface EntryPattern {
  kind: EntryKind;
  count: number;
  /** Days on which the Moon sat in a star of one of the stream's lords or karakas, and what chance would give. */
  tied: number;
  tiedChance: number;
  /** Days on which the Moon was in one of the stream's houses, and what chance would give. */
  inHouse: number;
  houseChance: number;
  planets: PatternPlanet[];
  weekdays: number[];
}

/** What the days of one kind of entry have in common, measured against chance. */
export function entryPattern(n: Natal, place: Place, entries: MoneyEntry[], kind: EntryKind): EntryPattern | null {
  const list = entries.filter((e) => e.kind === kind);
  const key = ENTRY_STREAM[kind];
  if (!list.length || !key) return null;
  const st = moneyStream(n, key);
  const tiedSet = new Set<PlanetId>([...st.lords.map((l) => l.p), ...st.karakas.map((k) => k.p)]);
  const counts = new Map<PlanetId, number>();
  const weekdays = new Array(7).fill(0);
  let tied = 0, inHouse = 0;
  for (const e of list) {
    const f = dayFrame(e.date, place);
    const p = panchangFor(f);
    const mid = new Date(f.sunrise.getTime() + f.dayLength / 2);
    const star = spanAt(p.nakshatra, mid).value;
    const sl = DASHA_ORDER[star % 9];
    counts.set(sl, (counts.get(sl) ?? 0) + 1);
    if (tiedSet.has(sl)) tied++;
    if (n.profile.timeConfirmed && st.houses.some((x) => x.h === houseFrom(n.lagnaSign, spanAt(p.moonSign, mid).value))) inHouse++;
    weekdays[f.weekday]++;
  }
  const c = list.length;
  const planets = [...counts.entries()]
    .map(([planet, days]) => ({ planet, days, chance: Math.round((c / 9) * 10) / 10, tie: tieOf(st, planet)?.text ?? null }))
    .sort((a, b) => b.days - a.days);
  return {
    kind,
    count: c,
    tied,
    tiedChance: Math.round(((c * tiedSet.size) / 9) * 10) / 10,
    inHouse,
    houseChance: Math.round(((c * st.houses.length) / 12) * 10) / 10,
    planets,
    weekdays,
  };
}
