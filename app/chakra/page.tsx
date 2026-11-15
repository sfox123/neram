"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { DateStepper, H2, Loading, PageTitle } from "@/components/ui";
import { PLANET_INFO, PlanetId } from "@/lib/astro/constants";
import { allPositions } from "@/lib/astro/ephemeris";
import { tithiIndex } from "@/lib/astro/panchang";
import { BOARD, Cell, DEFAULT_SCHOOL, LineKind, NAME_SOUNDS, nameSound, SbcSchool, sbcReading, SbcWord, starName } from "@/lib/astro/sbc";
import { dateKey, fmtDateLong, parseDateKey, zonedToUtc } from "@/lib/astro/time";

const WORD_TIER: Record<SbcWord, string> = { Clear: "tier-go", Lighter: "tier-good", Usual: "tier-steady", Heavier: "tier-hold" };
const LINE_LABEL: Record<LineKind, string> = { front: "front line", fore: "fore diagonal", hind: "hind diagonal" };
const name = (p: PlanetId) => PLANET_INFO[p].ta;
const cellId = (c: Cell) => `${c.row}-${c.col}`;

export default function ChakraPage() {
  const { ready, now, natal, profile, saveProfile } = useStore();
  const tz = profile.here.tz;
  const todayKey = ready ? dateKey(now, tz) : "";
  const [picked, setPicked] = useState<string | null>(null);
  const key = picked ?? todayKey;
  const isToday = key === todayKey;
  // Today is read at this hour; another date is read at its local noon.
  const hourStamp = Math.floor(now.getTime() / 3600000);

  const data = useMemo(() => {
    if (!ready || !key) return null;
    const { y, m, d } = parseDateKey(key);
    const at = isToday ? new Date(hourStamp * 3600000) : zonedToUtc(y, m, d, 12, 0, tz);
    return { at, reading: sbcReading(natal, allPositions(at), at, tithiIndex(at)) };
  }, [ready, key, isToday, hourStamp, natal, tz]);

  if (!ready || !data) return <Loading />;
  const { at, reading } = data;
  const school = profile.sbcSchool ?? DEFAULT_SCHOOL;
  const guessed = nameSound(profile.name);

  // What falls on each cell.
  const mine = new Map<string, string[]>();
  for (const p of reading.points) if (p.cell) mine.set(cellId(p.cell), [...(mine.get(cellId(p.cell)) ?? []), p.label]);
  const struck = new Map<string, { bad: PlanetId[]; good: PlanetId[] }>();
  const sitting = new Map<string, PlanetId[]>();
  for (const th of reading.throwers) {
    for (const row of BOARD) for (const c of row) if (c.kind === "star" && c.index === th.star) sitting.set(cellId(c), [...(sitting.get(cellId(c)) ?? []), th.planet]);
    for (const { cell } of th.cells) {
      const cur = struck.get(cellId(cell)) ?? { bad: [], good: [] };
      const list = th.malefic ? cur.bad : cur.good;
      if (!list.includes(th.planet)) list.push(th.planet);
      struck.set(cellId(cell), cur);
    }
  }

  return (
    <div>
      <PageTitle title="Sarvatobhadra chakra" tamil="சர்வதோபத்ர சக்கரம்">
        One board of 81 cells holds the 28 stars, the name sounds, the signs, the tithis and the weekdays. Each planet throws lines across it from the
        star it is in. Lines from malefics that fall on your own points call for care; lines from benefics support them.
      </PageTitle>

      <div className="mb-6">
        <DateStepper value={key} onChange={(k) => setPicked(k === todayKey ? null : k)} todayKey={todayKey} />
      </div>

      <section className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[1fr_1.3fr]">
        <div className={`${WORD_TIER[reading.word]} p-6 sm:p-8`}>
          <p className="opacity-85">{isToday ? "The board now" : `The board on ${fmtDateLong(at, tz)}`}</p>
          <p className="verdict-word mt-2 text-6xl leading-none sm:text-7xl">{reading.word}</p>
          <p className="mt-4 text-[1.02rem] opacity-95">
            {reading.pierced} of your {reading.points.length} birth points pierced by malefics
            {reading.supported ? `, ${reading.supported} supported by benefics` : ""}.
          </p>
        </div>
        <div className="bg-paper p-6 sm:p-8">
          <p className="max-w-[60ch] text-[1.02rem]">{reading.summary}</p>
          <p className="mt-3 max-w-[60ch] text-[0.95rem] text-mute">
            The slow planets stay on one star for weeks, so some pressure is a standing condition and not news. The verdict therefore ranks today against the
            twelve months around it, and it is that difference, not the bare count, that enters the daily score.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <H2 aside="east at the top; your points are ringed">The board</H2>
        <div className="overflow-x-auto">
          <div className="grid w-full min-w-[40rem] max-w-[58rem] grid-cols-9 border border-ink/70 bg-paper text-[0.72rem] leading-tight">
            {BOARD.flatMap((row) =>
              row.map((c) => {
                const id = cellId(c);
                const own = mine.get(id);
                const hit = struck.get(id);
                const here = sitting.get(id) ?? [];
                const tint = hit?.bad.length ? "bg-avoid/15" : hit?.good.length ? "bg-go/15" : c.kind === "star" ? "bg-panel/60" : "";
                return (
                  <div
                    key={id}
                    className={`relative flex aspect-square min-h-[4.2rem] flex-col justify-between border border-ink/20 p-1 ${tint} ${own ? "z-10 outline outline-2 -outline-offset-2 outline-peacock" : ""}`}
                    title={[c.kind === "star" ? `${c.label} (star)` : `${c.label} (${c.kind})`, own ? `Yours: ${own.join(", ")}` : "", hit?.bad.length ? `Pierced by ${hit.bad.map(name).join(", ")}` : "", hit?.good.length ? `Supported by ${hit.good.map(name).join(", ")}` : ""].filter(Boolean).join(". ")}
                  >
                    <span className={c.kind === "star" ? "font-semibold" : c.kind === "sign" ? "text-peacock" : c.kind === "tithi" ? "font-semibold text-deep" : "text-mute"}>
                      {c.label}
                      {c.sub && <span className="block font-normal text-mute">{c.sub}</span>}
                    </span>
                    <span className="flex flex-wrap items-end gap-x-1">
                      {here.map((p) => (
                        <span key={p} className="rounded-sm bg-deep px-1 font-semibold text-paper">
                          {p}
                        </span>
                      ))}
                      {hit?.bad.map((p) => (
                        <span key={`b${p}`} className="font-semibold text-avoid">
                          {p}
                        </span>
                      ))}
                      {hit?.good.map((p) => (
                        <span key={`g${p}`} className="font-semibold text-go">
                          {p}
                        </span>
                      ))}
                    </span>
                  </div>
                );
              }),
            )}
          </div>
        </div>
        <p className="mt-3 max-w-[76ch] text-sm text-mute">
          A dark tag is a planet sitting in that star. Red letters are malefic lines crossing a cell, green letters benefic ones. Ringed cells are your
          own: birth star, rasi, lagna, tithi, weekday and name sound.
        </p>
      </section>

      <section className="mt-12 max-w-[86ch]">
        <H2>Your points</H2>
        <ul className="border-t border-line">
          {reading.points.map((pt) => {
            const hits = reading.hits.filter((h) => h.point.key === pt.key);
            const bad = hits.filter((h) => h.malefic);
            return (
              <li key={pt.key} className="grid gap-x-6 gap-y-1 border-b border-line py-3 sm:grid-cols-[13rem_1fr]">
                <span>
                  <span className="flex items-baseline gap-2 font-semibold">
                    <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${bad.length ? "bg-avoid" : hits.length ? "bg-go" : "bg-ink/25"}`} />
                    {pt.label}
                  </span>
                  <span className="block pl-4 text-sm text-mute">{pt.value}</span>
                </span>
                <span className="text-[0.95rem] text-mute">
                  {!pt.cell
                    ? "Not placed on the board. Set your name sound below."
                    : hits.length === 0
                      ? "No line falls on it."
                      : hits.map((h) => `${name(h.planet)} (${h.malefic ? "malefic" : "benefic"}, ${LINE_LABEL[h.line]})`).join("; ") + "."}
                  {bad.length > 0 && <span className="block">A malefic here touches {pt.area}.</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-12 max-w-[86ch]">
        <H2 aside={school === "motion" ? "one line each, by motion" : "all three lines"}>Where the planets stand</H2>
        <ul className="grid gap-x-10 border-t border-line sm:grid-cols-2">
          {reading.throwers.map((th) => (
            <li key={th.planet} className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-[0.95rem]">
              <span>
                <span className="font-semibold">{name(th.planet)}</span> in {starName(th.star)}
                {th.retro && th.planet !== "Ra" && th.planet !== "Ke" ? " (R)" : ""}
              </span>
              <span className={`text-sm ${th.malefic ? "text-avoid" : "text-go"}`}>
                {th.malefic ? "malefic" : "benefic"}, {th.lines.map((l) => l).join(" + ")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-mute">
          Budhan turns malefic when it shares a sign with a malefic. The Moon counts as a malefic from Theipirai Ekadasi to Valarpirai Chaturthi, when it
          is thin, and as a benefic otherwise.
        </p>
      </section>

      <section className="mt-12 max-w-[74ch]">
        <H2>Settings for this board</H2>
        <div className="grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-mute">Which lines a planet throws</span>
            <select value={school} onChange={(e) => saveProfile({ ...profile, sbcSchool: e.target.value as SbcSchool })}>
              <option value="motion">One line, by its motion (classical)</option>
              <option value="all">All three lines, always</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-mute">First sound of your name</span>
            <select value={profile.nameSound ?? ""} onChange={(e) => saveProfile({ ...profile, nameSound: e.target.value || null })}>
              <option value="">From the spelling{guessed ? ` (${guessed})` : ""}</option>
              {NAME_SOUNDS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm text-mute">
          In the classical school a retrograde planet throws the hind diagonal, a planet moving faster than its average the fore diagonal, and one at
          ordinary speed the line straight across; the Sun and Moon always throw the fore diagonal and the nodes the hind one. The other school lets every
          planet throw all three at once, which pierces far more of the board. The front line strikes only the star at its far end; the diagonals strike
          every cell they cross. Sounds are taken from the Latin spelling, which cannot tell ta from ṭa or da from ḍa, so set yours here if it differs.
        </p>
      </section>
    </div>
  );
}
