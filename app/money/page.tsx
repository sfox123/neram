"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore, useToday } from "@/components/store";
import { H2, Loading, PageTitle, TierTag, ToneDot } from "@/components/ui";
import { ordinal, rulesText } from "@/lib/astro/chart";
import { PLANET_INFO, RASI, signOf } from "@/lib/astro/constants";
import { dayFrame } from "@/lib/astro/panchang";
import { bestWindows, Tier } from "@/lib/astro/score";
import { addDaysKey, dateKey, fmtDate, fmtDateLong, fmtTime } from "@/lib/astro/time";
import { moneyDay, moneyIngresses, moneyLords, moneyPeriods } from "@/lib/astro/wealth";

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
                <strong>{RASI[natal.induLagna].ta}</strong>. Days when the Moon crosses it, and months when Guru or Sukran do, favour receipts.
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
