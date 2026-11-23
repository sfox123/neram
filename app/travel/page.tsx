"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore, useStored } from "@/components/store";
import { H2, LineList, Loading, PageTitle } from "@/components/ui";
import { Natal } from "@/lib/astro/chart";
import { NAKSHATRA, PLANET_INFO, PlanetId, PLANETS, RASI, WEEKDAYS } from "@/lib/astro/constants";
import { dayFrame, frameContaining } from "@/lib/astro/panchang";
import { addDaysKey, dateKey, fmtDate, fmtDateLong, MS_DAY, parseDateKey, zonedToUtc } from "@/lib/astro/time";
import {
  Direction,
  DIRECTION_LABEL,
  flightDay,
  flightDays,
  PromiseWord,
  Purpose,
  signNature,
  travelAt,
  TravelBaseline,
  travelBaseline,
  TravelFactor,
  TravelLevel,
  TravelPromise,
  travelPromise,
  travelTrip,
  travelWindows,
} from "@/lib/astro/travel";
import { activation } from "@/lib/astro/yogas";

const WORD_TIER: Record<PromiseWord, string> = { Strong: "tier-go", Good: "tier-good", Moderate: "tier-steady", Low: "tier-hold" };
const LEVEL_WORD: Record<TravelLevel, string> = { high: "High", raised: "Raised", ordinary: "Ordinary" };
const LEVEL_CLASS: Record<TravelLevel, string> = { high: "tier-go", raised: "tier-good", ordinary: "bg-ink/10 text-ink" };
const PURPOSE_LABEL: Record<Purpose, string> = { work: "Work trips and postings", leisure: "Short trips and sightseeing", stay: "A longer stay abroad" };
const PURPOSE_SHORT: Record<Purpose, string> = { work: "work", leisure: "leisure", stay: "longer stay" };
const DIRECTIONS: Direction[] = ["north", "east", "south", "west"];

function LevelTag({ level }: { level: TravelLevel }) {
  return <span className={`${LEVEL_CLASS[level]} inline-block rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none`}>{LEVEL_WORD[level]}</span>;
}

const LAYER_LABEL: Record<TravelFactor["layer"], string> = {
  period: "The dasa, down to sookshma",
  year: "The annual chart",
  slow: "Slow planets: Rahu, Ketu, Guru, Sani",
  fast: "Fast planets: this month and this week",
};

interface SavedTrip {
  from: string;
  to: string;
  /** Departure time on the first day, HH:MM, or "" for midday. */
  time: string;
  direction: Direction | "any";
}

const sameTrip = (a: SavedTrip, b: SavedTrip) => a.from === b.from && a.to === b.to && a.time === b.time && a.direction === b.direction;

function atKey(key: string, time: string, tz: string): Date {
  const { y, m, d } = parseDateKey(key);
  const [hh, mm] = (time || "12:00").split(":").map(Number);
  return zonedToUtc(y, m, d, hh || 0, mm || 0, tz);
}

function readTrip(natal: Natal, promise: TravelPromise, base: TravelBaseline, trip: SavedTrip) {
  const tz = natal.profile.here.tz;
  let start = atKey(trip.from, trip.time, tz);
  let end = atKey(trip.to, "12:00", tz);
  if (end < start) [start, end] = [end, start];
  const check = travelTrip(natal, promise, base, start, end);
  const dir = trip.direction === "any" ? null : trip.direction;
  const leave = trip.time ? flightDay(natal, frameContaining(start, natal.profile.here), dir, start) : flightDay(natal, dayFrame(trip.from, natal.profile.here), dir);
  return { check, leave };
}

function TripChecker({ natal, promise, base, todayKey }: { natal: Natal; promise: TravelPromise; base: TravelBaseline; todayKey: string }) {
  const tz = natal.profile.here.tz;
  const [trips, setTrips] = useStored<SavedTrip[]>("neram.travel.trips", []);
  const [draft, setDraft] = useState<SavedTrip>(() => ({ from: todayKey, to: addDaysKey(todayKey, 6), time: "", direction: "any" }));
  const [shown, setShown] = useState<SavedTrip | null>(null);
  const result = useMemo(() => (shown ? readTrip(natal, promise, base, shown) : null), [shown, natal, promise, base]);
  const saved = useMemo(() => trips.map((t) => ({ trip: t, check: travelTrip(natal, promise, base, atKey(t.from, t.time, tz), atKey(t.to, "12:00", tz)) })), [trips, natal, promise, base, tz]);
  const d = (x: Date) => fmtDateLong(x, tz);
  const name = (p: PlanetId) => PLANET_INFO[p].ta;
  const isSaved = shown ? trips.some((t) => sameTrip(t, shown)) : false;

  return (
    <div>
      <form
        className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_8rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.from && draft.to) setShown({ ...draft });
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm text-mute">Leaving on</span>
          <input type="date" value={draft.from} onChange={(e) => e.target.value && setDraft({ ...draft, from: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-mute">Back on</span>
          <input type="date" value={draft.to} onChange={(e) => e.target.value && setDraft({ ...draft, to: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-mute">Departure time</span>
          <input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
        </label>
        <button type="submit" className="rounded border border-deep bg-deep px-5 py-2 text-paper hover:opacity-90">
          Read these dates
        </button>
        <div className="flex flex-wrap items-center gap-1.5 sm:col-span-4" role="group" aria-label="Direction of the first leg">
          <span className="mr-2 text-sm text-mute">First leg heads</span>
          {(["any", ...DIRECTIONS] as (Direction | "any")[]).map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setDraft({ ...draft, direction: x })}
              aria-pressed={draft.direction === x}
              className={`rounded border px-3 py-1 text-[0.95rem] ${draft.direction === x ? "border-deep bg-deep text-paper" : "border-line bg-paper text-ink hover:border-peacock"}`}
            >
              {x === "any" ? "Any" : DIRECTION_LABEL[x]}
            </button>
          ))}
        </div>
      </form>

      {result && shown && (
        <div className="mt-8 border-t border-line pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <p className="display text-2xl">
              {d(result.check.start)} to {d(result.check.end)}
            </p>
            <button
              type="button"
              disabled={isSaved}
              onClick={() => setTrips([...trips, shown].sort((a, b) => a.from.localeCompare(b.from)))}
              className="rounded border border-line px-3 py-1.5 text-[0.95rem] enabled:hover:border-peacock disabled:text-mute"
            >
              {isSaved ? "Saved in your trips" : "Save to your trips"}
            </button>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.98rem]">
            <LevelTag level={result.check.level} />
            <span>
              {result.check.levelDays === result.check.days.length ? "on every day" : `on ${result.check.levelDays} of ${result.check.days.length} days`}. The average day ranks above{" "}
              <strong>{result.check.rank}%</strong> of your adult life.
            </span>
          </p>
          <p className="mt-2 max-w-[72ch] text-[0.95rem] text-mute">
            {result.check.level === "high"
              ? "A travel planet's period and travel transits run together over these dates: the chart's own timing points to a journey here."
              : result.check.level === "raised"
                ? "Either the periods or the transits lean to travel, not both at full strength. A trip here is supported, but it rests more on outside reasons."
                : "The tradition's signs are thin over these dates. A trip here comes from outside need more than from the chart's timing."}
          </p>

          <div className="mt-6 grid gap-x-12 gap-y-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="font-semibold">The planets carrying it</p>
              <ul className="mt-3 space-y-3">
                {result.check.drivers.slice(0, 5).map((x) => (
                  <li key={x.planet}>
                    <span className="flex items-baseline justify-between gap-4">
                      <span className="font-semibold">{name(x.planet)}</span>
                      <span className="text-sm tabular-nums text-mute">{x.share}%</span>
                    </span>
                    <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-sm bg-ink/10" role="img" aria-label={`${name(x.planet)}: ${x.share}% of the score`}>
                      <span className="block h-full bg-peacock" style={{ width: `${x.share}%` }} />
                    </span>
                    <span className="mt-1 block text-sm text-mute">{x.texts[0]}.</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-5 text-[0.95rem]">
              {result.check.run && (
                <div>
                  <p className="font-semibold">Periods running</p>
                  <ul className="mt-2 space-y-0.5 tabular-nums">
                    {(["maha", "bhukti", "antaram", "sookshma"] as const).map((k) => (
                      <li key={k}>
                        <span className="inline-block w-20 text-mute">{k === "maha" ? "dasa" : k}</span>
                        <span className="font-semibold">{name(result.check.run![k].lord)}</span>{" "}
                        <span className="text-mute">
                          {d(result.check.run![k].start)} to {d(result.check.run![k].end)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.check.year && (
                <div>
                  <p className="font-semibold">Annual chart, age {result.check.year.age}</p>
                  <p className="mt-1 text-mute">
                    Muntha in {RASI[result.check.year.muntha].ta}, your {result.check.year.munthaHouse}
                    {["th", "st", "nd", "rd"][result.check.year.munthaHouse % 10 < 4 && Math.floor(result.check.year.munthaHouse / 10) !== 1 ? result.check.year.munthaHouse % 10 : 0]} house. Lord of the year{" "}
                    {name(result.check.year.yearLord)}.
                    {result.check.year.mudda && (
                      <>
                        {" "}
                        Mudda period of {name(result.check.year.mudda.lord)}, {d(result.check.year.mudda.start)} to {d(result.check.year.mudda.end)}.
                      </>
                    )}
                  </p>
                </div>
              )}
              {result.check.chara && (
                <div>
                  <p className="font-semibold">Jaimini chara dasa</p>
                  <p className="mt-1 text-mute">
                    {RASI[result.check.chara.sign].ta} (your {result.check.chara.house}
                    {result.check.chara.house === 1 ? "st" : result.check.chara.house === 2 ? "nd" : result.check.chara.house === 3 ? "rd" : "th"} house), {signNature(result.check.chara.sign)}, until{" "}
                    {d(result.check.chara.end)}; sub-period {RASI[result.check.chara.sub].ta}, {signNature(result.check.chara.sub)}.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-x-12 gap-y-6 lg:grid-cols-2">
            {(["period", "year", "slow", "fast"] as TravelFactor["layer"][]).map((layer) => {
              const fs = result.check.factors.filter((f) => f.layer === layer);
              return (
                <div key={layer}>
                  <p className="font-semibold">{LAYER_LABEL[layer]}</p>
                  <ul className="mt-2 space-y-1.5 text-[0.95rem]">
                    {fs.map((f) => (
                      <li key={f.text} className="border-l-2 border-peacock pl-3">
                        {f.text}
                        {f.cover < 0.98 && <span className="text-mute"> (on {Math.round(f.cover * 100)}% of the days)</span>}.
                      </li>
                    ))}
                    {fs.length === 0 && <li className="text-mute">Nothing in this layer points to travel.</li>}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <p className="font-semibold">
              Setting out: {WEEKDAYS[result.leave.frame.weekday]}
              {shown.time ? ` at ${shown.time}` : ""}
              <span className={`ml-3 font-semibold ${result.leave.tone === "good" ? "text-go" : result.leave.tone === "bad" ? "text-avoid" : "text-mute"}`}>{result.leave.score} of 100</span>
            </p>
            <p className="mt-1 text-sm text-mute">
              Moon in {NAKSHATRA[result.leave.star].ta}
              {shown.time ? " at the hour of leaving" : " at midday (add a departure time to read the actual hour)"}. The Tamil day runs from sunrise to sunrise, so a flight before
              dawn counts as the day before.
            </p>
            <ul className="mt-2 space-y-1.5 text-[0.95rem]">
              {result.leave.good.map((g) => (
                <li key={g} className="border-l-2 border-go pl-3">
                  {g}.
                </li>
              ))}
              {result.leave.bad.map((g) => (
                <li key={g} className="border-l-2 border-avoid pl-3">
                  {g}.
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {saved.length > 0 && (
        <div className="mt-10">
          <p className="font-semibold">Your trips</p>
          <p className="mt-1 max-w-[72ch] text-sm text-mute">
            Kept in this browser only. Add past trips too: if most of them read raised or high, the windows above deserve your trust; if they read
            ordinary, trust them less.
          </p>
          <ul className="mt-3 border-t border-line text-[0.95rem]">
            {saved.map(({ trip, check }) => (
              <li key={`${trip.from}${trip.to}${trip.time}${trip.direction}`} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line py-2.5">
                <button type="button" onClick={() => { setDraft(trip); setShown(trip); }} className="text-left tabular-nums hover:text-peacock">
                  {d(check.start)} to {d(check.end)}
                </button>
                <span className="flex flex-wrap items-center gap-3 text-sm">
                  <LevelTag level={check.level} />
                  <span className="text-mute">above {check.rank}% of your life</span>
                  <span className="text-mute">{check.drivers.slice(0, 2).map((x) => name(x.planet)).join(", ")}</span>
                  <button type="button" onClick={() => setTrips(trips.filter((t) => !sameTrip(t, trip)))} className="text-mute underline hover:text-avoid" aria-label="Remove this trip">
                    remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TravelPage() {
  const { ready, now, natal, profile } = useStore();
  const [direction, setDirection] = useStored<Direction | "any">("neram.travel.direction", "any");
  const [picked, setPicked] = useState<string | null>(null);
  const dayStamp = Math.floor(now.getTime() / MS_DAY);
  const todayKey = ready ? dateKey(now, profile.here.tz) : null;

  const data = useMemo(() => {
    if (!ready || !profile.timeConfirmed) return null;
    const at = new Date(dayStamp * MS_DAY);
    const promise = travelPromise(natal);
    const base = travelBaseline(natal, promise);
    const ahead = travelWindows(natal, promise, base, at, 3);
    const adult = new Date(natal.birth.getTime() + 18 * 365.25 * MS_DAY);
    const yearsBack = Math.max(0, (at.getTime() - adult.getTime()) / (365.25 * MS_DAY));
    const past = yearsBack > 0.5 ? travelWindows(natal, promise, base, adult, yearsBack, 7).windows.filter((w) => w.level === "high" && w.end < at) : [];
    // One cell per month for the next three years: the highest level reached in it.
    const months: { key: string; label: string; year: number; level: TravelLevel }[] = [];
    const rank: Record<TravelLevel, number> = { ordinary: 0, raised: 1, high: 2 };
    for (const m of ahead.samples) {
      const k = dateKey(m.t, profile.here.tz).slice(0, 7);
      const last = months[months.length - 1];
      if (last && last.key === k) {
        if (rank[m.level] > rank[last.level]) last.level = m.level;
      } else months.push({ key: k, label: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: profile.here.tz }).format(m.t), year: Number(k.slice(0, 4)), level: m.level });
    }
    const carriers = PLANETS.filter((p) => promise.planets[p].weight >= 2.5)
      .sort((a, b) => promise.planets[b].weight - promise.planets[a].weight)
      .map((p) => ({ planet: p, info: promise.planets[p], act: activation(natal, [p], at) }));
    return { promise, base, ahead, past, months: months.slice(0, 36), carriers };
  }, [ready, natal, profile.timeConfirmed, profile.here.tz, dayStamp]);

  const days = useMemo(() => {
    if (!todayKey) return [];
    return flightDays(natal, profile.here, todayKey, 45, direction === "any" ? null : direction);
  }, [todayKey, natal, profile.here, direction]);

  if (!ready) return <Loading />;
  if (!profile.timeConfirmed)
    return (
      <div>
        <PageTitle title="Travel abroad" tamil="வெளிநாடு">
          The houses of foreign travel are counted from the lagna, which needs your birth time.
        </PageTitle>
        <Link href="/setup" className="underline">
          Add your birth time in Setup
        </Link>
      </div>
    );
  if (!data || !days.length) return <Loading />;

  const tz = profile.here.tz;
  const d = (x: Date) => fmtDateLong(x, tz);
  const name = (p: PlanetId) => PLANET_INFO[p].ta;
  const dm = (x: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: tz }).format(x);
  const { promise, base, ahead, past, months, carriers } = data;
  const current = travelAt(natal, promise, now, base);
  const upcoming = ahead.windows.filter((w) => w.level !== "ordinary");
  const nextHigh = ahead.windows.find((w) => w.level === "high" && w.end > now);
  const sel = days.find((x) => x.frame.dateKey === picked) ?? [...days].sort((a, b) => b.score - a.score)[0];
  const best = [...days].sort((a, b) => b.score - a.score).slice(0, 6).sort((a, b) => a.frame.sunrise.getTime() - b.frame.sunrise.getTime());
  const purposeOrder = (Object.keys(promise.purposes) as Purpose[]).sort((a, b) => promise.purposes[b] - promise.purposes[a]);

  return (
    <div>
      <PageTitle title="Travel abroad" tamil="வெளிநாடு">
        Whether your chart points abroad, for what, and when the signs gather. The windows below mark stretches when a foreign trip is more likely by the
        tradition&rsquo;s rules. They are not flight dates: a trip still needs a reason, a visa and a ticket.
      </PageTitle>

      <section className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[1fr_1.25fr]">
        <div className={`${WORD_TIER[promise.word]} p-6 sm:p-8`}>
          <p className="opacity-85">The promise in your birth chart</p>
          <p className="verdict-word mt-2 text-6xl leading-none sm:text-7xl">{promise.word}</p>
          <p className="mt-4 max-w-[42ch] text-[1.02rem] opacity-90">{promise.summary}</p>
        </div>
        <div className="bg-paper p-6 sm:p-8">
          <p className="text-mute">What kind of travel</p>
          <ul className="mt-4 space-y-4">
            {purposeOrder.map((k) => (
              <li key={k}>
                <span className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold">{PURPOSE_LABEL[k]}</span>
                  <span className="text-sm text-mute">{promise.purposes[k] >= 65 ? "strong" : promise.purposes[k] >= 40 ? "present" : "light"}</span>
                </span>
                <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-sm bg-ink/10" role="img" aria-label={`${PURPOSE_LABEL[k]}: ${promise.purposes[k]} of 100`}>
                  <span className="block h-full bg-peacock" style={{ width: `${promise.purposes[k]}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <H2 aside={<LevelTag level={current.level} />}>Right now</H2>
        <div className="grid gap-x-12 gap-y-4 lg:grid-cols-[1fr_20rem]">
          <ul className="space-y-1.5 text-[0.98rem]">
            {current.reasons.map((r) => (
              <li key={r} className="border-l-2 border-peacock pl-3">
                {r}.
              </li>
            ))}
            {current.reasons.length === 0 && <li className="text-mute">No travel planet holds a period and no slow planet touches your 9th or 12th: a stay-at-home stretch.</li>}
          </ul>
          <p className="text-[0.95rem] text-mute">
            {current.level === "high"
              ? "A supportive period and supportive transits are running together. If a trip is on the table, this is a stretch to push it."
              : current.level === "raised"
                ? "Either the period or the transits favour travel, but not both at full strength. Good for applications, visas and planning."
                : "Nothing much points abroad at the moment. Use the time to prepare for the next window."}
            {nextHigh && nextHigh.start > now && (
              <>
                {" "}
                The next high window opens on <strong className="text-ink">{d(nextHigh.start)}</strong>.
              </>
            )}
          </p>
        </div>
      </section>

      <section className="mt-12">
        <H2 aside="highest level reached in each month">The next three years</H2>
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[44rem] grid-flow-col gap-[3px]" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
            {months.map((m, i) => (
              <div key={m.key}>
                <div className={`${LEVEL_CLASS[m.level]} ${m.level === "high" ? "h-14" : m.level === "raised" ? "h-9" : "h-4"} mt-auto rounded-[2px]`} style={{ marginTop: m.level === "high" ? 0 : m.level === "raised" ? "1.25rem" : "2.5rem" }} title={`${m.label} ${m.year}: ${LEVEL_WORD[m.level]}`} />
                <p className="mt-1 text-center text-[0.68rem] leading-tight text-mute">
                  {m.label.slice(0, 1)}
                  {(i === 0 || m.label === "Jan") && <span className="block font-semibold text-ink">{m.year}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-6 text-sm text-mute">The next 90 days, two days to a cell</p>
        <div className="mt-2 flex h-10 items-end gap-[2px]" role="img" aria-label="Travel level for each two-day step of the next 90 days">
          {ahead.samples.slice(0, 46).map((m) => (
            <div
              key={m.t.getTime()}
              className={`${LEVEL_CLASS[m.level]} min-w-0 flex-1 rounded-[1px]`}
              style={{ height: m.level === "high" ? "100%" : m.level === "raised" ? "62%" : "25%" }}
              title={`${dm(m.t)}: ${LEVEL_WORD[m.level]}`}
            />
          ))}
        </div>
        <div className="mt-1 flex gap-[2px] text-[0.68rem] text-mute">
          {ahead.samples.slice(0, 46).map((m, i) => {
            const k = dateKey(m.t, tz);
            const first = i === 0 || dateKey(ahead.samples[i - 1].t, tz).slice(0, 7) !== k.slice(0, 7);
            return (
              <span key={m.t.getTime()} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
                {first ? dm(m.t) : ""}
              </span>
            );
          })}
        </div>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-mute">
          {(["high", "raised", "ordinary"] as TravelLevel[]).map((l) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span className={`${LEVEL_CLASS[l]} inline-block h-3 w-3 rounded-[2px]`} />
              {LEVEL_WORD[l]}
            </span>
          ))}
        </p>

        <ol className="mt-6 border-t border-line">
          {upcoming.map((w) => (
            <li key={w.start.getTime()} className="grid gap-x-8 gap-y-2 border-b border-line py-4 lg:grid-cols-[17rem_1fr]">
              <div>
                <p className="font-semibold tabular-nums">
                  {w.start <= now ? "Now" : d(w.start)} to {d(w.end)}
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                  <LevelTag level={w.level} />
                  {w.purposes.length > 0 && <span className="text-mute">leans to {w.purposes.map((p) => PURPOSE_SHORT[p]).join(", ")}</span>}
                </p>
                {w.level === "high" && (w.peakStart.getTime() > w.start.getTime() + 6 * MS_DAY || w.peakEnd.getTime() < w.end.getTime() - 6 * MS_DAY) && (
                  <p className="mt-1.5 text-sm">
                    Thickest: <span className="font-semibold text-go">{d(w.peakStart)} to {d(w.peakEnd)}</span>
                  </p>
                )}
              </div>
              <p className="max-w-[72ch] text-[0.95rem] text-mute">{w.reasons.join(". ")}.</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 max-w-[72ch] text-sm text-mute">
          Levels are ranked against your own adult life, since a chart with a strong promise would otherwise read high all the time: the top sixth of
          your years counts as high, the next quarter as raised. High also needs a travel planet&rsquo;s period and a transit over the 9th, 12th or lagna
          at once.
        </p>
      </section>

      <section className="mt-12">
        <H2 aside="any dates, past or planned">Check a trip</H2>
        <p className="mb-5 max-w-[72ch] text-[0.98rem] text-mute">
          Enter the dates of a trip you have taken or booked. The reading shows which periods and transits were running, which planets carried
          them, and how those days rank against the rest of your adult life.
        </p>
        <TripChecker natal={natal} promise={promise} base={base} todayKey={todayKey!} />
      </section>

      {past.length > 0 && (
        <section className="mt-12">
          <H2 aside="a test you can run yourself">Looking back</H2>
          <p className="max-w-[72ch] text-[0.98rem]">
            The same rules marked these stretches of your adult life as high. If your foreign trips, or the offers and applications that led to them,
            fell in or near these, the windows ahead deserve more weight. If they did not, trust them less.
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[0.95rem] tabular-nums">
            {past.map((w) => (
              <li key={w.start.getTime()} className="border-l-2 border-go pl-3">
                {d(w.start)} to {d(w.end)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14">
        <H2 aside="houses 12, 9, 7, 3 and Rahu">What in your chart points abroad</H2>
        <LineList lines={promise.lines} />
      </section>

      <section className="mt-14">
        <H2 aside="their periods carry the trips">Your travel planets</H2>
        <ul className="border-t border-line">
          {carriers.map(({ planet, info, act }) => {
            const next = act.upcoming.slice(0, 2);
            return (
              <li key={planet} className="grid gap-x-8 gap-y-1 border-b border-line py-4 lg:grid-cols-[17rem_1fr]">
                <div>
                  <p className="font-semibold">{name(planet)}</p>
                  <p className="text-sm text-mute">{info.purposes.length ? `leans to ${info.purposes.map((p) => PURPOSE_SHORT[p]).join(", ")}` : "general"}</p>
                </div>
                <div className="text-[0.95rem]">
                  <p className="text-mute">{info.reasons.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(". ")}.</p>
                  <ul className="mt-1.5 space-y-0.5 tabular-nums">
                    {act.runningNow.map((r) => (
                      <li key={r.level + r.period.start.getTime()}>
                        <span className="font-semibold text-go">Now:</span> {r.level} until {d(r.period.end)}
                      </li>
                    ))}
                    {next.map((u) => (
                      <li key={u.level + u.period.start.getTime()}>
                        {name(u.period.lord)} {u.level}
                        {u.level !== "dasa" && <span className="text-mute"> in {name(u.within)}</span>}: {d(u.period.start)} to {d(u.period.end)}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-14">
        <H2 aside="next 45 days">Days to set out</H2>
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.95rem]">
          <span className="text-mute">Heading from {profile.here.name}:</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Direction of travel">
            {(["any", ...DIRECTIONS] as (Direction | "any")[]).map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setDirection(x)}
                aria-pressed={direction === x}
                className={`rounded border px-3 py-1.5 ${direction === x ? "border-deep bg-deep text-paper" : "border-line bg-paper text-ink hover:border-peacock"}`}
              >
                {x === "any" ? "Any direction" : DIRECTION_LABEL[x]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex h-28 items-end gap-[3px]" role="group" aria-label="Departure score for each of the next 45 days">
          {days.map((x) => {
            const active = x === sel;
            return (
              <button
                key={x.frame.dateKey}
                type="button"
                onClick={() => setPicked(x.frame.dateKey)}
                aria-pressed={active}
                aria-label={`${fmtDate(x.frame.sunrise, tz)}: ${x.score}`}
                title={`${fmtDate(x.frame.sunrise, tz)}: ${x.score}`}
                className={`min-w-0 flex-1 rounded-t-[2px] ${x.tone === "good" ? "tier-go" : x.tone === "bad" ? "tier-avoid bar-avoid" : "tier-steady"} ${active ? "outline outline-2 outline-offset-1 outline-deep" : "opacity-85 hover:opacity-100"}`}
                style={{ height: `${Math.max(8, x.score)}%` }}
              />
            );
          })}
        </div>
        <div className="mt-5 grid gap-x-12 gap-y-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="display text-2xl">
              {WEEKDAYS[sel.frame.weekday]}, {dm(sel.frame.sunrise)}
              <span className={`ml-3 align-middle font-sans text-base font-semibold ${sel.tone === "good" ? "text-go" : sel.tone === "bad" ? "text-avoid" : "text-mute"}`}>{sel.score} of 100</span>
            </p>
            <p className="mt-1 text-sm text-mute">
              Star {NAKSHATRA[sel.star].ta}. Soolai on a {WEEKDAYS[sel.frame.weekday]}: avoid setting out towards the {DIRECTION_LABEL[sel.soolai].toLowerCase()}.
            </p>
            <ul className="mt-3 space-y-1.5 text-[0.95rem]">
              {sel.good.map((g) => (
                <li key={g} className="border-l-2 border-go pl-3">
                  {g}.
                </li>
              ))}
              {sel.bad.map((g) => (
                <li key={g} className="border-l-2 border-avoid pl-3">
                  {g}.
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold">Best days in this stretch</p>
            <ul className="mt-2 border-t border-line text-[0.95rem]">
              {best.map((x) => (
                <li key={x.frame.dateKey} className="border-b border-line">
                  <button type="button" onClick={() => setPicked(x.frame.dateKey)} className="flex w-full items-baseline justify-between gap-4 py-2 text-left hover:text-peacock">
                    <span>
                      {WEEKDAYS[x.frame.weekday].slice(0, 3)} {dm(x.frame.sunrise)} <span className="text-mute">{NAKSHATRA[x.star].ta}</span>
                    </span>
                    <span className="font-semibold tabular-nums text-go">{x.score}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-mute">
              For the hour of leaving the house on the chosen day, use{" "}
              <Link href="/find" className="underline">
                Find a time
              </Link>{" "}
              with Travel selected.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 max-w-[72ch] space-y-3 text-[0.95rem] text-mute">
        <H2>How to read this page</H2>
        <p>
          The promise is read from the 12th house (foreign lands), the 9th (long journeys), the 3rd (short trips), the 7th (business and partners),
          Rahu, the movable (sara) signs, the water signs (neer rasi) and air signs (kaatru rasi), and the ties of your lagna and 10th lords to these. A
          planet also carries the results of the lord of the star it sits in, so a planet in one of Rahu&rsquo;s stars brings foreign contact in its
          own periods.
        </p>
        <p>
          The timing has four layers. The dasa, down to the sookshma, which runs for days to weeks. The annual chart: the muntha&rsquo;s house, the
          lord of the year and the mudda period. The slow transits of Rahu, Guru and Sani over your 9th, 12th and lagna, over the 12th from your Moon in{" "}
          {RASI[natal.moonSign].ta}, and over the 9th and 12th lords. And the fast transits: the Sun and the moving 9th and 12th lords, which pick the
          weeks inside a longer window. The sookshma moves by a few days for every minute of error in the birth time, so read week-level dates loosely
          unless your birth time is exact.
        </p>
        <p>
          The rules were written long before air travel, when going abroad was rare and long. Today a short work trip can happen in any month, so
          treat a window as a time when pushing for a trip meets less resistance, and when larger moves (a posting, study, a long stay) are more likely
          to be offered.
        </p>
      </section>
    </div>
  );
}
