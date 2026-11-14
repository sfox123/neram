"use client";

import { useMemo } from "react";
import { useStore, useToday } from "@/components/store";
import { H2, Loading, PageTitle, ToneDot } from "@/components/ui";
import { formatDeg, NAKSHATRA, PLANET_INFO, PlanetId, PLANETS, RASI, signOf } from "@/lib/astro/constants";
import { spanAt } from "@/lib/astro/panchang";
import { fmtDate, fmtDateLong, fmtTime } from "@/lib/astro/time";
import { moonPasses, PLANET_DEITY, planetPasses, starRelation, yogiInfo } from "@/lib/astro/yogi";

const REL_LABEL = {
  "yoga-tara": "Yoga tara",
  "yogi-star": "Yogi's star",
  "avayoga-tara": "Avayoga tara",
  "avayogi-star": "Avayogi's star",
} as const;

export default function YogiPage() {
  const { ready, now, natal, profile } = useStore();
  const day = useToday();
  const y = useMemo(() => yogiInfo(natal), [natal]);
  const dayKey = day?.frame.dateKey ?? null;
  const passes = useMemo(() => {
    if (!dayKey) return null;
    const from = new Date();
    return { moon: moonPasses(y, from, 45), planets: planetPasses(y, from, 400) };
  }, [dayKey, y]);

  if (!ready || !day || !passes) return <Loading />;
  const tz = profile.here.tz;
  const star = spanAt(day.ctx.panchang.nakshatra, now);
  const rel = starRelation(y, star.value);
  const name = (p: PlanetId) => PLANET_INFO[p].ta;
  const when = (d: Date) => `${fmtDate(d, tz)}, ${fmtTime(d, tz)}`;
  const nextYoga = passes.moon.find((p) => p.relation === "yoga-tara" && p.end > now);

  return (
    <div>
      <PageTitle title="Yogi and avayogi" tamil="யோகி, அவயோகி">
        From the Sun and Moon at your birth come one planet that opens the way for you, one that helps it, and one that applies the brake. The app gives
        more weight to any time, hora or period that touches your Yogi or your yoga tara, and less to those that touch the Avayogi.
      </PageTitle>

      <section className="grid gap-px overflow-hidden rounded-md bg-line md:grid-cols-3">
        <div className="tier-go p-6 sm:p-7">
          <p className="opacity-85">Yogi, the giver</p>
          <p className="verdict-word mt-3 text-5xl">{name(y.yogi)}</p>
          <p className="tamil mt-3 text-2xl">{PLANET_INFO[y.yogi].tamil}</p>
          <p className="mt-4 text-[0.95rem] leading-snug opacity-90">
            Yoga tara {NAKSHATRA[y.yogiStar].ta}. Yogi point {formatDeg(y.yogiPoint)} {RASI[signOf(y.yogiPoint)].ta}.
          </p>
        </div>
        <div className="bg-deep p-6 text-paper sm:p-7">
          <p className="text-paper/70">Sahayogi, the helper</p>
          <p className="verdict-word mt-3 text-5xl">{name(y.sahayogi)}</p>
          <p className="tamil mt-3 text-2xl text-steady">{PLANET_INFO[y.sahayogi].tamil}</p>
          <p className="mt-4 text-[0.95rem] leading-snug text-paper/85">Lord of {RASI[signOf(y.yogiPoint)].ta}, the sign that holds the yogi point.</p>
        </div>
        <div className="tier-avoid p-6 sm:p-7">
          <p className="opacity-85">Avayogi, the brake</p>
          <p className="verdict-word mt-3 text-5xl">{name(y.avayogi)}</p>
          <p className="tamil mt-3 text-2xl">{PLANET_INFO[y.avayogi].tamil}</p>
          <p className="mt-4 text-[0.95rem] leading-snug opacity-90">
            Avayoga tara {NAKSHATRA[y.avayogiStar].ta}. Avayogi point {formatDeg(y.avayogiPoint)} {RASI[signOf(y.avayogiPoint)].ta}.
          </p>
        </div>
      </section>

      {y.notes.length > 0 && (
        <section className="mt-10 max-w-[74ch]">
          <H2>What stands out in your chart</H2>
          <ul className="space-y-3 border-t border-line pt-4 text-[0.98rem]">
            {y.notes.map((t) => (
              <li key={t} className="flex gap-3">
                <ToneDot tone={/Avayogi|avayoga|reduced|not rewarded/.test(t) && !/softened/.test(t) ? "bad" : "good"} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-2">
        <section>
          <H2 aside={`Moon now in ${NAKSHATRA[star.value].ta}`}>The Moon and your two stars</H2>
          <p className="mb-4 max-w-[62ch] text-[0.95rem]">
            {rel === "yoga-tara"
              ? `The Moon is in your yoga tara until ${when(star.end)}. This is the best stretch of the month: use it.`
              : rel === "avayoga-tara"
                ? `The Moon is in your avayoga tara until ${when(star.end)}. Keep to routine and hold money decisions.`
                : rel === "yogi-star"
                  ? `The Moon is in a star of your Yogi until ${when(star.end)}: a helpful day.`
                  : rel === "avayogi-star"
                    ? `The Moon is in a star of your Avayogi until ${when(star.end)}: expect some drag.`
                    : nextYoga
                      ? `The Moon is in neither group today. It next enters your yoga tara on ${when(nextYoga.start)}.`
                      : "The Moon is in neither group today."}
          </p>
          <ol className="border-t border-line">
            {passes.moon.map((p) => {
              const good = p.relation === "yoga-tara" || p.relation === "yogi-star";
              const live = now >= p.start && now < p.end;
              return (
                <li key={p.start.getTime()} className={`grid grid-cols-[7.5rem_1fr] items-baseline gap-x-3 border-b border-line py-2.5 text-[0.95rem] ${live ? "bg-panel px-3 -mx-3" : ""}`}>
                  <span>
                    <span className={`tier-${p.relation === "yoga-tara" ? "go" : p.relation === "yogi-star" ? "good" : p.relation === "avayoga-tara" ? "avoid" : "hold"} rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none`}>
                      {REL_LABEL[p.relation]}
                    </span>
                  </span>
                  <span>
                    <span className="font-semibold tabular-nums">
                      {when(p.start)} to {when(p.end)}
                    </span>
                    <span className="block text-sm text-mute">
                      {NAKSHATRA[p.star].ta}: {good ? (p.relation === "yoga-tara" ? "begin, ask, receive" : "a favourable day") : p.relation === "avayoga-tara" ? "hold starts and money decisions" : "go a little slower"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-sm text-mute">Next 45 days. The Moon returns to each star about every 27 days.</p>
        </section>

        <section>
          <H2>Planets crossing the two stars</H2>
          <p className="mb-4 max-w-[62ch] text-[0.95rem] text-mute">
            A favourable planet (Guru, Sukran, Budhan, your Yogi or Sahayogi) in the yoga tara gives with full weight for as long as it stays. Any
            planet in the avayoga tara has its matters delayed.
          </p>
          {passes.planets.length ? (
            <ol className="border-t border-line">
              {passes.planets.map((p) => {
                const good = p.relation === "yoga-tara";
                return (
                  <li key={p.planet + p.start.getTime()} className="grid grid-cols-[1.2rem_1fr] gap-x-2 border-b border-line py-2.5 text-[0.95rem]">
                    <ToneDot tone={good ? "good" : "bad"} />
                    <span>
                      <span className="font-semibold">
                        {name(p.planet)} in your {good ? "yoga" : "avayoga"} tara
                      </span>
                      <span className="block tabular-nums text-mute">
                        {p.ongoing ? "now" : fmtDateLong(p.start, tz)} to {p.end ? fmtDateLong(p.end, tz) : "beyond the next 13 months"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="border-t border-line pt-4 text-[0.95rem] text-mute">No planet crosses either star in the next 13 months.</p>
          )}
        </section>
      </div>

      <section className="mt-12">
        <H2 aside="Used for horas and dasa periods">How the scheme changes each of your planets</H2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-[0.95rem]">
            <tbody>
              {PLANETS.map((p) => {
                const st = y.standing[p];
                const tier = st.boost >= 2 ? "go" : st.boost > 0 ? "good" : st.boost <= -2 ? "avoid" : st.boost < 0 ? "hold" : "steady";
                return (
                  <tr key={p} className="border-y border-line align-top">
                    <th scope="row" className="w-28 py-2.5 pr-3 text-left font-semibold">
                      {name(p)}
                    </th>
                    <td className="w-36 py-2.5 pr-3">
                      <span className={`tier-${tier} rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none`}>
                        {st.boost >= 2 ? "Much stronger" : st.boost > 0 ? "Stronger" : st.boost <= -2 ? "Much weaker" : st.boost < 0 ? "Weaker" : "Unchanged"}
                      </span>
                    </td>
                    <td className="py-2.5 text-mute">
                      {st.reasons.length ? `${PLANET_INFO[p].en} ${st.reasons.join(" and ")}.` : `In ${NAKSHATRA[Math.floor(natal.positions[p] / (360 / 27))].ta}, outside both groups.`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-2">
        <section>
          <H2 aside={<span className="tamil text-lg text-peacock">கரண நாதன்</span>}>Karana nathan</H2>
          <dl className="space-y-4 border-t border-line pt-4 text-[0.95rem]">
            <div>
              <dt className="text-sm text-mute">Birth karana</dt>
              <dd className="mt-1">
                <strong>
                  {y.karana === "Gara" ? "Garaja" : y.karana} <span className="tamil font-medium">{y.karanaTamil}</span>
                </strong>
                , whose animal is the {y.karanaAnimal}.
              </dd>
            </div>
            <div>
              <dt className="text-sm text-mute">Karana nathan (its ruling planet)</dt>
              <dd className="mt-1">
                <strong>{name(y.karanaLord)}</strong>. Next to the lagna lord, this planet steers how you act. Its hora and weekday suit getting things
                done; its standing above shows how well effort is rewarded.
              </dd>
            </div>
            <div>
              <dt className="text-sm text-mute">Worship for the karana</dt>
              <dd className="mt-1">{y.karanaDeity}.</dd>
            </div>
          </dl>
        </section>

        <section>
          <H2 aside="Degree within the sign, 0 to 30">HD and LD planets</H2>
          <ul className="space-y-1.5 border-t border-line pt-4">
            {y.degrees.map((d) => (
              <li key={d.planet} className="grid grid-cols-[5rem_1fr_3.5rem] items-center gap-x-3 text-[0.9rem]">
                <span className="font-semibold">{name(d.planet)}</span>
                <span className="block h-2.5 rounded-sm bg-ink/10">
                  <span
                    className={`block h-full rounded-sm ${d.planet === y.hd ? "bg-go" : d.planet === y.ld ? "bg-hold" : "bg-peacock/50"}`}
                    style={{ width: `${Math.max(2, (d.degree / 30) * 100)}%` }}
                  />
                </span>
                <span className="text-right tabular-nums text-mute">{formatDeg(d.degree)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-4 text-[0.95rem]">
            <div>
              <dt className="text-sm text-mute">HD planet (highest degree)</dt>
              <dd className="mt-1">
                <strong>{name(y.hd)}</strong>. High-degree planets act fast and serve you: {PLANET_INFO[y.hd].karaka} come to you without much
                chasing, sometimes before you want them.
                {y.hdGroup.length > 1 ? ` Also above 20°: ${y.hdGroup.filter((p) => p !== y.hd).map(name).join(", ")}.` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-mute">LD planet (lowest degree)</dt>
              <dd className="mt-1">
                <strong>{name(y.ld)}</strong>. Low-degree planets are slow: you go looking for {PLANET_INFO[y.ld].karaka.split(",").slice(0, 2).join(" and ")},
                and results in its house come late.
                {y.ldGroup.length > 1 ? ` Also below 10°: ${y.ldGroup.filter((p) => p !== y.ld).map(name).join(", ")}.` : ""}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="mt-12 max-w-[74ch]">
        <H2 aside={<span className="tamil text-lg text-peacock">உபாசனா தெய்வம்</span>}>Upasana deivam</H2>
        <div className="space-y-3 border-t border-line pt-4 text-[0.98rem]">
          <p>
            <strong>{y.upasana.deity}</strong>, for your LD planet {name(y.upasana.planet)}. In the degree method the lowest-degree planet is the one
            you have to do upasana for, because it will not act on its own.
          </p>
          <p>
            To strengthen the Yogi {name(y.yogi)}: {PLANET_DEITY[y.yogi]}. To ease the Avayogi {name(y.avayogi)}: {PLANET_DEITY[y.avayogi]}, and give
            extra regard to the Sahayogi {name(y.sahayogi)} ({PLANET_DEITY[y.sahayogi]}), who counters the Avayogi&rsquo;s obstruction.
          </p>
        </div>
      </section>

      <section className="mt-12 max-w-[74ch]">
        <H2>How the app uses this</H2>
        <ul className="list-disc space-y-2 border-t border-line pl-5 pt-4 text-[0.95rem] marker:text-mute">
          <li>Moon in the yoga tara adds 8 to the time score (10 for money); in another star of the Yogi, 4.</li>
          <li>Moon in the avayoga tara takes 7 (8 for money); in another star of the Avayogi, 3.</li>
          <li>A hora ruled by a strengthened planet above gains up to 6; one ruled by a weakened planet loses up to 4.</li>
          <li>A favourable planet transiting the yoga tara adds 4 for as long as it stays; a planet in the avayoga tara takes 2 or 3.</li>
          <li>Dasa, bhukti and antaram lords carry their standing into the background score.</li>
          <li>On the People page, someone whose birth star is your yoga tara counts strongly in their favour.</li>
        </ul>
        <p className="mt-4 text-sm text-mute">
          The calculations (yogi point, avayogi point, karana, degrees) are exact. The interpretive rules follow publicly available summaries of the GK
          school and other Tamil sources; GK&rsquo;s own books go further and were not available to check against, so treat the upasana deity in
          particular as the general rule, and confirm with a teacher of his method if it matters to you.
        </p>
      </section>
    </div>
  );
}
