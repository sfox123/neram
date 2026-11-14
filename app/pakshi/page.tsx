"use client";

import { useState } from "react";
import { useDay, useStore } from "@/components/store";
import { DateStepper, H2, Loading, PageTitle } from "@/components/ui";
import { NAKSHATRA, WEEKDAYS } from "@/lib/astro/constants";
import { ACTIVITY, Bird, BIRDS, PakshiSub, pakshiRating, relation } from "@/lib/astro/pakshi";
import { Tier } from "@/lib/astro/score";
import { dateKey, fmtTime } from "@/lib/astro/time";

const powerTier = (s: PakshiSub): Tier => {
  const r = pakshiRating(s);
  return r >= 8 ? "go" : r >= 5 ? "good" : r >= 4 ? "steady" : r >= 2 ? "hold" : "avoid";
};

export default function PakshiPage() {
  const { ready, now, profile, natal } = useStore();
  const todayKey = ready ? dateKey(now, profile.here.tz) : null;
  const [chosen, setChosen] = useState<string | null>(null);
  const key = chosen ?? todayKey;
  const day = useDay(key);
  if (!ready || !day || !key || !todayKey) return <Loading />;

  const tz = profile.here.tz;
  const pk = day.ctx.pakshi;
  const mine = BIRDS[natal.bird];
  const paksha = pk.paksha;
  const others = ([0, 1, 2, 3, 4] as Bird[]).filter((b) => b !== natal.bird);
  const friends = others.filter((b) => relation(paksha, natal.bird, b) === "friend");
  const enemies = others.filter((b) => relation(paksha, natal.bird, b) === "enemy");
  const isToday = key === todayKey;
  const t = (d: Date) => fmtTime(d, tz);

  return (
    <div>
      <PageTitle title="Pancha Pakshi" tamil="பஞ்ச பட்சி சாஸ்திரம்">
        Your bird moves through five states in each of the ten yamas of the day and night: ruling, eating, walking,
        sleeping and dying. Act when it rules or eats; hold when it sleeps or dies.
      </PageTitle>

      <section className="mb-10 grid gap-x-12 gap-y-6 rounded-md bg-deep px-6 py-7 text-paper sm:grid-cols-[auto_1fr] sm:px-9">
        <div>
          <p className="text-paper/70">Your bird</p>
          <p className="verdict-word mt-2 text-7xl sm:text-8xl">{mine.ta}</p>
          <p className="tamil mt-3 text-3xl text-steady">{mine.tamil}</p>
        </div>
        <div className="max-w-[58ch] self-end text-[0.95rem] leading-relaxed text-paper/90">
          <p>
            {mine.en}. Born under {NAKSHATRA[natal.star].ta} in the {natal.paksha === 0 ? "waxing (valarpirai)" : "waning (theipirai)"} half.
            {natal.profile.birdOverride !== null ? " Set by hand in Setup." : ""}
          </p>
          <p className="mt-2">
            In this {paksha === 0 ? "valarpirai" : "theipirai"} fortnight its friends are {friends.map((b) => BIRDS[b].ta).join(" and ")}; its enemies are{" "}
            {enemies.map((b) => BIRDS[b].ta).join(" and ")}. People and sub-periods of friendly birds help you; enemy birds drag.
          </p>
        </div>
      </section>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <DateStepper value={key} onChange={setChosen} todayKey={todayKey} />
        <p className="max-w-[60ch] text-[0.95rem] text-mute">
          {paksha === 0 ? "Valarpirai" : "Theipirai"} {WEEKDAYS[pk.weekday]}. Day led by {BIRDS[pk.dayRuler].ta}, night by {BIRDS[pk.nightRuler].ta}. Padu
          pakshi (dead bird) of the day: {BIRDS[pk.paduBird].ta}
          {pk.isPaduDay ? ", which is yours, so treat even the ruling periods with caution." : "."}
        </p>
      </div>

      {[true, false].map((isDay) => (
        <section key={String(isDay)} className="mb-10">
          <H2 aside={isDay ? `Sunrise ${t(day.frame.sunrise)} to sunset ${t(day.frame.sunset)}` : `Sunset ${t(day.frame.sunset)} to sunrise ${t(day.frame.nextSunrise)}`}>
            {isDay ? "Day yamas" : "Night yamas"}
          </H2>
          <ol className="border-t border-line">
            {pk.yamas
              .filter((y) => y.isDay === isDay)
              .map((y) => {
                const act = ACTIVITY[y.activity];
                const current = isToday && now >= y.start && now < y.end;
                return (
                  <li key={y.start.getTime()} className={`grid gap-x-6 gap-y-3 border-b border-line py-4 lg:grid-cols-[13rem_1fr] ${current ? "bg-panel px-3 -mx-3" : ""}`}>
                    <div>
                      <p className="tabular-nums text-mute">
                        {t(y.start)} to {t(y.end)}
                      </p>
                      <p className="display mt-1 text-2xl">
                        {act.ta} <span className="tamil text-xl text-peacock">{act.tamil}</span>
                      </p>
                      <p className="mt-1 text-sm text-mute">{act.note}</p>
                    </div>
                    <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-5">
                      {y.subs.map((s) => {
                        const tier = powerTier(s);
                        const live = isToday && now >= s.start && now < s.end;
                        return (
                          <li key={s.start.getTime()} className={`tier-${tier} ${tier === "avoid" ? "bar-avoid" : ""} rounded-sm px-2.5 py-2 text-[0.85rem] leading-snug ${live ? "outline outline-2 outline-offset-2 outline-ink" : ""}`}>
                            <span className="flex items-baseline justify-between gap-2 sm:block">
                              <span className="block font-semibold tabular-nums">
                                {t(s.start)} to {t(s.end)}
                              </span>
                              <span className="block text-[1rem] font-semibold">{ACTIVITY[s.activity].ta}</span>
                            </span>
                            <span className="block opacity-90">
                              {s.relation === "self" ? "own sub-period" : `${BIRDS[s.bird].ta}, ${s.relation}`}
                            </span>
                            <span className="block opacity-90">Rating {pakshiRating(s)} of 10</span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
          </ol>
        </section>
      ))}

      <p className="max-w-[70ch] text-sm text-mute">
        Each yama is a fifth of the actual day or night at {profile.here.name}, so the times shift with sunrise through the year. The rating multiplies
        the strength of the main state (ruling 1.0, eating 0.8, walking 0.6, sleeping 0.4, dying 0.2) by that of the sub-period, then nudges it for a
        friendly or enemy bird.
      </p>
    </div>
  );
}
