"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { H2, Loading, PageTitle, TierTag } from "@/components/ui";
import { dayFrame } from "@/lib/astro/panchang";
import { ACTIVITIES, ActivityKey, bestWindows, Block, dayContext, Segment, timeline } from "@/lib/astro/score";
import { addDaysKey, dateKey, fmtDate, fmtDuration, fmtTime, wallTime } from "@/lib/astro/time";

interface Found extends Block {
  dayKey: string;
  reasons: string[];
}

export default function FindPage() {
  const { ready, now, natal, profile } = useStore();
  const [activity, setActivity] = useState<ActivityKey>("apply");
  const [days, setDays] = useState(7);
  const [waking, setWaking] = useState(true);
  const [minLen, setMinLen] = useState(30);
  const todayKey = ready ? dateKey(now, profile.here.tz) : null;

  const found = useMemo<Found[]>(() => {
    if (!todayKey) return [];
    const tz = profile.here.tz;
    const start = new Date();
    const out: Found[] = [];
    for (let i = 0; i < days; i++) {
      const key = addDaysKey(todayKey, i);
      const ctx = dayContext(natal, dayFrame(key, profile.here));
      let segs: Segment[] = timeline(ctx);
      if (waking)
        segs = segs.filter((s) => {
          const a = wallTime(s.start, tz);
          const b = wallTime(new Date(s.end.getTime() - 1000), tz);
          return a.hh >= 6 && b.hh < 22 && a.d === b.d;
        });
      for (const b of bestWindows(segs, activity, start, minLen, 6)) {
        const mid = b.segments[Math.floor(b.segments.length / 2)].reading;
        const reasons = [...mid.factors]
          .filter((x) => x.effect[activity] > 2 && x.id !== "dasha")
          .sort((x, y) => y.effect[activity] - x.effect[activity])
          .slice(0, 3)
          .map((x) => x.title);
        out.push({ ...b, dayKey: key, reasons });
      }
    }
    return out;
  }, [todayKey, days, waking, minLen, activity, natal, profile.here]);

  if (!ready || !todayKey) return <Loading />;
  const tz = profile.here.tz;
  const ranked = [...found].sort((a, b) => b.score - a.score || a.start.getTime() - b.start.getTime()).slice(0, 12);
  const byDay = new Map<string, Found[]>();
  for (const f of found) byDay.set(f.dayKey, [...(byDay.get(f.dayKey) ?? []), f]);
  const label = ACTIVITIES.find((a) => a.key === activity)?.label ?? "Anything important";

  return (
    <div>
      <PageTitle title="Find a time" tamil="நல்ல நேரம் தேடு">
        Pick what you want to do and how far ahead to look. The app scores every stretch of every day and lists the strongest windows.
      </PageTitle>

      <form className="grid max-w-3xl gap-4 rounded-md bg-panel p-5 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
        <label className="block">
          <span className="mb-1 block text-sm text-mute">What for</span>
          <select value={activity} onChange={(e) => setActivity(e.target.value as ActivityKey)}>
            <option value="overall">Anything important</option>
            {ACTIVITIES.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-mute">Look ahead</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-mute">At least</span>
          <select value={minLen} onChange={(e) => setMinLen(Number(e.target.value))}>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1½ hours</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2">
          <input type="checkbox" checked={waking} onChange={(e) => setWaking(e.target.checked)} className="h-4 w-4 accent-[var(--color-peacock)]" />
          <span className="text-[0.95rem]">6 am to 10 pm only</span>
        </label>
      </form>

      <section className="mt-10">
        <H2 aside={`${label}, next ${days} days`}>Strongest windows</H2>
        {ranked.length ? (
          <ol className="border-t border-line">
            {ranked.map((f, i) => (
              <li key={f.start.getTime()} className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-x-3 gap-y-1 border-b border-line py-3 sm:grid-cols-[2rem_7.5rem_16rem_1fr_auto]">
                <span className="tabular-nums text-mute">{i + 1}</span>
                <span className="font-semibold">{fmtDate(f.start, tz)}</span>
                <span className="col-start-2 whitespace-nowrap tabular-nums sm:col-start-auto">
                  {fmtTime(f.start, tz)} to {fmtTime(f.end, tz)}
                  <span className="ml-2 text-sm text-mute">{fmtDuration(f.end.getTime() - f.start.getTime())}</span>
                </span>
                <span className="col-span-2 col-start-2 text-[0.9rem] text-mute sm:col-span-1 sm:col-start-auto">{f.reasons.join("; ")}</span>
                <span className="col-start-3 row-start-1 flex items-center gap-2 sm:col-start-auto sm:row-start-auto">
                  <span className="tabular-nums text-sm text-mute">{f.score}</span>
                  <TierTag tier={f.tier} />
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="border-t border-line pt-4 text-[0.95rem] text-mute">
            No favourable window in this range with these limits. Look further ahead, allow shorter windows, or include night hours.
          </p>
        )}
      </section>

      <section className="mt-12">
        <H2>Day by day</H2>
        <ol className="border-t border-line">
          {Array.from({ length: days }, (_, i) => addDaysKey(todayKey, i)).map((key) => {
            const list = (byDay.get(key) ?? []).sort((a, b) => a.start.getTime() - b.start.getTime());
            const noon = dayFrame(key, profile.here).sunrise;
            return (
              <li key={key} className="grid gap-x-4 gap-y-1 border-b border-line py-2.5 sm:grid-cols-[9rem_1fr]">
                <span className="font-semibold">{fmtDate(noon, tz)}</span>
                {list.length ? (
                  <ul className="flex flex-wrap gap-x-6 gap-y-1.5 text-[0.95rem]">
                    {list.map((f) => (
                      <li key={f.start.getTime()} className="flex items-center gap-2 tabular-nums">
                        <TierTag tier={f.tier} />
                        {fmtTime(f.start, tz)} to {fmtTime(f.end, tz)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-[0.95rem] text-mute">Nothing favourable. Keep this day for routine.</span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <p className="mt-8 max-w-[70ch] text-sm text-mute">
        Times are for {profile.here.name}. If you will be somewhere else on the day, change your location in Setup first, because sunrise moves every
        window.
      </p>
    </div>
  );
}
