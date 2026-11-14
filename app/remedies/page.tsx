"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStore, useToday } from "@/components/store";
import { H2, Loading, PageTitle, TierTag } from "@/components/ui";
import { PLANET_INFO } from "@/lib/astro/constants";
import { CareMode, MODE_LABEL, MODE_RULE, PLANET_REMEDY, planetCare, recoveryFor, RESET_STEPS } from "@/lib/astro/remedies";
import { bestWindows, readAt } from "@/lib/astro/score";
import { fmtTime } from "@/lib/astro/time";
import { PLANET_DEITY } from "@/lib/astro/yogi";

const MODE_STYLE: Record<CareMode, string> = {
  strengthen: "bg-go text-paper",
  settle: "bg-hold text-ink",
  honour: "bg-deep text-paper",
  steady: "bg-panel text-ink border border-line",
};

export default function RemediesPage() {
  const { ready, now, natal, profile } = useStore();
  const day = useToday();
  const care = useMemo(() => (day ? planetCare(natal, day.ctx.yogi, day.ctx.gocharam) : null), [day, natal]);

  if (!ready || !day || !care) return <Loading />;
  const tz = profile.here.tz;
  const reading = readAt(day.ctx, now);
  const recovery = recoveryFor(day.ctx, reading);
  const allDay = recovery.filter((r) => r.allDay);
  const stretch = recovery.filter((r) => !r.allDay);
  const nextGood = bestWindows(day.segments, "overall", now, 20, 1)[0];
  const modes: CareMode[] = ["strengthen", "settle", "honour", "steady"];

  return (
    <div>
      <PageTitle title="Strengthen and recover" tamil="பரிகாரம்">
        What to do when the hour, the day or a planet is against you. First what is weighing on you right now and its fix, then a reset for any bad day,
        then each of your nine planets with the practice that suits its place in your chart.
      </PageTitle>

      <section className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[18rem_1fr]">
        <div className={`tier-${reading.tiers.overall} p-6 sm:p-7`}>
          <p className="opacity-85">Right now, {fmtTime(now, tz)}</p>
          <p className="verdict-word mt-3 text-5xl">{recovery.length === 0 ? "Clear" : recovery.length === 1 ? "One weight" : `${recovery.length} weights`}</p>
          <p className="mt-4 text-[0.95rem] leading-snug opacity-90">
            The moment reads <TierTag tier={reading.tiers.overall} className="!bg-paper/90 !text-ink" /> at {Math.round(reading.scores.overall)} of 100.
            {nextGood && (
              <>
                {" "}
                Next good window: {fmtTime(nextGood.start, tz)} to {fmtTime(nextGood.end, tz)}.
              </>
            )}
          </p>
        </div>
        <div className="bg-paper p-6 sm:p-7">
          {recovery.length === 0 ? (
            <p className="max-w-[56ch] text-lg">
              Nothing heavy is running: no Chandrashtamam, no hard tara, no Rahu kalam, and your period lords are holding up in the sky. Use the time; keep
              the weekly practices below going so that it stays this way.
            </p>
          ) : (
            <div className="space-y-7">
              {[...allDay, ...stretch].map((r) => (
                <div key={r.id} className="max-w-[68ch]">
                  <h3 className="display text-2xl">
                    {r.title}
                    <span className="ml-3 align-middle font-sans text-sm font-normal text-mute">{r.allDay ? "a longer phase" : "this stretch only"}</span>
                  </h3>
                  <p className="mt-1 text-mute">{r.why}</p>
                  <ul className="mt-3 space-y-1.5">
                    {r.tips.map((t) => (
                      <li key={t} className="border-l-2 border-peacock pl-3">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-14">
        <H2 aside="in this order">When a day goes wrong anyway</H2>
        <ol className="grid gap-px overflow-hidden rounded-md bg-line sm:grid-cols-2 xl:grid-cols-3">
          {RESET_STEPS.map((s, i) => (
            <li key={s.title} className="bg-paper p-5">
              <p className="display text-xl">
                <span className="mr-2 tabular-nums text-peacock">{i + 1}</span>
                {s.title}
              </p>
              <p className="mt-2 text-[0.95rem] text-mute">{s.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <H2 aside="most in need first">Your nine planets</H2>
        <dl className="grid gap-x-8 gap-y-3 border-y border-line py-4 text-[0.95rem] md:grid-cols-2">
          {modes.map((m) => (
            <div key={m} className="grid grid-cols-[6.5rem_1fr] gap-3">
              <dt>
                <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none ${MODE_STYLE[m]}`}>{MODE_LABEL[m]}</span>
              </dt>
              <dd className="text-mute">{MODE_RULE[m]}</dd>
            </div>
          ))}
        </dl>

        <div>
          {care.map((c) => {
            const r = PLANET_REMEDY[c.planet];
            const info = PLANET_INFO[c.planet];
            const give = c.mode === "settle";
            return (
              <article key={c.planet} className="grid gap-x-10 gap-y-4 border-b border-line py-7 lg:grid-cols-[17rem_1fr]">
                <div>
                  <h3 className="display text-3xl leading-none">
                    {info.ta} <span className="tamil ml-1 text-xl text-peacock">{info.tamil}</span>
                  </h3>
                  <p className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none ${MODE_STYLE[c.mode]}`}>{MODE_LABEL[c.mode]}</span>
                    <span className="text-[0.95rem]">{c.headline}</span>
                  </p>
                  <p className="mt-3 text-sm text-mute">{c.state.join("; ")}.</p>
                  {c.running && <p className="mt-2 text-sm font-semibold text-peacock">{c.running}</p>}
                </div>
                <div className="max-w-[72ch] text-[0.98rem]">
                  <p>{c.why}</p>
                  <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold">Day and worship</dt>
                      <dd className="mt-0.5 text-mute">
                        {r.day}. {r.worship} Deity: {PLANET_DEITY[c.planet]}.
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Give</dt>
                      <dd className="mt-0.5 text-mute">
                        {r.give.charAt(0).toUpperCase() + r.give.slice(1)}, on its day.
                        {give ? " For this planet, giving is the main remedy." : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">{give ? "Colour" : "Wear"}</dt>
                      <dd className="mt-0.5 text-mute">
                        {give ? `Its colour is ${r.colour}; don't make a point of wearing it. Give things of this colour away instead.` : `${r.colour.charAt(0).toUpperCase() + r.colour.slice(1)} on its day, even one item.`}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Chant and temple</dt>
                      <dd className="mt-0.5 text-mute">
                        {r.mantra}, 108 times or as many as you manage. Navagraha temple: {r.temple}.
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 font-semibold">In daily life</p>
                  <ul className="mt-1 grid gap-x-8 gap-y-1 text-mute sm:grid-cols-2">
                    {r.habits.map((h) => (
                      <li key={h} className="border-l-2 border-line pl-3">
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-12 max-w-[72ch] space-y-3 text-[0.95rem] text-mute">
        <H2>Keep in mind</H2>
        <p>
          One practice kept up every week does more than ten started in a panic. Pick the top two or three planets in the list and stay with them for a
          full bhukti.
        </p>
        <p>
          Gemstones are left out on purpose. A stone amplifies a planet for good and for bad, costs real money, and should follow a full reading of the
          chart by someone you trust, not an app.
        </p>
        <p>
          These are traditional practices. They steady the mind and add discipline and generosity to the week, which helps on its own account; they do
          not replace preparation, and the app never counts them in its scores. For the timing side, see your{" "}
          <Link href="/dasa" className="underline">
            period lords in today&rsquo;s sky
          </Link>{" "}
          and your{" "}
          <Link href="/yogas" className="underline">
            yogas
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
