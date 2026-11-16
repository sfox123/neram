"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Graha } from "@/components/Graha";
import { SkyWheel } from "@/components/SkyWheel";
import { Skyline, TierLegend } from "@/components/Skyline";
import { useStore, useStored, useToday } from "@/components/store";
import { FLOW, SARAM_FRESH_MS, SARAM_KEY, SaramCheck } from "@/lib/astro/saram";
import { FactorList, H2, Loading, Meter, TierTag } from "@/components/ui";
import { NAKSHATRA, PLANET_INFO, RASI, WEEKDAYS_TAMIL } from "@/lib/astro/constants";
import { ordinal } from "@/lib/astro/chart";
import { runningDasha } from "@/lib/astro/dasha";
import { ACTIVITY, BIRDS } from "@/lib/astro/pakshi";
import { label } from "@/lib/astro/panchang";
import { ACTIVITIES, ActivityKey, advice, bestWindows, blocks, readAt, TIER, worstWindows } from "@/lib/astro/score";
import { fmtDate, fmtDateLong, fmtDuration, fmtTime } from "@/lib/astro/time";

const ACTIVITY_TAMIL: Record<ActivityKey, string> = {
  overall: "நேரம்",
  work: "வேலை",
  apply: "போட்டி",
  start: "தொடக்கம்",
  money: "பணம்",
  people: "சந்திப்பு",
  travel: "பயணம்",
};

export default function NowPage() {
  const { ready, now, natal, profile } = useStore();
  const day = useToday();
  const [saramCheck] = useStored<SaramCheck | null>(SARAM_KEY, null);
  const [picked, setPicked] = useState<Date | null>(null);
  const [activity, setActivity] = useState<ActivityKey>("overall");

  const at = picked ?? now;
  const reading = useMemo(() => (day ? readAt(day.ctx, at) : null), [day, at]);

  if (!ready || !day || !reading) return <Loading />;

  const tz = profile.here.tz;
  const saram = saramCheck && now.getTime() - saramCheck.at < SARAM_FRESH_MS ? saramCheck : null;
  const tier = reading.tiers.overall;
  const block = blocks(day.segments, "overall").find((b) => at >= b.start && at < b.end);
  const allBlocks = blocks(day.segments, "overall");
  const next = block ? allBlocks[allBlocks.indexOf(block) + 1] : undefined;
  const tips = advice(reading);
  const best = bestWindows(day.segments, activity, now, 15, 4);
  const worst = worstWindows(day.segments, now, 3);
  const dasha = runningDasha(natal.mahas, now);
  const p = day.ctx.panchang;
  const bird = BIRDS[natal.bird];

  return (
    <div>
      <p className="mb-4 text-[0.95rem] text-mute">
        {fmtDate(now, tz, { weekday: "long", month: "long" })}
        <span className="tamil mx-2 text-ink">{WEEKDAYS_TAMIL[day.frame.weekday]}</span>
        {p.tamil.month} {p.tamil.day}, {p.tamil.year} year. {profile.here.name}.
      </p>

      {/* The verdict */}
      <section className={`tier-${tier} relative overflow-hidden rounded-md px-6 pb-7 pt-8 sm:px-10 sm:pb-9 sm:pt-10`}>
        <p className="text-[1.05rem] opacity-85">
          {picked ? `At ${fmtTime(picked, tz)} the time is` : `${profile.name}, right now the time is`}
        </p>
        <span aria-hidden className="verdict-graha pointer-events-none absolute -right-6 -top-6 opacity-[0.16] sm:right-6 sm:top-2">
          <Graha id={reading.hora.value} size={220} />
        </span>
        <p key={tier} className="verdict-word verdict-in relative mt-3 text-[clamp(5.5rem,17vw,12.5rem)]">{TIER[tier].word}</p>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-12 gap-y-5">
          <div>
            <p className="tamil text-2xl sm:text-3xl">{TIER[tier].tamil}</p>
            <p className="display mt-2 text-5xl tabular-nums sm:text-6xl">{fmtTime(at, tz)}</p>
          </div>
          <div className="max-w-[40ch]">
            <p className="text-[1.05rem] leading-snug">{TIER[tier].line}</p>
            {block && (
              <p className="mt-2 text-[0.95rem] opacity-85">
                {picked ? "This stretch runs" : "Holds"} until {fmtTime(block.end, tz)}
                {!picked && ` (${fmtDuration(block.end.getTime() - now.getTime())})`}
                {next ? `, then ${TIER[next.tier].word.toLowerCase()}.` : "."}
              </p>
            )}
            {picked && (
              <button type="button" onClick={() => setPicked(null)} className="mt-3 rounded bg-ink px-3 py-1.5 text-[0.95rem] text-paper">
                Back to now
              </button>
            )}
          </div>
        </div>
      </section>

      {/* What it is good for */}
      <section className="mt-6" aria-label="By kind of activity">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 xl:grid-cols-6">
          {ACTIVITIES.map((a) => (
            <li key={a.key}>
              <button
                type="button"
                onClick={() => setActivity(activity === a.key ? "overall" : a.key)}
                aria-pressed={activity === a.key}
                className={`block w-full rounded px-2 py-2 text-left -mx-2 ${activity === a.key ? "bg-panel" : "hover:bg-panel/60"}`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[0.95rem] font-semibold">
                    {a.label} <span className="tamil ml-1 font-medium text-mute">{ACTIVITY_TAMIL[a.key]}</span>
                  </span>
                  <TierTag tier={reading.tiers[a.key]} />
                </span>
                <span className="mt-2 block">
                  <Meter score={reading.scores[a.key]} tier={reading.tiers[a.key]} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* The day */}
      <section className="mt-10">
        <H2 tamil={activity === "overall" ? "இன்று" : ACTIVITY_TAMIL[activity]} aside={<TierLegend />}>
          {activity === "overall" ? "Today, sunrise to sunrise" : `Today for ${ACTIVITIES.find((a) => a.key === activity)!.label.toLowerCase()}`}
        </H2>
        <Skyline frame={day.frame} segments={day.segments} activity={activity} now={now} selected={picked} onPick={setPicked} />
      </section>

      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[1.15fr_1fr]">
        {/* Why */}
        <section>
          <H2 tamil="ஏன்" aside={`Score ${reading.scores[activity]} of 100, starting from 49`}>Why</H2>
          <FactorList factors={reading.factors} activity={activity} limit={8} />
          <p className="mt-3 text-sm text-mute">
            Each line adds to or takes from the score.{" "}
            <Link href="/setup#method" className="text-peacock underline underline-offset-2">
              How the score is built
            </Link>
          </p>
        </section>

        <div className="space-y-10">
          {/* Do and don't */}
          <section>
            <H2 tamil="இப்போது">{picked ? `At ${fmtTime(picked, tz)}` : "Right now"}</H2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 font-semibold text-go">
                  Do <span className="tamil ml-1 font-medium">செய்</span>
                </h3>
                <ul className="space-y-2 text-[0.95rem]">
                  {tips.dos.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-avoid">
                  Don&rsquo;t <span className="tamil ml-1 font-medium">தவிர்</span>
                </h3>
                {tips.donts.length ? (
                  <ul className="space-y-2 text-[0.95rem]">
                    {tips.donts.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[0.95rem] text-mute">Nothing in particular to avoid.</p>
                )}
              </div>
            </div>
          </section>

          {/* Windows */}
          <section>
            <H2 tamil="நல்ல நேரம்" aside={<Link href="/day" className="text-peacock underline underline-offset-2">Full day plan</Link>}>
              Best windows still ahead
            </H2>
            {best.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {best.map((b) => (
                  <li key={b.start.getTime()} className="flex items-center justify-between gap-3 py-2.5">
                    <button type="button" className="text-left hover:underline" onClick={() => setPicked(new Date(Math.max(b.start.getTime(), now.getTime()) + 60000))}>
                      <span className="font-semibold tabular-nums">
                        {fmtTime(b.start, tz)} to {fmtTime(b.end, tz)}
                      </span>
                      <span className="ml-2 text-sm text-mute">{fmtDuration(b.end.getTime() - b.start.getTime())}</span>
                    </button>
                    <TierTag tier={b.tier} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[0.95rem] text-mute">No strong window is left before the next sunrise. Use the time to prepare.</p>
            )}
            {worst.length > 0 && (
              <p className="mt-3 text-[0.95rem] text-mute">
                Keep clear of{" "}
                {worst.map((w, i) => (
                  <span key={w.start.getTime()}>
                    {i > 0 && (i === worst.length - 1 ? " and " : ", ")}
                    <span className="font-semibold text-ink tabular-nums">
                      {fmtTime(w.start, tz)} to {fmtTime(w.end, tz)}
                    </span>
                  </span>
                ))}
                .
              </p>
            )}
          </section>
        </div>
      </div>

      {/* What is running */}
      <section className="mt-12">
        <H2 tamil="நடப்பு">Running at this moment</H2>
        <div className="grid gap-x-10 gap-y-8 border-t border-line pt-6 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
        <SkyWheel at={now} latitude={profile.here.latitude} longitude={profile.here.longitude} natalMoonSign={natal.moonSign} className="mx-auto w-full max-w-[22rem] lg:mx-0" />
        <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
          <Item term="Dasa, bhukti, antaram" tamil="தசை" href="/dasa">
            {dasha ? (
              <>
                <strong className="inline-flex flex-wrap items-center gap-x-1.5">
                  <Graha id={dasha.maha.lord} size={18} /> <span className="tamil">{PLANET_INFO[dasha.maha.lord].tamil}</span>
                  <span className="text-mute">/</span>
                  <Graha id={dasha.bhukti.lord} size={18} /> <span className="tamil">{PLANET_INFO[dasha.bhukti.lord].tamil}</span>
                  <span className="text-mute">/</span>
                  <Graha id={dasha.antaram.lord} size={18} /> <span className="tamil">{PLANET_INFO[dasha.antaram.lord].tamil}</span>
                </strong>
                <br />
                Antaram until {fmtDateLong(dasha.antaram.end, tz)}; bhukti until {fmtDateLong(dasha.bhukti.end, tz)}.
              </>
            ) : (
              "Outside the 120-year dasa range."
            )}
          </Item>
          <Item term="Pancha Pakshi" tamil="பஞ்ச பட்சி" href="/pakshi">
            <strong>
              <span className="tamil">{bird.tamil}</span> {bird.ta} is {ACTIVITY[reading.yama.activity].en.toLowerCase()}{" "}
              <span className="tamil font-medium text-peacock">{ACTIVITY[reading.yama.activity].tamil}</span>
            </strong>
            <br />
            Yama {ACTIVITY[reading.yama.activity].ta} until {fmtTime(reading.yama.end, tz)}; sub-period {ACTIVITY[reading.sub.activity].ta} until{" "}
            {fmtTime(reading.sub.end, tz)}.
          </Item>
          <Item term="Hora" tamil="ஓரை">
            <strong>
              <Graha id={reading.hora.value} size={18} /> <span className="tamil">{PLANET_INFO[reading.hora.value].tamil}</span> hora
            </strong>{" "}
            until {fmtTime(reading.hora.end, tz)}
            <br />
            Gowri: {reading.gowri.value} until {fmtTime(reading.gowri.end, tz)}.
          </Item>
          {profile.timeConfirmed && (
            <Item term="Rising lagna" tamil="லக்னம்" href="/day">
              <strong>
                <span className="tamil">{RASI[reading.rising.value].tamil}</span> {RASI[reading.rising.value].ta}
              </strong>{" "}
              until {fmtTime(reading.rising.end, tz)}
              <br />
              Your {ordinal(((reading.rising.value - natal.lagnaSign + 12) % 12) + 1)} house from {RASI[natal.lagnaSign].ta} lagna.
            </Item>
          )}
          <Item term="Saram (breath)" tamil="சரம்" href="/saram">
            {saram ? (
              <>
                <strong>{FLOW[saram.flow].name}</strong>
                <br />
                Checked at {fmtTime(new Date(saram.at), tz)}. {saram.flow === "both" ? "Stay still until one side takes over." : saram.flow === "right" ? "Suits effort, contest and hard work." : "Suits lasting starts, money and asks."}
              </>
            ) : (
              "Not checked in the last hour. Check which nostril is flowing."
            )}
          </Item>
          <Item term="Moon" tamil="சந்திரன்" href="/sky">
            <strong>
              <Graha id="Mo" size={18} /> <span className="tamil">{RASI[reading.moonSign].tamil}</span>, <span className="tamil">{NAKSHATRA[reading.star.value].tamil}</span>
            </strong>
            <br />
            {reading.tara.name} tara for you; Moon is {reading.chandra.house === 8 ? "in Chandrashtamam" : `${ordinal(reading.chandra.house)} from your rasi`}.
          </Item>
          <Item term="Tithi and yoga" tamil="திதி" href="/day">
            <strong>{label.tithi(reading.tithi.value)}</strong> until {fmtTime(reading.tithi.end, tz)}
            <br />
            {label.yoga(reading.yoga.value)} yoga, {label.karana(reading.karana.value)} karana.
          </Item>
          <Item term="Today's fixed periods" tamil="ராகு காலம்" href="/day">
            Rahu kalam {fmtTime(p.rahu.start, tz)} to {fmtTime(p.rahu.end, tz)}
            <br />
            Yamagandam {fmtTime(p.yamagandam.start, tz)} to {fmtTime(p.yamagandam.end, tz)}
            {p.abhijit && (
              <>
                <br />
                Abhijit {fmtTime(p.abhijit.start, tz)} to {fmtTime(p.abhijit.end, tz)}
              </>
            )}
          </Item>
        </dl>
        </div>
      </section>
    </div>
  );
}

function Item({ term, tamil, href, children }: { term: string; tamil?: string; href?: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-mute">
        {href ? (
          <Link href={href} className="underline decoration-line underline-offset-4 hover:decoration-peacock">
            {term}
          </Link>
        ) : (
          term
        )}
        {tamil && <span className="tamil ml-2 text-peacock">{tamil}</span>}
      </dt>
      <dd className="mt-1 text-[0.95rem] leading-relaxed">{children}</dd>
    </div>
  );
}
