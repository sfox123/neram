"use client";

import { useMemo } from "react";
import Link from "next/link";
import { RasiChart } from "@/components/RasiChart";
import { useStore } from "@/components/store";
import { H2, LineList, Loading, PageTitle } from "@/components/ui";
import { PLANET_INFO, PlanetId, PLANETS, RASI } from "@/lib/astro/constants";
import { Dignity } from "@/lib/astro/dignity";
import { fmtDateLong, MS_DAY } from "@/lib/astro/time";
import {
  buildVarga,
  dasamsaReading,
  lagnaWindow,
  LagnaWindow,
  navamsaReading,
  PLANET_CAREER,
  Varga,
  vargaStrength,
  VargaWord,
} from "@/lib/astro/vargas";
import { activation } from "@/lib/astro/yogas";

const WORD_TIER: Record<VargaWord, string> = { Confirmed: "tier-go", Gains: "tier-good", Holds: "tier-steady", Slips: "tier-hold", Falls: "tier-avoid" };
const DIG: Record<Dignity, string> = { exalted: "exalted", own: "own sign", friend: "friend", neutral: "neutral", enemy: "enemy", debilitated: "debilitated" };

function marksFor(v: Varga) {
  const out: Partial<Record<PlanetId, ("up" | "down" | "same")[]>> = {};
  for (const p of PLANETS) {
    const x = v.planets[p];
    const m: ("up" | "down" | "same")[] = [];
    if (p !== "Ra" && p !== "Ke") {
      if (x.dignity === "exalted" || x.dignity === "own") m.push("up");
      if (x.dignity === "debilitated") m.push("down");
    }
    if (x.sameSign) m.push("same");
    if (m.length) out[p] = m;
  }
  return out;
}

function DignityCell({ sign, d, node }: { sign: number; d: Dignity; node: boolean }) {
  const strong = d === "exalted" || d === "own";
  return (
    <span>
      {RASI[sign].ta}
      {!node && d !== "neutral" && <span className={`ml-1.5 text-sm ${strong ? "font-semibold text-go" : d === "debilitated" ? "font-semibold text-avoid" : "text-mute"}`}>{DIG[d]}</span>}
    </span>
  );
}

export default function VargasPage() {
  const { ready, now, natal, profile } = useStore();
  const dayStamp = Math.floor(now.getTime() / MS_DAY);

  const data = useMemo(() => {
    if (!ready || !profile.timeConfirmed) return null;
    const at = new Date(dayStamp * MS_DAY);
    const d9 = buildVarga(natal, "D9");
    const d10 = buildVarga(natal, "D10");
    const w9 = lagnaWindow(natal, "D9");
    const strength = vargaStrength(natal);
    const careerPlanets = PLANETS.filter((p) => strength[p].career >= 1.5);
    const timing = careerPlanets.map((p) => ({ planet: p, act: activation(natal, [p], at) }));
    return { d9, d10, w9, strength, timing, read9: navamsaReading(natal, d9), read10: dasamsaReading(natal, d10) };
  }, [ready, natal, profile.timeConfirmed, dayStamp]);

  if (!ready) return <Loading />;
  if (!profile.timeConfirmed)
    return (
      <div>
        <PageTitle title="Navamsa and Dasamsa" tamil="அம்ச சக்கரங்கள்">
          The amsa charts turn on the lagna degree, so they need your birth time to the minute.
        </PageTitle>
        <Link href="/setup" className="underline">
          Add your birth time in Setup
        </Link>
      </div>
    );
  if (!data) return <Loading />;

  const { d9, d10, w9, strength, timing, read9, read10 } = data;
  const btz = profile.birthPlace.tz;
  const clock = (x: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: btz, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(x).replace(" ", " ");
  const d = (x: Date) => fmtDateLong(x, profile.here.tz);
  const name = (p: PlanetId) => PLANET_INFO[p].ta;
  const real = PLANETS.filter((p) => p !== "Ra" && p !== "Ke");
  const vargottama = real.filter((p) => strength[p].vargottama);
  const best = real.filter((p) => strength[p].word === "Confirmed" || strength[p].word === "Gains");
  const worst = real.filter((p) => strength[p].word === "Falls" || strength[p].word === "Slips");
  const windowText = (w: LagnaWindow) => `${clock(w.from)} to ${clock(w.to)}`;

  return (
    <div>
      <PageTitle title="Navamsa and Dasamsa" tamil="அம்ச சக்கரங்கள்">
        The rasi chart shows what is promised. The navamsa (D9) shows the person behind it and how much real strength each planet has; the dasamsa (D10)
        shows how that plays out in work and standing. Both are read against the rasi chart, never alone.
      </PageTitle>

      <section className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[1fr_1.25fr]">
        <div className="bg-deep p-6 text-paper sm:p-8">
          <p className="text-paper/70">Vargottama in your chart</p>
          <p className="verdict-word mt-2 text-6xl leading-none sm:text-7xl">{vargottama.length ? vargottama.map(name).join(", ") : "None"}</p>
          <p className="mt-4 max-w-[44ch] text-[1.02rem] text-paper/90">
            {vargottama.length
              ? `${vargottama.map((p) => `${name(p)} sits in ${RASI[d9.planets[p].sign].ta} in both rasi and navamsa`).join("; ")}. A vargottama planet acts the same inside and out, so what it promises can be relied on.`
              : "No planet holds the same sign in rasi and navamsa. That is common; strength is then read from each planet's navamsa dignity below."}
            {d9.lagnaSameSign ? " Your lagna is vargottama too." : ""}
          </p>
        </div>
        <div className="bg-paper p-6 sm:p-8">
          <p className="text-mute">What the amsa charts change</p>
          <ul className="mt-3 space-y-3">
            {[...best, ...worst].map((p) => (
              <li key={p} className="grid grid-cols-[6.2rem_1fr] gap-3">
                <span>
                  <span className={`${WORD_TIER[strength[p].word]} inline-block rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none`}>{strength[p].word}</span>
                </span>
                <span className="text-[0.98rem]">
                  <strong>{name(p)}.</strong> <span className="text-mute">{strength[p].note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <H2 aside="▲ exalted or own sign, ▼ debilitated, ● same sign as rasi">The three charts</H2>
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <RasiChart title="Rasi" subtitle="D1: the whole life" positions={natal.positions} lagnaSign={natal.lagnaSign} retro={natal.retro} />
          </div>
          <div>
            <RasiChart title="Navamsa" subtitle="D9: the inner person" positions={natal.positions} signs={d9.signs} lagnaSign={d9.lagnaSign} marks={marksFor(d9)} />
          </div>
          <div>
            <RasiChart title="Dasamsa" subtitle="D10: work and rank" positions={natal.positions} signs={d10.signs} lagnaSign={d10.lagnaSign} marks={marksFor(d10)} />
          </div>
        </div>
      </section>

      <section className="mt-12">
        <H2 aside="sign and dignity in each chart">Each planet across the three charts</H2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[54rem] border-collapse text-[0.95rem]">
            <thead>
              <tr className="border-y border-line text-left text-sm text-mute">
                <th className="py-2 pr-3 font-normal">Planet</th>
                <th className="py-2 pr-3 font-normal">Rasi</th>
                <th className="py-2 pr-3 font-normal">Navamsa</th>
                <th className="py-2 pr-3 font-normal">Dasamsa</th>
                <th className="py-2 pr-3 font-normal">Reading</th>
              </tr>
            </thead>
            <tbody>
              {PLANETS.map((p) => {
                const node = p === "Ra" || p === "Ke";
                const s = strength[p];
                return (
                  <tr key={p} className="border-b border-line align-top">
                    <th scope="row" className="py-2.5 pr-3 text-left font-semibold">
                      {name(p)}
                    </th>
                    <td className="py-2.5 pr-3">
                      <DignityCell sign={d9.planets[p].d1Sign} d={s.d1} node={node} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <DignityCell sign={d9.planets[p].sign} d={s.d9} node={node} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <DignityCell sign={d10.planets[p].sign} d={s.d10} node={node} />
                    </td>
                    <td className="max-w-[26rem] py-2.5 pr-3">
                      <span className={`${WORD_TIER[s.word]} mr-2 inline-block rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none`}>{s.word}</span>
                      <span className="text-mute">{s.note}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-[72ch] text-sm text-mute">
          The planets&rsquo; signs in these charts do not depend on the exact birth minute, so this table is firm. These results now also adjust the
          notes on the{" "}
          <Link href="/yogas" className="underline">
            Yogas
          </Link>{" "}
          page, the order on{" "}
          <Link href="/remedies" className="underline">
            Strengthen and recover
          </Link>
          , and the weight of your running bhukti and antaram lords in the scores.
        </p>
      </section>

      <section className="mt-14">
        <H2 aside={`${RASI[d9.lagnaSign].ta} lagna`}>Who you are inside: the navamsa</H2>
        <LineList lines={read9} />
        <p className="mt-3 max-w-[72ch] text-sm text-mute">
          The navamsa lagna is {RASI[d9.lagnaSign].ta} for any birth between {windowText(w9)}. Your recorded time is{" "}
          {Math.round(w9.secondsBefore / 60)} minutes inside that window on one side and {Math.round(w9.secondsAfter / 60)} on the other
          {w9.fragile ? ", which is close to the edge: treat the house readings with care." : ", so this reading is reasonably safe."}
        </p>
      </section>

      <section className="mt-14">
        <H2 aside={`${RASI[d10.lagnaSign].ta} lagna`}>Your career: the dasamsa</H2>
        <LineList lines={read10} />

        <h3 className="display mt-10 text-xl">Your strongest career planets</h3>
        <ul className="mt-3 border-t border-line">
          {timing.length === 0 && <li className="border-b border-line py-3 text-mute">No planet is exalted or in its own sign in the dasamsa; career strength is spread evenly.</li>}
          {timing.map(({ planet, act }) => {
            const next = act.upcoming.filter((u) => u.level !== "antaram").slice(0, 2);
            return (
              <li key={planet} className="grid gap-x-8 gap-y-1 border-b border-line py-4 md:grid-cols-[17rem_1fr]">
                <span className="font-semibold">
                  {name(planet)} <span className="font-normal text-go">{DIG[strength[planet].d10]} in dasamsa</span>
                </span>
                <span className="max-w-[68ch] text-[0.98rem] text-mute">
                  Points to {PLANET_CAREER[planet]}. Career moves most in its periods:{" "}
                  {act.runningNow.map((r) => `${r.level} running now until ${d(r.period.end)}`).join("; ")}
                  {act.runningNow.length > 0 && next.length > 0 ? "; then " : ""}
                  {next.map((u) => `${name(u.period.lord)} ${u.level} ${d(u.period.start)} to ${d(u.period.end)}`).join("; ")}.
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-12 max-w-[72ch] space-y-3 text-[0.95rem] text-mute">
        <H2>How these are worked out</H2>
        <p>
          Navamsa: each sign is cut into nine parts of 3°20′, counted on from Mesham without a break, so a planet&rsquo;s navamsa sign is the same thing
          as its star quarter (pada). Dasamsa: each sign is cut into ten parts of 3°; for an odd sign the count starts from the sign itself, for an even
          sign from the ninth sign from it. A planet or lagna in the same sign in rasi and navamsa is vargottama.
        </p>
        <p>
          Reading rules used: a planet strong in rasi but debilitated in navamsa gives less than it seems; one that is exalted or in its own sign in
          navamsa is backed and improves with age; a planet exalted or in its own sign in the dasamsa delivers its career matters with less friction.
          Sources are listed under{" "}
          <Link href="/setup#method" className="underline">
            Setup and method
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
