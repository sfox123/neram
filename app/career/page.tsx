"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/components/store";
import { H2, LineList, Loading, PageTitle } from "@/components/ui";
import { careerAt, careerBaseline, CareerLean, careerPromise, careerWindows, CareerWord, LEAN_LABEL } from "@/lib/astro/career";
import { PLANET_INFO, PlanetId, PLANETS } from "@/lib/astro/constants";
import { dateKey, fmtDateLong, MS_DAY } from "@/lib/astro/time";
import { TravelLevel } from "@/lib/astro/travel";
import { activation } from "@/lib/astro/yogas";

const WORD_TIER: Record<CareerWord, string> = { Strong: "tier-go", Good: "tier-good", Moderate: "tier-steady", Uneven: "tier-hold" };
const LEVEL_WORD: Record<TravelLevel, string> = { high: "High", raised: "Raised", ordinary: "Ordinary" };
const LEVEL_CLASS: Record<TravelLevel, string> = { high: "tier-go", raised: "tier-good", ordinary: "bg-ink/10 text-ink" };

function LevelTag({ level }: { level: TravelLevel }) {
  return <span className={`${LEVEL_CLASS[level]} inline-block rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none`}>{LEVEL_WORD[level]}</span>;
}

const leanText = (leans: CareerLean[]) => (leans.length ? `leans to ${leans.map((l) => LEAN_LABEL[l]).join(", ")}` : "");

export default function CareerPage() {
  const { ready, now, natal, profile } = useStore();
  const dayStamp = Math.floor(now.getTime() / MS_DAY);

  const data = useMemo(() => {
    if (!ready || !profile.timeConfirmed) return null;
    const at = new Date(dayStamp * MS_DAY);
    const promise = careerPromise(natal);
    const base = careerBaseline(natal, promise);
    const ahead = careerWindows(natal, promise, base, at, 4);
    const from21 = new Date(natal.birth.getTime() + 21 * 365.25 * MS_DAY);
    const yearsBack = Math.max(0, (at.getTime() - from21.getTime()) / (365.25 * MS_DAY));
    const past = yearsBack > 0.5 ? careerWindows(natal, promise, base, from21, yearsBack, 7).windows.filter((w) => w.level === "high" && w.end < at) : [];
    // One cell per month. A level must hold for about ten days of the month to count, to match the smoothed list below.
    const tally = new Map<string, { label: string; year: number; high: number; raised: number; top: boolean }>();
    for (const m of ahead.samples) {
      const k = dateKey(m.t, profile.here.tz).slice(0, 7);
      const c = tally.get(k) ?? { label: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: profile.here.tz }).format(m.t), year: Number(k.slice(0, 4)), high: 0, raised: 0, top: false };
      if (m.level === "high") c.high++;
      if (m.level === "raised") c.raised++;
      if (m.level === "high" && m.total >= base.top) c.top = true;
      tally.set(k, c);
    }
    const months = [...tally.entries()].map(([key, c]) => {
      const level: TravelLevel = c.high >= 4 ? "high" : c.high + c.raised >= 4 ? "raised" : "ordinary";
      return { key, label: c.label, year: c.year, level, top: c.top && level === "high" };
    });
    const carriers = PLANETS.filter((p) => promise.planets[p].weight >= 2)
      .sort((a, b) => promise.planets[b].weight - promise.planets[a].weight)
      .map((p) => ({ planet: p, info: promise.planets[p], act: activation(natal, [p], at) }));
    return { promise, base, ahead, past, months: months.slice(0, 48), carriers };
  }, [ready, natal, profile.timeConfirmed, profile.here.tz, dayStamp]);

  if (!ready) return <Loading />;
  if (!profile.timeConfirmed)
    return (
      <div>
        <PageTitle title="Career" tamil="தொழில்">
          The 10th house is counted from the lagna, which needs your birth time.
        </PageTitle>
        <Link href="/setup" className="underline">
          Add your birth time in Setup
        </Link>
      </div>
    );
  if (!data) return <Loading />;

  const tz = profile.here.tz;
  const d = (x: Date) => fmtDateLong(x, tz);
  const name = (p: PlanetId) => PLANET_INFO[p].ta;
  const { promise, base, ahead, past, months, carriers } = data;
  const current = careerAt(natal, promise, now, base);
  const upcoming = ahead.windows.filter((w) => w.level !== "ordinary");
  const nextHigh = ahead.windows.find((w) => w.level === "high" && w.end > now);
  const strongest = ahead.windows.flatMap((w) => w.strongest).filter((x) => x.end > now);
  const venture = 100 - promise.job;

  return (
    <div>
      <PageTitle title="Career" tamil="தொழில்">
        What your chart promises for work and standing, whether employment or your own venture suits it, the kind of work it points to, and when
        things are likely to move. A window marks a stretch when offers, promotions and changes come more easily by the tradition&rsquo;s rules; what
        it is worth still depends on what you have prepared.
      </PageTitle>

      <section className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[1fr_1.25fr]">
        <div className={`${WORD_TIER[promise.word]} p-6 sm:p-8`}>
          <p className="opacity-85">The promise in your birth chart</p>
          <p className="verdict-word mt-2 text-6xl leading-none sm:text-7xl">{promise.word}</p>
          <p className="mt-4 max-w-[42ch] text-[1.02rem] opacity-90">{promise.summary}</p>
        </div>
        <div className="bg-paper p-6 sm:p-8">
          <p className="flex items-baseline justify-between gap-4">
            <span className="font-semibold">Employment</span>
            <span className="font-semibold">Own venture</span>
          </p>
          <span className="mt-1.5 flex h-2 w-full overflow-hidden rounded-sm bg-ink/10" role="img" aria-label={`Leans ${promise.job} to employment, ${venture} to own venture`}>
            <span className="block h-full bg-deep" style={{ width: `${promise.job}%` }} />
            <span className="block h-full bg-peacock/45" style={{ width: `${venture}%` }} />
          </span>
          <p className="mt-3 text-[0.95rem] text-mute">{promise.styleText}</p>
        </div>
      </section>

      <section className="mt-12">
        <H2 aside="strongest signature first">Work the chart points to</H2>
        <ul className="border-t border-line">
          {promise.fields.map((f, i) => (
            <li key={f.planet} className="grid gap-x-8 gap-y-1 border-b border-line py-3.5 lg:grid-cols-[17rem_1fr]">
              <p>
                <span className="font-semibold">{name(f.planet)}</span>
                <span className="block text-sm text-mute">{f.why}</span>
              </p>
              <p className={`max-w-[68ch] text-[0.98rem] ${i === 0 ? "" : "text-mute"}`}>{f.field.charAt(0).toUpperCase() + f.field.slice(1)}.</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-[72ch] text-sm text-mute">
          Read these as flavours that combine, not as a list to choose from: the first sets the tone and the others add to it. The dasamsa reading,
          including the open question about your dasamsa lagna, is on{" "}
          <Link href="/vargas" className="underline">
            Navamsa, Dasamsa
          </Link>
          .
        </p>
      </section>

      <section className="mt-12">
        <H2 aside={<LevelTag level={current.level} />}>Right now</H2>
        <div className="grid gap-x-12 gap-y-4 lg:grid-cols-[1fr_22rem]">
          <ul className="space-y-1.5 text-[0.98rem]">
            {current.reasons.map((r) => (
              <li key={r} className="border-l-2 border-peacock pl-3">
                {r}.
              </li>
            ))}
            {current.reasons.length === 0 && <li className="text-mute">No career planet holds a period and no slow planet touches your 10th: a stretch for steady work.</li>}
          </ul>
          <p className="text-[0.95rem] text-mute">
            {current.level === "high"
              ? "A career planet's period and a supporting transit are running together. Ask, apply and put yourself forward."
              : current.level === "raised"
                ? "The period favours career matters, without a strong transit behind it yet. Good for building the case: results, visibility, applications in preparation."
                : "Nothing much is pushing career matters now. Do the groundwork for the next window."}
            {current.leans.length > 0 && <> It {leanText(current.leans)}.</>}
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
        <H2 aside="highest level reached in each month">The next four years</H2>
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[46rem] grid-flow-col gap-[3px]" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
            {months.map((m, i) => (
              <div key={m.key}>
                <div className={`mx-auto mb-1 h-1.5 w-1.5 rounded-full ${m.top ? "bg-deep" : "bg-transparent"}`} />
                <div className={`${LEVEL_CLASS[m.level]} ${m.level === "high" ? "h-14" : m.level === "raised" ? "h-9" : "h-4"} rounded-[2px]`} style={{ marginTop: m.level === "high" ? 0 : m.level === "raised" ? "1.25rem" : "2.5rem" }} title={`${m.label} ${m.year}: ${LEVEL_WORD[m.level]}${m.top ? ", strongest" : ""}`} />
                <p className="mt-1 text-center text-[0.68rem] leading-tight text-mute">
                  {m.label.slice(0, 1)}
                  {(i === 0 || m.label === "Jan") && <span className="block font-semibold text-ink">{m.year}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-mute">
          {(["high", "raised", "ordinary"] as TravelLevel[]).map((l) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span className={`${LEVEL_CLASS[l]} inline-block h-3 w-3 rounded-[2px]`} />
              {LEVEL_WORD[l]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-deep" />
            Strongest of all
          </span>
        </p>

        {strongest.length > 0 && (
          <div className="mt-6 rounded bg-panel px-5 py-4">
            <p className="font-semibold">The strongest stretches</p>
            <ul className="mt-2 flex flex-wrap gap-x-8 gap-y-1 tabular-nums">
              {strongest.map((x) => (
                <li key={x.start.getTime()} className="border-l-2 border-deep pl-3">
                  {x.start <= now ? "Now" : d(x.start)} to {d(x.end)}
                </li>
              ))}
            </ul>
            <p className="mt-2 max-w-[72ch] text-sm text-mute">
              These rank in the top twentieth of your working life: a career planet&rsquo;s period with Guru and Sani both on your 10th house.
            </p>
          </div>
        )}

        <ol className="mt-6 border-t border-line">
          {upcoming.map((w) => (
            <li key={w.start.getTime()} className="grid gap-x-8 gap-y-2 border-b border-line py-4 lg:grid-cols-[17rem_1fr]">
              <div>
                <p className="font-semibold tabular-nums">
                  {w.start <= now ? "Now" : d(w.start)} to {d(w.end)}
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                  <LevelTag level={w.level} />
                </p>
                {w.leans.length > 0 && <p className="mt-1.5 text-sm text-mute">{leanText(w.leans).replace(/^l/, "L")}</p>}
              </div>
              <p className="max-w-[72ch] text-[0.95rem] text-mute">{w.reasons.join(". ")}.</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 max-w-[72ch] text-sm text-mute">
          Levels are ranked against your own working years, 21 to 60: the top sixth counts as high, the next quarter as raised. High also needs a
          career planet&rsquo;s period and a transit over the 10th house, its lord, the 6th or the 11th at once.
        </p>
      </section>

      {past.length > 0 && (
        <section className="mt-12">
          <H2 aside="a test you can run yourself">Looking back</H2>
          <p className="max-w-[72ch] text-[0.98rem]">
            The same rules marked these earlier stretches as high. If a job offer, a promotion, a new role or a first client came in or near them, give
            the windows ahead more weight. If nothing did, give them less.
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
        <H2 aside="10th, 6th and 11th houses, significators, amatyakaraka">What your chart says</H2>
        <LineList lines={promise.lines} />
      </section>

      <section className="mt-14">
        <H2 aside="their periods carry it">Your career planets</H2>
        <ul className="border-t border-line">
          {carriers.map(({ planet, info, act }) => {
            const next = act.upcoming.filter((u) => u.level !== "antaram").slice(0, 2);
            return (
              <li key={planet} className="grid gap-x-8 gap-y-1 border-b border-line py-4 lg:grid-cols-[17rem_1fr]">
                <div>
                  <p className="font-semibold">{name(planet)}</p>
                  {info.leans.length > 0 && <p className="text-sm text-mute">{info.leans.map((l) => LEAN_LABEL[l]).join(", ")}</p>}
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

      <section className="mt-12 max-w-[72ch] space-y-3 text-[0.95rem] text-mute">
        <H2>How to read this page</H2>
        <p>
          The promise is read from the 10th house and its lord, the 6th and 11th lords, your lagna lord, Suriyan and Sani, the dasamsa and the
          amatyakaraka. Timing adds the periods of the planets tied to these to the transits of Guru and Sani over your 10th house, its lord, the 6th
          and the 11th, with extra weight when both touch the 10th together, and a small mark whenever a bhukti changes.
        </p>
        <p>
          Guru on these points tends to show as growth and being trusted; Sani as a heavier role earned by work already done, or a reshaping of the
          job. A window that leans to change is a time when moving is easier, not an instruction to move: do not resign on a window without an offer
          in hand. For the day and hour of an application or interview, use{" "}
          <Link href="/find" className="underline">
            Find a time
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
