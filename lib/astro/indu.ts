// Indu lagna (Dhana lagna): the wealth ascendant of Kalidasa's Uttara Kalamrita.
//
// Each planet has a fixed number of kalas (rays): Sun 30, Moon 16, Mars 6, Mercury 8,
// Jupiter 10, Venus 12, Saturn 1. Add the kalas of the 9th lord from the lagna and the 9th
// lord from the Moon, cast out twelves, and count the remainder in signs from the Moon.
// The sign reached is then read like a lagna, for money alone:
//   - benefics in it, unspoilt by malefics, are the big-wealth signature; malefics in it give
//     moderately, an exalted malefic late;
//   - its lord, strong and well placed, gives wealth in its own periods;
//   - planets in it, looking at it, or in the kendras and trines from it produce wealth;
//     planets in the 3rd, 6th, 8th and 12th from it thin it out;
//   - the periods of the lord and the producers are the wealth windows, helped along when
//     Guru crosses or looks at the sign.
// The 2nd and 11th from it are shown as supports by ordinary house logic; the classical rule
// does not name them.

import { ashtakavarga } from "./ashtaka";
import { KALA, Natal, ordinal } from "./chart";
import { houseFrom, PLANET_INFO, PlanetId, PLANETS, RASI, signOf } from "./constants";
import { RunningDasha } from "./dasha";
import { aspects, Dignity, dignity, isCombust } from "./dignity";
import { siderealLongitude } from "./ephemeris";
import { nextSignChange } from "./panchang";
import { MS_DAY } from "./time";
import { AmsaLine, vargaStrength } from "./vargas";
import { yogiInfo } from "./yogi";

export interface InduWorking {
  ninthFromLagna: number;
  lordA: PlanetId;
  kalaA: number;
  ninthFromMoon: number;
  lordB: PlanetId;
  kalaB: number;
  sum: number;
  remainder: number;
  sign: number;
}

export type InduRole = "in" | "sight" | "kendra" | "trine" | "support" | "thin";

export const ROLE_LABEL: Record<InduRole, string> = {
  in: "In the Indu lagna",
  sight: "Looks at it",
  kendra: "Kendra from it",
  trine: "Trine from it",
  support: "Supports (2nd or 11th)",
  thin: "Thins it out",
};

export interface InduPlanet {
  planet: PlanetId;
  sign: number;
  house: number;
  role: InduRole;
  sees: boolean;
  dignity: Dignity;
  weight: number;
  note: string;
}

export type InduWord = "Rich" | "Good" | "Moderate" | "Thin";

export interface InduReading {
  working: InduWorking;
  sign: number;
  savPoints: number | null;
  lord: PlanetId;
  planets: InduPlanet[];
  producers: PlanetId[];
  supports: PlanetId[];
  thinners: PlanetId[];
  score: number;
  word: InduWord;
  summary: string;
  lines: AmsaLine[];
}

const NAME = (p: PlanetId) => PLANET_INFO[p].ta;
const BENEFIC: PlanetId[] = ["Ju", "Ve", "Me", "Mo"];
const NODES: PlanetId[] = ["Ra", "Ke"];
const TOPIC: Record<number, string> = {
  1: "the wealth point itself",
  2: "what is kept",
  3: "own effort and skills",
  4: "property and base",
  5: "ideas, merit and speculation",
  6: "service, debts and competition",
  7: "partners, clients and trade",
  8: "sudden turns and other people's money",
  9: "fortune",
  10: "work and standing",
  11: "gains",
  12: "spending and outflow",
};

export function induWorking(n: Natal): InduWorking {
  const ninthFromLagna = (n.lagnaSign + 8) % 12;
  const ninthFromMoon = (n.moonSign + 8) % 12;
  const lordA = RASI[ninthFromLagna].lord;
  const lordB = RASI[ninthFromMoon].lord;
  const kalaA = KALA[lordA] ?? 0;
  const kalaB = KALA[lordB] ?? 0;
  const sum = kalaA + kalaB;
  const remainder = sum % 12 === 0 ? 12 : sum % 12;
  return { ninthFromLagna, lordA, kalaA, ninthFromMoon, lordB, kalaB, sum, remainder, sign: (n.moonSign + remainder - 1) % 12 };
}

export function induReading(n: Natal, run?: RunningDasha | null): InduReading {
  const working = induWorking(n);
  const sign = working.sign;
  const lord = RASI[sign].lord;
  const amsa = vargaStrength(n);
  const y = yogiInfo(n);
  const savPoints = n.profile.timeConfirmed ? ashtakavarga(n).sav[sign] : null;

  const planets: InduPlanet[] = PLANETS.map((p) => {
    const ps = signOf(n.positions[p]);
    const house = houseFrom(sign, ps);
    const node = NODES.includes(p);
    const dig = dignity(p, ps);
    const sees = house !== 1 && aspects(p, ps, sign);
    const benefic = BENEFIC.includes(p);
    const role: InduRole = house === 1 ? "in" : [4, 7, 10].includes(house) ? "kendra" : [5, 9].includes(house) ? "trine" : sees ? "sight" : [2, 11].includes(house) ? "support" : "thin";
    let weight =
      role === "in" ? (benefic ? 3 : dig === "exalted" ? 2 : 1.5)
      : role === "kendra" || role === "trine" ? 2
      : role === "sight" ? (benefic ? 1.5 : -0.5)
      : role === "support" ? 1
      : -1;
    if (!node) {
      if (dig === "exalted" || dig === "own") weight += 0.5;
      if (dig === "debilitated") weight -= 0.75;
      const a = amsa[p];
      if (a.vargottama || a.d9 === "exalted" || a.d9 === "own") weight += 0.5;
      if (a.d9 === "debilitated") weight -= 0.5;
    } else if (weight > 0) weight /= 2;

    const dg = node || dig === "neutral" ? "" : `, ${dig === "own" ? "in its own sign" : dig === "friend" ? "in a friend's sign" : dig === "enemy" ? "in an enemy's sign" : dig}`;
    const where = `${ordinal(house)} from it (${TOPIC[house]})${dg}`;
    const note =
      role === "in" ? `Sits in the Indu lagna${dg}. ${benefic ? "A benefic here is the classic sign of wealth." : dig === "exalted" ? "An exalted malefic here gives wealth late, growing with time." : "A malefic here gives moderately, and through effort."}`
      : role === "kendra" || role === "trine" ? `${where}. A wealth-producing place: its periods bring money through ${TOPIC[house]}.`
      : role === "sight" ? `${where}, and it looks at the Indu lagna. ${benefic ? "A benefic's sight adds to it." : "A malefic's sight puts pressure on it."}`
      : role === "support" ? `${where}. Not named in the classical rule, but a money house by ordinary logic: steady support.`
      : `${where}. One of the places that thin the Indu lagna: do not look to its periods for windfalls.`;
    return { planet: p, sign: ps, house, role, sees, dignity: dig, weight: Math.round(weight * 100) / 100, note };
  });

  const by = (p: PlanetId) => planets.find((x) => x.planet === p)!;
  const producers = planets.filter((x) => ["in", "kendra", "trine"].includes(x.role) || (x.role === "sight" && x.weight > 0)).sort((a, b) => b.weight - a.weight).map((x) => x.planet);
  const supports = planets.filter((x) => x.role === "support").map((x) => x.planet);
  const thinners = planets.filter((x) => x.role === "thin" || (x.role === "sight" && x.weight < 0)).map((x) => x.planet);
  const occupants = planets.filter((x) => x.role === "in");
  const seers = planets.filter((x) => x.sees);

  const lp = by(lord);
  const savAdj = savPoints === null ? 0 : savPoints >= 30 ? 1 : savPoints <= 25 ? -1 : 0;
  const score =
    planets.filter((x) => producers.includes(x.planet)).reduce((a, x) => a + x.weight, 0) +
    planets.filter((x) => x.role === "support").reduce((a, x) => a + x.weight / 2, 0) +
    lp.weight * (producers.includes(lord) ? 0.5 : 1) +
    savAdj;
  const word: InduWord = score >= 9 ? "Rich" : score >= 5.5 ? "Good" : score >= 2 ? "Moderate" : "Thin";
  const summary =
    word === "Rich" ? "A strong wealth chart by this measure: money comes readily in the periods named below."
    : word === "Good" ? "A good wealth chart by this measure, with clear periods when money comes more easily."
    : word === "Moderate" ? "A moderate reading: wealth is built by your own work over time, not handed over, and it comes in particular periods."
    : "A thin reading by this measure: rely on your 2nd and 11th lords and steady saving more than on windfalls.";

  // ---- Lines -------------------------------------------------------------------------------
  const lines: AmsaLine[] = [];
  lines.push({
    title: `${RASI[sign].ta} Indu lagna`,
    detail: `${ordinal(houseFrom(n.lagnaSign, sign))} house from your lagna and ${ordinal(houseFrom(n.moonSign, sign))} from your Moon.${savPoints !== null ? ` It holds ${savPoints} Ashtakavarga points (28 is average), so the sign itself is ${savPoints >= 30 ? "strong" : savPoints >= 26 ? "ordinary" : "weak"} for you.` : ""}`,
    tone: savAdj > 0 ? "good" : savAdj < 0 ? "bad" : "neutral",
  });
  lines.push(
    occupants.length
      ? {
          title: `${occupants.map((x) => NAME(x.planet)).join(" and ")} in the Indu lagna`,
          detail: occupants.map((x) => `${NAME(x.planet)}: ${x.note.split(". ").slice(1).join(". ")}`).join(" "),
          tone: occupants.some((x) => BENEFIC.includes(x.planet)) ? "good" : "neutral",
        }
      : {
          title: "No planet in the Indu lagna",
          detail: `${seers.length ? `It is looked at by ${seers.map((x) => NAME(x.planet)).join(" and ")}.` : "No planet looks at it either."} The big-wealth signature of this method, benefics sitting in the Indu lagna, is not in your chart, so the reading rests on its lord and on the planets around it.`,
          tone: "neutral",
        },
  );
  const combust = isCombust(lord, n.positions[lord], n.positions.Su);
  lines.push({
    title: `Its lord ${NAME(lord)}, ${ordinal(lp.house)} from it`,
    detail:
      `${NAME(lord)} is in ${RASI[lp.sign].ta}${lp.dignity === "neutral" ? "" : `, ${lp.dignity === "own" ? "its own sign" : lp.dignity}`}${combust ? ", combust" : ""}. ` +
      (["in", "kendra", "trine"].includes(lp.role)
        ? `Well placed from the Indu lagna: ${NAME(lord)}'s periods are your prime wealth windows.`
        : lp.role === "support"
          ? `In a money house from the Indu lagna: its periods add steadily.`
          : `The ${ordinal(lp.house)} is a thinning place, so the lord gives in a limited way at first and more with time, through ${TOPIC[lp.house]}.`) +
      (lord === y.avayogi ? ` ${NAME(lord)} is also your Avayogi, so its periods are for careful handling of money, not for risk.` : lord === y.yogi ? ` ${NAME(lord)} is also your Yogi, which adds luck to it.` : ""),
    tone: ["in", "kendra", "trine"].includes(lp.role) && lp.dignity !== "debilitated" ? "good" : lp.role === "thin" ? "bad" : "neutral",
  });
  if (producers.length)
    lines.push({
      title: "Your wealth-producing planets",
      detail: producers.map((p) => `${NAME(p)} in the ${ordinal(by(p).house)} from it (${TOPIC[by(p).house]})${by(p).dignity === "exalted" ? ", exalted" : by(p).dignity === "own" ? ", own sign" : ""}${amsa[p].d9 === "debilitated" ? ", though debilitated in navamsa" : ""}`).join("; ") + ". Their dasa, bhukti and antaram are when money comes most readily.",
      tone: "good",
    });
  else lines.push({ title: "No planet in a kendra or trine from it", detail: "None of your planets holds a wealth-producing place from the Indu lagna; the supports below carry the load.", tone: "bad" });
  if (supports.length)
    lines.push({
      title: "Supports",
      detail: supports.map((p) => `${NAME(p)} in the ${ordinal(by(p).house)} from it (${TOPIC[by(p).house]})${by(p).dignity === "own" ? ", own sign" : by(p).dignity === "exalted" ? ", exalted" : ""}`).join("; ") + ".",
      tone: "good",
    });
  if (thinners.length)
    lines.push({
      title: "Planets that thin it out",
      detail: `${thinners.map((p) => `${NAME(p)} (${ordinal(by(p).house)})`).join(", ")}. In their periods money takes more work and leaks more easily; they can still do well for other things.`,
      tone: "bad",
    });
  if (run) {
    const seen = new Set<PlanetId>();
    const parts: string[] = [];
    for (const [level, l] of [["dasa", run.maha.lord], ["bhukti", run.bhukti.lord], ["antaram", run.antaram.lord]] as [string, PlanetId][]) {
      const x = by(l);
      parts.push(`${NAME(l)} ${level}${seen.has(l) ? " (as above)" : `: ${ROLE_LABEL[x.role].toLowerCase()}, ${ordinal(x.house)}`}`);
      seen.add(l);
    }
    const net = [run.bhukti.lord, run.antaram.lord].reduce((a, l) => a + by(l).weight, 0);
    lines.push({
      title: "Your running periods, by this measure",
      detail: `${parts.join("; ")}. ${net >= 2 ? "Together they favour money now." : net <= -1 ? "Together they do not favour windfalls now: earn, save and avoid risk." : "A mixed picture: one helps and one holds back, so steady income rather than windfalls."}`,
      tone: net >= 2 ? "good" : net <= -1 ? "bad" : "neutral",
    });
  }

  return { working, sign, savPoints, lord, planets, producers, supports, thinners, score: Math.round(score * 100) / 100, word, summary, lines };
}

/** How much a period lord helps money by the Indu lagna, for the scoring. */
export function induWeight(r: InduReading, p: PlanetId): number {
  return r.planets.find((x) => x.planet === p)!.weight;
}

// ---- Transits over the Indu lagna ----------------------------------------------------------

export interface InduTransit {
  planet: PlanetId;
  start: Date;
  end: Date;
  live: boolean;
  text: string;
  tone: "good" | "bad" | "neutral";
}

export function induTransits(n: Natal, now: Date): InduTransit[] {
  const sign = induWorking(n).sign;
  const out: InduTransit[] = [];
  const scan = (p: PlanetId, days: number, hit: (h: number) => { text: string; tone: InduTransit["tone"] } | null, max = 6) => {
    let t = now;
    const end = now.getTime() + days * MS_DAY;
    let guard = 0;
    let found = 0;
    while (t.getTime() < end && guard++ < 60 && found < max) {
      const probe = new Date(t.getTime() + 60000);
      const cur = signOf(siderealLongitude(p, probe));
      const next = nextSignChange(p, probe);
      const res = hit(houseFrom(cur, sign));
      if (res) {
        out.push({ planet: p, start: t, end: next, live: t.getTime() <= now.getTime(), ...res });
        found++;
      }
      t = next;
    }
  };
  scan("Ju", 1100, (h) =>
    h === 1 ? { text: "Guru crosses your Indu lagna: the strongest transit for money in this method.", tone: "good" }
    : [5, 7, 9].includes(h) ? { text: `Guru looks at your Indu lagna (${ordinal(h)} sight): support for income.`, tone: "good" }
    : null,
  );
  scan("Sa", 1100, (h) =>
    h === 1 ? { text: "Sani crosses your Indu lagna: money comes slowly and only for work done; avoid debt.", tone: "bad" }
    : [3, 7, 10].includes(h) ? { text: `Sani looks at your Indu lagna (${ordinal(h)} sight): income needs discipline; nothing comes loose.`, tone: "neutral" }
    : null,
  );
  scan("Ve", 500, (h) => (h === 1 ? { text: "Sukran crosses your Indu lagna: a few good weeks for receipts and purchases.", tone: "good" } : null), 2);
  scan("Mo", 95, (h) => (h === 1 ? { text: "Chandran crosses your Indu lagna: the month's days for asking, invoicing and receiving.", tone: "good" } : null), 3);
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
