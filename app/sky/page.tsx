"use client";

import { useMemo } from "react";
import { RasiChart } from "@/components/RasiChart";
import { useStore, useToday } from "@/components/store";
import { H2, Loading, PageTitle, ToneDot } from "@/components/ui";
import { ashtakavarga, savGrade } from "@/lib/astro/ashtaka";
import { ordinal, rulesText } from "@/lib/astro/chart";
import { formatDeg, nakOf, NAKSHATRA, padaOf, PLANET_INFO, PLANETS, RASI, signOf } from "@/lib/astro/constants";
import { allPositions } from "@/lib/astro/ephemeris";
import { chandraNaadi, contacts, gochara, saturnPhase, taraBala, upcomingIngresses } from "@/lib/astro/transits";
import { fmtDateLong, fmtTime, MS_DAY } from "@/lib/astro/time";

export default function SkyPage() {
  const { ready, now, natal, profile } = useStore();
  const day = useToday();
  // Slow-moving data: refresh every ten minutes rather than on every tick.
  const bucket = ready ? Math.floor(now.getTime() / 600000) : 0;
  const data = useMemo(() => {
    if (!bucket) return null;
    const t = new Date(bucket * 600000);
    const pos = allPositions(t);
    return {
      pos,
      goch: gochara(natal, t, pos),
      naadi: chandraNaadi(natal, signOf(pos.Mo)),
      contacts: contacts(natal, pos, t),
      saturn: saturnPhase(natal, pos),
      ingresses: upcomingIngresses(natal, t, 240),
      tara: taraBala(natal.star, nakOf(pos.Mo)),
    };
  }, [bucket, natal]);

  if (!ready || !data || !day) return <Loading />;
  const tz = profile.here.tz;
  const known = profile.timeConfirmed;
  const moonSign = signOf(data.pos.Mo);

  return (
    <div>
      <PageTitle title="Chart and transits" tamil="ஜாதகம், கோசாரம்">
        Your birth chart on the left, today&rsquo;s sky on the right, and every place where the two touch.
      </PageTitle>

      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <RasiChart
            title="Rasi"
            subtitle={`${profile.birthDate}, ${profile.birthTime}`}
            positions={natal.positions}
            lagnaSign={natal.lagnaSign}
            retro={natal.retro}
          />
          <p className="mt-3 max-w-[26rem] text-[0.95rem] text-mute">
            {known ? "" : "Lagna shown for the assumed birth time. "}
            Lagna {RASI[natal.lagnaSign].ta}, rasi {RASI[natal.moonSign].ta}, star {NAKSHATRA[natal.star].ta} pada {natal.pada}. Indu lagna (wealth point):{" "}
            {RASI[natal.induLagna].ta}.
          </p>
        </div>
        <div>
          <RasiChart
            title="Today"
            subtitle={fmtDateLong(now, tz)}
            positions={data.pos}
            lagnaSign={null}
            retro={Object.fromEntries(data.goch.map((g) => [g.planet, g.retro]))}
            highlightSign={natal.moonSign}
          />
          <p className="mt-3 max-w-[26rem] text-[0.95rem] text-mute">
            Transit positions now. The shaded box is your rasi; houses in the notes below are counted from it and from your lagna.
          </p>
        </div>
      </section>

      <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-2">
        <section>
          <H2 aside={`Moon in ${RASI[moonSign].ta}, ${NAKSHATRA[nakOf(data.pos.Mo)].ta}`}>Chandra Naadi today</H2>
          <p className="mb-3 max-w-[62ch] text-[0.95rem] text-mute">
            The transit Moon is read against your natal planets: the planets it joins, opposes or is aspected by show what the day brings up.
          </p>
          {data.naadi.length ? (
            <ul className="space-y-3 border-t border-line pt-4">
              {data.naadi.map((l) => (
                <li key={l.planet + l.kind} className="flex gap-3 text-[0.95rem]">
                  <ToneDot tone={l.tone} />
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-line pt-4 text-[0.95rem]">The Moon touches none of your natal planets today: a quiet, uncoloured day.</p>
          )}
          <p className="mt-4 text-[0.95rem]">
            <strong>{data.tara.name} tara</strong> ({data.tara.meaning}).
          </p>
        </section>

        <section>
          <H2>Planets over your natal planets</H2>
          <p className="mb-3 max-w-[62ch] text-[0.95rem] text-mute">
            When a moving planet crosses the exact degree of a birth planet, that planet&rsquo;s matters come alive. Benefics crossing benefics are the days to use.
          </p>
          {data.contacts.length ? (
            <ul className="space-y-3 border-t border-line pt-4">
              {data.contacts.slice(0, 7).map((c) => (
                <li key={c.transit + c.natal} className="flex gap-3 text-[0.95rem]">
                  <ToneDot tone={c.tone} />
                  <span>
                    {c.exact && <strong>Exact. </strong>}
                    {c.text}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-line pt-4 text-[0.95rem]">No planet is close to a natal planet right now.</p>
          )}
        </section>
      </div>

      <section className="mt-12">
        <H2 aside={data.saturn.label}>Gochara: where each planet is for you</H2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-[0.95rem]">
            <thead>
              <tr className="border-y border-line text-left text-sm text-mute">
                <th className="py-2 pr-3 font-normal">Planet</th>
                <th className="py-2 pr-3 font-normal">In</th>
                <th className="py-2 pr-3 font-normal">From your Moon</th>
                <th className="py-2 pr-3 font-normal">From lagna</th>
                <th className="py-2 pr-3 font-normal">Stays until</th>
              </tr>
            </thead>
            <tbody>
              {data.goch.map((g) => (
                <tr key={g.planet} className="border-b border-line">
                  <th scope="row" className="py-2 pr-3 text-left font-semibold">
                    {PLANET_INFO[g.planet].ta}
                    {g.retro && g.planet !== "Ra" && g.planet !== "Ke" ? <span className="ml-1 font-normal text-mute">retro</span> : null}
                  </th>
                  <td className="py-2 pr-3 tabular-nums">
                    {RASI[g.sign].ta} {formatDeg(g.longitude)}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-baseline gap-2">
                      <ToneDot tone={g.tone} />
                      {ordinal(g.fromMoon)}, {g.tone === "good" ? "favourable" : "unfavourable"}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{known ? ordinal(g.fromLagna) : "set birth time"}</td>
                  <td className="py-2 pr-3 tabular-nums text-mute">
                    {g.until.getTime() - now.getTime() < 3 * MS_DAY ? `${fmtDateLong(g.until, tz)}, ${fmtTime(g.until, tz)}` : fmtDateLong(g.until, tz)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-[72ch] text-[0.95rem]">
          <strong>{data.saturn.label}.</strong> {data.saturn.note}
        </p>
      </section>

      {known && (
        <section className="mt-12">
          <H2 aside="337 points in all; 28 per sign is average">Ashtakavarga: how strong each sign is for you</H2>
          <p className="mb-5 max-w-[70ch] text-[0.95rem] text-mute">
            Each planet in your birth chart gives points to certain signs. A transit through a sign with many points delivers; through a sign with few
            it disappoints. The Moon&rsquo;s sign today feeds the time score.
          </p>
          <SavBars sav={ashtakavarga(natal).sav} lagnaSign={natal.lagnaSign} marks={{ Moon: moonSign, Guru: signOf(data.pos.Ju), Sani: signOf(data.pos.Sa) }} />
        </section>
      )}

      <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-2">
        <section>
          <H2>Sign changes ahead</H2>
          <ol className="border-t border-line">
            {data.ingresses
              .filter((i) => i.planet !== "Su" && i.planet !== "Me" && i.planet !== "Ve")
              .concat(data.ingresses.filter((i) => ["Su", "Me", "Ve"].includes(i.planet)).slice(0, 6))
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, 14)
              .map((i) => (
                <li key={i.planet + i.date.getTime()} className="grid grid-cols-[7rem_1fr] gap-x-3 border-b border-line py-2 text-[0.95rem]">
                  <span className="tabular-nums text-mute">{fmtDateLong(i.date, tz)}</span>
                  <span className="flex gap-2">
                    <ToneDot tone={i.tone} />
                    <span>
                      {PLANET_INFO[i.planet].ta} enters {RASI[i.sign].ta}: {ordinal(i.fromMoon)} from your Moon
                      {known ? `, your ${ordinal(i.fromLagna)} house` : ""}.
                    </span>
                  </span>
                </li>
              ))}
          </ol>
        </section>

        <section>
          <H2>Birth positions</H2>
          <table className="w-full border-collapse text-[0.95rem]">
            <tbody>
              {PLANETS.map((p) => (
                <tr key={p} className="border-y border-line align-top">
                  <th scope="row" className="py-2 pr-3 text-left font-semibold">
                    {PLANET_INFO[p].ta}
                    {natal.retro[p] && p !== "Ra" && p !== "Ke" ? <span className="ml-1 font-normal text-mute">retro</span> : null}
                  </th>
                  <td className="py-2 pr-3 tabular-nums">
                    {RASI[signOf(natal.positions[p])].ta} {formatDeg(natal.positions[p])}
                    <span className="block text-sm text-mute">
                      {NAKSHATRA[nakOf(natal.positions[p])].ta} {padaOf(natal.positions[p])}
                    </span>
                  </td>
                  <td className="py-2 text-sm text-mute">{known ? (natal.rules[p].length ? `${ordinal(natal.house[p])} house; ${rulesText(natal, p)}` : `${ordinal(natal.house[p])} house`) : PLANET_INFO[p].karaka}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function SavBars({ sav, lagnaSign, marks }: { sav: number[]; lagnaSign: number; marks: Record<string, number> }) {
  const max = Math.max(...sav);
  const tierOfGrade = { strong: "go", fair: "good", average: "steady", weak: "hold", poor: "avoid" } as const;
  return (
    <div className="overflow-x-auto">
      <ol className="grid min-w-[40rem] grid-cols-12 gap-1.5">
        {sav.map((pts, sign) => {
          const grade = savGrade(pts);
          const here = Object.entries(marks)
            .filter(([, s]) => s === sign)
            .map(([k]) => k);
          return (
            <li key={sign} className="flex flex-col">
              <div className="flex h-32 items-end">
                <div
                  className={`skyline-bar tier-${tierOfGrade[grade]} ${grade === "poor" ? "bar-avoid" : ""} flex w-full items-start justify-center rounded-t-sm pt-1 text-sm font-semibold`}
                  style={{ height: `${(pts / max) * 100}%` }}
                >
                  {pts}
                </div>
              </div>
              <div className="border-t border-ink/60 pt-1 text-center text-[0.75rem] leading-tight">
                <span className="block font-semibold">{RASI[sign].ta}</span>
                <span className="block text-mute">{ordinal(((sign - lagnaSign + 12) % 12) + 1)} house</span>
                <span className="block min-h-[1rem] text-peacock">{here.join(", ")}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
