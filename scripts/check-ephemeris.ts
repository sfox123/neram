// Quick sanity check against published Thirukanitha / drik values.
// Run: npx tsx scripts/check-ephemeris.ts
import { allPositions, ayanamsa, lagnaLongitude, sunTimesFrom, dailyMotion } from "../lib/astro/ephemeris";
import { PLANETS, RASI, NAKSHATRA, nakOf, signOf, formatDeg, padaOf } from "../lib/astro/constants";
import { zonedToUtc, fmtTime } from "../lib/astro/time";

const tz = "Asia/Colombo";
function show(label: string, date: Date) {
  const p = allPositions(date);
  console.log(`\n${label}  (${date.toISOString()})  ayanamsa ${ayanamsa(date).toFixed(4)}`);
  for (const id of PLANETS) {
    const lon = p[id];
    console.log(
      `  ${id}  ${RASI[signOf(lon)].ta.padEnd(11)} ${formatDeg(lon)}  ${NAKSHATRA[nakOf(lon)].ta}-${padaOf(lon)}  ${dailyMotion(id, date) < 0 ? "R" : ""}`,
    );
  }
}

for (const hh of [0, 6, 12, 18, 23]) {
  const birth = zonedToUtc(1999, 12, 15, hh, 0, tz);
  show(`Birth 15 Dec 1999 ${hh}:00 Colombo`, birth);
  const lg = lagnaLongitude(birth, 6.9271, 79.8612);
  console.log(`  Lagna ${RASI[signOf(lg)].ta} ${formatDeg(lg)}`);
}

const now = zonedToUtc(2026, 11, 14, 10, 0, tz);
show("14 Nov 2026 10:00 Colombo", now);
const st = sunTimesFrom(zonedToUtc(2026, 11, 14, 0, 0, tz), 6.9271, 79.8612);
console.log("Colombo sunrise", fmtTime(st.sunrise, tz, true), "sunset", fmtTime(st.sunset, tz, true), "next", fmtTime(st.nextSunrise, tz, true));
const delhi = sunTimesFrom(zonedToUtc(2026, 11, 14, 0, 0, "Asia/Kolkata"), 28.6139, 77.209);
console.log("Delhi sunrise", fmtTime(delhi.sunrise, "Asia/Kolkata", true), "sunset", fmtTime(delhi.sunset, "Asia/Kolkata", true), "(published: 06:43 / 17:28)");
