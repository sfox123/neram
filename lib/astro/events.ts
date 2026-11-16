// What is coming: the next days' planetary moves, your dasa changes, the Moon's shifts,
// the temple karanam, good windows today and tomorrow, and the longer life windows,
// as one sorted feed for the bell in the header.

import { Natal, ordinal } from "./chart";
import { careerBaseline, careerPromise, careerWindows, LEAN_LABEL } from "./career";
import { NAKSHATRA, nakOf, PLANET_INFO, PlanetId, RASI, signOf } from "./constants";
import { subPeriods, runningDasha, DashaPeriod } from "./dasha";
import { allPositions, dailyMotion, siderealLongitude } from "./ephemeris";
import { marriageBaseline, marriagePromise, marriageWindows } from "./marriage";
import { nextVanija, pakshaOf } from "./panchang";
import { bestWindows, Segment, TIER } from "./score";
import { fmtDateLong, fmtDuration, fmtTime, MS_DAY, MS_HOUR } from "./time";
import { chandraBala, contacts, taraBala, Tone, upcomingIngresses } from "./transits";
import { travelBaseline, travelPromise, travelWindows } from "./travel";
import { completedYears, solarReturn } from "./varsha";

export type EventKind = "planet" | "moon" | "dasa" | "temple" | "window" | "year" | "life";

export interface NeramEvent {
  id: string;
  kind: EventKind;
  /** When it begins. At or before `now` means it is running. */
  at: Date;
  until?: Date;
  tone: Tone;
  /** The graha to draw, when one applies. */
  planet?: PlanetId;
  title: string;
  tamil: string;
  detail: string;
  href: string;
}

/** How far ahead the bell looks for day-to-day events: today, tomorrow and the day after. */
export const HORIZON_MS = 2.5 * MS_DAY;

const DASA_HORIZON = { antaram: 14 * MS_DAY, bhukti: 90 * MS_DAY, maha: 365 * MS_DAY };
const LIFE_HORIZON = 60 * MS_DAY;

/** The first instant after `from` (to the minute) at which `index(t)` changes, or null within `limitMs`. */
function nextChange(index: (t: Date) => number, from: Date, limitMs: number, stepMs = 30 * 60000): Date | null {
  const start = index(from);
  let lo = from.getTime();
  let hi = lo;
  const limit = lo + limitMs;
  while (hi < limit) {
    hi += stepMs;
    if (index(new Date(hi)) !== start) break;
    lo = hi;
  }
  if (hi >= limit) return null;
  while (hi - lo > 60000) {
    const mid = (lo + hi) / 2;
    if (index(new Date(mid)) === start) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
}

export interface CoreInput {
  natal: Natal;
  now: Date;
  tz: string;
  today: Segment[] | null;
  tomorrow: Segment[] | null;
}

/** The cheap, day-to-day events. Safe to compute on every page. */
export function coreEvents({ natal, now, tz, today, tomorrow }: CoreInput): NeramEvent[] {
  const out: NeramEvent[] = [];
  const horizon = now.getTime() + HORIZON_MS;

  // Planets changing sign.
  for (const g of upcomingIngresses(natal, now, 3)) {
    if (g.date.getTime() > horizon) continue;
    out.push({
      id: `ingress-${g.planet}-${g.date.getTime()}`,
      kind: "planet",
      at: g.date,
      tone: g.tone,
      planet: g.planet,
      title: `${PLANET_INFO[g.planet].ta} enters ${RASI[g.sign].ta}`,
      tamil: `${PLANET_INFO[g.planet].tamil} ${RASI[g.sign].tamil}`,
      detail: `${ordinal(g.fromMoon)} from your rasi, ${ordinal(g.fromLagna)} from your lagna: ${
        g.tone === "good" ? "a helping place for it." : "not a helping place; expect friction in what it rules."
      }`,
      href: "/sky",
    });
  }

  // Planets turning retrograde or direct.
  for (const p of ["Ma", "Me", "Ju", "Ve", "Sa"] as PlanetId[]) {
    const dir = (t: Date) => (dailyMotion(p, t) < 0 ? 1 : 0);
    const flip = nextChange(dir, now, HORIZON_MS, 6 * MS_HOUR);
    if (!flip) continue;
    const retro = dir(new Date(flip.getTime() + MS_HOUR)) === 1;
    out.push({
      id: `station-${p}-${flip.getTime()}`,
      kind: "planet",
      at: flip,
      tone: retro ? "neutral" : "good",
      planet: p,
      title: `${PLANET_INFO[p].ta} turns ${retro ? "retrograde" : "direct"}`,
      tamil: `${PLANET_INFO[p].tamil} ${retro ? "வக்ரம்" : "நேர்க்கதி"}`,
      detail: retro
        ? `What it rules (${PLANET_INFO[p].karaka.split(",").slice(0, 2).join(",")}) slows and comes back for review.`
        : `What it rules (${PLANET_INFO[p].karaka.split(",").slice(0, 2).join(",")}) moves forward again.`,
      href: "/sky",
    });
  }

  // The Moon changing sign and star.
  {
    const moonSign = (t: Date) => signOf(siderealLongitude("Mo", t));
    let t = now;
    for (let i = 0; i < 3; i++) {
      const next = nextChange(moonSign, t, horizon - t.getTime());
      if (!next) break;
      const after = new Date(next.getTime() + 60000);
      const sign = moonSign(after);
      const cb = chandraBala(natal.moonSign, sign, pakshaOf(after) === 0);
      out.push({
        id: `moon-sign-${next.getTime()}`,
        kind: "moon",
        at: next,
        tone: cb.tone,
        planet: "Mo",
        title: cb.chandrashtama ? `Chandrashtamam begins: Moon enters ${RASI[sign].ta}` : `Moon enters ${RASI[sign].ta}`,
        tamil: cb.chandrashtama ? `சந்திராஷ்டமம்` : `சந்திரன் ${RASI[sign].tamil}`,
        detail: cb.note,
        href: "/day",
      });
      t = after;
    }
    const moonStar = (d: Date) => nakOf(siderealLongitude("Mo", d));
    t = now;
    for (let i = 0; i < 4; i++) {
      const next = nextChange(moonStar, t, horizon - t.getTime());
      if (!next) break;
      const after = new Date(next.getTime() + 60000);
      const star = moonStar(after);
      const tara = taraBala(natal.star, star);
      out.push({
        id: `moon-star-${next.getTime()}`,
        kind: "moon",
        at: next,
        tone: tara.tone,
        planet: "Mo",
        title: `Moon in ${NAKSHATRA[star].ta}: ${tara.name} tara`,
        tamil: NAKSHATRA[star].tamil,
        detail: tara.meaning,
        href: "/day",
      });
      t = after;
    }
  }

  // Dasa, bhukti and antaram changes.
  const run = runningDasha(natal.mahas, now);
  if (run) {
    const nextIn = (list: DashaPeriod[], cur: DashaPeriod) => {
      const i = list.findIndex((p) => p.start.getTime() === cur.start.getTime());
      return i >= 0 ? list[i + 1] : undefined;
    };
    const levels: { label: string; tamil: string; cur: DashaPeriod; next: DashaPeriod | undefined; horizon: number }[] = [
      { label: "Antaram", tamil: "அந்தரம்", cur: run.antaram, next: nextIn(subPeriods(run.bhukti), run.antaram), horizon: DASA_HORIZON.antaram },
      { label: "Bhukti", tamil: "புக்தி", cur: run.bhukti, next: nextIn(subPeriods(run.maha), run.bhukti), horizon: DASA_HORIZON.bhukti },
      { label: "Maha dasa", tamil: "தசை", cur: run.maha, next: nextIn(natal.mahas, run.maha), horizon: DASA_HORIZON.maha },
    ];
    for (const l of levels) {
      // When a sub-period ends with its parent, the parent's change is the one to show.
      if (!l.next) continue;
      if (l.cur.end.getTime() - now.getTime() > l.horizon) continue;
      const lord = l.next.lord;
      out.push({
        id: `dasa-${l.label}-${l.cur.end.getTime()}`,
        kind: "dasa",
        at: l.cur.end,
        until: l.next.end,
        tone: PLANET_INFO[lord].benefic ? "good" : "neutral",
        planet: lord,
        title: `${l.label} changes to ${PLANET_INFO[lord].ta}`,
        tamil: `${PLANET_INFO[lord].tamil} ${l.tamil}`,
        detail: `Runs until ${fmtDateLong(l.next.end, tz)}. ${PLANET_INFO[lord].ta} stands for ${PLANET_INFO[lord].karaka}.`,
        href: "/dasa",
      });
    }
  }

  // The temple karanam.
  {
    const v = nextVanija(now);
    if (v.start.getTime() <= horizon) {
      const running = now >= v.start && now < v.end;
      out.push({
        id: `vanija-${v.start.getTime()}`,
        kind: "temple",
        at: v.start,
        until: v.end,
        tone: "good",
        title: running ? "Vanisai karanam is running" : "Vanisai karanam",
        tamil: "வணிசை கரணம்",
        detail: `${running ? "Until" : `${fmtTime(v.start, tz)} to`} ${fmtTime(v.end, tz)}, ${fmtDuration(v.end.getTime() - v.start.getTime())}. Good for the temple.`,
        href: "/",
      });
    }
  }

  // The best windows still ahead today, and the best of tomorrow.
  const pushWindow = (b: { start: Date; end: Date; tier: keyof typeof TIER }, day: string) => {
    out.push({
      id: `window-${b.start.getTime()}`,
      kind: "window",
      at: b.start,
      until: b.end,
      tone: "good",
      title: `${TIER[b.tier].word} window ${day}`,
      tamil: TIER[b.tier].tamil,
      detail: `${fmtTime(b.start, tz)} to ${fmtTime(b.end, tz)}, ${fmtDuration(b.end.getTime() - b.start.getTime())}. Use it for what matters most.`,
      href: "/day",
    });
  };
  if (today) for (const b of bestWindows(today, "overall", now, 30, 2)) pushWindow(b, "today");
  if (tomorrow) {
    const best = bestWindows(tomorrow, "overall", undefined, 30, 1).filter((b) => b.tier === "go" || b.tier === "good");
    for (const b of best) pushWindow(b, "tomorrow");
  }

  // Planets exactly on your natal planets right now.
  for (const c of contacts(natal, allPositions(now), now).filter((x) => x.exact).slice(0, 3)) {
    const brings = c.text.split(". ").slice(1).join(". ");
    out.push({
      id: `contact-${c.transit}-${c.natal}`,
      kind: "planet",
      at: now,
      tone: c.tone,
      planet: c.transit,
      title: `${PLANET_INFO[c.transit].ta} on your natal ${PLANET_INFO[c.natal].ta}`,
      tamil: `${PLANET_INFO[c.transit].tamil} · ${PLANET_INFO[c.natal].tamil}`,
      detail: brings || c.text,
      href: "/sky",
    });
  }

  // The solar return: the year chart begins.
  {
    const k = completedYears(natal, now) + 1;
    const sr = solarReturn(natal, k);
    if (sr.getTime() - now.getTime() < 10 * MS_DAY && sr > now) {
      out.push({
        id: `solar-${k}`,
        kind: "year",
        at: sr,
        tone: "neutral",
        planet: "Su",
        title: `Your solar return: year ${k + 1} begins`,
        tamil: "வருட ஆரம்பம்",
        detail: `The Sun returns to its birth degree at ${fmtTime(sr, tz)}. The new year chart is read from this moment.`,
        href: "/year",
      });
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** The longer life windows: slower to compute, so the bell asks for these only when opened. */
export function lifeEvents(natal: Natal, now: Date, tz: string): NeramEvent[] {
  const out: NeramEvent[] = [];
  const push = (key: string, tamil: string, href: string, w: { start: Date; end: Date; level: string; reasons: string[] }, lean: string) => {
    if (w.level !== "high") return;
    const running = w.start <= now && now < w.end;
    if (!running && w.start.getTime() - now.getTime() > LIFE_HORIZON) return;
    out.push({
      id: `life-${key}-${w.start.getTime()}`,
      kind: "life",
      at: w.start,
      until: w.end,
      tone: "good",
      title: running ? `${key}: a high window is running` : `${key}: a high window opens`,
      tamil,
      detail: `${running ? "Until" : `${fmtDateLong(w.start, tz)} to`} ${fmtDateLong(w.end, tz)}.${lean ? ` ${lean}.` : ""}${w.reasons[0] ? ` ${w.reasons[0]}` : ""}`,
      href,
    });
  };
  try {
    const cp = careerPromise(natal);
    for (const w of careerWindows(natal, cp, careerBaseline(natal, cp), now, 1).windows) push("Career", "தொழில்", "/career", w, `Leans to ${w.leans.map((l) => LEAN_LABEL[l]).join(" and ")}`);
    const tp = travelPromise(natal);
    for (const w of travelWindows(natal, tp, travelBaseline(natal, tp), now, 1).windows) push("Travel abroad", "வெளிநாடு", "/travel", w, `For ${w.purposes.join(", ")}`);
    const mp = marriagePromise(natal);
    for (const w of marriageWindows(natal, mp, marriageBaseline(natal, mp), now, 1).windows) push("Marriage", "திருமணம்", "/marriage", w, "");
  } catch {
    // A life engine that cannot run for this chart (for example, no confirmed birth time) just contributes nothing.
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
