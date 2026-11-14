// Compare with published drik values for 14 Nov 2026 (IST = Colombo time):
//   Panchami till 23:24, Pooradam till 20:24, Shula yoga till 06:22 next day,
//   Bava till 10:02 then Balava till 23:23. Saturday Rahu kalam is the 3rd eighth.
// Run: npx tsx scripts/check-panchang.ts
import { dayFrame, panchangFor, label, Place } from "../lib/astro/panchang";
import { fmtTime } from "../lib/astro/time";

const colombo: Place = { name: "Colombo", latitude: 6.9271, longitude: 79.8612, tz: "Asia/Colombo" };
for (const key of ["2026-11-14", "2026-04-14", "2026-12-16"]) {
  const p = panchangFor(dayFrame(key, colombo));
  const t = (d: Date) => fmtTime(d, colombo.tz);
  console.log(`\n${key} weekday ${p.frame.weekday}  sunrise ${t(p.frame.sunrise)} sunset ${t(p.frame.sunset)}`);
  console.log(" Tamil date:", p.tamil.month, p.tamil.day, p.tamil.year);
  console.log(" Tithi:", p.tithi.map((s) => `${label.tithi(s.value)} till ${t(s.end)}`).join(" | "));
  console.log(" Star:", p.nakshatra.map((s) => `${label.nak(s.value)} till ${t(s.end)}`).join(" | "));
  console.log(" Yoga:", p.yoga.map((s) => `${label.yoga(s.value)} till ${t(s.end)}`).join(" | "));
  console.log(" Karana:", p.karana.map((s) => `${label.karana(s.value)} till ${t(s.end)}`).join(" | "));
  console.log(" Rahu:", t(p.rahu.start), "-", t(p.rahu.end), " Yama:", t(p.yamagandam.start), " Gulika:", t(p.gulika.start));
  console.log(" Abhijit:", p.abhijit && `${t(p.abhijit.start)} - ${t(p.abhijit.end)}`);
  console.log(" Horas:", p.horas.slice(0, 6).map((h) => `${h.value}@${t(h.start)}`).join(" "));
  console.log(" Gowri:", p.gowri.slice(0, 8).map((h) => h.value).join(","));
}
