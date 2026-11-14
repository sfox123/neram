"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RasiChart } from "@/components/RasiChart";
import { useStore, useToday } from "@/components/store";
import { H2, LineList, Loading, PageTitle, TierTag, ToneDot } from "@/components/ui";
import { ordinal, rulesText } from "@/lib/astro/chart";
import { houseFrom, PLANET_INFO, PlanetId, RASI, signOf } from "@/lib/astro/constants";
import { runningDasha } from "@/lib/astro/dasha";
import { induReading, induTransits, InduWord, ROLE_LABEL } from "@/lib/astro/indu";
import { dayFrame } from "@/lib/astro/panchang";
import { bestWindows, Tier } from "@/lib/astro/score";
import { addDaysKey, dateKey, fmtDate, fmtDateLong, fmtTime } from "@/lib/astro/time";
import { moneyDay, moneyIngresses, moneyLords, moneyPeriods } from "@/lib/astro/wealth";
import { activation } from "@/lib/astro/yogas";

const INDU_TIER: Record<InduWord, string> = { Rich: "tier-go", Good: "tier-good", Moderate: "tier-steady", Thin: "tier-hold" };

const moneyTier = (score: number): Tier => (score >= 72 ? "go" : score >= 60 ? "good" : score >= 43 ? "steady" : score >= 30 ? "hold" : "avoid");

export default function MoneyPage() {
  const { ready, now, natal, profile } = useStore();
  const today = useToday();
  const todayKey = ready ? dateKey(now, profile.here.tz) : null;
  const [picked, setPicked] = useState<string | null>(null);

  const days = useMemo(() => {
    if (!todayKey) return [];
    return Array.from({ length: 30 }, (_, i) => moneyDay(natal, dayFrame(addDaysKey(todayKey, i), profile.here)));
  }, [todayKey, natal, profile.here]);
  const longRun = useMemo(() => {
    if (!todayKey) return null;
    const t = new Date();
    return { periods: moneyPeriods(natal, t), ingresses: moneyIngresses(natal, t) };
  }, [todayKey, natal]);

  const indu = useMemo(() => {
    if (!todayKey || !profile.timeConfirmed) return null;
    const t = new Date();
    const reading = induReading(natal, runningDasha(natal.mahas, t));
    const key = [reading.lord, ...reading.producers, ...reading.supports].filter((p, i, a) => p !== "Ra" && p !== "Ke" && a.indexOf(p) === i);
    return { reading, transits: induTransits(natal, t), timing: key.map((p) => ({ planet: p, act: activation(natal, [p], t) })) };
  }, [todayKey, natal, profile.timeConfirmed]);

  if (!ready || !today || !days.length || !longRun) return <Loading />;
  const tz = profile.here.tz;
  const known = profile.timeConfirmed;
  const sel = days.find((d) => d.frame.dateKey === picked) ?? days[0];
  const isToday = sel === days[0];
  const windows = bestWindows(today.segments, "money", now, 15, 4);
  const lords = moneyLords(natal);
  const topDays = [...days].sort((a, b) => b.score - a.score).slice(0, 5).sort((a, b) => a.frame.sunrise.getTime() - b.frame.sunrise.getTime());

  return (
    <div>
      <PageTitle title="Money outlook" tamil="தன வரவு">
        The traditional signs of cash coming in or going out: the Moon through your 2nd and 11th houses, the wealth stars, your money lords, and the slower
        dasa and Jupiter cycles behind them.
      </PageTitle>

      <section>
        <H2 aside="Taller bars: more signs of inflow. Select a day.">Next 30 days</H2>
        <div className="flex h-40 items-end gap-[3px]" role="group" aria-label="Money score for each of the next 30 days">
          {days.map((d, i) => {
            const tier = moneyTier(d.score);
            const active = d === sel;
            return (
              <button
                key={d.frame.dateKey}
                type="button"
                onClick={() => setPicked(d.frame.dateKey)}
                aria-pressed={active}
                aria-label={`${fmtDate(d.frame.sunrise, tz)}: ${d.label}, ${d.score}`}
                className={`skyline-bar tier-${tier} ${tier === "avoid" ? "bar-avoid" : ""} min-w-0 flex-1 rounded-t-sm ${active ? "outline outline-2 outline-offset-2 outline-ink" : ""}`}
                style={{ height: `${12 + (88 * d.score) / 100}%`, animationDelay: `${i * 12}ms` }}
              />
            );
          })}
        </div>
        <div className="mt-1 flex justify-between border-t border-ink/60 pt-1 text-[0.75rem] text-mute">
          <span>{fmtDate(days[0].frame.sunrise, tz)}</span>
          <span>{fmtDate(days[10].frame.sunrise, tz)}</span>
          <span>{fmtDate(days[20].frame.sunrise, tz)}</span>
          <span>{fmtDate(days[29].frame.sunrise, tz)}</span>
        </div>
        <p className="mt-3 text-[0.95rem]">
          Strongest days:{" "}
          {topDays.map((d, i) => (
            <span key={d.frame.dateKey}>
              {i > 0 && ", "}
              <button type="button" className="font-semibold underline decoration-line underline-offset-4 hover:decoration-peacock" onClick={() => setPicked(d.frame.dateKey)}>
                {fmtDate(d.frame.sunrise, tz)}
              </button>
            </span>
          ))}
          .
        </p>
      </section>

      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <H2 aside={<TierTag tier={moneyTier(sel.score)} />}>
            {isToday ? "Today" : fmtDate(sel.frame.sunrise, tz, { weekday: "long", month: "long" })}: {sel.label.toLowerCase()}
          </H2>
          {sel.signals.length ? (
            <ul className="space-y-2.5 border-t border-line pt-4">
              {sel.signals.map((s) => (
                <li key={s.text} className="flex gap-3 text-[0.95rem]">
                  <ToneDot tone={s.tone} />
                  <span>{s.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-line pt-4 text-[0.95rem] text-mute">No money signal either way: an ordinary day for finances.</p>
          )}
          {!known && (
            <p className="mt-4 text-[0.95rem] text-mute">
              Only Moon-based signals are counted.{" "}
              <Link className="text-peacock underline underline-offset-2" href="/setup">
                Set your birth time
              </Link>{" "}
              to add the 2nd and 11th house checks.
            </p>
          )}
        </section>

        <section>
          <H2>Best money hours left today</H2>
          {windows.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {windows.map((b) => (
                <li key={b.start.getTime()} className="flex items-center justify-between py-2.5 tabular-nums">
                  <span className="font-semibold">
                    {fmtTime(b.start, tz)} to {fmtTime(b.end, tz)}
                  </span>
                  <TierTag tier={b.tier} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.95rem] text-mute">Nothing favourable is left today for money matters.</p>
          )}
          <p className="mt-3 text-sm text-mute">
            Use these for sending invoices, asking about pay, pricing conversations and planned purchases. Guru, Sukran and Budhan horas and the Laabam and
            Dhanam Gowri periods weigh most here.
          </p>
        </section>
      </div>

      <section className="mt-12">
        <H2>Your money planets</H2>
        {known ? (
          <dl className="grid gap-x-10 gap-y-5 border-t border-line pt-5 text-[0.95rem] sm:grid-cols-2 xl:grid-cols-4">
            {(lords.second === lords.eleventh
              ? ([["2nd and 11th lord, savings and income", lords.second]] as const)
              : ([
                  ["2nd lord, savings", lords.second],
                  ["11th lord, income", lords.eleventh],
                ] as const)
            ).map(([term, lord]) => (
              <div key={term}>
                <dt className="text-sm text-mute">{term}</dt>
                <dd className="mt-1">
                  <strong>{PLANET_INFO[lord].ta}</strong> in {RASI[signOf(natal.positions[lord])].ta}, your {ordinal(natal.house[lord])} house. Its horas, weekday and
                  periods are your money times.
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-sm text-mute">Indu lagna, wealth point</dt>
              <dd className="mt-1">
                <strong>{RASI[natal.induLagna].ta}</strong>. Read in full{" "}
                <a href="#indu" className="underline">
                  below
                </a>
                .
              </dd>
            </div>
            <div>
              <dt className="text-sm text-mute">Natural wealth planets</dt>
              <dd className="mt-1">
                Guru {rulesText(natal, "Ju")}. Sukran {rulesText(natal, "Ve")}.
              </dd>
            </div>
          </dl>
        ) : (
          <p className="border-t border-line pt-4 text-[0.95rem] text-mute">Your 2nd and 11th lords depend on the lagna, which needs your birth time.</p>
        )}
      </section>

      {indu && (
        <section className="mt-14 scroll-mt-6" id="indu">
          <H2 aside={`${RASI[indu.reading.sign].ta}, your ${ordinal(houseFrom(natal.lagnaSign, indu.reading.sign))} house`}>Indu lagna: your wealth ascendant</H2>
          <div className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[1fr_1.35fr]">
            <div className={`${INDU_TIER[indu.reading.word]} p-6 sm:p-7`}>
              <p className="opacity-85">The reading from {RASI[indu.reading.sign].ta}</p>
              <p className="verdict-word mt-2 text-6xl leading-none">{indu.reading.word}</p>
              <p className="mt-4 max-w-[40ch] text-[1.02rem] opacity-90">{indu.reading.summary}</p>
            </div>
            <div className="bg-paper p-6 sm:p-7">
              <p className="text-mute">How it is found</p>
              <ol className="mt-3 space-y-2 text-[0.98rem]">
                {[
                  `The 9th from your lagna is ${RASI[indu.reading.working.ninthFromLagna].ta}. Its lord ${PLANET_INFO[indu.reading.working.lordA].ta} carries ${indu.reading.working.kalaA} kalas.`,
                  `The 9th from your Moon is ${RASI[indu.reading.working.ninthFromMoon].ta}. Its lord ${PLANET_INFO[indu.reading.working.lordB].ta} carries ${indu.reading.working.kalaB} kalas.`,
                  `${indu.reading.working.kalaA} + ${indu.reading.working.kalaB} = ${indu.reading.working.sum}. Divided by 12, the remainder is ${indu.reading.working.remainder}.`,
                  `Counting ${RASI[natal.moonSign].ta}, your Moon sign, as the first, the ${ordinal(indu.reading.working.remainder)} sign is ${RASI[indu.reading.sign].ta}.`,
                ].map((step, i) => (
                  <li key={step} className="grid grid-cols-[1.4rem_1fr] gap-2">
                    <span className="font-semibold tabular-nums text-peacock">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-mute">Kalas: Suriyan 30, Chandran 16, Sevvai 6, Budhan 8, Guru 10, Sukran 12, Sani 1.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-x-12 gap-y-8 xl:grid-cols-[26rem_1fr]">
            <RasiChart title="From Indu lagna" subtitle="read for money only" positions={natal.positions} lagnaSign={indu.reading.sign} lagnaLabel="Indu" retro={natal.retro} highlightSign={indu.reading.sign} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] border-collapse text-[0.95rem]">
                <thead>
                  <tr className="border-y border-line text-left text-sm text-mute">
                    <th className="py-2 pr-3 font-normal">Planet</th>
                    <th className="py-2 pr-3 font-normal">Place from it</th>
                    <th className="py-2 pr-3 font-normal">Role for money</th>
                  </tr>
                </thead>
                <tbody>
                  {[...indu.reading.planets]
                    .sort((a, b) => b.weight - a.weight)
                    .map((x) => (
                      <tr key={x.planet} className="border-b border-line">
                        <th scope="row" className="py-2 pr-3 text-left font-semibold">
                          {PLANET_INFO[x.planet].ta}
                          {x.planet === indu.reading.lord && <span className="ml-2 font-normal text-peacock">its lord</span>}
                        </th>
                        <td className="py-2 pr-3">
                          {ordinal(x.house)}, {RASI[x.sign].ta}
                          {x.planet !== "Ra" && x.planet !== "Ke" && (x.dignity === "exalted" || x.dignity === "own" || x.dignity === "debilitated") && (
                            <span className={`ml-1.5 text-sm font-semibold ${x.dignity === "debilitated" ? "text-avoid" : "text-go"}`}>{x.dignity === "own" ? "own sign" : x.dignity}</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="inline-flex items-baseline gap-2">
                            <ToneDot tone={x.weight >= 1.5 ? "good" : x.weight < 0 ? "bad" : "neutral"} />
                            {ROLE_LABEL[x.role]}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8">
            <LineList lines={indu.reading.lines} />
          </div>

          <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-2">
            <div>
              <h3 className="display text-xl">Periods that carry it</h3>
              <ul className="mt-3 border-t border-line text-[0.95rem]">
                {indu.timing.map(({ planet, act }) => {
                  const next = act.upcoming.slice(0, 2);
                  const name = (p: PlanetId) => PLANET_INFO[p].ta;
                  return (
                    <li key={planet} className="border-b border-line py-3">
                      <strong>{name(planet)}</strong>
                      <span className="text-mute">
                        {planet === indu.reading.lord ? ", lord of the Indu lagna" : indu.reading.producers.includes(planet) ? ", wealth-producing" : ", support"}
                      </span>
                      <ul className="mt-1 space-y-0.5 tabular-nums">
                        {act.runningNow.map((r) => (
                          <li key={r.level + r.period.start.getTime()}>
                            <span className="font-semibold text-go">Now:</span> {r.level} until {fmtDateLong(r.period.end, tz)}
                          </li>
                        ))}
                        {next.map((u) => (
                          <li key={u.level + u.period.start.getTime()}>
                            {name(u.period.lord)} {u.level}
                            {u.level !== "dasa" && <span className="text-mute"> in {name(u.within)}</span>}: {fmtDateLong(u.period.start, tz)} to {fmtDateLong(u.period.end, tz)}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="display text-xl">Planets crossing or looking at it</h3>
              <ul className="mt-3 border-t border-line text-[0.95rem]">
                {indu.transits.map((t) => (
                  <li key={t.planet + t.start.getTime()} className="grid grid-cols-[auto_1fr] gap-x-3 border-b border-line py-3">
                    <ToneDot tone={t.tone} />
                    <span>
                      <span className="tabular-nums">
                        {t.live ? <span className="font-semibold text-go">Now</span> : fmtDateLong(t.start, tz)} to {fmtDateLong(t.end, tz)}
                      </span>
                      <span className="block text-mute">{t.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 max-w-[72ch] text-sm text-mute">
            The method is from Kalidasa&rsquo;s Uttara Kalamrita. It is one measure of money among several on this page: your 2nd and 11th lords and the
            dhana yogas on the Yogas page are read separately, and a moderate Indu lagna does not cancel them.
          </p>
        </section>
      )}

      <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-2">
        <section>
          <H2>Dasa periods tied to money</H2>
          {longRun.periods.length ? (
            <ol className="border-t border-line">
              {longRun.periods.slice(0, 10).map((m) => {
                const live = now >= m.period.start && now < m.period.end;
                return (
                  <li key={m.period.level + "-" + m.period.start.getTime()} className={`border-b border-line py-2.5 text-[0.95rem] ${live ? "bg-panel px-3 -mx-3" : ""}`}>
                    <span className="font-semibold">
                      {PLANET_INFO[m.period.lord].ta} {m.period.level === 2 ? "bhukti" : "antaram"}
                    </span>{" "}
                    <span className="text-mute">in {PLANET_INFO[m.parent.lord].ta} {m.period.level === 2 ? "dasa" : "bhukti"}</span>
                    <span className="block tabular-nums">
                      {fmtDateLong(m.period.start, tz)} to {fmtDateLong(m.period.end, tz)}
                      {live ? " (running now)" : ""}
                    </span>
                    <span className="block text-sm text-mute">{m.reasons.join(", ")}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="border-t border-line pt-4 text-[0.95rem] text-mute">
              {known ? "No bhukti or antaram of a money lord in the next few years." : "Needs your birth time."}
            </p>
          )}
        </section>

        <section>
          <H2>Slow transits that move money</H2>
          {longRun.ingresses.length ? (
            <ol className="border-t border-line">
              {longRun.ingresses.slice(0, 10).map((i) => (
                <li key={i.planet + i.date.getTime()} className="grid grid-cols-[7rem_1fr] gap-x-3 border-b border-line py-2.5 text-[0.95rem]">
                  <span className="tabular-nums text-mute">{fmtDateLong(i.date, tz)}</span>
                  <span>{i.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="border-t border-line pt-4 text-[0.95rem] text-mute">No wealth-related sign change in the coming months.</p>
          )}
        </section>
      </div>

      <p className="mt-10 max-w-[72ch] text-sm text-mute">
        These are traditional indicators, useful for choosing when to ask, invoice or buy. They cannot tell you how much money will arrive or promise that any
        will, so don&rsquo;t use them alone for loans or investments.
      </p>
    </div>
  );
}
