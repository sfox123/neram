"use client";

import { useStore } from "@/components/store";
import { H2, Loading, PageTitle } from "@/components/ui";
import { functionalRole, Natal, rulesText } from "@/lib/astro/chart";
import { DASHA_YEARS, NAKSHATRA, PLANET_INFO, PlanetId } from "@/lib/astro/constants";
import { DashaPeriod, runningDasha, subPeriods } from "@/lib/astro/dasha";
import { dailyMotion } from "@/lib/astro/ephemeris";
import { fmtDateLong, fmtDuration, MS_DAY } from "@/lib/astro/time";

const ROLE_NOTE = {
  yogakaraka: "Yogakaraka for your lagna: its periods lift career and luck together.",
  good: "A helpful planet for your lagna.",
  neutral: "Neutral for your lagna; results follow where it sits.",
  mixed: "Mixed: gives with one hand and tests with the other.",
  hard: "A difficult lord for your lagna: effort, obstacles and clean-ups.",
};

function lordLine(n: Natal, lord: PlanetId) {
  return `${PLANET_INFO[lord].en} ${rulesText(n, lord)}. ${n.profile.timeConfirmed ? ROLE_NOTE[functionalRole(n, lord)] : ""}`;
}

function span(ms: number) {
  const days = ms / MS_DAY;
  if (days >= 365) return `${(days / 365.25).toFixed(1)} years`;
  if (days >= 60) return `${Math.round(days / 30.44)} months`;
  if (days >= 2) return `${Math.round(days)} days`;
  return fmtDuration(ms);
}

export default function DasaPage() {
  const { ready, now, natal, profile } = useStore();
  if (!ready) return <Loading />;
  const tz = profile.here.tz;
  const run = runningDasha(natal.mahas, now);
  if (!run) return <p>These dates fall outside the 120-year dasa cycle that starts at your birth.</p>;

  const levels: { name: string; tamil: string; p: DashaPeriod }[] = [
    { name: "Dasa", tamil: "தசை", p: run.maha },
    { name: "Bhukti", tamil: "புக்தி", p: run.bhukti },
    { name: "Antaram", tamil: "அந்தரம்", p: run.antaram },
    { name: "Sookshma", tamil: "சூட்சுமம்", p: run.sookshma },
  ];
  const d = (x: Date) => fmtDateLong(x, tz);
  const firstLord = natal.mahas[0].lord;
  // How far the dates move for each minute of birth-time error.
  const daysPerMinute = ((dailyMotion("Mo", natal.birth) / 1440) / (360 / 27)) * DASHA_YEARS[firstLord] * 365.25;

  const table = (title: string, list: DashaPeriod[], current: DashaPeriod, note: string) => (
    <section>
      <H2 aside={note}>{title}</H2>
      <ol className="border-t border-line">
        {list.map((p) => {
          const isNow = p.start.getTime() === current.start.getTime();
          const past = p.end <= now;
          return (
            <li key={p.start.getTime()} className={`grid grid-cols-[6.5rem_1fr] gap-x-4 border-b border-line py-2.5 sm:grid-cols-[7.5rem_15rem_1fr] ${isNow ? "bg-panel px-3 -mx-3" : ""} ${past ? "text-mute" : ""}`}>
              <span className="font-semibold">
                {PLANET_INFO[p.lord].ta}
                {isNow && <span className="ml-2 rounded-sm bg-deep px-1.5 py-0.5 text-[0.7rem] font-semibold text-paper">now</span>}
              </span>
              <span className="tabular-nums">
                {d(p.start)} to {d(p.end)}
              </span>
              <span className="col-span-2 text-[0.9rem] text-mute sm:col-span-1">{lordLine(natal, p.lord)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );

  return (
    <div>
      <PageTitle title="Dasa, bhukti, antaram" tamil="தசா புக்தி">
        Vimshottari dasa counted from your Moon in {NAKSHATRA[natal.star].ta}. The dasa sets the decade, the bhukti the year, the antaram the weeks, and the
        sookshma the days.
      </PageTitle>

      <section className="mb-12 grid gap-px overflow-hidden rounded-md bg-line sm:grid-cols-2 xl:grid-cols-4">
        {levels.map((l) => {
          const total = l.p.end.getTime() - l.p.start.getTime();
          const done = Math.min(1, Math.max(0, (now.getTime() - l.p.start.getTime()) / total));
          return (
            <div key={l.name} className="bg-paper p-5">
              <p className="text-sm text-mute">
                {l.name} <span className="tamil">{l.tamil}</span>
              </p>
              <p className="display mt-1 text-4xl">{PLANET_INFO[l.p.lord].ta}</p>
              <p className="tamil text-lg text-peacock">{PLANET_INFO[l.p.lord].tamil}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-sm bg-ink/10" role="img" aria-label={`${Math.round(done * 100)} percent elapsed`}>
                <div className="h-full bg-peacock" style={{ width: `${done * 100}%` }} />
              </div>
              <p className="mt-2 text-[0.9rem] tabular-nums">
                until {d(l.p.end)}
                <span className="block text-mute">{span(l.p.end.getTime() - now.getTime())} left of {span(total)}</span>
              </p>
            </div>
          );
        })}
      </section>

      <section className="mb-12 max-w-[72ch]">
        <H2>What the running lords mean for you</H2>
        <ul className="space-y-3 border-t border-line pt-4 text-[0.98rem]">
          {levels.slice(0, 3).map((l) => (
            <li key={l.name}>
              <strong>
                {l.name} lord {PLANET_INFO[l.p.lord].ta}:
              </strong>{" "}
              {lordLine(natal, l.p.lord)} Signifies {PLANET_INFO[l.p.lord].karaka}.
            </li>
          ))}
        </ul>
        {!profile.timeConfirmed && (
          <p className="mt-4 rounded border border-hold/60 bg-hold/15 px-3 py-2 text-[0.95rem]">
            These dates assume a {profile.birthTime} birth. Each minute of difference moves every date by about {Math.abs(daysPerMinute).toFixed(1)} days, so
            set your real birth time before relying on them.
          </p>
        )}
      </section>

      <div className="space-y-12">
        {table(`Antarams in ${PLANET_INFO[run.bhukti.lord].ta} bhukti`, subPeriods(run.bhukti), run.antaram, "the coming weeks")}
        {table(`Bhuktis in ${PLANET_INFO[run.maha.lord].ta} dasa`, subPeriods(run.maha), run.bhukti, "the coming years")}
        {table("All dasas", natal.mahas, run.maha, "your 120-year cycle")}
      </div>

      {profile.timeConfirmed && (
        <p className="mt-8 max-w-[70ch] text-sm text-mute">
          Dates use a 365.25-day year. Each minute of error in the birth time moves them by about {Math.abs(daysPerMinute).toFixed(1)} days.
        </p>
      )}
    </div>
  );
}
