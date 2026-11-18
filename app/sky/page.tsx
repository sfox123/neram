"use client";

import { useMemo } from "react";
import { RasiChart } from "@/components/RasiChart";
import { useStore, useToday } from "@/components/store";
import { H2, Loading, PageTitle, ToneDot } from "@/components/ui";
import { ashtakavarga, savGrade } from "@/lib/astro/ashtaka";
import { houseTopic, ordinal, rulesText } from "@/lib/astro/chart";
import { formatDeg, nakOf, NAKSHATRA, padaOf, PLANET_INFO, PLANETS, RASI, signOf } from "@/lib/astro/constants";
import { allPositions } from "@/lib/astro/ephemeris";
import { fmtAhead, fmtDays, recentlyDirect, retroSpells } from "@/lib/astro/retro";
import { chandraNaadi, contacts, gochara, saturnPhase, taraBala, upcomingIngresses } from "@/lib/astro/transits";
import { fmtCountdown, fmtDateLong, fmtTime, MS_DAY } from "@/lib/astro/time";

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
      retro: retroSpells(t),
      direct: recentlyDirect(t),
    };
  }, [bucket, natal]);

  if (!ready || !data || !day) return <Loading />;
  const tz = profile.here.tz;
  const known = profile.timeConfirmed;
  const bav = known ? (ashtakavarga(natal).bav as Record<string, number[]>) : null;
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
          <table className="w-full min-w-[52rem] border-collapse text-[0.95rem]">
            <thead>
              <tr className="border-y border-line text-left text-sm text-mute">
                <th className="py-2 pr-3 font-normal">Planet</th>
                <th className="py-2 pr-3 font-normal">In</th>
                <th className="py-2 pr-3 font-normal">From your Moon</th>
                <th className="py-2 pr-3 font-normal">Its points here</th>
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
                      {ordinal(g.fromMoon)}, {g.tone === "good" ? "a helping place" : "not a helping place"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {bav ? (
                      (() => {
                        const pts = bav[g.planet === "Ra" ? "Sa" : g.planet === "Ke" ? "Ma" : g.planet][g.sign];
                        return (
                          <span className="inline-flex items-baseline gap-2">
                            <ToneDot tone={pts >= 5 ? "good" : pts >= 4 ? "neutral" : "bad"} />
                            {pts} of 8 <span className="text-mute">{pts >= 5 ? "strong" : pts >= 4 ? "fair" : "low"}</span>
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-mute">set birth time</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {known ? (
                      <>
                        {ordinal(g.fromLagna)} <span className="text-mute">{houseTopic(g.fromLagna).split(/[,;]/)[0]}</span>
                      </>
                    ) : (
                      "set birth time"
                    )}
                  </td>
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
        <p className="mt-3 max-w-[72ch] text-sm text-mute">
          Read the two dots together. The Moon column is the classical rule: each planet has a fixed list of helping places counted from your birth
          Moon, and the Sun, Sevvai, Sani and the nodes have only three or four each, so most rows are red on an ordinary day. The points column is the
          planet&rsquo;s own Ashtakavarga score in the sign it is crossing (Rahu is read through Sani, Ketu through Sevvai). A planet outside its helping
          places but with five or more points still works for you, through the lagna house shown beside it. Only your period lords carry these marks
          into the scores.
        </p>
      </section>

      <section id="vakram" className="mt-12 scroll-mt-24">
        <H2 aside={data.retro.some((r) => r.running) ? `${data.retro.filter((r) => r.running).length} retrograde now` : "none retrograde now"}>
          Vakram: retrograde now and ahead <span className="tamil ml-2 text-lg font-medium text-peacock">வக்ரம், வக்ர நிவர்த்தி</span>
        </H2>
        <p className="mb-3 max-w-[70ch] text-[0.95rem] text-mute">
          Each planet&rsquo;s running retrograde spell, or the next one. Vakram is the day it stands still and turns back; vakra nivarthi is the day it
          stands still again and moves forward. The Sun and Moon never turn back and Rahu and Ketu always move backward, so they are not listed.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-[0.95rem]">
            <thead>
              <tr className="border-y border-line text-left text-sm text-mute">
                <th className="py-2 pr-3 font-normal">Planet</th>
                <th className="py-2 pr-3 font-normal">Now</th>
                <th className="py-2 pr-3 font-normal">Vakram (turns back)</th>
                <th className="py-2 pr-3 font-normal">Vakra nivarthi (turns direct)</th>
                <th className="py-2 pr-3 font-normal">Lasts</th>
                <th className="py-2 pr-3 font-normal">In</th>
              </tr>
            </thead>
            <tbody>
              {data.retro.map((r) => {
                const left = r.end.getTime() - now.getTime();
                const ahead = r.start.getTime() - now.getTime();
                const fromMoon = (s: number) => ordinal(((s - natal.moonSign + 12) % 12) + 1);
                const when = (d: Date) => (
                  <>
                    {fmtDateLong(d, tz)}
                    <span className="block text-sm text-mute">{fmtTime(d, tz)}</span>
                  </>
                );
                return (
                  <tr key={r.planet} className="border-b border-line align-top">
                    <th scope="row" className="py-2 pr-3 text-left font-semibold">
                      {PLANET_INFO[r.planet].ta}
                      <span className="tamil ml-2 font-normal text-peacock">{PLANET_INFO[r.planet].tamil}</span>
                    </th>
                    <td className="py-2 pr-3">
                      {r.running ? (
                        <span className="inline-flex items-baseline gap-2">
                          <ToneDot tone="neutral" />
                          <span>
                            <strong>Retrograde</strong>
                            <span className="block text-sm text-mute">direct in {left < 3 * MS_DAY ? fmtCountdown(left) : fmtDays(left)}</span>
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-baseline gap-2">
                          <ToneDot tone="good" />
                          <span>
                            Direct
                            <span className="block text-sm text-mute">vakram in {ahead < 3 * MS_DAY ? fmtCountdown(ahead) : fmtAhead(ahead)}</span>
                          </span>
                        </span>
                      )}
                    </td>
                    <td className={`py-2 pr-3 tabular-nums ${r.running ? "text-mute" : ""}`}>{when(r.start)}</td>
                    <td className="py-2 pr-3 tabular-nums">{when(r.end)}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {fmtDays(r.end.getTime() - r.start.getTime())}
                      {r.running && (
                        <span className="mt-1.5 block h-1 w-20 overflow-hidden rounded-full bg-line" aria-hidden>
                          <span className="block h-full bg-peacock" style={{ width: `${Math.min(100, ((now.getTime() - r.start.getTime()) / (r.end.getTime() - r.start.getTime())) * 100)}%` }} />
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {RASI[r.startSign].ta}
                      {r.endSign !== r.startSign && <> back into {RASI[r.endSign].ta}</>}
                      <span className="block text-sm text-mute">
                        {fromMoon(r.startSign)}
                        {r.endSign !== r.startSign && ` then ${fromMoon(r.endSign)}`} from your rasi
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data.direct.length > 0 && (
          <p className="mt-3 max-w-[72ch] text-[0.95rem]">
            <strong>Recently direct.</strong>{" "}
            {data.direct
              .map((d) => `${PLANET_INFO[d.planet].ta} on ${fmtDateLong(d.end, tz)}, after ${fmtDays(d.end.getTime() - d.start.getTime())} in ${RASI[d.endSign].ta}`)
              .join("; ")}
            . The first days after vakra nivarthi are still slow while it regains speed.
          </p>
        )}
        <p className="mt-3 max-w-[72ch] text-sm text-mute">
          While a planet is retrograde, what it rules slows down and comes back for a second look: plans are revised rather than launched. Vakram and
          vakra nivarthi days also appear in the bell a week ahead.
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
