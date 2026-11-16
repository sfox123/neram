"use client";

// The nine grahas drawn as small vector planets. Each keeps one colour across the app,
// so a glyph can stand in for a name wherever space is short.

import { useId } from "react";
import { PLANET_INFO, PlanetId } from "@/lib/astro/constants";

export const GRAHA_COLOR: Record<PlanetId, string> = {
  Su: "#d9822b",
  Mo: "#2f8794",
  Ma: "#b3243b",
  Me: "#2f8f5b",
  Ju: "#c9971f",
  Ve: "#b26fa2",
  Sa: "#3b4b7c",
  Ra: "#5b6b86",
  Ke: "#8a6a48",
};

const HI = "rgb(255 255 255 / 0.38)";
const LO = "rgb(0 0 0 / 0.18)";

/** The drawing alone, in a 32 by 32 box, for placing inside a larger SVG. */
export function GrahaShape({ id, animate = true }: { id: PlanetId; animate?: boolean }) {
  const key = useId().replace(/[^a-zA-Z0-9]/g, "");
  const c = GRAHA_COLOR[id];
  switch (id) {
    case "Su":
      return (
        <g>
          <g className={animate ? "sun-rays" : undefined} stroke={c} strokeWidth={2.2} strokeLinecap="round">
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * Math.PI) / 4;
              return <line key={i} x1={16 + 10.5 * Math.cos(a)} y1={16 + 10.5 * Math.sin(a)} x2={16 + 14.5 * Math.cos(a)} y2={16 + 14.5 * Math.sin(a)} />;
            })}
          </g>
          <circle cx={16} cy={16} r={7} fill={c} />
          <circle cx={13.5} cy={13.5} r={2.2} fill={HI} />
        </g>
      );
    case "Mo":
      return (
        <g>
          <path d="M22 6A12 12 0 1 0 22 26A11 11 0 0 1 22 6Z" fill={c} />
          <circle cx={10} cy={12} r={1.7} fill={LO} />
          <circle cx={12} cy={20.5} r={1.2} fill={LO} />
          <circle cx={7.5} cy={16.5} r={0.9} fill={LO} />
        </g>
      );
    case "Ma":
      return (
        <g>
          <circle cx={16} cy={16} r={9.5} fill={c} />
          <ellipse cx={16} cy={8} rx={4} ry={1.6} fill={HI} />
          <path d="M9 19c3-1.5 6 1 10 0" stroke={LO} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <circle cx={12.5} cy={12.5} r={2} fill={HI} />
        </g>
      );
    case "Me":
      return (
        <g>
          <circle cx={16} cy={16} r={7.5} fill={c} />
          <circle cx={13} cy={14} r={1.8} fill={LO} />
          <circle cx={18.5} cy={18.5} r={1.4} fill={LO} />
          <circle cx={18} cy={12.5} r={0.9} fill={LO} />
          <circle cx={12.5} cy={19.5} r={0.8} fill={HI} />
        </g>
      );
    case "Ju":
      return (
        <g>
          <clipPath id={`${key}j`}>
            <circle cx={16} cy={16} r={11} />
          </clipPath>
          <circle cx={16} cy={16} r={11} fill={c} />
          <g clipPath={`url(#${key}j)`}>
            <rect x={0} y={8.5} width={32} height={2.4} fill={HI} />
            <rect x={0} y={14.3} width={32} height={3.4} fill={LO} />
            <rect x={0} y={20.6} width={32} height={2} fill={HI} />
            <ellipse cx={20.5} cy={19.4} rx={2.7} ry={1.4} fill="rgb(179 36 59 / 0.7)" />
          </g>
        </g>
      );
    case "Ve":
      return (
        <g>
          <circle cx={16} cy={16} r={9.5} fill={c} />
          <path d="M8 13c4-3 9-2 13 1M9.5 20c4 2 8 1.5 12-1" stroke={HI} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </g>
      );
    case "Sa":
      return (
        <g>
          <clipPath id={`${key}s`}>
            <rect x={-4} y={16} width={40} height={20} />
          </clipPath>
          <ellipse cx={16} cy={16} rx={15} ry={4.6} fill="none" stroke={c} strokeWidth={2} opacity={0.45} transform="rotate(-18 16 16)" />
          <circle cx={16} cy={16} r={7.5} fill={c} />
          <circle cx={13} cy={13} r={2} fill={HI} />
          <ellipse cx={16} cy={16} rx={15} ry={4.6} fill="none" stroke={c} strokeWidth={2} clipPath={`url(#${key}s)`} transform="rotate(-18 16 16)" />
        </g>
      );
    case "Ra":
      return (
        <g>
          <path d="M7 24a9 9 0 1 1 18 0" fill="none" stroke={c} strokeWidth={3} strokeLinecap="round" />
          <circle cx={7} cy={24.5} r={2.8} fill={c} />
          <circle cx={25} cy={24.5} r={2.8} fill={c} />
        </g>
      );
    case "Ke":
      return (
        <g>
          <path d="M7 8a9 9 0 1 0 18 0" fill="none" stroke={c} strokeWidth={3} strokeLinecap="round" />
          <circle cx={7} cy={7.5} r={2.8} fill={c} />
          <circle cx={25} cy={7.5} r={2.8} fill={c} />
        </g>
      );
  }
}

interface Props {
  id: PlanetId;
  size?: number;
  className?: string;
  title?: string;
  animate?: boolean;
}

/** A graha as a standalone inline icon. */
export function Graha({ id, size = 20, className = "", title, animate = true }: Props) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`inline-block shrink-0 align-[-0.22em] ${className}`} role="img" aria-label={title ?? PLANET_INFO[id].ta}>
      <title>{title ?? `${PLANET_INFO[id].tamil} ${PLANET_INFO[id].ta}`}</title>
      <GrahaShape id={id} animate={animate} />
    </svg>
  );
}
