// End-to-end check of the engine, plus a look at how the scores are distributed.
// Run: npx tsx scripts/check-engine.ts [HH:MM birth time]
import { buildNatal, DEFAULT_PROFILE } from "../lib/astro/chart";
import { NAKSHATRA, PLANET_INFO, RASI } from "../lib/astro/constants";
import { runningDasha } from "../lib/astro/dasha";
import { ACTIVITY, BIRDS } from "../lib/astro/pakshi";
import { dayFrame } from "../lib/astro/panchang";
import { bestWindows, dayContext, readAt, timeline, tierOf, Tier } from "../lib/astro/score";
import { addDaysKey, fmtDateLong, fmtTime } from "../lib/astro/time";
import { moneyDay } from "../lib/astro/wealth";

const time = process.argv[2] ?? DEFAULT_PROFILE.birthTime;
const profile = { ...DEFAULT_PROFILE, birthTime: time, timeConfirmed: true };
const n = buildNatal(profile);
const tz = profile.here.tz;
console.log(`Born ${profile.birthDate} ${time}: lagna ${RASI[n.lagnaSign].ta}, rasi ${RASI[n.moonSign].ta}, star ${NAKSHATRA[n.star].ta}-${n.pada}, bird ${BIRDS[n.bird].ta}, indu lagna ${RASI[n.induLagna].ta}`);
console.log("Dasas:", n.mahas.map((m) => `${PLANET_INFO[m.lord].ta} ${fmtDateLong(m.start, tz)}`).join(" > "));
const now = new Date("2026-11-14T04:30:00Z");
const rd = runningDasha(n.mahas, now)!;
console.log("Running:", [rd.maha, rd.bhukti, rd.antaram, rd.sookshma].map((p) => `${PLANET_INFO[p.lord].ta} till ${fmtDateLong(p.end, tz)}`).join(" / "));

const ctx = dayContext(n, dayFrame("2026-11-14", profile.here));
const r = readAt(ctx, now);
console.log(`\nNow 10:00: overall ${r.scores.overall} ${r.tiers.overall}`, r.scores);
for (const f of r.factors) console.log(`  ${f.effect.overall >= 0 ? "+" : ""}${f.effect.overall.toFixed(1)}  [${f.source}] ${f.title}`);
console.log("Pakshi yamas:", ctx.pakshi.yamas.map((y) => `${fmtTime(y.start, tz)} ${ACTIVITY[y.activity].ta}`).join(" | "));

const t0 = Date.now();
const seg = timeline(ctx);
console.log(`\nTimeline: ${seg.length} segments in ${Date.now() - t0} ms`);
for (const key of ["overall", "apply", "money"] as const)
  console.log(` best ${key}:`, bestWindows(seg, key).map((b) => `${fmtTime(b.start, tz)}-${fmtTime(b.end, tz)} (${b.score})`).join(", "));

// Distribution over 60 days
const hist: Record<Tier, number> = { go: 0, good: 0, steady: 0, hold: 0, avoid: 0 };
let total = 0;
let key = "2026-11-01";
const t1 = Date.now();
const money: string[] = [];
for (let i = 0; i < 60; i++) {
  const f = dayFrame(key, profile.here);
  const c = dayContext(n, f);
  for (const s of timeline(c)) {
    if (s.start >= f.sunset) continue; // daytime only
    const d = s.end.getTime() - s.start.getTime();
    hist[tierOf(s.reading.scores.overall)] += d;
    total += d;
  }
  if (i < 20) { const m = moneyDay(n, f); money.push(`${key.slice(5)}:${m.score}`); }
  key = addDaysKey(key, 1);
}
console.log(`\n60 days of daytime in ${Date.now() - t1} ms:`, Object.fromEntries(Object.entries(hist).map(([k, v]) => [k, `${((100 * v) / total).toFixed(0)}%`])));
console.log("Money scores:", money.join(" "));
