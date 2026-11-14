"use client";

import { Factor, Tier, TIER } from "@/lib/astro/score";
import { Tone } from "@/lib/astro/transits";

export function TierTag({ tier, className = "" }: { tier: Tier; className?: string }) {
  return (
    <span className={`tier-${tier} inline-block rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none ${className}`}>
      {TIER[tier].word}
    </span>
  );
}

export function Meter({ score, tier }: { score: number; tier: Tier }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-sm bg-ink/10" role="img" aria-label={`Score ${score} of 100`}>
      <span className={`tier-${tier} meter-fill block h-full`} style={{ width: `${Math.max(4, score)}%` }} />
    </span>
  );
}

export function PageTitle({ title, tamil, children }: { title: string; tamil?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 max-w-[70ch]">
      <h1 className="display text-4xl sm:text-5xl">
        {title}
        {tamil && <span className="tamil ml-3 text-2xl text-peacock sm:text-3xl">{tamil}</span>}
      </h1>
      {children && <p className="mt-3 text-[1.05rem] text-mute">{children}</p>}
    </div>
  );
}

export function H2({ children, tamil, aside }: { children: React.ReactNode; tamil?: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="display text-2xl">
        {children}
        {tamil && <span className="tamil ml-2.5 text-lg font-medium text-peacock">{tamil}</span>}
      </h2>
      {aside && <div className="text-sm text-mute">{aside}</div>}
    </div>
  );
}

export function Loading({ label = "Reading the sky" }: { label?: string }) {
  return (
    <div className="py-24 text-mute" role="status">
      <p className="display text-2xl">{label}…</p>
    </div>
  );
}

const TONE_DOT: Record<Tone, string> = { good: "bg-go", bad: "bg-avoid", neutral: "bg-mute/50" };

export function ToneDot({ tone }: { tone: Tone }) {
  return <span aria-hidden className={`mt-[0.55em] inline-block h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`} />;
}

export function FactorList({ factors, activity = "overall", limit }: { factors: Factor[]; activity?: keyof Factor["effect"]; limit?: number }) {
  const sorted = [...factors]
    .filter((f) => Math.abs(f.effect[activity]) >= 0.5)
    .sort((a, b) => Math.abs(b.effect[activity]) - Math.abs(a.effect[activity]));
  const shown = limit ? sorted.slice(0, limit) : sorted;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {shown.map((f) => {
        const v = f.effect[activity];
        return (
          <li key={f.id} className="grid grid-cols-[3.2rem_1fr] gap-x-3 py-3">
            <span className={`pt-0.5 text-right text-lg font-semibold tabular-nums ${v > 0 ? "text-go" : "text-avoid"}`}>
              {v > 0 ? "+" : "−"}
              {Math.abs(Math.round(v))}
            </span>
            <div>
              <p className="font-semibold leading-snug">{f.title}</p>
              <p className="mt-0.5 text-[0.95rem] text-mute">{f.detail}</p>
              <p className="mt-1 text-[0.8rem] text-peacock">{f.source}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DateStepper({ value, onChange, todayKey }: { value: string; onChange: (k: string) => void; todayKey: string }) {
  const shift = (days: number) => {
    const [y, m, d] = value.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + days, 12));
    onChange(`${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`);
  };
  const btn = "rounded border border-line px-3 py-2 hover:bg-panel";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={btn} onClick={() => shift(-1)} aria-label="Previous day">
        ‹
      </button>
      <label className="sr-only" htmlFor="date-pick">
        Date
      </label>
      <input id="date-pick" type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} className="!w-auto" />
      <button type="button" className={btn} onClick={() => shift(1)} aria-label="Next day">
        ›
      </button>
      {value !== todayKey && (
        <button type="button" className={btn} onClick={() => onChange(todayKey)}>
          Back to today
        </button>
      )}
    </div>
  );
}

/** A list of titled findings, each with a tone dot. Used by the amsa and Indu lagna readings. */
export function LineList({ lines, stacked = false }: { lines: { title: string; detail: string; tone: "good" | "bad" | "neutral" }[]; stacked?: boolean }) {
  return (
    <ul className="border-t border-line">
      {lines.map((l) => (
        <li key={l.title} className={`grid gap-x-8 gap-y-1 border-b border-line py-4 ${stacked ? "" : "md:grid-cols-[17rem_1fr]"}`}>
          <span className="flex items-baseline gap-2 font-semibold">
            <span aria-hidden className={`inline-block h-2 w-2 shrink-0 translate-y-[-1px] rounded-full ${l.tone === "good" ? "bg-go" : l.tone === "bad" ? "bg-avoid" : "bg-ink/25"}`} />
            {l.title}
          </span>
          <span className="max-w-[68ch] text-[0.98rem] text-mute">{l.detail}</span>
        </li>
      ))}
    </ul>
  );
}
