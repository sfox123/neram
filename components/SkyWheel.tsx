"use client";

// The sky now drawn as a wheel: the twelve rasis around the rim with their Tamil names,
// the 27 star ticks inside, and each graha placed where it stands at this moment.
// Mesham sits at the left and the signs run anti-clockwise, as on a drawn horoscope.

import { useMemo } from "react";
import { GRAHA_COLOR, GrahaShape } from "./Graha";
import { formatDeg, NAKSHATRA, nakOf, PLANET_INFO, PlanetId, PLANETS, RASI, signOf } from "@/lib/astro/constants";
import { allPositions, lagnaLongitude } from "@/lib/astro/ephemeris";

interface Props {
  at: Date;
  latitude: number;
  longitude: number;
  /** Your rasi, shaded on the rim. */
  natalMoonSign?: number | null;
  className?: string;
}

const C = 200;
const R_OUT = 190;
const R_IN = 156;

function pt(lon: number, r: number): [number, number] {
  const a = ((180 - lon) * Math.PI) / 180;
  return [C + r * Math.cos(a), C - r * Math.sin(a)];
}

function sector(lon0: number, lon1: number, r0: number, r1: number) {
  const [ax, ay] = pt(lon0, r1);
  const [bx, by] = pt(lon1, r1);
  const [cx, cy] = pt(lon1, r0);
  const [dx, dy] = pt(lon0, r0);
  return `M${ax} ${ay}A${r1} ${r1} 0 0 0 ${bx} ${by}L${cx} ${cy}A${r0} ${r0} 0 0 1 ${dx} ${dy}Z`;
}

function arcPath(lon0: number, lon1: number, r: number) {
  const [ax, ay] = pt(lon0, r);
  const [bx, by] = pt(lon1, r);
  return `M${ax} ${ay}A${r} ${r} 0 0 0 ${bx} ${by}`;
}

export function SkyWheel({ at, latitude, longitude, natalMoonSign = null, className = "" }: Props) {
  // Planets barely move in ten minutes; the lagna does, so it is read on the finer tick.
  const bucket = Math.floor(at.getTime() / 600000);
  const pos = useMemo(() => allPositions(new Date(bucket * 600000)), [bucket]);
  const lagna = useMemo(() => lagnaLongitude(at, latitude, longitude), [at, latitude, longitude]);

  const moonSign = signOf(pos.Mo);
  const moonStar = nakOf(pos.Mo);
  const starSpan = 360 / 27;

  // Spread conjunct planets inward so none sits on top of another.
  const ordered = [...PLANETS].sort((a, b) => pos[a] - pos[b]);
  const radius: Partial<Record<PlanetId, number>> = {};
  ordered.forEach((p, i) => {
    let crowd = 0;
    for (let j = 0; j < i; j++) {
      const d = Math.abs(pos[p] - pos[ordered[j]]);
      if (Math.min(d, 360 - d) < 11) crowd++;
    }
    radius[p] = 136 - crowd * 20;
  });

  const [lx, ly] = pt(lagna, R_IN + 2);
  const [lx2, ly2] = pt(lagna, R_IN - 10);
  const [lx3, ly3] = pt(lagna + 3, R_IN - 2);
  const [lx4, ly4] = pt(lagna - 3, R_IN - 2);

  return (
    <figure className={className}>
      <svg viewBox="0 0 400 400" className="block w-full" role="img" aria-label={`The sky now: Moon in ${RASI[moonSign].ta}, ${NAKSHATRA[moonStar].ta}; lagna rising ${RASI[signOf(lagna)].ta}`}>
        {/* decorative slow rings */}
        <circle cx={C} cy={C} r={197} fill="none" stroke="var(--color-line)" strokeWidth={1} strokeDasharray="2 7" className="wheel-slow" />
        <circle cx={C} cy={C} r={74} fill="none" stroke="var(--color-peacock)" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="1 5" className="wheel-slow-rev" />

        {/* the twelve rasis */}
        {RASI.map((r, i) => (
          <g key={r.en}>
            <path
              d={sector(i * 30, i * 30 + 30, R_IN, R_OUT)}
              fill={natalMoonSign === i ? "var(--color-steady)" : i % 2 ? "var(--color-panel)" : "var(--color-paper)"}
              fillOpacity={natalMoonSign === i ? 0.75 : 1}
              stroke="var(--color-ink)"
              strokeOpacity={0.35}
              strokeWidth={0.8}
            />
            <text x={pt(i * 30 + 15, 173)[0]} y={pt(i * 30 + 15, 173)[1]} textAnchor="middle" dominantBaseline="central" className="tamil" fontSize={10.5} fill="var(--color-ink)">
              {r.tamil}
            </text>
          </g>
        ))}

        {/* 27 star ticks, with the Moon's star drawn in */}
        {Array.from({ length: 27 }, (_, k) => {
          const [x1, y1] = pt(k * starSpan, R_IN);
          const [x2, y2] = pt(k * starSpan, R_IN - 6);
          return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-ink)" strokeOpacity={0.4} strokeWidth={0.8} />;
        })}
        <path d={arcPath(moonStar * starSpan, (moonStar + 1) * starSpan, R_IN - 3)} fill="none" stroke={GRAHA_COLOR.Mo} strokeWidth={5} strokeLinecap="butt" className="moon-glow" />
        <circle cx={C} cy={C} r={R_IN - 6} fill="none" stroke="var(--color-ink)" strokeOpacity={0.25} strokeWidth={0.8} />

        {/* rising lagna marker */}
        <polygon points={`${lx},${ly} ${lx3},${ly3} ${lx2},${ly2} ${lx4},${ly4}`} fill="var(--color-ink)" />
        <line x1={lx2} y1={ly2} x2={pt(lagna, 80)[0]} y2={pt(lagna, 80)[1]} stroke="var(--color-ink)" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 4" />

        {/* the centre: the Moon's star today */}
        <circle cx={C} cy={C} r={68} fill="var(--color-panel)" />
        <text x={C} y={C - 22} textAnchor="middle" className="tamil" fontSize={11} fill="var(--color-mute)">
          சந்திரன்
        </text>
        <text x={C} y={C + 2} textAnchor="middle" className="tamil" fontSize={17} fontWeight={600} fill="var(--color-ink)">
          {NAKSHATRA[moonStar].tamil}
        </text>
        <text x={C} y={C + 22} textAnchor="middle" className="tamil" fontSize={12} fill="var(--color-peacock)">
          {RASI[moonSign].tamil}
        </text>
        <text x={C} y={C + 42} textAnchor="middle" fontSize={9} fill="var(--color-mute)">
          {NAKSHATRA[moonStar].ta}, {RASI[moonSign].ta}
        </text>

        {/* the grahas */}
        {PLANETS.map((p, i) => {
          const [x, y] = pt(pos[p], radius[p]!);
          const size = p === "Mo" || p === "Su" || p === "Ju" ? 26 : 22;
          return (
            <g key={p} transform={`translate(${x - size / 2} ${y - size / 2})`}>
              <g className="graha-pop" style={{ animationDelay: `${120 + i * 70}ms` }}>
                <g transform={`scale(${size / 32})`}>
                  <title>{`${PLANET_INFO[p].tamil} ${PLANET_INFO[p].ta}, ${RASI[signOf(pos[p])].tamil} ${formatDeg(pos[p])}`}</title>
                  <circle cx={16} cy={16} r={15} fill="var(--color-paper)" fillOpacity={0.85} />
                  <GrahaShape id={p} />
                </g>
              </g>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3">
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-[0.85rem]">
          {PLANETS.map((p) => (
            <li key={p} className="flex items-center gap-1.5" title={`${PLANET_INFO[p].ta} in ${RASI[signOf(pos[p])].ta}, ${formatDeg(pos[p])}`}>
              <svg viewBox="0 0 32 32" width={15} height={15} aria-hidden>
                <GrahaShape id={p} animate={false} />
              </svg>
              <span className="tamil">{PLANET_INFO[p].tamil}</span>
              <span className="tamil text-mute">{RASI[signOf(pos[p])].tamil}</span>
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-0 w-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-ink" />
            <span className="tamil">லக்னம்</span>
            <span className="tamil text-mute">{RASI[signOf(lagna)].tamil}</span>
          </li>
        </ul>
      </figcaption>
    </figure>
  );
}
