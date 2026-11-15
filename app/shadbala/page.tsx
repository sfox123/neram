"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/components/store";
import { H2, Loading, PageTitle } from "@/components/ui";
import { ordinal } from "@/lib/astro/chart";
import { PLANET_INFO, PlanetId, RASI, signOf } from "@/lib/astro/constants";
import { runningDasha } from "@/lib/astro/dasha";
import { BalaWord, balaWord, Graha, GRAHAS, Part, PlanetBala, REQUIRED_PARTS, shadbala } from "@/lib/astro/shadbala";

const WORD_TIER: Record<BalaWord, string> = { "Very strong": "tier-go", Strong: "tier-good", Passes: "tier-steady", Short: "tier-hold", Weak: "tier-avoid" };
const name = (p: PlanetId) => PLANET_INFO[p].ta;
const v = (x: number) => (Math.round(x * 10) / 10).toFixed(1);

const SIX: { key: "sthana" | "dig" | "kala" | "cheshta" | "naisargika" | "drik"; label: string; what: string }[] = [
  { key: "sthana", label: "Sthana", what: "position" },
  { key: "dig", label: "Dig", what: "direction" },
  { key: "kala", label: "Kala", what: "time" },
  { key: "cheshta", label: "Cheshta", what: "motion" },
  { key: "naisargika", label: "Naisargika", what: "natural rank" },
  { key: "drik", label: "Drik", what: "aspects" },
];

function PartRows({ parts }: { parts: Part[] }) {
  return (
    <ul className="mt-1 divide-y divide-line/70 text-[0.9rem]">
      {parts.map((p) => (
        <li key={p.label} className="grid grid-cols-[3.2rem_1fr] gap-x-3 py-1.5">
          <span className="text-right font-semibold tabular-nums">{v(p.value)}</span>
          <span>
            {p.label}. <span className="text-mute">{p.note}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Detail({ b }: { b: PlanetBala }) {
  const need = REQUIRED_PARTS[b.planet];
  const row = (label: string, value: number, pass: number | null, note: string) => (
    <div className="grid grid-cols-[3.2rem_1fr] gap-x-3 border-t border-line py-2">
      <span className={`text-right font-semibold tabular-nums ${pass !== null && value < pass ? "text-avoid" : ""}`}>{v(value)}</span>
      <span>
        <span className="font-semibold">{label}</span>
        {pass !== null && <span className="text-mute"> (needs {pass})</span>}. <span className="text-mute">{note}</span>
      </span>
    </div>
  );
  return (
    <div className="pb-2 text-[0.93rem]">
      <div className="grid grid-cols-[3.2rem_1fr] gap-x-3 border-t border-line py-2">
        <span className={`text-right font-semibold tabular-nums ${b.sthana < need.sthana ? "text-avoid" : ""}`}>{v(b.sthana)}</span>
        <div>
          <span className="font-semibold">Sthana bala</span>
          <span className="text-mute"> (needs {need.sthana}). Strength of position, in five parts:</span>
          <PartRows parts={b.parts.sthana} />
        </div>
      </div>
      {row("Dig bala", b.dig, need.dig, b.notes.dig)}
      <div className="grid grid-cols-[3.2rem_1fr] gap-x-3 border-t border-line py-2">
        <span className={`text-right font-semibold tabular-nums ${b.kala < need.kala ? "text-avoid" : ""}`}>{v(b.kala)}</span>
        <div>
          <span className="font-semibold">Kala bala</span>
          <span className="text-mute"> (needs {need.kala}). Strength of the hour you were born, in five parts:</span>
          <PartRows parts={b.parts.kala} />
        </div>
      </div>
      {row("Cheshta bala", b.cheshta, need.cheshta, b.notes.cheshta)}
      {row("Naisargika bala", b.naisargika, null, "Fixed for every chart: the Sun highest, Sani lowest.")}
      {row("Drik bala", b.drik, null, b.notes.drik)}
      <p className="border-t border-line pt-2 text-mute">
        Ishta {v(b.ishta)} and kashta {v(b.kashta)} of 60: of what this planet gives in its periods, about {Math.round((b.ishta / Math.max(1, b.ishta + b.kashta)) * 100)}% leans to the
        wanted side.
      </p>
    </div>
  );
}

export default function ShadbalaPage() {
  const { ready, now, natal, profile } = useStore();
  const sb = useMemo(() => (ready && profile.timeConfirmed ? shadbala(natal) : null), [ready, natal, profile.timeConfirmed]);

  if (!ready) return <Loading />;
  if (!profile.timeConfirmed || !sb)
    return (
      <div>
        <PageTitle title="Shadbala" tamil="ஷட்பலம்">
          Directional and temporal strength turn on the lagna and the hour of birth, so Shadbala needs your birth time.
        </PageTitle>
        <Link href="/setup" className="underline">
          Add your birth time in Setup
        </Link>
      </div>
    );

  const strongest = sb.planets[sb.order[0]];
  const weakest = sb.planets[sb.order[sb.order.length - 1]];
  const failing = GRAHAS.filter((p) => sb.planets[p].ratio < 1);
  const run = runningDasha(natal.mahas, now);
  const lords: { level: string; lord: PlanetId }[] = run ? [{ level: "Dasa", lord: run.maha.lord }, { level: "Bhukti", lord: run.bhukti.lord }, { level: "Antaram", lord: run.antaram.lord }] : [];
  const maxRatio = Math.max(1.6, ...GRAHAS.map((p) => sb.planets[p].ratio));
  const lowDig = GRAHAS.filter((p) => sb.planets[p].dig < 10);
  const highCheshta = (["Ma", "Me", "Ju", "Ve", "Sa"] as Graha[]).filter((p) => natal.retro[p]);

  return (
    <div>
      <PageTitle title="Shadbala" tamil="ஷட்பலம்">
        The classical six-fold strength of each planet, after Parashara. Six separate measurements add up to one figure in rupas, and every planet has its
        own pass mark. It answers a narrow question well: does this planet have the strength to deliver what its place in the chart promises?
      </PageTitle>

      <section className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[1fr_1.25fr]">
        <div className="bg-deep p-6 text-paper sm:p-8">
          <p className="text-paper/70">Strongest for its need</p>
          <p className="verdict-word mt-2 text-6xl leading-none sm:text-7xl">{name(strongest.planet)}</p>
          <p className="mt-4 max-w-[44ch] text-[1.02rem] text-paper/90">
            {strongest.rupas.toFixed(2)} rupas against the {strongest.required} it needs, {strongest.ratio.toFixed(2)} times its pass mark. It is in{" "}
            {RASI[signOf(natal.positions[strongest.planet])].ta}, your {ordinal(natal.house[strongest.planet])} house.
          </p>
        </div>
        <div className="bg-paper p-6 sm:p-8">
          <p className="text-mute">What stands out</p>
          <ul className="mt-3 space-y-3 text-[0.98rem]">
            <li>
              <strong>{failing.length === 0 ? "Every planet passes." : `${failing.map(name).join(", ")} ${failing.length === 1 ? "falls" : "fall"} short.`}</strong>{" "}
              <span className="text-mute">
                {failing.length === 0
                  ? `The weakest is ${name(weakest.planet)} at ${weakest.ratio.toFixed(2)} times its pass mark.`
                  : `${name(weakest.planet)} is lowest at ${weakest.rupas.toFixed(2)} rupas of the ${weakest.required} it needs. Its periods ask for more effort, and its remedies are worth keeping.`}
              </span>
            </li>
            {highCheshta.length > 0 && (
              <li>
                <strong>Retrograde at birth: {highCheshta.map(name).join(", ")}.</strong>{" "}
                <span className="text-mute">
                  Motion strength is {highCheshta.map((p) => `${v(sb.planets[p].cheshta)} for ${name(p)}`).join(" and ")} of 60. A planet turning back is close to the Earth and
                  bright, which this measure rewards.
                </span>
              </li>
            )}
            {lowDig.length > 0 && (
              <li>
                <strong>Almost no directional strength: {lowDig.map(name).join(", ")}.</strong>{" "}
                <span className="text-mute">{lowDig.map((p) => `${name(p)} has ${v(sb.planets[p].dig)} of 60. ${sb.planets[p].notes.dig}`).join(" ")}</span>
              </li>
            )}
            {sb.wars.length > 0 && (
              <li>
                <strong>Planetary war: {sb.wars.map(([a, b]) => `${name(a)} and ${name(b)}`).join("; ")}.</strong>{" "}
                <span className="text-mute">They are within a degree of each other. The adjustment for war is not applied here, so read their figures with care.</span>
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <H2 aside="rupas, against each planet's own pass mark">The seven planets</H2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-[0.95rem]">
            <thead>
              <tr className="border-b border-ink/40 text-left text-sm text-mute">
                <th className="py-2 pr-3 font-normal">Planet</th>
                {SIX.map((s) => (
                  <th key={s.key} className="px-2 py-2 text-right font-normal" title={s.what}>
                    {s.label}
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-normal">Rupas</th>
                <th className="px-2 py-2 text-right font-normal">Needs</th>
                <th className="py-2 pl-3 font-normal">Against its pass mark</th>
              </tr>
            </thead>
            <tbody>
              {sb.order.map((p) => {
                const b = sb.planets[p];
                const word = balaWord(b.ratio);
                return (
                  <tr key={p} className="border-b border-line">
                    <td className="py-2.5 pr-3 font-semibold">
                      {name(p)}
                      {natal.retro[p] && p !== "Su" && p !== "Mo" ? <span className="ml-1 font-normal text-mute">(R)</span> : null}
                    </td>
                    {SIX.map((s) => (
                      <td key={s.key} className="px-2 py-2.5 text-right tabular-nums">
                        {v(b[s.key])}
                      </td>
                    ))}
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{b.rupas.toFixed(2)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-mute">{b.required}</td>
                    <td className="py-2.5 pl-3">
                      <span className="flex items-center gap-2">
                        <span className="relative block h-2 w-28 overflow-hidden rounded-sm bg-ink/10" role="img" aria-label={`${b.ratio.toFixed(2)} times the pass mark`}>
                          <span className={`${WORD_TIER[word]} block h-full`} style={{ width: `${Math.min(100, (b.ratio / maxRatio) * 100)}%` }} />
                          <span aria-hidden className="absolute inset-y-0 w-px bg-ink" style={{ left: `${(1 / maxRatio) * 100}%` }} />
                        </span>
                        <span className={`${WORD_TIER[word]} rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none`}>{word}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-[78ch] text-sm text-mute">
          The six columns are in virupas (60 to a rupa). The mark on each bar is the planet&rsquo;s pass mark. Rahu and Ketu have no Shadbala. You were born
          by {sb.dayBirth ? "day" : "night"}; the lords of your year, month, weekday and hora are {name(sb.yearLord)}, {name(sb.monthLord)}, {name(sb.dayLord)} and{" "}
          {name(sb.hourLord)}.
        </p>
      </section>

      {lords.length > 0 && (
        <section className="mt-12 max-w-[86ch]">
          <H2 aside="this feeds the daily score">Your running period lords</H2>
          <ul className="border-t border-line">
            {lords.map(({ level, lord }) => {
              const b = lord === "Ra" || lord === "Ke" ? null : sb.planets[lord as Graha];
              return (
                <li key={level} className="grid gap-x-6 gap-y-1 border-b border-line py-3 sm:grid-cols-[13rem_1fr]">
                  <span className="font-semibold">
                    {level} lord {name(lord)}
                  </span>
                  <span className="text-[0.95rem] text-mute">
                    {b
                      ? `${b.rupas.toFixed(2)} rupas against ${b.required}: ${balaWord(b.ratio).toLowerCase()}. ${b.ratio >= 1 ? "It has the strength to deliver what it rules." : "It is under its pass mark, so its promises come slower and need more from you."}`
                      : "The nodes have no Shadbala; they are read through the lord of the sign they sit in."}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-mute">
            A bhukti or antaram lord above its pass mark adds a little to every score while it runs, and one below takes a little away. It sits beside the
            navamsa and dasamsa strength on{" "}
            <Link href="/vargas" className="underline">
              Navamsa, Dasamsa
            </Link>
            , it does not replace them.
          </p>
        </section>
      )}

      <section className="mt-12 max-w-[86ch]">
        <H2 aside="open a planet to see the working">How each figure is made</H2>
        <div className="border-t border-line">
          {sb.order.map((p) => (
            <details key={p} className="border-b border-line">
              <summary className="flex cursor-pointer items-baseline justify-between gap-4 py-3">
                <span className="font-semibold">
                  {name(p)} <span className="font-normal text-mute">in {RASI[signOf(natal.positions[p])].ta}, {ordinal(natal.house[p])} house</span>
                </span>
                <span className="tabular-nums text-mute">
                  {v(sb.planets[p].total)} virupas, {sb.planets[p].rupas.toFixed(2)} rupas
                </span>
              </summary>
              <Detail b={sb.planets[p]} />
            </details>
          ))}
        </div>
        <p className="mt-4 text-sm text-mute">
          Where schools differ, this follows Parashara: 45, 30, 20, 15, 10, 4 and 2 virupas for the seven grades of dignity across the seven divisional
          charts; the lords of the year and month taken from the weekday on which the solar year and the solar month began; ayana bala from the declination
          of the planet&rsquo;s degree. A different program can therefore differ by a few tenths of a rupa without either being wrong.
        </p>
      </section>
    </div>
  );
}
