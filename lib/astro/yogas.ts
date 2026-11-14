// Yogas in the birth chart: which ones are present, how clean they are, when they switch on,
// and how to use them. Rules follow the standard classical definitions (whole-sign houses).

import { houseTopic, Natal, ordinal } from "./chart";
import { houseFrom, PLANET_INFO, PlanetId, RASI, signOf } from "./constants";
import { DashaPeriod, subPeriods } from "./dasha";
import { aspects, debilitated, EXALT, exalted, isCombust, link, ownSign } from "./dignity";
import { siderealLongitude } from "./ephemeris";
import { nextSignChange } from "./panchang";
import { MS_DAY } from "./time";
import { Tone } from "./transits";
import { vargaStrength } from "./vargas";
import { yogiInfo } from "./yogi";

export type YogaGroup = "Pancha Mahapurusha" | "Raja yogas" | "Dhana yogas" | "Sun and Moon yogas" | "Other yogas" | "To watch";

export interface Yoga {
  id: string;
  group: YogaGroup;
  name: string;
  tone: Tone;
  planets: PlanetId[]; // whose periods switch it on
  formed: string;
  modifiers: string[];
  gives: string;
  use: string;
}

const N = (p: PlanetId) => PLANET_INFO[p].ta;
const KENDRA = [1, 4, 7, 10];

const MAHAPURUSHA: Partial<Record<PlanetId, { name: string; gives: string; use: string }>> = {
  Ma: {
    name: "Ruchaka yoga",
    gives: "Courage, drive, command, physical stamina and success in competition, engineering, land and anything that needs decisive action.",
    use: "Take the lead and take on contests. Choose work with clear targets and deadlines; train the body regularly, because this yoga pays through energy spent, not saved. Its weak side is temper: decide fast, speak slow.",
  },
  Me: {
    name: "Bhadra yoga",
    gives: "Sharp intellect, speech, skill with numbers, writing, trade and analysis; a long learning life.",
    use: "Earn through knowledge work: writing, code, analysis, teaching, deals. Keep learning in public; this yoga pays for communication, so publish and present.",
  },
  Ju: {
    name: "Hamsa yoga",
    gives: "Wisdom, good name, teachers and mentors, ethical standing and steady prosperity.",
    use: "Teach, advise and mentor; seek roles of trust. It rewards generosity and principled choices over quick wins.",
  },
  Ve: {
    name: "Malavya yoga",
    gives: "Comfort, taste, charm, vehicles and property, support from partners, and gains through design, beauty and anything people enjoy.",
    use: "Put care into how things look and feel: design, presentation, user experience, client relationships. Build partnerships; let quality and polish be your signature. Its weak side is comfort-seeking, so tie it to a goal.",
  },
  Sa: {
    name: "Sasa yoga",
    gives: "Authority through discipline, command over organisations and people, endurance, and late but lasting success.",
    use: "Play the long game: systems, operations, institutions. Take responsibility for others; results come from consistency over years.",
  },
};

export function findYogas(n: Natal): Yoga[] {
  const pos = n.positions;
  const s = (p: PlanetId) => signOf(pos[p]);
  const h = (p: PlanetId) => n.house[p];
  const fromMoon = (p: PlanetId) => houseFrom(n.moonSign, s(p));
  const out: Yoga[] = [];
  const y = yogiInfo(n);
  const amsa = vargaStrength(n);

  // Things that strengthen or spoil any yoga planet.
  const modifiersFor = (p: PlanetId): string[] => {
    const m: string[] = [];
    if (isCombust(p, pos[p], pos.Su)) m.push(`${N(p)} is combust (too close to the Sun), which mutes the yoga.`);
    for (const node of ["Ra", "Ke"] as PlanetId[]) if (p !== node && s(node) === s(p)) m.push(`${N(node)} shares the sign, which unsettles ${N(p)} and makes results come in bursts.`);
    if (p !== "Ju" && (aspects("Ju", s("Ju"), s(p)) || s("Ju") === s(p))) m.push(`Guru's sight falls on ${N(p)}, which refines and protects the yoga.`);
    if (p !== "Sa" && aspects("Sa", s("Sa"), s(p))) m.push(`Sani's sight falls on ${N(p)}: results are delayed and have to be earned, but they last.`);
    if (p !== "Su" && p !== "Mo" && n.retro[p] && p !== "Ra" && p !== "Ke") m.push(`${N(p)} is retrograde: the yoga works inwardly first, and often on second attempts.`);
    const deg = pos[p] % 30;
    if (deg < 1 || deg > 29) m.push(`${N(p)} is at the very edge of its sign, which weakens it.`);
    // Navamsa: the check on whether the rasi position is backed.
    const a = amsa[p];
    if (p !== "Ra" && p !== "Ke") {
      if (a.vargottama && a.d9 !== "debilitated") m.push(`${N(p)} is vargottama (same sign in navamsa), so the yoga is steady and dependable.`);
      else if (a.d9 === "exalted") m.push(`${N(p)} is exalted in the navamsa, so the yoga is fully backed and grows with age.`);
      else if (a.d9 === "own") m.push(`${N(p)} is in its own sign in the navamsa, which backs the yoga.`);
      else if (a.d9 === "debilitated") m.push(`${N(p)} is debilitated in the navamsa (${a.d1 === "exalted" ? "exalted in rasi, fallen in amsa" : "fallen in amsa"}): the yoga is real but gives unevenly, and less than the rasi chart alone suggests.`);
    }
    const st = y.standing[p];
    if (st.boost >= 2) m.push(`${N(p)} ${st.reasons.join(" and ")}, which adds luck to the yoga.`);
    if (st.boost <= -1.5) m.push(`${N(p)} ${st.reasons.join(" and ")}, which puts a brake on the yoga.`);
    return m;
  };

  // ---- Pancha Mahapurusha ----------------------------------------------------------------
  for (const p of ["Ma", "Me", "Ju", "Ve", "Sa"] as PlanetId[]) {
    const strong = ownSign(p, s(p)) || exalted(p, s(p));
    if (!strong) continue;
    const fromLagna = KENDRA.includes(h(p));
    const fromMo = KENDRA.includes(fromMoon(p));
    if (!fromLagna && !fromMo) continue;
    const info = MAHAPURUSHA[p]!;
    out.push({
      id: `mp-${p}`,
      group: "Pancha Mahapurusha",
      name: info.name,
      tone: "good",
      planets: [p],
      formed: `${N(p)} is ${exalted(p, s(p)) ? "exalted" : "in its own sign"} in ${RASI[s(p)].ta}, ${fromLagna ? `your ${ordinal(h(p))} house, a kendra from the lagna` : `a kendra from your Moon (the weaker form of the yoga)`}.`,
      modifiers: modifiersFor(p),
      gives: info.gives,
      use: info.use,
    });
  }

  // ---- Yogakaraka and raja yogas ---------------------------------------------------------
  const kendraLords = new Map<PlanetId, number[]>();
  const trineLords = new Map<PlanetId, number[]>();
  for (const k of [1, 4, 7, 10]) kendraLords.set(n.lordOf(k), [...(kendraLords.get(n.lordOf(k)) ?? []), k]);
  for (const t of [1, 5, 9]) trineLords.set(n.lordOf(t), [...(trineLords.get(n.lordOf(t)) ?? []), t]);
  for (const [p, ks] of kendraLords) {
    const ts = (trineLords.get(p) ?? []).filter((t) => t !== 1);
    const kk = ks.filter((k) => k !== 1);
    if (ts.length && kk.length)
      out.push({
        id: `yk-${p}`,
        group: "Raja yogas",
        name: `Yogakaraka ${N(p)}`,
        tone: "good",
        planets: [p],
        formed: `${N(p)} rules both a trine (${ts.map(ordinal).join(", ")}) and a kendra (${kk.map(ordinal).join(", ")}) for ${RASI[n.lagnaSign].ta} lagna, and sits in your ${ordinal(h(p))} house in ${RASI[s(p)].ta}${ownSign(p, s(p)) ? ", its own sign" : exalted(p, s(p)) ? ", exalted" : debilitated(p, s(p)) ? ", debilitated" : ""}.`,
        modifiers: modifiersFor(p),
        gives: "One planet carries both luck and action, so its periods lift career and fortune together. This is the single most useful planet in the chart.",
        use: `Lean on ${PLANET_INFO[p].en}'s matters (${PLANET_INFO[p].karaka}) for career moves, and time big steps to its periods, weekday and hora.`,
      });
  }
  const seen = new Set<string>();
  for (const [k, ks] of kendraLords)
    for (const [t, ts] of trineLords) {
      if (k === t) continue;
      const key = [k, t].sort().join("-");
      if (seen.has(key)) continue;
      const l = link(k, pos[k], t, pos[t]);
      if (!l) continue;
      seen.add(key);
      const is910 = (ks.includes(10) && ts.includes(9)) || (kendraLords.get(t)?.includes(10) && trineLords.get(k)?.includes(9));
      out.push({
        id: `raja-${key}`,
        group: "Raja yogas",
        name: is910 ? "Dharma-karmadhipati yoga" : `Raja yoga of ${N(k)} and ${N(t)}`,
        tone: "good",
        planets: [k, t],
        formed: `${N(k)} (lord of the ${ks.map(ordinal).join(" and ")}) and ${N(t)} (lord of the ${ts.map(ordinal).join(" and ")}) are tied by ${l}: a kendra lord joined to a trine lord.`,
        modifiers: [...modifiersFor(k), ...modifiersFor(t)].slice(0, 3),
        gives: is910 ? "The lords of fortune and career work as one: recognition and position come through right effort." : "Effort (kendra) and luck (trine) support each other: rise in status, authority and results that match the work put in.",
        use: `Works best when both planets are running together, such as ${N(k)} dasa with ${N(t)} bhukti or the reverse. Take on visible responsibility in those periods.`,
      });
    }

  // ---- Dhana yogas ------------------------------------------------------------------------
  const wealth: [PlanetId, number][] = [1, 2, 5, 9, 11].map((x) => [n.lordOf(x), x]);
  const dseen = new Set<string>();
  for (const [a, ah] of wealth)
    for (const [b, bh] of wealth) {
      if (a === b || !(ah === 2 || ah === 11) || ah === bh) continue;
      const key = [a, b].sort().join("-");
      if (dseen.has(key)) continue;
      const l = link(a, pos[a], b, pos[b]);
      if (!l) continue;
      dseen.add(key);
      out.push({
        id: `dhana-${key}`,
        group: "Dhana yogas",
        name: `Dhana yoga of ${N(a)} and ${N(b)}`,
        tone: "good",
        planets: [a, b],
        formed: `${N(a)} (lord of the ${ordinal(ah)}, ${houseTopic(ah)}) and ${N(b)} (lord of the ${ordinal(bh)}, ${houseTopic(bh)}) are tied by ${l}.`,
        modifiers: [...modifiersFor(a), ...modifiersFor(b)].slice(0, 3),
        gives: "A direct line between the houses of earning, saving and fortune: money grows when these two planets are active.",
        use: `Plan raises, sales pushes and investments you have already researched for periods of ${N(a)} and ${N(b)}; use their horas for money conversations.`,
      });
    }
  for (const x of [2, 11]) {
    const p = n.lordOf(x);
    if ((exalted(p, s(p)) || ownSign(p, s(p))) && [1, 2, 4, 5, 7, 9, 10, 11].includes(h(p)))
      out.push({
        id: `dhana-strong-${x}`,
        group: "Dhana yogas",
        name: `Strong ${ordinal(x)} lord`,
        tone: "good",
        planets: [p],
        formed: `${N(p)}, lord of your ${ordinal(x)} house (${houseTopic(x)}), is ${exalted(p, s(p)) ? "exalted" : "in its own sign"} in your ${ordinal(h(p))} house.`,
        modifiers: modifiersFor(p),
        gives: x === 11 ? "A strong income lord: gains come through your own initiative and network." : "A strong savings lord: what is earned tends to stay.",
        use: `Let ${PLANET_INFO[p].en}'s field (${PLANET_INFO[p].karaka.split(",").slice(0, 3).join(",")}) be a source of income.`,
      });
  }

  // ---- Exchange of signs ------------------------------------------------------------------
  const seven: PlanetId[] = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa"];
  for (let i = 0; i < seven.length; i++)
    for (let j = i + 1; j < seven.length; j++) {
      const a = seven[i];
      const b = seven[j];
      if (RASI[s(a)].lord !== b || RASI[s(b)].lord !== a) continue;
      const hs = [h(a), h(b)];
      const dus = hs.some((x) => [6, 8, 12].includes(x));
      const third = hs.includes(3);
      out.push({
        id: `pari-${a}-${b}`,
        group: dus ? "To watch" : "Other yogas",
        name: dus ? "Dainya parivartana" : third ? "Khala parivartana" : "Maha parivartana yoga",
        tone: dus ? "bad" : "good",
        planets: [a, b],
        formed: `${N(a)} sits in ${RASI[s(a)].ta}, ${N(b)}'s sign, and ${N(b)} sits in ${RASI[s(b)].ta}, ${N(a)}'s sign: the ${ordinal(hs[0])} and ${ordinal(hs[1])} houses exchange lords.`,
        modifiers: debilitated(a, s(a)) || debilitated(b, s(b)) ? ["The exchange also cancels the debilitation of the planet involved (neecha bhanga)."] : [],
        gives: dus
          ? "An exchange with a difficult house: the two areas of life drain each other until handled deliberately."
          : `Each planet behaves as if it were in its own sign, so both houses (${houseTopic(hs[0])}; ${houseTopic(hs[1])}) are strengthened and feed each other.`,
        use: dus ? "Keep the two areas separate and budget time and money for the weaker one." : `Use one house to build the other: put ${houseTopic(hs[0]).split(" ")[0]} to work for ${houseTopic(hs[1]).split(",")[0]} and the reverse. Strongest when the two planets' periods run together.`,
      });
    }

  // ---- Neecha bhanga ----------------------------------------------------------------------
  for (const p of seven) {
    if (!debilitated(p, s(p))) continue;
    const reasons: string[] = [];
    const dispositor = RASI[s(p)].lord;
    const kendraFromEither = (q: PlanetId) => KENDRA.includes(h(q)) || KENDRA.includes(fromMoon(q));
    if (kendraFromEither(dispositor)) reasons.push(`its sign lord ${N(dispositor)} is in a kendra from the ${KENDRA.includes(h(dispositor)) ? "lagna" : "Moon"}`);
    const exaltLord = RASI[EXALT[p]!].lord;
    if (kendraFromEither(exaltLord)) reasons.push(`${N(exaltLord)}, lord of its exaltation sign, is in a kendra from the ${KENDRA.includes(h(exaltLord)) ? "lagna" : "Moon"}`);
    const exaltedHere = seven.find((q) => exalted(q, s(p)));
    if (exaltedHere && kendraFromEither(exaltedHere)) reasons.push(`${N(exaltedHere)}, the planet exalted in ${RASI[s(p)].ta}, is in a kendra from the ${KENDRA.includes(h(exaltedHere)) ? "lagna" : "Moon"}`);
    if (RASI[s(dispositor)].lord === p) reasons.push(`it exchanges signs with ${N(dispositor)}`);
    if (aspects(dispositor, s(dispositor), s(p))) reasons.push(`${N(dispositor)} looks at it`);
    if (reasons.length)
      out.push({
        id: `nb-${p}`,
        group: "Raja yogas",
        name: `Neecha bhanga raja yoga of ${N(p)}`,
        tone: "good",
        planets: [p, dispositor],
        formed: `${N(p)} is debilitated in ${RASI[s(p)].ta}, but the weakness is cancelled because ${reasons.join("; ")}.`,
        modifiers: modifiersFor(p).slice(0, 2),
        gives: "A fall turned into a rise: early struggle, self-doubt or a slow start in this planet's matters, followed by success that is greater because it was earned the hard way.",
        use: `Don't judge ${PLANET_INFO[p].en}'s areas (${PLANET_INFO[p].karaka.split(",").slice(0, 3).join(",")}) by early setbacks. Persist; the turn usually comes in its own period or its sign lord's.`,
      });
    else
      out.push({
        id: `neecha-${p}`,
        group: "To watch",
        name: `${N(p)} debilitated`,
        tone: "bad",
        planets: [p],
        formed: `${N(p)} is debilitated in ${RASI[s(p)].ta} with no cancellation.`,
        modifiers: [],
        gives: `${PLANET_INFO[p].en}'s matters need extra effort and give less than expected.`,
        use: "See Strengthen and recover for this planet's remedies.",
      });
  }

  // ---- Vipareeta raja yoga ----------------------------------------------------------------
  const vip: [number, string][] = [[6, "Harsha"], [8, "Sarala"], [12, "Vimala"]];
  for (const [x, name] of vip) {
    const p = n.lordOf(x);
    if ([6, 8, 12].includes(h(p)) && !(x === 6 && n.lordOf(1) === p))
      out.push({
        id: `vip-${x}`,
        group: "Raja yogas",
        name: `${name} yoga (Vipareeta raja yoga)`,
        tone: "good",
        planets: [p],
        formed: `${N(p)}, lord of your ${ordinal(x)} house, sits in the ${ordinal(h(p))}: a difficult lord hidden in a difficult house.`,
        modifiers: [],
        gives: "Gain out of adversity: other people's losses, crises and endings turn into openings for you.",
        use: "When something goes wrong in this planet's periods, look for the opening inside it; it is usually real.",
      });
  }

  // ---- Sun and Moon yogas -----------------------------------------------------------------
  const five: PlanetId[] = ["Ma", "Me", "Ju", "Ve", "Sa"];
  const second = five.filter((p) => fromMoon(p) === 2);
  const twelfth = five.filter((p) => fromMoon(p) === 12);
  const withMoon = five.filter((p) => fromMoon(p) === 1);
  const kendraFromMoon = five.filter((p) => KENDRA.includes(fromMoon(p)));
  if (second.length && twelfth.length)
    out.push({ id: "durudhara", group: "Sun and Moon yogas", name: "Durudhara yoga", tone: "good", planets: [...second, ...twelfth], formed: `Planets stand on both sides of your Moon (${[...twelfth, ...second].map(N).join(", ")}).`, modifiers: [], gives: "A supported mind: resources, helpers and comforts on both sides.", use: "You do best with a team around you; ask for help early." });
  else if (second.length)
    out.push({ id: "sunapha", group: "Sun and Moon yogas", name: "Sunapha yoga", tone: "good", planets: second, formed: `${second.map(N).join(", ")} in the 2nd from your Moon.`, modifiers: [], gives: "Self-earned wealth and a good name; the mind turns naturally to building resources.", use: "Earn through your own skill rather than inheritance or luck; save steadily." });
  else if (twelfth.length)
    out.push({ id: "anapha", group: "Sun and Moon yogas", name: "Anapha yoga", tone: "good", planets: twelfth, formed: `${twelfth.map(N).join(", ")} in the 12th from your Moon.`, modifiers: [], gives: "Presence, self-respect and a capable body; the planet behind the Moon acts as its backing.", use: `Rely on ${twelfth.map((p) => PLANET_INFO[p].en).join(" and ")}'s qualities when your confidence dips: they sit right behind your mind.` });
  else if (!withMoon.length && !kendraFromMoon.length && !KENDRA.includes(n.house.Mo))
    out.push({ id: "kemadruma", group: "To watch", name: "Kemadruma yoga", tone: "bad", planets: ["Mo"], formed: "No planet stands beside your Moon, with it, or in a kendra from it.", modifiers: [], gives: "The mind feels unsupported at times: swings of mood and fortune, a sense of doing things alone.", use: "Build routine and company deliberately; Monday worship of Ambal and steady sleep are the traditional supports." });

  const sunSecond = five.filter((p) => houseFrom(s("Su"), s(p)) === 2);
  const sunTwelfth = five.filter((p) => houseFrom(s("Su"), s(p)) === 12);
  if (sunSecond.length && sunTwelfth.length)
    out.push({ id: "ubhayachari", group: "Sun and Moon yogas", name: "Ubhayachari yoga", tone: "good", planets: [...sunSecond, ...sunTwelfth], formed: `Planets on both sides of your Sun (${[...sunTwelfth, ...sunSecond].map(N).join(", ")}).`, modifiers: [], gives: "Standing, eloquence and an ability to carry responsibility.", use: "Seek roles where you represent others." });
  else if (sunSecond.length)
    out.push({ id: "vesi", group: "Sun and Moon yogas", name: "Vesi yoga", tone: "good", planets: sunSecond, formed: `${sunSecond.map(N).join(", ")} in the 2nd from your Sun.`, modifiers: [], gives: "Truthfulness, balance and a steady rise.", use: "Play it straight; reputation compounds for you." });
  else if (sunTwelfth.length)
    out.push({ id: "vasi", group: "Sun and Moon yogas", name: "Vasi yoga", tone: "good", planets: sunTwelfth, formed: `${sunTwelfth.map(N).join(", ")} in the 12th from your Sun.`, modifiers: [], gives: "Skill, good memory, generosity and favour from people in authority.", use: `Let ${sunTwelfth.map((p) => PLANET_INFO[p].en).join(" and ")}'s skills be what seniors notice about you.` });

  if (s("Su") === s("Me"))
    out.push({
      id: "budhaditya",
      group: "Sun and Moon yogas",
      name: "Budhaditya yoga",
      tone: "good",
      planets: ["Su", "Me"],
      formed: `Suriyan and Budhan are together in ${RASI[s("Su")].ta}, your ${ordinal(h("Su"))} house.`,
      modifiers: isCombust("Me", pos.Me, pos.Su) ? ["Budhan is within 14° of the Sun (combust), which dulls the yoga: ideas are good but credit goes to others unless you document your work."] : ["Budhan is far enough from the Sun not to be combust, so the yoga is clean."],
      gives: "Intelligence that gets noticed: analysis, communication and a reputation for being sharp.",
      use: `Use it through the ${ordinal(h("Su"))} house (${houseTopic(h("Su"))}): write, present and make your thinking visible to people with authority.`,
    });
  if (KENDRA.includes(houseFrom(n.moonSign, s("Ju"))))
    out.push({ id: "gajakesari", group: "Other yogas", name: "Gajakesari yoga", tone: "good", planets: ["Ju", "Mo"], formed: `Guru is in the ${ordinal(houseFrom(n.moonSign, s("Ju")))} from your Moon, a kendra.`, modifiers: modifiersFor("Ju").slice(0, 2), gives: "Respect, good judgement, lasting reputation and help arriving when needed.", use: "Trust your considered judgement and take advisory or teaching roles; the yoga pays through reputation." });
  const cm = link("Mo", pos.Mo, "Ma", pos.Ma);
  if (cm === "conjunction" || cm === "mutual aspect")
    out.push({ id: "chandra-mangala", group: "Dhana yogas", name: "Chandra-Mangala yoga", tone: "good", planets: ["Mo", "Ma"], formed: `Chandran and Sevvai are tied by ${cm}.`, modifiers: [], gives: "Earning power through enterprise and boldness; money made by acting on instinct.", use: "Good for business and deal-making; guard against impulsive spending." });
  const gm = link("Ju", pos.Ju, "Ma", pos.Ma);
  if (gm === "conjunction" || gm === "mutual aspect" || aspects("Ma", s("Ma"), s("Ju")) || aspects("Ju", s("Ju"), s("Ma")))
    out.push({
      id: "guru-mangala",
      group: "Other yogas",
      name: gm ? "Guru-Mangala yoga" : "Guru-Mangala link (one-way)",
      tone: "good",
      planets: ["Ju", "Ma"],
      formed: gm ? `Guru and Sevvai are tied by ${gm}.` : aspects("Ma", s("Ma"), s("Ju")) ? `Sevvai looks at Guru in ${RASI[s("Ju")].ta}; Guru does not look back, so the yoga is partial.` : `Guru looks at Sevvai in ${RASI[s("Ma")].ta}; Sevvai does not look back, so the yoga is partial.`,
      modifiers: [],
      gives: "Energy guided by principle: leadership, property and the courage to act on convictions.",
      use: "Channel drive into causes and long projects; it supports land, building and technical leadership.",
    });
  const tenthBenefics = (["Ju", "Ve", "Me"] as PlanetId[]).filter((p) => h(p) === 10 || fromMoon(p) === 10);
  if (tenthBenefics.length)
    out.push({
      id: "amala",
      group: "Other yogas",
      name: "Amala yoga",
      tone: "good",
      planets: tenthBenefics,
      formed: tenthBenefics.map((p) => `${N(p)} is in the 10th from your ${h(p) === 10 ? "lagna" : "Moon"}`).join(" and ") + ": a natural benefic in the house of work.",
      modifiers: [],
      gives: "A spotless name in your profession; work that people remember well.",
      use: "Protect your professional reputation above short-term gain: for you it is an asset that grows.",
    });
  const adhi = (["Ju", "Ve", "Me"] as PlanetId[]).filter((p) => [6, 7, 8].includes(fromMoon(p)));
  if (adhi.length === 3)
    out.push({ id: "adhi", group: "Other yogas", name: "Adhi yoga", tone: "good", planets: adhi, formed: "Guru, Sukran and Budhan all stand in the 6th, 7th and 8th from your Moon.", modifiers: [], gives: "Leadership, comfort and victory over opposition.", use: "Aim for positions of command; opposition tends to fold." });
  if ((["Ju", "Ve", "Me"] as PlanetId[]).every((p) => [1, 2, 4, 5, 7, 9, 10].includes(h(p))) && (ownSign("Ju", s("Ju")) || exalted("Ju", s("Ju")) || FRIENDLY(n)))
    out.push({ id: "saraswati", group: "Other yogas", name: "Saraswati yoga", tone: "good", planets: ["Ju", "Ve", "Me"], formed: "Guru, Sukran and Budhan all occupy kendras, trines or the 2nd house.", modifiers: [], gives: "Learning, eloquence and skill in arts and sciences.", use: "Study, write and teach: knowledge is your wealth." });

  // ---- Cautions ---------------------------------------------------------------------------
  const mFromJ = houseFrom(s("Ju"), n.moonSign);
  if ([6, 8, 12].includes(mFromJ) && !KENDRA.includes(n.house.Mo))
    out.push({ id: "sakata", group: "To watch", name: "Sakata yoga", tone: "bad", planets: ["Mo", "Ju"], formed: `Your Moon is ${ordinal(mFromJ)} from Guru.`, modifiers: [], gives: "Fortune that turns like a wheel: ups and downs rather than a straight line.", use: "Save in good phases; don't assume a good run will continue unbroken." });
  const ra = pos.Ra;
  const side = seven.map((p) => ((pos[p] - ra + 360) % 360) < 180);
  if (side.every(Boolean) || side.every((x) => !x))
    out.push({ id: "kalasarpa", group: "To watch", name: "Kala sarpa yoga", tone: "bad", planets: ["Ra", "Ke"], formed: "All seven planets lie on one side of the Rahu-Ketu axis.", modifiers: [], gives: "Life moves in intense phases; delays early, then sudden movement.", use: "Naga worship is the traditional remedy; in practice, expect things to come in waves and plan for them." });

  return out;
}

// A light stand-in for "Guru well placed" where the strict rule asks for strength.
function FRIENDLY(n: Natal): boolean {
  return [1, 4, 5, 7, 9, 10].includes(n.house.Ju);
}

// ---- Activation -----------------------------------------------------------------------------

export interface Activation {
  runningNow: { level: "dasa" | "bhukti" | "antaram"; period: DashaPeriod }[];
  upcoming: { level: "dasa" | "bhukti" | "antaram"; period: DashaPeriod; within: PlanetId }[];
  /** 0 = dormant, 1 = lightly on, 2 = on, 3 = fully on. */
  heat: number;
}

/** When a yoga's planets rule the running periods, and when they next will. */
export function activation(n: Natal, planets: PlanetId[], now: Date): Activation {
  const runningNow: Activation["runningNow"] = [];
  const upcoming: Activation["upcoming"] = [];
  const t = now.getTime();
  const horizonBhukti = t + 15 * 365.25 * MS_DAY;
  const horizonAntaram = t + 3 * 365.25 * MS_DAY;
  for (const maha of n.mahas) {
    if (maha.end.getTime() <= t) continue;
    const mahaLive = maha.start.getTime() <= t;
    if (planets.includes(maha.lord)) {
      if (mahaLive) runningNow.push({ level: "dasa", period: maha });
      else if (maha.start.getTime() < t + 40 * 365.25 * MS_DAY) upcoming.push({ level: "dasa", period: maha, within: maha.lord });
    }
    if (maha.start.getTime() > horizonBhukti) continue;
    for (const bh of subPeriods(maha)) {
      if (bh.end.getTime() <= t || bh.start.getTime() > horizonBhukti) continue;
      const bhLive = bh.start.getTime() <= t;
      if (planets.includes(bh.lord)) {
        if (bhLive) runningNow.push({ level: "bhukti", period: bh });
        else upcoming.push({ level: "bhukti", period: bh, within: maha.lord });
      }
      if (bh.start.getTime() > horizonAntaram) continue;
      for (const an of subPeriods(bh)) {
        if (an.end.getTime() <= t || an.start.getTime() > horizonAntaram) continue;
        if (!planets.includes(an.lord)) continue;
        if (an.start.getTime() <= t) runningNow.push({ level: "antaram", period: an });
        else upcoming.push({ level: "antaram", period: an, within: bh.lord });
      }
    }
  }
  upcoming.sort((a, b) => a.period.start.getTime() - b.period.start.getTime());
  const heat = Math.min(3, runningNow.reduce((a, r) => a + (r.level === "dasa" ? 1.5 : r.level === "bhukti" ? 1.5 : 1), 0));
  return { runningNow, upcoming, heat: Math.round(heat) };
}

export interface TransitTrigger {
  planet: "Ju" | "Sa";
  start: Date;
  end: Date;
  how: string;
  live: boolean;
}

/** Guru's sight on, and Sani's passage over, a natal planet's sign in the next few years. */
export function transitTriggers(n: Natal, target: PlanetId, now: Date, days = 1100): TransitTrigger[] {
  const sign = signOf(n.positions[target]);
  const out: TransitTrigger[] = [];
  for (const p of ["Ju", "Sa"] as const) {
    let t = now;
    const end = now.getTime() + days * MS_DAY;
    let guard = 0;
    while (t.getTime() < end && guard++ < 30) {
      const cur = signOf(siderealLongitude(p, new Date(t.getTime() + 60000)));
      const next = nextSignChange(p, new Date(t.getTime() + 60000));
      const c = houseFrom(cur, sign);
      const hit = p === "Ju" ? [1, 5, 7, 9].includes(c) : c === 1;
      if (hit)
        out.push({
          planet: p,
          start: t,
          end: next,
          live: t.getTime() <= now.getTime(),
          how: p === "Ju" ? (c === 1 ? `Guru passes over ${PLANET_INFO[target].ta}` : `Guru looks at ${PLANET_INFO[target].ta} (${ordinal(c)} sight)`) : `Sani passes over ${PLANET_INFO[target].ta}`,
        });
      t = next;
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
