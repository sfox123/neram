"use client";

// South Indian rasi chart: the signs stay fixed in their boxes, Meenam at top left,
// running clockwise.

import { formatDeg, PlanetId, PLANETS, RASI, signOf } from "@/lib/astro/constants";
import { Positions } from "@/lib/astro/ephemeris";

// [row, column] of each sign, Mesham first.
const CELL: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [0, 0],
];

interface Props {
  title: string;
  subtitle?: string;
  positions: Positions;
  lagnaSign?: number | null;
  retro?: Partial<Record<PlanetId, boolean>>;
  highlightSign?: number | null;
}

export function RasiChart({ title, subtitle, positions, lagnaSign, retro, highlightSign }: Props) {
  return (
    <div className="grid aspect-square w-full max-w-[26rem] grid-cols-4 grid-rows-4 border border-ink/70 bg-paper text-[0.8rem]">
      {RASI.map((r, sign) => {
        const [row, col] = CELL[sign];
        const here = PLANETS.filter((p) => signOf(positions[p]) === sign);
        const isLagna = lagnaSign === sign;
        return (
          <div
            key={r.en}
            className={`relative border border-ink/25 p-1.5 ${highlightSign === sign ? "bg-steady/60" : ""}`}
            style={{ gridRow: row + 1, gridColumn: col + 1 }}
          >
            <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[0.7rem] leading-none text-mute">
              {r.ta}
              {isLagna && (
                <span className="rounded-sm bg-deep px-1 text-[0.65rem] font-semibold leading-4 text-paper" title="Lagna">
                  Lagna
                </span>
              )}
            </span>
            <span className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 font-semibold leading-tight">
              {here.map((p) => (
                <span key={p} title={`${p} ${formatDeg(positions[p])}`} className={p === "Mo" ? "text-peacock" : ""}>
                  {p}
                  {retro?.[p] && p !== "Ra" && p !== "Ke" ? <span className="font-normal text-mute">(R)</span> : null}
                  <span className="ml-0.5 font-normal text-mute">{Math.floor(positions[p] % 30)}°</span>
                </span>
              ))}
            </span>
          </div>
        );
      })}
      <div className="col-span-2 col-start-2 row-span-2 row-start-2 flex flex-col items-center justify-center p-2 text-center">
        <span className="display text-xl">{title}</span>
        {subtitle && <span className="mt-1 text-[0.8rem] text-mute">{subtitle}</span>}
      </div>
    </div>
  );
}
