"use client";

// The day drawn as a skyline: one bar per stretch of time, taller and greener when the
// time is better. Runs from sunrise to the next sunrise.

import { useState } from "react";
import { ACTIVITY } from "@/lib/astro/pakshi";
import { PLANET_INFO } from "@/lib/astro/constants";
import { DayFrame } from "@/lib/astro/panchang";
import { ActivityKey, Segment, TIER } from "@/lib/astro/score";
import { fmtTime } from "@/lib/astro/time";

interface Props {
  frame: DayFrame;
  segments: Segment[];
  activity: ActivityKey;
  now?: Date;
  selected?: Date | null;
  onPick?: (t: Date) => void;
  height?: number;
  compact?: boolean;
}

export function Skyline({ frame, segments, activity, now, selected, onPick, height = 150, compact = false }: Props) {
  const [hover, setHover] = useState<Segment | null>(null);
  const tz = frame.place.tz;
  const t0 = frame.sunrise.getTime();
  const span = frame.nextSunrise.getTime() - t0;
  const pct = (d: Date) => ((d.getTime() - t0) / span) * 100;
  const nowIn = now && now.getTime() >= t0 && now.getTime() < t0 + span;
  const pickedSeg = selected ? segments.find((s) => selected >= s.start && selected < s.end) : null;
  const shown = hover ?? pickedSeg ?? (nowIn ? segments.find((s) => now! >= s.start && now! < s.end) : null) ?? null;

  // Hour ticks on round local hours.
  const ticks: { at: number; label: string }[] = [];
  const first = new Date(Math.ceil(t0 / 3600000) * 3600000);
  for (let t = first.getTime(); t < t0 + span; t += 3600000) {
    const d = new Date(t);
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(d));
    const mins = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, minute: "numeric" }).format(d));
    if (mins !== 0 || hour % 3 !== 0) continue;
    ticks.push({ at: pct(d), label: hour === 0 ? "12 am" : hour === 12 ? "12 pm" : hour < 12 ? `${hour} am` : `${hour - 12} pm` });
  }

  return (
    <div>
      <div className="relative" style={{ height }}>
        {/* night shading */}
        <div
          aria-hidden
          className="absolute inset-y-0 bg-deep/[0.07]"
          style={{ left: `${pct(frame.sunset)}%`, right: 0 }}
        />
        <div className="absolute inset-0 flex items-end" role="group" aria-label="Quality of time across the day">
          {segments.map((s, i) => {
            const score = s.reading.scores[activity];
            const tier = s.reading.tiers[activity];
            const isPicked = pickedSeg === s;
            return (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(s)}
                onBlur={() => setHover(null)}
                onClick={() => onPick?.(new Date((s.start.getTime() + s.end.getTime()) / 2))}
                aria-label={`${fmtTime(s.start, tz)} to ${fmtTime(s.end, tz)}: ${TIER[tier].word}, ${score}`}
                className={`skyline-bar tier-${tier} ${tier === "avoid" ? "bar-avoid" : ""} relative border-r border-paper/70 ${
                  isPicked ? "ring-2 ring-ink ring-offset-1 ring-offset-paper z-10" : ""
                } ${onPick ? "cursor-pointer" : "cursor-default"}`}
                style={{
                  width: `${((s.end.getTime() - s.start.getTime()) / span) * 100}%`,
                  height: `${14 + (86 * score) / 100}%`,
                  animationDelay: `${Math.min(i * 6, 500)}ms`,
                }}
              />
            );
          })}
        </div>
        {nowIn && (
          <div aria-hidden className="pointer-events-none absolute -top-2 bottom-0 z-20" style={{ left: `${pct(now!)}%` }}>
            <div className="absolute inset-y-0 w-px bg-ink" />
            <div className="now-dot absolute -left-[5px] -top-[5px] h-[11px] w-[11px] rounded-full bg-ink" />
          </div>
        )}
      </div>

      {/* axis */}
      <div className="relative mt-1 h-5 border-t border-ink/60 text-[0.75rem] text-mute">
        {ticks.map((t) => (
          <span key={t.at} className="absolute top-0.5 -translate-x-1/2 whitespace-nowrap" style={{ left: `${t.at}%` }}>
            {t.label}
          </span>
        ))}
      </div>

      {!compact && (
        <p className="mt-2 min-h-[3rem] text-[0.95rem] text-mute" aria-live="polite">
          {shown ? (
            <>
              <span className="font-semibold text-ink">
                {fmtTime(shown.start, tz)} to {fmtTime(shown.end, tz)}
              </span>
              {": "}
              <span className="font-semibold text-ink">{TIER[shown.reading.tiers[activity]].word}</span> ({shown.reading.scores[activity]}). Bird{" "}
              {ACTIVITY[shown.reading.yama.activity].ta.toLowerCase()} / {ACTIVITY[shown.reading.sub.activity].ta.toLowerCase()},{" "}
              {PLANET_INFO[shown.reading.hora.value].ta} hora, {shown.reading.gowri.value}
              {shown.reading.inRahu ? ", Rahu kalam" : ""}
              {shown.reading.inYama ? ", Yamagandam" : ""}
              {shown.reading.inAbhijit ? ", Abhijit" : ""}.{onPick ? " Select a bar to read that time in full." : ""}
            </>
          ) : (
            "Sunrise on the left, next sunrise on the right; the shaded part is night. Taller, greener bars are better time."
          )}
        </p>
      )}
    </div>
  );
}

export function TierLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem] text-mute">
      {(["go", "good", "steady", "hold", "avoid"] as const).map((t) => (
        <li key={t} className="flex items-center gap-1.5">
          <span className={`tier-${t} ${t === "avoid" ? "bar-avoid" : ""} inline-block h-3 w-3 rounded-[2px]`} />
          {TIER[t].word}
        </li>
      ))}
    </ul>
  );
}
