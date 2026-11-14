// Vimshottari dasa: maha dasa, bhukti (antardasa), antaram (pratyantara) and sookshma.

import { DASHA_ORDER, DASHA_YEARS, NAK_SPAN, norm360, PlanetId } from "./constants";
import { MS_DAY } from "./time";

const YEAR_MS = 365.25 * MS_DAY;

export interface DashaPeriod {
  lord: PlanetId;
  start: Date;
  end: Date;
  level: 1 | 2 | 3 | 4;
}

/** The nine maha dasas (120 years) that contain the birth. */
export function mahaDashas(birth: Date, moonLongitude: number): DashaPeriod[] {
  const lon = norm360(moonLongitude);
  const nak = Math.floor(lon / NAK_SPAN);
  const fraction = (lon % NAK_SPAN) / NAK_SPAN;
  const firstIdx = nak % 9;
  const firstLord = DASHA_ORDER[firstIdx];
  let start = birth.getTime() - fraction * DASHA_YEARS[firstLord] * YEAR_MS;
  const out: DashaPeriod[] = [];
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(firstIdx + i) % 9];
    const len = DASHA_YEARS[lord] * YEAR_MS;
    out.push({ lord, start: new Date(start), end: new Date(start + len), level: 1 });
    start += len;
  }
  return out;
}

/** Split a period into its nine sub-periods, starting with its own lord. */
export function subPeriods(parent: DashaPeriod): DashaPeriod[] {
  const total = parent.end.getTime() - parent.start.getTime();
  const firstIdx = DASHA_ORDER.indexOf(parent.lord);
  let start = parent.start.getTime();
  const out: DashaPeriod[] = [];
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(firstIdx + i) % 9];
    const len = (total * DASHA_YEARS[lord]) / 120;
    out.push({ lord, start: new Date(start), end: new Date(start + len), level: (parent.level + 1) as 2 | 3 | 4 });
    start += len;
  }
  return out;
}

export interface RunningDasha {
  maha: DashaPeriod;
  bhukti: DashaPeriod;
  antaram: DashaPeriod;
  sookshma: DashaPeriod;
}

const at = (list: DashaPeriod[], t: Date) => list.find((p) => t >= p.start && t < p.end);

export function runningDasha(mahas: DashaPeriod[], t: Date): RunningDasha | null {
  const maha = at(mahas, t);
  if (!maha) return null;
  const bhukti = at(subPeriods(maha), t)!;
  const antaram = at(subPeriods(bhukti), t)!;
  const sookshma = at(subPeriods(antaram), t)!;
  return { maha, bhukti, antaram, sookshma };
}
