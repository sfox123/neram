// Prints the newer engines (Shadbala, annual chart, Sarvatobhadra, Jaimini) for the default profile.
// Run: npx tsx scripts/check-new.ts
import { buildNatal, DEFAULT_PROFILE } from "../lib/astro/chart";
import { formatDeg, PLANET_INFO, RASI, signOf } from "../lib/astro/constants";
import { GRAHAS, shadbala, balaWord } from "../lib/astro/shadbala";

const n = buildNatal(DEFAULT_PROFILE);
console.log("Positions:", (Object.keys(n.positions) as (keyof typeof n.positions)[]).map((p) => `${p} ${RASI[signOf(n.positions[p])].ta} ${formatDeg(n.positions[p])}${n.retro[p] ? " R" : ""} h${n.house[p]}`).join(" | "));
console.log(`Lagna ${RASI[n.lagnaSign].ta} ${formatDeg(n.lagna)}`);

const sb = shadbala(n);
console.log(`\nShadbala (year lord ${sb.yearLord}, month ${sb.monthLord}, day ${sb.dayLord}, hora ${sb.hourLord}; ${sb.dayBirth ? "day" : "night"} birth)`);
console.log("      sthana   dig    kala  cheshta  nais   drik   total  rupas  need  ratio");
for (const p of GRAHAS) {
  const b = sb.planets[p];
  const f = (x: number) => x.toFixed(1).padStart(6);
  console.log(`${PLANET_INFO[p].ta.padEnd(8)}${f(b.sthana)} ${f(b.dig)} ${f(b.kala)} ${f(b.cheshta)} ${f(b.naisargika)} ${f(b.drik)} ${f(b.total)} ${b.rupas.toFixed(2).padStart(6)} ${String(b.required).padStart(5)} ${b.ratio.toFixed(2).padStart(6)}  ${balaWord(b.ratio)}`);
}

// ---- Annual chart ---------------------------------------------------------------------------
import { completedYears, tithiPraveshaAt, tithiPravesha, varshaphal } from "../lib/astro/varsha";
import { fmtDateLong, fmtTime } from "../lib/astro/time";
import { NAKSHATRA, WEEKDAYS } from "../lib/astro/constants";

const tz = DEFAULT_PROFILE.here.tz;
const now = new Date(process.argv[2] ?? "2026-11-15T05:30:00Z");
const when = (d: Date) => `${fmtDateLong(d, tz)} ${fmtTime(d, tz)}`;
const k = completedYears(n, now);
for (const kk of [k, k + 1]) {
  const v = varshaphal(n, kk);
  console.log(`\nVarshaphal year ${kk}: ${when(v.start)} to ${when(v.end)}`);
  console.log(`  year lagna ${RASI[v.chart.lagnaSign].ta}; muntha ${RASI[v.muntha].ta} (birth house ${v.munthaHouseBirth}, year house ${v.munthaHouseYear}), lord ${v.munthaLord}; year lord ${v.yearLord}; ${v.dayStart ? "day" : "night"} start`);
  console.log("  bearers:", v.bearers.map((b) => `${b.office}=${b.planet} ${b.strength} ${b.aspect}`).join(" | "));
  console.log("  mudda:", v.mudda.map((m) => `${m.lord} ${fmtDateLong(m.start, tz)}`).join(" > "));
  for (const l of v.lines) console.log(`  [${l.tone}] ${l.title}: ${l.detail}`);
  const tp = tithiPravesha(n, kk);
  console.log(`Tithi Pravesha ${kk}: ${when(tp.start)} (${tp.offsetDays.toFixed(1)} days from solar), ${WEEKDAYS[tp.weekday]}, lord ${tp.yearLord}, hora ${tp.horaLord}, lagna ${RASI[tp.chart.lagnaSign].ta}, star ${NAKSHATRA[tp.star].ta}, tithi ${tp.tithi}, Sun in ${RASI[signOf(tp.chart.positions.Su)].ta}`);
}
console.log("Running lunar year:", tithiPraveshaAt(n, now).k, " natal tithi", n.tithi);

// ---- Sarvatobhadra --------------------------------------------------------------------------
import { BOARD, boardStar, sbcReading, sbcScore, starName, vedhaLines } from "../lib/astro/sbc";
import { allPositions } from "../lib/astro/ephemeris";
import { tithiIndex } from "../lib/astro/panchang";

console.log("\nSarvatobhadra board:");
for (const row of BOARD) console.log("  " + row.map((c) => c.label.slice(0, 9).padEnd(10)).join(""));
const kr = vedhaLines(0);
console.log("Krittika lines: front", kr.front.map((c) => c.label), "fore", kr.fore.map((c) => c.label), "hind", kr.hind.map((c) => c.label));
for (const school of ["all", "motion"] as const) {
  const r = sbcReading(n, allPositions(now), now, tithiIndex(now), school);
  console.log(`School ${school}: ${r.word}. ${r.summary}`);
  console.log("  points:", r.points.map((p) => `${p.label}=${p.value}@${p.cell ? `${p.cell.row},${p.cell.col}` : "-"}`).join(" | "));
  console.log("  throwers:", r.throwers.map((t) => `${t.planet}@${starName(t.star)}${t.malefic ? "(m)" : "(b)"}[${t.lines.join("/")}]`).join(" "));
  console.log("  hits:", r.hits.map((h) => `${h.planet}->${h.point.key}(${h.line}${h.malefic ? ",m" : ",b"})`).join(" "), " score", sbcScore(r.hits).value.toFixed(2));
}
console.log("Abhijit check:", starName(boardStar(278)), starName(boardStar(276)), starName(boardStar(281)));

// ---- Jaimini --------------------------------------------------------------------------------
import { ARUDHA_NAME, charaAt, charaSubs, charaSupport, jaimini, KARAKA_ORDER } from "../lib/astro/jaimini";

const j = jaimini(n);
console.log("\nKarakas:", KARAKA_ORDER.map((key) => `${key}=${j.karakas[key].planet} ${j.karakas[key].degree.toFixed(2)}`).join(" "), " karakamsa", RASI[j.karakamsa].ta);
console.log("Padas:", j.padas.map((p) => `A${p.house}=${RASI[p.sign].ta}${p.moved ? "*" : ""}`).join(" "));
void ARUDHA_NAME;
console.log(`Chara dasa (${j.dasa.forward ? "forward" : "backward"}):`);
for (const p of j.dasa.periods.slice(0, 14)) console.log(`  ${RASI[p.sign].ta.padEnd(11)} ${String(p.years).padStart(2)}y  ${fmtDateLong(p.start, tz)} - ${fmtDateLong(p.end, tz)}  (${p.note})`);
const run = charaAt(j.dasa, now)!;
console.log(`Running: ${RASI[run.dasa.sign].ta} / ${RASI[run.sub.sign].ta} until ${fmtDateLong(run.sub.end, tz)}`);
console.log("  subs:", charaSubs(j.dasa, run.dasa).map((s) => `${RASI[s.sign].ta} ${fmtDateLong(s.start, tz)}`).join(" > "));
for (const yr of [2027, 2028, 2029, 2030, 2031]) for (const topic of ["career", "marriage"] as const) {
  const s = charaSupport(n, j, new Date(Date.UTC(yr, 6, 1)), topic)!;
  console.log(`  mid-${yr} ${topic}: ${RASI[s.dasa.sign].ta}/${RASI[s.sub.sign].ta} ${s.level} ${s.score} :: ${s.reasons.join("; ")}`);
}
