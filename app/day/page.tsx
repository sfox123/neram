"use client";

import { useState } from "react";
import { Skyline, TierLegend } from "@/components/Skyline";
import { useDay, useStore } from "@/components/store";
import { DateStepper, H2, Loading, PageTitle, TierTag } from "@/components/ui";
import { PLANET_INFO, RASI, WEEKDAYS, WEEKDAYS_TAMIL } from "@/lib/astro/constants";
import { GOWRI_INFO, label, Span } from "@/lib/astro/panchang";
import { pushkaraAt } from "@/lib/astro/pushkara";
import { ACTIVITIES, ActivityKey, bestWindows, blocks, readAt, TIER } from "@/lib/astro/score";
import { dateKey, fmtDuration, fmtTime } from "@/lib/astro/time";

export default function DayPage() {
  const { ready, now, profile } = useStore();
  const todayKey = ready ? dateKey(now, profile.here.tz) : null;
  const [chosen, setChosen] = useState<string | null>(null);
  const key = chosen ?? todayKey;
  const day = useDay(key);

  if (!ready || !day || !key || !todayKey) return <Loading />;
  const tz = profile.here.tz;
  const p = day.ctx.panchang;
  const f = day.frame;
  const isToday = key === todayKey;
  const t = (d: Date) => fmtTime(d, tz);
  const overall = blocks(day.segments, "overall").filter((b) => b.end.getTime() - b.start.getTime() >= 10 * 60000);
  const rows: { key: ActivityKey; label: string }[] = [{ key: "overall", label: "Overall" }, ...ACTIVITIES.map((a) => ({ key: a.key as ActivityKey, label: a.label }))];
  const spanList = (list: Span<number>[], name: (i: number) => string) =>
    list.map((s, i) => (
      <span key={i} className="block">
        <strong>{name(s.value)}</strong> until {t(s.end)}
        {s.end > f.nextSunrise ? " (after next sunrise)" : ""}
      </span>
    ));

  return (
    <div>
      <PageTitle title="Day plan" tamil="நாள் பலன்">
        Every stretch of the day scored for each kind of activity, from sunrise to the next sunrise.
      </PageTitle>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <DateStepper value={key} onChange={setChosen} todayKey={todayKey} />
        <p className="text-[0.95rem] text-mute">
          {WEEKDAYS[f.weekday]} <span className="tamil text-ink">{WEEKDAYS_TAMIL[f.weekday]}</span>, {p.tamil.month} {p.tamil.day}, {p.tamil.year}. Sunrise{" "}
          {t(f.sunrise)}, sunset {t(f.sunset)}.
        </p>
      </div>

      <section>
        <H2 aside={<TierLegend />}>The day at a glance</H2>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="grid items-end gap-x-4 sm:grid-cols-[9rem_1fr]">
              <p className="pb-6 text-[0.95rem] font-semibold">{r.label}</p>
              <Skyline frame={f} segments={day.segments} activity={r.key} now={isToday ? now : undefined} height={r.key === "overall" ? 96 : 52} compact />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <H2>Best windows by activity</H2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-[0.95rem]">
            <tbody>
              {ACTIVITIES.map((a) => {
                const best = bestWindows(day.segments, a.key, undefined, 20, 4);
                return (
                  <tr key={a.key} className="border-y border-line align-top">
                    <th scope="row" className="w-44 py-3 pr-4 text-left font-semibold">
                      {a.label}
                    </th>
                    <td className="py-3">
                      {best.length ? (
                        <ul className="flex flex-wrap gap-x-6 gap-y-1.5">
                          {best.map((b) => (
                            <li key={b.start.getTime()} className="flex items-center gap-2 tabular-nums">
                              <TierTag tier={b.tier} />
                              {t(b.start)} to {t(b.end)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-mute">No favourable window this day. Pick another day if you can.</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {profile.timeConfirmed && (
        <section className="mt-12">
          <H2 aside="the rising lagna in a nourishing navamsa">Pushkara windows</H2>
          <p className="mb-4 max-w-[72ch] text-[0.95rem] text-mute">
            About every two hours the rising lagna passes through two pushkara navamsas of twelve to fifteen minutes each. They are the classical
            choice of minutes for the act itself: sending, signing, paying, setting out. Use one that falls inside a good stretch of the day; the
            tier beside each shows how the rest of the hour reads.
            {day.ctx.pushkara.moon.length > 0 && (
              <>
                {" "}
                The Moon is itself in a pushkara navamsa{" "}
                {day.ctx.pushkara.moon.map((m, i) => (
                  <span key={i}>
                    {i > 0 ? " and " : ""}
                    <strong className="text-ink">
                      {t(m.start)} to {t(m.end)}
                    </strong>
                  </span>
                ))}
                : windows inside that are double pushkara.
              </>
            )}
          </p>
          <ul className="grid gap-x-10 border-t border-line sm:grid-cols-2 xl:grid-cols-3">
            {day.ctx.pushkara.lagna
              .filter((w) => w.end.getTime() - w.start.getTime() >= 4 * 60000)
              .map((w) => {
                const mid = new Date((w.start.getTime() + w.end.getTime()) / 2);
                const r = readAt(day.ctx, mid);
                const double = !!pushkaraAt(day.ctx.pushkara.moon, mid);
                const exact = day.ctx.pushkara.bhaga.find((b) => b.at >= w.start && b.at < w.end);
                const past = isToday && w.end < now;
                const live = isToday && w.start <= now && now < w.end;
                return (
                  <li key={w.start.getTime()} className={`flex items-baseline justify-between gap-3 border-b border-line py-2.5 text-[0.95rem] ${past ? "opacity-45" : ""}`}>
                    <span>
                      <span className={`tabular-nums ${live ? "font-semibold text-go" : "font-semibold"}`}>
                        {t(w.start)} to {t(w.end)}
                      </span>
                      <span className="block text-sm text-mute">
                        {RASI[w.sign].ta} rising, {RASI[w.navamsa].ta} navamsa
                        {double ? ", double pushkara" : ""}
                        {exact ? `, exact degree at ${t(exact.at)}` : ""}
                      </span>
                    </span>
                    <TierTag tier={r.tiers.overall} />
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <H2>Hour by hour</H2>
          <ol className="border-t border-line">
            {overall.map((b) => {
              const mid = b.segments[Math.floor(b.segments.length / 2)].reading;
              // Name the time-of-day reason, not the day-long ones that every row shares.
              const hourly = mid.factors.filter((x) => ["pakshi", "hora", "gowri", "rahu", "yama", "abhijit", "rising"].includes(x.id));
              const top = [...hourly].sort((x, y) =>
                b.tier === "hold" || b.tier === "avoid" ? x.effect.overall - y.effect.overall : y.effect.overall - x.effect.overall,
              )[0];
              const current = isToday && now >= b.start && now < b.end;
              return (
                <li key={b.start.getTime()} className={`grid grid-cols-[9.5rem_4.2rem_1fr] items-baseline gap-x-3 border-b border-line py-2.5 ${current ? "bg-panel" : ""}`}>
                  <span className="tabular-nums">
                    {t(b.start)} to {t(b.end)}
                  </span>
                  <span>
                    <TierTag tier={b.tier} />
                  </span>
                  <span className="text-[0.95rem] text-mute">
                    {top?.title}
                    <span className="ml-2 whitespace-nowrap text-[0.8rem]">{fmtDuration(b.end.getTime() - b.start.getTime())}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-sm text-mute">Stretches shorter than ten minutes are folded away here; the bars above show them.</p>
        </section>

        <div className="space-y-12">
          <section>
            <H2>Panchangam</H2>
            <dl className="grid grid-cols-[7.5rem_1fr] gap-y-3 border-t border-line pt-4 text-[0.95rem]">
              <dt className="text-mute">Tithi</dt>
              <dd>{spanList(p.tithi, label.tithi)}</dd>
              <dt className="text-mute">Nakshatra</dt>
              <dd>{spanList(p.nakshatra, label.nak)}</dd>
              <dt className="text-mute">Yoga</dt>
              <dd>{spanList(p.yoga, label.yoga)}</dd>
              <dt className="text-mute">Karana</dt>
              <dd>{spanList(p.karana, label.karana)}</dd>
              <dt className="text-mute">Moon in</dt>
              <dd>{spanList(p.moonSign, (i) => RASI[i].ta)}</dd>
              <dt className="text-mute">Rising lagna</dt>
              <dd>
                {p.rising.map((r, i) => (
                  <span key={i} className="block">
                    <strong>{RASI[r.value].ta}</strong> from {t(r.start)}
                  </span>
                ))}
              </dd>
              <dt className="text-mute">Sun in</dt>
              <dd>{RASI[p.sunSign].ta}</dd>
              <dt className="text-mute">Rahu kalam</dt>
              <dd>
                {t(p.rahu.start)} to {t(p.rahu.end)}
              </dd>
              <dt className="text-mute">Yamagandam</dt>
              <dd>
                {t(p.yamagandam.start)} to {t(p.yamagandam.end)}
              </dd>
              <dt className="text-mute">Kuligai</dt>
              <dd>
                {t(p.gulika.start)} to {t(p.gulika.end)}
              </dd>
              <dt className="text-mute">Abhijit</dt>
              <dd>{p.abhijit ? `${t(p.abhijit.start)} to ${t(p.abhijit.end)}` : "Not counted on Wednesdays"}</dd>
              <dt className="text-mute">Brahma muhurtham</dt>
              <dd>
                {t(p.brahmaMuhurtham.start)} to {t(p.brahmaMuhurtham.end)}
              </dd>
            </dl>
            <p className="mt-3 text-sm text-mute">Thirukanitha (drik) calculation with Lahiri ayanamsa, for {profile.here.name}.</p>
          </section>

          <section>
            <H2>Hora</H2>
            <ul className="grid grid-cols-2 gap-x-8 border-t border-line pt-3 text-[0.95rem] sm:grid-cols-3">
              {p.horas.map((h, i) => {
                const subha = ["Ju", "Ve", "Me"].includes(h.value) || (h.value === "Mo" && p.paksha === 0);
                const current = isToday && now >= h.start && now < h.end;
                return (
                  <li key={i} className={`flex justify-between gap-2 border-b border-line py-1.5 ${current ? "bg-panel font-semibold" : ""}`}>
                    <span className="tabular-nums text-mute">{t(h.start)}</span>
                    <span className={subha ? "text-go" : ""}>
                      {PLANET_INFO[h.value].ta}
                      {subha ? " ✓" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-sm text-mute">Ticked horas are subha: Guru, Sukran, Budhan and the waxing Moon.</p>
          </section>

          <section>
            <H2>Gowri nalla neram</H2>
            <ul className="grid grid-cols-2 gap-x-8 border-t border-line pt-3 text-[0.95rem]">
              {p.gowri.map((g, i) => {
                const current = isToday && now >= g.start && now < g.end;
                return (
                  <li key={i} className={`flex justify-between gap-2 border-b border-line py-1.5 ${current ? "bg-panel font-semibold" : ""}`}>
                    <span className="tabular-nums text-mute">{t(g.start)}</span>
                    <span className={GOWRI_INFO[g.value].good ? "text-go" : "text-avoid"}>{g.value}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
      <p className="sr-only">{TIER.go.line}</p>
    </div>
  );
}
