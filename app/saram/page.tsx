"use client";

import { useMemo } from "react";
import { useStore, useStored, useToday } from "@/components/store";
import { H2, Loading, PageTitle, TierTag } from "@/components/ui";
import { WEEKDAYS } from "@/lib/astro/constants";
import { dawnFlowTamil, Flow, FLOW, SARAM_FRESH_MS, SARAM_KEY, SaramCheck, sunriseFlowSwarodaya, SWITCH_TIPS } from "@/lib/astro/saram";
import { ACTIVITIES, readAt, TIER } from "@/lib/astro/score";
import { fmtTime } from "@/lib/astro/time";

const CHOICES: { flow: Flow; label: string; sub: string }[] = [
  { flow: "left", label: "Left", sub: "Chandra kalai" },
  { flow: "right", label: "Right", sub: "Surya kalai" },
  { flow: "both", label: "Both", sub: "Suzhumunai" },
];

export default function SaramPage() {
  const { ready, now, profile } = useStore();
  const day = useToday();
  const [check, setCheck] = useStored<SaramCheck | null>(SARAM_KEY, null);
  const reading = useMemo(() => (day ? readAt(day.ctx, now) : null), [day, now]);
  if (!ready || !day || !reading) return <Loading />;

  const tz = profile.here.tz;
  const fresh = check && now.getTime() - check.at < SARAM_FRESH_MS ? check : null;
  const info = fresh ? FLOW[fresh.flow] : null;
  const p = day.ctx.panchang;
  const dawn = dawnFlowTamil(day.frame.weekday, p.paksha);
  const swar = sunriseFlowSwarodaya(p.tithi[0].value);

  return (
    <div>
      <PageTitle title="Saram" tamil="சர வித்தை">
        Your breath favours one nostril at a time and changes sides every hour or two. Sara sastram reads that side as the kind of action the moment
        suits. Check it, tell the app, and it is weighed with the time.
      </PageTitle>

      <section className="rounded-md bg-deep px-6 py-7 text-paper sm:px-9">
        <h2 className="display text-2xl">Which nostril is flowing now?</h2>
        <p className="mt-2 max-w-[62ch] text-[0.95rem] text-paper/80">
          Close one nostril with a finger and breathe out onto the back of your hand, then the other. The side with the stronger, freer stream is the one
          that is flowing.
        </p>
        <div className="mt-5 grid max-w-xl grid-cols-3 gap-3" role="group" aria-label="Flowing nostril">
          {CHOICES.map((c) => {
            const on = fresh?.flow === c.flow;
            return (
              <button
                key={c.flow}
                type="button"
                aria-pressed={on}
                onClick={() => setCheck({ flow: c.flow, at: now.getTime() })}
                className={`rounded px-3 py-3 text-left ${on ? "bg-steady text-ink" : "bg-paper/10 text-paper hover:bg-paper/20"}`}
              >
                <span className="display block text-2xl">{c.label}</span>
                <span className="block text-sm opacity-80">{c.sub}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-[0.95rem] text-paper/80" role="status">
          {fresh
            ? `Checked at ${fmtTime(new Date(fresh.at), tz)}. Check again after about an hour, or sooner if you notice it change.`
            : check
              ? "Your last check is more than an hour old. Check again."
              : "Not checked yet."}
        </p>
      </section>

      {info && fresh && (
        <>
          <section className="mt-10">
            <H2 aside={<span className="tamil text-lg text-peacock">{info.tamil}</span>}>{info.name}</H2>
            <p className="max-w-[66ch] text-[1.05rem]">{info.nature}</p>
            <div className="mt-6 grid gap-x-12 gap-y-8 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-semibold text-go">Do</h3>
                <ul className="space-y-2 border-t border-line pt-3 text-[0.95rem]">
                  {info.dos.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-avoid">Don&rsquo;t</h3>
                <ul className="space-y-2 border-t border-line pt-3 text-[0.95rem]">
                  {info.donts.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-6 max-w-[66ch] text-[0.95rem] text-mute">
              {info.foot} {info.direction}
            </p>
          </section>

          <section className="mt-12">
            <H2 aside={`Time verdict at ${fmtTime(now, tz)}: ${TIER[reading.tiers.overall].word}`}>Breath and time together</H2>
            <p className="mb-4 max-w-[66ch] text-[0.95rem] text-mute">
              The best moment is when the clock and the breath agree. If the time is good but the breath is on the wrong side, change the breath (see below)
              before you act.
            </p>
            <ul className="border-t border-line">
              {ACTIVITIES.map((a) => {
                const tier = reading.tiers[a.key];
                const fit = info.fit[a.key];
                const timeGood = tier === "go" || tier === "good";
                const timeBad = tier === "hold" || tier === "avoid";
                const verdict =
                  fit > 0 && timeGood ? "Both agree: act now."
                  : fit > 0 && timeBad ? "Breath suits it, but the time is weak: prepare, then act in the next good window."
                  : fit > 0 ? "Breath suits it; the time is ordinary. Fine for small things."
                  : fit < 0 && timeGood ? "Time is good, breath is on the wrong side: switch the breath first."
                  : fit < 0 ? "Neither favours it: leave it for now."
                  : timeGood ? "Time is good; the breath is neutral for this. Go ahead."
                  : timeBad ? "Time is weak and the breath adds nothing: wait."
                  : "Ordinary on both counts.";
                return (
                  <li key={a.key} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 border-b border-line py-3 sm:grid-cols-[11rem_5rem_7rem_1fr]">
                    <span className="font-semibold">{a.label}</span>
                    <span>
                      <TierTag tier={tier} />
                    </span>
                    <span className={`text-[0.9rem] ${fit > 0 ? "text-go" : fit < 0 ? "text-avoid" : "text-mute"}`}>
                      Breath {fit > 0 ? "suits" : fit < 0 ? "against" : "neutral"}
                    </span>
                    <span className="col-span-2 text-[0.95rem] sm:col-span-1">{verdict}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <div className="mt-12 grid gap-x-12 gap-y-10 lg:grid-cols-2">
        <section>
          <H2>What today expects</H2>
          <dl className="space-y-4 border-t border-line pt-4 text-[0.95rem]">
            <div>
              <dt className="text-sm text-mute">Tamil sara nool, at dawn (4 to 6 am)</dt>
              <dd className="mt-1">
                On a {WEEKDAYS[day.frame.weekday]}
                {day.frame.weekday === 4 ? ` in ${p.paksha === 0 ? "valarpirai" : "theipirai"}` : ""} the breath should be in the{" "}
                <strong>{dawn} nostril</strong> ({FLOW[dawn].tamil}). Monday, Wednesday and Friday belong to the left; Sunday, Tuesday and Saturday to the
                right; Thursday follows the fortnight.
              </dd>
            </div>
            <div>
              <dt className="text-sm text-mute">Siva Swarodaya, at sunrise ({fmtTime(day.frame.sunrise, tz)})</dt>
              <dd className="mt-1">
                By the tithi at sunrise the breath should be in the <strong>{swar} nostril</strong>. This rule changes side every three tithis.
              </dd>
            </div>
          </dl>
          <p className="mt-4 max-w-[60ch] text-sm text-mute">
            The two traditions use different rules and can disagree. Both say the same thing about a mismatch: if your breath was on the other side at
            dawn, treat the day as slightly out of tune and correct it by switching the breath.
          </p>
        </section>

        <section>
          <H2>How to switch sides</H2>
          <ul className="space-y-3 border-t border-line pt-4 text-[0.95rem]">
            {SWITCH_TIPS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="mt-4 max-w-[60ch] text-sm text-mute">
            A blocked nose from a cold or allergy is not a reading. If one side stays blocked for days, that is a matter for a doctor, not for saram.
          </p>
        </section>
      </div>
    </div>
  );
}
