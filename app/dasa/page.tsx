"use client";

import Link from "next/link";
import { useStore, useToday } from "@/components/store";
import { H2, Loading, PageTitle } from "@/components/ui";
import { functionalRole, Natal, ordinal, rulesText } from "@/lib/astro/chart";
import { DASHA_YEARS, NAKSHATRA, PLANET_INFO, PlanetId, RASI } from "@/lib/astro/constants";
import { LordTransit, PowerWord } from "@/lib/astro/dashaTransit";
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
  const day = useToday();
  if (!ready) return <Loading />;
  const tz = profile.here.tz;
  const gocharam = day?.ctx.gocharam ?? null;
  const run = runningDasha(natal.mahas, now);
  if (!run) return <p>These dates fall outside the 120-year dasa cycle that starts at your birth.</p>;

  const levels: { name: string; tamil: string; p: DashaPeriod }[] = [
    { name: "Dasa", tamil: "தசை", p: run.maha },
    { name: "Bhukti", tamil: "புக்தி", p: run.bhukti },
    { name: "Antaram", tamil: "அந்தரம்", p: run.antaram },
    { name: "Sookshma", tamil: "சூட்சுமம்", p: run.sookshma },
  ];
  const d = (x: Date) => fmtDateLong(x, tz);
  // The same planet can hold two levels at once; show it once.
  const uniqueLords: { l: LordTransit; levels: string[] }[] = [];
  for (const l of gocharam?.lords ?? []) {
    const hit = uniqueLords.find((u) => u.l.lord === l.lord);
    if (hit) hit.levels.push(l.level);
    else uniqueLords.push({ l, levels: [l.level] });
  }
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

      {gocharam && (
        <section className="mb-14">
          <H2 aside={`together: ${gocharam.word.toLowerCase()}`}>Your period lords in today&rsquo;s sky</H2>
          <p className="mb-5 max-w-[72ch] text-[0.98rem] text-mute">
            The birth chart says what a period promises; the transit (gocharam) of its lord says how well it can deliver this month. Each lord is weighed
            on the sign it is crossing, its own Ashtakavarga points there, the house it is passing through, and what Guru and Sani are doing to its birth
            position. This feeds the scores on every page.
          </p>
          <div className={`grid gap-px overflow-hidden rounded-md bg-line ${uniqueLords.length === 3 ? "lg:grid-cols-3" : uniqueLords.length === 2 ? "lg:grid-cols-2" : ""}`}>
            {uniqueLords.map((u) => (
              <LordPanel key={u.l.lord} l={u.l} levels={u.levels} d={d} />
            ))}
          </div>
          {gocharam.pairs.length > 0 && (
            <ul className="mt-5 max-w-[76ch] space-y-2 text-[0.98rem]">
              {gocharam.pairs.map((p) => (
                <li key={p.title} className={`border-l-2 pl-3 ${p.tone === "good" ? "border-go" : p.tone === "bad" ? "border-avoid" : "border-line"}`}>
                  <strong>{p.title}.</strong> <span className="text-mute">{p.detail}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm text-mute">
            If a lord is strained, its remedies are on{" "}
            <Link href="/remedies" className="underline">
              Strengthen and recover
            </Link>
            . The yogas these lords switch on are on{" "}
            <Link href="/yogas" className="underline">
              Yogas
            </Link>
            .
          </p>
        </section>
      )}

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

const WORD_TIER: Record<PowerWord, string> = { Strong: "tier-go", Supported: "tier-good", Mixed: "tier-steady", Strained: "tier-hold", Weak: "tier-avoid" };

function LordPanel({ l, levels, d }: { l: LordTransit; levels: string[]; d: (x: Date) => string }) {
  const info = PLANET_INFO[l.lord];
  const joined = levels.join(" and ");
  const level = joined.charAt(0).toUpperCase() + joined.slice(1);
  return (
    <div className="flex flex-col bg-paper">
      <div className={`${WORD_TIER[l.word]} p-5`}>
        <p className="opacity-85">
          {level} lord {info.ta}
        </p>
        <p className="verdict-word mt-2 text-4xl">{l.word}</p>
        <p className="mt-2 text-[0.95rem] opacity-90">
          In {RASI[l.sign].ta}, your {ordinal(l.houseFromLagna)} house
          {l.retro && l.lord !== "Ra" && l.lord !== "Ke" ? ", retrograde" : ""}
        </p>
      </div>
      <div className="flex-1 p-5">
        <p className="text-[0.95rem]">{l.summary}</p>
        <ul className="mt-4 divide-y divide-line border-y border-line text-[0.92rem]">
          {l.points.map((p) => (
            <li key={p.label} className="grid grid-cols-[2.6rem_1fr] gap-x-2 py-2">
              <span className={`text-right font-semibold tabular-nums ${p.value > 0 ? "text-go" : p.value < 0 ? "text-avoid" : "text-mute"}`}>
                {p.value > 0 ? "+" : p.value < 0 ? "−" : ""}
                {p.value === 0 ? "0" : Math.abs(p.value)}
              </span>
              <span>
                <span className="font-semibold">{p.label}.</span> <span className="text-mute">{p.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[0.92rem] text-mute">
          Leaves {RASI[l.sign].ta} on {d(l.until)} for {RASI[l.next.sign].ta} ({l.next.bav} points there)
          {l.next.better === null ? ", about the same strength." : l.next.better ? ", where it is stronger." : ", where it is weaker."}
        </p>
      </div>
    </div>
  );
}
