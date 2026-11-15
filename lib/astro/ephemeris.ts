// Sidereal (nirayana) positions using the Lahiri / Chitrapaksha ayanamsa, the basis of
// Thirukanitha (drik) panchangams. Planet positions come from astronomy-engine
// (accurate to about an arc-minute), computed geocentric and apparent.

import * as Astronomy from "astronomy-engine";
import { norm360, PlanetId } from "./constants";

const DEG = Math.PI / 180;

// Mean Lahiri ayanamsa at J2000.0. Derived from the Indian Calendar Reform Committee
// definition (23°15'00.658" on 21 Mar 1956, true) the same way Swiss Ephemeris does.
const AYANAMSA_J2000 = 23.857056;

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const julianCenturies = (date: Date) => (date.getTime() - J2000_MS) / (36525 * 86400000);

/** Lahiri ayanamsa (mean) in degrees for the date. */
export function ayanamsa(date: Date): number {
  const T = julianCenturies(date);
  return AYANAMSA_J2000 + (5028.796195 * T + 1.1054348 * T * T) / 3600;
}

const ROT_EQJ_ECL = Astronomy.Rotation_EQJ_ECL();

const BODY: Partial<Record<PlanetId, Astronomy.Body>> = {
  Su: Astronomy.Body.Sun,
  Ma: Astronomy.Body.Mars,
  Me: Astronomy.Body.Mercury,
  Ju: Astronomy.Body.Jupiter,
  Ve: Astronomy.Body.Venus,
  Sa: Astronomy.Body.Saturn,
};

function meanNodeTropical(date: Date): number {
  const T = julianCenturies(date);
  return norm360(
    125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000,
  );
}

/**
 * Sidereal longitude (0..360) of a graha.
 *
 * The longitude is measured on the J2000 ecliptic and the J2000 ayanamsa is subtracted.
 * Because the ayanamsa grows at exactly the rate of precession, this equals
 * "tropical longitude of date minus ayanamsa of date" to well under an arc-second,
 * and sidesteps nutation entirely.
 */
export function siderealLongitude(planet: PlanetId, date: Date): number {
  if (planet === "Ra") return norm360(meanNodeTropical(date) - ayanamsa(date));
  if (planet === "Ke") return norm360(meanNodeTropical(date) - ayanamsa(date) + 180);
  const vec =
    planet === "Mo" ? Astronomy.GeoMoon(date) : Astronomy.GeoVector(BODY[planet] as Astronomy.Body, date, true);
  const ecl = Astronomy.RotateVector(ROT_EQJ_ECL, vec);
  const lon = Math.atan2(ecl.y, ecl.x) / DEG;
  return norm360(lon - AYANAMSA_J2000);
}

/** Degrees per day; negative means retrograde. */
export function dailyMotion(planet: PlanetId, date: Date): number {
  const h = 3 * 3600000;
  const a = siderealLongitude(planet, new Date(date.getTime() - h));
  const b = siderealLongitude(planet, new Date(date.getTime() + h));
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff * 4;
}

export type Positions = Record<PlanetId, number>;

export function allPositions(date: Date): Positions {
  return {
    Su: siderealLongitude("Su", date),
    Mo: siderealLongitude("Mo", date),
    Ma: siderealLongitude("Ma", date),
    Me: siderealLongitude("Me", date),
    Ju: siderealLongitude("Ju", date),
    Ve: siderealLongitude("Ve", date),
    Sa: siderealLongitude("Sa", date),
    Ra: siderealLongitude("Ra", date),
    Ke: siderealLongitude("Ke", date),
  };
}

/** Sidereal longitude of the lagna (ascendant) for a place and instant. */
export function lagnaLongitude(date: Date, latitude: number, longitude: number): number {
  const gst = Astronomy.SiderealTime(date); // hours
  const ramc = norm360(gst * 15 + longitude) * DEG;
  const T = julianCenturies(date);
  const eps = (23.439291 - 0.0130042 * T) * DEG;
  const lat = latitude * DEG;
  const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps))) / DEG;
  return norm360(asc - ayanamsa(date));
}

/** Sidereal longitude of the midheaven (the 10th cusp, the point culminating in the south). */
export function midheavenLongitude(date: Date, longitude: number): number {
  const gst = Astronomy.SiderealTime(date); // hours
  const ramc = norm360(gst * 15 + longitude) * DEG;
  const T = julianCenturies(date);
  const eps = (23.439291 - 0.0130042 * T) * DEG;
  const mc = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) / DEG;
  return norm360(mc - ayanamsa(date));
}

/** Declination (kranti) in degrees of a point on the ecliptic at a sidereal longitude, north positive. */
export function declinationOf(siderealLon: number, date: Date): number {
  const T = julianCenturies(date);
  const eps = (23.439291 - 0.0130042 * T) * DEG;
  const tropical = norm360(siderealLon + ayanamsa(date)) * DEG;
  return Math.asin(Math.sin(eps) * Math.sin(tropical)) / DEG;
}

// Heliocentric mean longitudes on the J2000 ecliptic (Meeus, Astronomical Algorithms, table 31.b),
// used for the mean positions that Cheshta bala needs.
const MEAN_L: Record<"Me" | "Ve" | "Ea" | "Ma" | "Ju" | "Sa", [number, number]> = {
  Me: [252.250906, 149472.6746358],
  Ve: [181.979801, 58517.815676],
  Ea: [100.466457, 35999.3728565],
  Ma: [355.433, 19140.2993039],
  Ju: [34.351519, 3034.9056606],
  Sa: [50.077444, 1222.1138488],
};
/** Sidereal mean longitude: of the Sun as seen from the Earth, or of a planet around the Sun. */
export function meanLongitude(body: "Su" | "Me" | "Ve" | "Ma" | "Ju" | "Sa", date: Date): number {
  const T = julianCenturies(date);
  const [l0, rate] = MEAN_L[body === "Su" ? "Ea" : body];
  return norm360(l0 + rate * T + (body === "Su" ? 180 : 0) - AYANAMSA_J2000);
}

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  nextSunrise: Date;
}

/** Sunrise, sunset and the following sunrise, searching forward from `from`. */
export function sunTimesFrom(from: Date, latitude: number, longitude: number): SunTimes {
  const obs = new Astronomy.Observer(latitude, longitude, 0);
  const rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, from, 2);
  if (!rise) throw new Error("No sunrise found for this place and date.");
  const set = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, rise.date, 2);
  if (!set) throw new Error("No sunset found for this place and date.");
  const next = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, set.date, 2);
  if (!next) throw new Error("No sunrise found for this place and date.");
  return { sunrise: rise.date, sunset: set.date, nextSunrise: next.date };
}
