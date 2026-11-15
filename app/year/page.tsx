"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RasiChart } from "@/components/RasiChart";
import { useStore } from "@/components/store";
import { H2, LineList, Loading, PageTitle } from "@/components/ui";
import { houseTopic, ordinal } from "@/lib/astro/chart";
import { NAKSHATRA, PLANET_INFO, PlanetId, RASI, signOf, tithiName, WEEKDAYS } from "@/lib/astro/constants";
import { runningDasha } from "@/lib/astro/dasha";
import { fmtDateLong, fmtTime, MS_DAY } from "@/lib/astro/time";
import { completedYears, tithiPravesha, tithiPraveshaAt, varshaphal } from "@/lib/astro/varsha";

const name = (p: PlanetId) => PLANET_INFO[p].ta;

export default function YearPage() {
  const { ready, now, natal, profile } = useStore();
  const [ahead, setAhead] = useState(0);
  const dayStamp = Math.floor(now.getTime() / MS_DAY);

  const data = useMemo(() => {
    if (!ready || !profile.timeConfirmed) return null;
    const at = new Date(dayStamp * MS_DAY + MS_DAY / 2);
    const kNow = completedYears(natal, at);
    const k = kNow + ahead;
    const solar = varshaphal(natal, k);
    const next = varshaphal(natal, k + 1);
    const lunarNow = tithiPraveshaAt(natal, at);
    const lunar = tithiPravesha(natal, lunarNow.k + ahead);
    const lunarNext = tithiPravesha(natal, lunarNow.k + ahead + 1);
    return { at, solar, next, lunar, lunarNext };
  }, [ready, natal, profile.timeConfirmed, dayStamp, ahead]);

  if (!ready) return <Loading />;
  if (!profile.timeConfirmed)
    return (
      <div>
        <PageTitle title="This year" tamil="ஆண்டு பலன்">
          The annual chart moves a pointer on from your birth lagna, so it needs your birth time.
        </PageTitle>
        <Link href="/setup" className="underline">
          Add your birth time in Setup
        </Link>
      </div>
    );
  if (!data) return <Loading />;

  const { at, solar, next, lunar, lunarNext } = data;
  const tz = profile.here.tz;
  const d = (x: Date) => fmtDateLong(x, tz);
  const dt = (x: Date) => `${fmtDateLong(x, tz)}, ${fmtTime(x, tz)}`;
  const running = at >= solar.start && at < solar.end;
  const daysLeft = Math.max(0, Math.round((solar.end.getTime() - at.getTime()) / MS_DAY));
  const daysTo = Math.max(0, Math.round((solar.start.getTime() - at.getTime()) / MS_DAY));
  const muddaNow = solar.mudda.find((m) => at >= m.start && at < m.end);
  const vim = runningDasha(natal.mahas, running ? at : solar.start);
  const goodLines = solar.lines.filter((l) => l.tone === "good").length;
  const badLines = solar.lines.filter((l) => l.tone === "bad").length;
  const lean = goodLines > badLines + 1 ? "A year that leans your way" : badLines > goodLines + 1 ? "A year that asks for care" : "A mixed year";
  const btn = (on: boolean) => `rounded px-3 py-1.5 text-[0.95rem] ${on ? "bg-deep text-paper" : "border border-line hover:bg-panel"}`;

  return (
    <div>
      <PageTitle title="This year" tamil="ஆண்டு பலன்">
        A one-year forecast laid over your birth chart. Your personal year turns over at your solar return, when the Sun comes back to its birth degree,
        and again by the lunar count when your birth tithi returns. Both are read here.
      </PageTitle>

      <div className="mb-6 flex flex-wrap gap-2">
        <button type="button" className={btn(ahead === 0)} onClick={() => setAhead(0)} aria-pressed={ahead === 0}>
          Year running now
        </button>
        <button type="button" className={btn(ahead === 1)} onClick={() => setAhead(1)} aria-pressed={ahead === 1}>
          Next year
        </button>
      </div>

      <section className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[1fr_1.2fr]">
        <div className="bg-deep p-6 text-paper sm:p-8">
          <p className="text-paper/70">Muntha, the year&rsquo;s pointer</p>
          <p className="verdict-word mt-2 text-6xl leading-none sm:text-7xl">{RASI[solar.muntha].ta}</p>
          <p className="tamil mt-2 text-xl text-paper/80">{RASI[solar.muntha].tamil}</p>
          <p className="mt-4 max-w-[46ch] text-[1.02rem] text-paper/90">
            Your {ordinal(solar.munthaHouseBirth)} house by birth: {houseTopic(solar.munthaHouseBirth)}. In the chart of the year it falls in the{" "}
            {ordinal(solar.munthaHouseYear)} house. Its lord is {name(solar.munthaLord)}.
          </p>
        </div>
        <div className="bg-paper p-6 sm:p-8">
          <p className="text-mute">
            Year {solar.age + 1} of your life (age {solar.age})
          </p>
          <p className="display mt-1 text-3xl">{lean}</p>
          <dl className="mt-4 grid grid-cols-[8.5rem_1fr] gap-x-4 gap-y-2 text-[0.98rem]">
            <dt className="text-mute">Solar year</dt>
            <dd className="tabular-nums">
              {dt(solar.start)} to {d(solar.end)}
              <span className="block text-mute">{running ? `${daysLeft} days left` : `begins in ${daysTo} days`}</span>
            </dd>
            <dt className="text-mute">Lunar year</dt>
            <dd className="tabular-nums">
              {dt(lunar.start)} to {d(lunar.end)}
            </dd>
            <dt className="text-mute">Year lagna</dt>
            <dd>
              {RASI[solar.chart.lagnaSign].ta}, cast for {profile.here.name}
            </dd>
            <dt className="text-mute">Likely year lord</dt>
            <dd>
              {name(solar.yearLord)} (solar), {name(lunar.yearLord)} (lunar)
            </dd>
            {vim && (
              <>
                <dt className="text-mute">Birth dasa</dt>
                <dd>
                  {name(vim.maha.lord)} dasa, {name(vim.bhukti.lord)} bhukti {running ? "now" : "as it opens"}
                </dd>
              </>
            )}
          </dl>
          <p className="mt-4 text-[0.95rem] text-mute">
            After this the muntha steps into {RASI[next.muntha].ta}, your {ordinal(next.munthaHouseBirth)} house ({houseTopic(next.munthaHouseBirth)}), on{" "}
            {d(next.start)}.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <H2 aside="Varshaphal, the solar year">What the solar year says</H2>
        <LineList lines={solar.lines} />
        <p className="mt-3 max-w-[74ch] text-sm text-mute">
          The annual chart never overrules the birth chart or the running dasa. It says which of their promises come to the front this year. A hard muntha
          in a year of good dasa gives effortful gains; an easy muntha in a hard dasa gives relief, not a windfall.
        </p>
      </section>

      <section className="mt-12">
        <H2 aside={`${RASI[solar.muntha].ta} is shaded`}>Birth chart and year chart</H2>
        <div className="grid gap-8 md:grid-cols-2">
          <RasiChart title="Birth" subtitle={d(natal.birth)} positions={natal.positions} lagnaSign={natal.lagnaSign} retro={natal.retro} highlightSign={solar.muntha} />
          <RasiChart title="Year" subtitle={`from ${d(solar.start)}`} positions={solar.chart.positions} lagnaSign={solar.chart.lagnaSign} retro={solar.chart.retro} highlightSign={solar.muntha} lagnaLabel="Year lagna" />
        </div>
      </section>

      <section className="mt-12 max-w-[86ch]">
        <H2 aside="who can speak for the year">The five office-bearers</H2>
        <ul className="border-t border-line">
          {solar.bearers.map((b) => (
            <li key={b.office} className={`grid gap-x-6 gap-y-1 border-b border-line py-3 sm:grid-cols-[15rem_1fr] ${b.planet === solar.yearLord ? "bg-panel px-3 -mx-3" : ""}`}>
              <span>
                <span className="font-semibold">{name(b.planet)}</span>
                {b.planet === solar.yearLord && <span className="ml-2 rounded-sm bg-deep px-1.5 py-0.5 text-[0.7rem] font-semibold text-paper">year lord</span>}
                <span className="block text-sm text-mute">{b.office}</span>
              </span>
              <span className="text-[0.95rem] text-mute">{b.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-mute">
          The year lord is the strongest of the five that can see the year lagna. Strength here is judged by sign dignity, nearness to exaltation and
          house; the full Tajika reckoning adds a table of degree-rulers (hadda) that this app does not carry, so read the result as the likely lord.
        </p>
      </section>

      <section className="mt-12 max-w-[86ch]">
        <H2 aside="the year's own dasa">Mudda dasa: which weeks belong to which planet</H2>
        <ol className="border-t border-line">
          {solar.mudda.map((m) => {
            const isNow = muddaNow === m;
            const past = m.end <= at;
            return (
              <li key={m.start.getTime()} className={`grid grid-cols-[6.5rem_1fr] gap-x-4 border-b border-line py-2.5 sm:grid-cols-[7.5rem_15rem_1fr] ${isNow ? "bg-panel px-3 -mx-3" : ""} ${past ? "text-mute" : ""}`}>
                <span className="font-semibold">
                  {name(m.lord)}
                  {isNow && <span className="ml-2 rounded-sm bg-deep px-1.5 py-0.5 text-[0.7rem] font-semibold text-paper">now</span>}
                </span>
                <span className="tabular-nums">
                  {d(m.start)} to {d(m.end)}
                </span>
                <span className="col-span-2 text-[0.9rem] text-mute sm:col-span-1">
                  In the {ordinal(solar.chart.house[m.lord])} house of the year chart: {houseTopic(solar.chart.house[m.lord])}.
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-14">
        <H2 aside="Tithi Pravesha, the lunar year">What the lunar year says</H2>
        <p className="mb-5 max-w-[74ch] text-[0.98rem] text-mute">
          Your lunar new year is the moment the Sun is back in {RASI[signOf(natal.positions.Su)].ta} and the Moon stands at the same angle from it as at
          your birth, so the tithi is {natal.tithi < 15 ? "Valarpirai" : "Theipirai"} {tithiName(natal.tithi)} at the same fraction. It fell on{" "}
          <strong className="text-ink">{WEEKDAYS[lunar.weekday]}, {dt(lunar.start)}</strong>, {Math.abs(lunar.offsetDays).toFixed(0)} days{" "}
          {lunar.offsetDays < 0 ? "before" : "after"} the solar return, with the Moon in {NAKSHATRA[lunar.star].ta}.
          {!lunar.sunInBirthSign && " In this year the birth angle does not recur while the Sun is in its birth sign, so the recurrence nearest the birthday is used."}
        </p>
        <div className="grid gap-8 lg:grid-cols-[1fr_26rem]">
          <LineList lines={lunar.lines} stacked />
          <RasiChart title="Lunar year" subtitle={`from ${d(lunar.start)}`} positions={lunar.chart.positions} lagnaSign={lunar.chart.lagnaSign} retro={lunar.chart.retro} lagnaLabel="Lagna" />
        </div>
        <p className="mt-4 max-w-[74ch] text-sm text-mute">
          The next lunar year opens on {WEEKDAYS[lunarNext.weekday]}, {dt(lunarNext.start)}, under {name(lunarNext.yearLord)}. Where the solar and lunar
          readings agree, take the point as firm; where they differ, the birth dasa on the{" "}
          <Link href="/dasa" className="underline">
            Dasa
          </Link>{" "}
          page decides.
        </p>
      </section>
    </div>
  );
}
