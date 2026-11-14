"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/components/store";
import { H2, LineList, Loading, PageTitle } from "@/components/ui";
import { PLANET_INFO, PlanetId, PLANETS, RASI } from "@/lib/astro/constants";
import { guruBalamSpans, marriageAt, marriageBaseline, marriagePromise, marriageWindows, MarriageWord, SevvaiDosham } from "@/lib/astro/marriage";
import { dateKey, fmtDateLong, MS_DAY } from "@/lib/astro/time";
import { TravelLevel } from "@/lib/astro/travel";
import { activation } from "@/lib/astro/yogas";

const WORD_TIER: Record<MarriageWord, string> = { Clear: "tier-go", Good: "tier-good", Mixed: "tier-steady", Hard: "tier-hold" };
const LEVEL_WORD: Record<TravelLevel, string> = { high: "High", raised: "Raised", ordinary: "Ordinary" };
const LEVEL_CLASS: Record<TravelLevel, string> = { high: "tier-go", raised: "tier-good", ordinary: "bg-ink/10 text-ink" };
const DOSHAM_WORD: Record<SevvaiDosham["verdict"], string> = { none: "None", cancelled: "Cancelled", mild: "Mild", present: "Present" };
const DOSHAM_CLASS: Record<SevvaiDosham["verdict"], string> = { none: "tier-go", cancelled: "tier-good", mild: "tier-steady", present: "tier-hold" };

function LevelTag({ level }: { level: TravelLevel }) {
  return <span className={`${LEVEL_CLASS[level]} inline-block rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none`}>{LEVEL_WORD[level]}</span>;
}

export default function MarriagePage() {
  const { ready, now, natal, profile } = useStore();
  const dayStamp = Math.floor(now.getTime() / MS_DAY);

  const data = useMemo(() => {
    if (!ready || !profile.timeConfirmed) return null;
    const at = new Date(dayStamp * MS_DAY);
    const promise = marriagePromise(natal);
    const base = marriageBaseline(natal, promise);
    const ahead = marriageWindows(natal, promise, base, at, 5);
    const from21 = new Date(natal.birth.getTime() + 21 * 365.25 * MS_DAY);
    const yearsBack = Math.max(0, (at.getTime() - from21.getTime()) / (365.25 * MS_DAY));
    const past = yearsBack > 0.5 ? marriageWindows(natal, promise, base, from21, yearsBack, 7).windows.filter((w) => w.level === "high" && w.end < at) : [];
    const rank: Record<TravelLevel, number> = { ordinary: 0, raised: 1, high: 2 };
    const months: { key: string; label: string; year: number; level: TravelLevel; top: boolean }[] = [];
    for (const m of ahead.samples) {
      const k = dateKey(m.t, profile.here.tz).slice(0, 7);
      const last = months[months.length - 1];
      const top = m.level === "high" && m.total >= base.top;
      if (last && last.key === k) {
        if (rank[m.level] > rank[last.level]) last.level = m.level;
        if (top) last.top = true;
      } else months.push({ key: k, label: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: profile.here.tz }).format(m.t), year: Number(k.slice(0, 4)), level: m.level, top });
    }
    const carriers = PLANETS.filter((p) => promise.planets[p].weight >= 2)
      .sort((a, b) => promise.planets[b].weight - promise.planets[a].weight)
      .map((p) => ({ planet: p, info: promise.planets[p], act: activation(natal, [p], at) }));
    return { promise, base, ahead, past, months: months.slice(0, 60), carriers, balam: guruBalamSpans(ahead.samples).slice(0, 4) };
  }, [ready, natal, profile.timeConfirmed, profile.here.tz, dayStamp]);

  if (!ready) return <Loading />;
  if (!profile.timeConfirmed)
    return (
      <div>
        <PageTitle title="Marriage" tamil="திருமணம்">
          The 7th house is counted from the lagna, which needs your birth time.
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
  const { promise, base, ahead, past, months, carriers, balam } = data;
  const current = marriageAt(natal, promise, now, base);
  const upcoming = ahead.windows.filter((w) => w.level !== "ordinary");
  const strongest = ahead.windows.flatMap((w) => w.strongest).filter((x) => x.end > now);
  const arranged = 100 - promise.love;

  return (
    <div>
      <PageTitle title="Marriage" tamil="திருமணம்">
        What your chart promises about marriage, how early or late, what kind of match, and when the signs gather. The windows mark stretches when
        proposals and decisions are more likely to come to a head by the tradition&rsquo;s rules. They are not wedding dates, and the choice of person
        matters more than any of them.
      </PageTitle>

      <section className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[1fr_1.25fr]">
        <div className={`${WORD_TIER[promise.word]} p-6 sm:p-8`}>
          <p className="opacity-85">The promise in your birth chart</p>
          <p className="verdict-word mt-2 text-6xl leading-none sm:text-7xl">{promise.word}</p>
          <p className="mt-4 max-w-[42ch] text-[1.02rem] opacity-90">{promise.summary}</p>
        </div>
        <div className="space-y-6 bg-paper p-6 sm:p-8">
          <div>
            <p className="flex items-baseline justify-between gap-4">
              <span className="font-semibold">Arranged by the family</span>
              <span className="font-semibold">Self-chosen</span>
            </p>
            <span className="mt-1.5 flex h-2 w-full overflow-hidden rounded-sm bg-ink/10" role="img" aria-label={`Leans ${arranged} to arranged, ${promise.love} to self-chosen`}>
              <span className="block h-full bg-deep" style={{ width: `${arranged}%` }} />
              <span className="block h-full bg-peacock/45" style={{ width: `${promise.love}%` }} />
            </span>
            <p className="mt-2 text-[0.95rem] text-mute">{promise.kindText}</p>
          </div>
          <div>
            <p className="flex items-baseline gap-3">
              <span className="font-semibold">Sevvai dosham</span>
              <span className={`${DOSHAM_CLASS[promise.dosham.verdict]} inline-block rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none`}>{DOSHAM_WORD[promise.dosham.verdict]}</span>
            </p>
            <p className="mt-2 text-[0.95rem] text-mute">{promise.dosham.text}</p>
          </div>
        </div>
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
            {current.reasons.length === 0 && <li className="text-mute">No marriage planet holds a period and Guru is not placed to help: a quiet stretch for this matter.</li>}
          </ul>
          <div className="text-[0.95rem]">
            <p className="font-semibold">Guru balam</p>
            <p className="mt-1 text-mute">
              The almanac&rsquo;s own test for a wedding: Guru in the 2nd, 5th, 7th, 9th or 11th from your Moon in {RASI[natal.moonSign].ta}.{" "}
              {current.guruBalam ? "You have it now." : "You do not have it now."}
            </p>
            <ul className="mt-2 space-y-0.5 tabular-nums">
              {balam.map((b) => (
                <li key={b.start.getTime()}>
                  {b.start <= now ? <span className="font-semibold text-go">Now</span> : d(b.start)} to {d(b.end)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <H2 aside="highest level reached in each month">The next five years</H2>
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[52rem] grid-flow-col gap-[2px]" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
            {months.map((m, i) => (
              <div key={m.key}>
                <div className={`mx-auto mb-1 h-1.5 w-1.5 rounded-full ${m.top ? "bg-deep" : "bg-transparent"}`} />
                <div className={`${LEVEL_CLASS[m.level]} ${m.level === "high" ? "h-14" : m.level === "raised" ? "h-9" : "h-4"} rounded-[2px]`} style={{ marginTop: m.level === "high" ? 0 : m.level === "raised" ? "1.25rem" : "2.5rem" }} title={`${m.label} ${m.year}: ${LEVEL_WORD[m.level]}${m.top ? ", strongest" : ""}`} />
                <p className="mt-1 text-center text-[0.65rem] leading-tight text-mute">
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
              These rank in the top twentieth of your whole marriageable span: a marriage planet&rsquo;s period together with Guru and Sani on the same
              marriage factor.
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
                  <span className="text-mute">{w.guruBalam >= 0.8 ? "with Guru balam" : w.guruBalam >= 0.2 ? "Guru balam for part of it" : "without Guru balam"}</span>
                </p>
              </div>
              <p className="max-w-[72ch] text-[0.95rem] text-mute">{w.reasons.join(". ")}.</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 max-w-[72ch] text-sm text-mute">
          Levels are ranked against your own years from 21 to 45: the top sixth counts as high, the next quarter as raised. High also needs a marriage
          planet&rsquo;s period and a supporting transit at once. If much of a stretch reads high, the chart is saying these are your marriage years;
          use the strongest stretches to narrow it.
        </p>
      </section>

      {past.length > 0 && (
        <section className="mt-12">
          <H2 aside="a test you can run yourself">Looking back</H2>
          <p className="max-w-[72ch] text-[0.98rem]">
            The same rules marked these earlier stretches as high. If proposals, a serious relationship, or family talk of marriage came in or near
            them, give the windows ahead more weight. If nothing did, give them less.
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
        <H2 aside="7th house, Sukran, 2nd house, navamsa">What your chart says</H2>
        <LineList lines={promise.lines} />
      </section>

      <section className="mt-12">
        <H2 aside={promise.pace === "late" ? "later than peers" : promise.pace === "usual" ? "the usual years" : "no delay marks"}>Early or late</H2>
        <p className="mb-4 max-w-[72ch] text-[0.98rem]">{promise.paceText}</p>
        {promise.delayLines.length > 0 && <LineList lines={promise.delayLines} />}
      </section>

      <section className="mt-12">
        <H2 aside="a sketch, not a portrait">The partner</H2>
        <LineList lines={promise.partner} />
        <p className="mt-3 max-w-[72ch] text-sm text-mute">
          Each line is one layer of the tradition&rsquo;s description, and they do not always agree. When you have a real person&rsquo;s birth
          details, the{" "}
          <Link href="/people" className="underline">
            People
          </Link>{" "}
          page compares the two charts directly, which says far more than this sketch.
        </p>
      </section>

      <section className="mt-14">
        <H2 aside="their periods carry it">Your marriage planets</H2>
        <ul className="border-t border-line">
          {carriers.map(({ planet, info, act }) => {
            const next = act.upcoming.filter((u) => u.level !== "antaram").slice(0, 2);
            return (
              <li key={planet} className="grid gap-x-8 gap-y-1 border-b border-line py-4 lg:grid-cols-[17rem_1fr]">
                <p className="font-semibold">{name(planet)}</p>
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
          The promise is read from the 7th house and its lord, Sukran (the significator of marriage in a man&rsquo;s chart), the 2nd house of family and
          the navamsa. Timing adds the periods of the planets tied to these to the transits of Guru and Sani over your 7th house, its lord, Sukran and
          your lagna, with extra weight when both touch the same one, and to Guru balam.
        </p>
        <p>
          A window is when the matter is more likely to move: proposals arrive, families talk, a decision gets made. Whether it should be made depends
          on the person, which no window can tell you. The date of the wedding itself is chosen separately by muhurtham, which this page does not do.
        </p>
      </section>
    </div>
  );
}
