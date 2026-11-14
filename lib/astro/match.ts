// Iru jadhaga koottu vilaivu: what two horoscopes do to each other.
//
// Three layers, each a traditional method:
//   1. Star agreement (porutham) from the two birth stars and Moon signs.
//   2. Chart overlay: one person's planets placed on the other's chart, with Jupiter's
//      sight (5th, 7th, 9th and conjunction) as the main sign of benefit.
//   3. Pancha Pakshi: whether the two birth birds are friends.
// Every finding says which way it flows: what they bring you, and what you bring them.

import { buildNatal, houseTopic, Natal, ordinal, Profile } from "./chart";
import { houseFrom, NAKSHATRA, PLANET_INFO, PlanetId, RASI, signOf, TARA_MEANING, TARA_NAMES } from "./constants";
import { Bird, BIRDS, relation } from "./pakshi";
import { Place } from "./panchang";
import { Tone } from "./transits";
import { starRelation, yogiInfo } from "./yogi";

export interface Person {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM
  timeKnown: boolean;
  place: Place;
}

export function personNatal(p: Person): Natal {
  const profile: Profile = {
    name: p.name,
    birthDate: p.birthDate,
    birthTime: p.timeKnown ? p.birthTime : "12:00",
    timeConfirmed: p.timeKnown,
    birthPlace: p.place,
    here: p.place,
    birdOverride: null,
  };
  return buildNatal(profile);
}

// ---- Star tables ---------------------------------------------------------------------------

export const YONI = ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion"];
// Yoni animal of each star, Ashwini first.
const YONI_OF = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
// Sworn enemies in the South Indian list.
const YONI_ENEMY: [number, number][] = [[0, 8], [1, 13], [2, 11], [3, 12], [3, 6], [4, 10], [5, 6], [7, 9]];

export const GANA = ["Deva", "Manushya", "Rakshasa"];
const GANA_OF = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];

export const RAJJU = ["Pada (foot)", "Kati (waist)", "Nabhi (navel)", "Kanta (neck)", "Sira (head)"];
const RAJJU_OF = [0, 1, 2, 3, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 3, 2, 1, 0];

// Vedha: pairs of stars that obstruct each other (0-based).
const VEDHA: [number, number][] = [
  [0, 17], [1, 16], [2, 15], [3, 14], [5, 21], [6, 20], [7, 19], [8, 18], [9, 26], [10, 25], [11, 24], [12, 23],
  [4, 13], [13, 22], [4, 22],
];

// Vasya: signs drawn to each sign (Mesham first).
const VASYA: number[][] = [[4, 7], [3, 6], [5], [7, 8], [6], [2, 11], [5, 9], [3], [11], [0, 10], [0], [9]];

const FRIENDS: Record<string, PlanetId[]> = {
  Su: ["Mo", "Ma", "Ju"], Mo: ["Su", "Me"], Ma: ["Su", "Mo", "Ju"], Me: ["Su", "Ve"], Ju: ["Su", "Mo", "Ma"], Ve: ["Me", "Sa"], Sa: ["Me", "Ve"],
};
const ENEMIES: Record<string, PlanetId[]> = {
  Su: ["Ve", "Sa"], Mo: [], Ma: ["Me"], Me: ["Mo"], Ju: ["Me", "Ve"], Ve: ["Su", "Mo"], Sa: ["Su", "Mo", "Ma"],
};
/** +1 friend, 0 neutral, -1 enemy: how planet `a` regards planet `b`. */
const regard = (a: PlanetId, b: PlanetId) => (a === b ? 1 : FRIENDS[a]?.includes(b) ? 1 : ENEMIES[a]?.includes(b) ? -1 : 0);

const pairIn = (list: [number, number][], a: number, b: number) => list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

// ---- Results -------------------------------------------------------------------------------

export interface Finding {
  id: string;
  group: "Guru links" | "Chart overlay" | "Pressure points" | "Stars" | "Birds";
  title: string;
  detail: string;
  tone: Tone;
  toMe: number; // effect on what they bring you
  toThem: number; // effect on what you bring them
}

export interface Porutham {
  name: string;
  tamil: string;
  status: "good" | "fair" | "poor";
  note: string;
}

export interface MatchResult {
  person: Person;
  other: Natal;
  toMe: number; // 0..100
  toThem: number; // 0..100
  findings: Finding[];
  poruthams: Porutham[];
  timeKnown: boolean; // both birth times known, so lagna-based findings are included
}

export function matchLabel(score: number, forThem = false): { word: string; line: string; tier: "go" | "good" | "steady" | "hold" | "avoid" } {
  if (score >= 72) return { word: "Strong support", line: forThem ? "The charts favour you helping this person." : "The charts favour this person helping you.", tier: "go" };
  if (score >= 60) return { word: "Supportive", line: forThem ? "You give them more help than friction." : "More help than friction.", tier: "good" };
  if (score >= 45) return { word: "Mixed", line: "Help and friction in about equal measure.", tier: "steady" };
  if (score >= 33)
    return { word: "Demanding", line: forThem ? "They may find you heavy going; be patient and clear." : "More friction than help; keep dealings clear and in writing.", tier: "hold" };
  return {
    word: "Draining",
    line: forThem ? "Your chart presses on theirs; go gently." : "The charts pull against each other; be careful with shared money and big commitments.",
    tier: "avoid",
  };
}

// Signs a planet looks at, counted from its own sign (1 = the sign it sits in).
const SIGHT: Partial<Record<PlanetId, number[]>> = { Ju: [1, 5, 7, 9], Sa: [1, 3, 7, 10], Ma: [1, 4, 7, 8], Ve: [1, 7], Me: [1, 7], Su: [1, 7], Mo: [1, 7], Ra: [1], Ke: [1] };
const sees = (planet: PlanetId, fromSign: number, toSign: number) => SIGHT[planet]!.includes(houseFrom(fromSign, toSign));
const how = (fromSign: number, toSign: number) => {
  const c = houseFrom(fromSign, toSign);
  return c === 1 ? "sits on" : `looks at (${ordinal(c)} sight)`;
};

export function matchPeople(me: Natal, person: Person): MatchResult {
  const other = personNatal(person);
  const name = person.name || "They";
  const both = me.profile.timeConfirmed && person.timeKnown;
  const f: Finding[] = [];
  const add = (x: Omit<Finding, "tone"> & { tone?: Tone }) =>
    f.push({ ...x, tone: x.tone ?? (x.toMe + x.toThem > 0 ? "good" : x.toMe + x.toThem < 0 ? "bad" : "neutral") });

  // ---- Jupiter's sight, each way ---------------------------------------------------------
  const guru = (giver: Natal, taker: Natal, giverName: string, takerPoss: string, dir: "toMe" | "toThem") => {
    const g = signOf(giver.positions.Ju);
    const w = (main: number) => (dir === "toMe" ? { toMe: main, toThem: main * 0.3 } : { toMe: main * 0.3, toThem: main });
    const targets: { key: string; sign: number; label: string; weight: number; note: string; needsTime: boolean }[] = [
      { key: "lagna", sign: taker.lagnaSign, label: `${takerPoss} lagna`, weight: 3, note: "guidance, protection and goodwill flow this way", needsTime: true },
      { key: "moon", sign: taker.moonSign, label: `${takerPoss} Moon`, weight: 2.5, note: "steadies the mind and gives encouragement", needsTime: false },
      { key: "guru", sign: signOf(taker.positions.Ju), label: `${takerPoss} Guru`, weight: 2, note: "shared values and mutual respect; each improves the other's judgement", needsTime: false },
      { key: "sun", sign: signOf(taker.positions.Su), label: `${takerPoss} Sun`, weight: 1, note: "supports confidence and standing", needsTime: false },
    ];
    for (const t of targets) {
      if (t.needsTime && !both) continue;
      if (!sees("Ju", g, t.sign)) continue;
      add({
        id: `guru-${dir}-${t.key}`,
        group: "Guru links",
        title: `${giverName} Guru ${how(g, t.sign)} ${t.label}`,
        detail: `Guru in ${RASI[g].ta} ${how(g, t.sign)} ${RASI[t.sign].ta}: ${t.note}.`,
        ...w(t.weight),
      });
    }
  };
  guru(other, me, `${name}'s`, "your", "toMe");
  guru(me, other, "Your", `${name}'s`, "toThem");

  // ---- Where their benefics fall in your houses, and yours in theirs ---------------------
  if (both) {
    const overlay = (giver: Natal, taker: Natal, giverPoss: string, takerPoss: string, dir: "toMe" | "toThem") => {
      const w = (main: number) => (dir === "toMe" ? { toMe: main, toThem: 0 } : { toMe: 0, toThem: main });
      for (const p of ["Ju", "Ve"] as PlanetId[]) {
        const h = houseFrom(taker.lagnaSign, signOf(giver.positions[p]));
        if ([2, 5, 9, 10, 11].includes(h))
          add({
            id: `in-${dir}-${p}`,
            group: "Chart overlay",
            title: `${giverPoss} ${PLANET_INFO[p].ta} falls in ${takerPoss} ${ordinal(h)} house`,
            detail: `A benefic in the house of ${houseTopic(h)}: gains in that area come through this person.`,
            ...w(h === 11 || h === 2 ? 2 : 1.5),
          });
        if ([6, 8, 12].includes(h) && p === "Ju")
          add({
            id: `in-${dir}-${p}-dus`,
            group: "Chart overlay",
            title: `${giverPoss} Guru falls in ${takerPoss} ${ordinal(h)} house`,
            detail: `Their goodwill lands in the house of ${houseTopic(h)}, so the help is real but hard to use.`,
            ...w(-1),
          });
      }
      // Lagna lord's seat
      const ll = giver.lordOf(1);
      const hl = houseFrom(taker.lagnaSign, signOf(giver.positions[ll]));
      const good = [1, 2, 4, 5, 7, 9, 10, 11].includes(hl);
      const bad = [6, 8, 12].includes(hl);
      if (good || bad)
        add({
          id: `ll-${dir}`,
          group: "Chart overlay",
          title: `${giverPoss} lagna lord ${PLANET_INFO[ll].ta} sits in ${takerPoss} ${ordinal(hl)} house`,
          detail: good
            ? `Their whole self is drawn toward ${houseTopic(hl)} in the other chart: a natural, useful role.`
            : `Their self falls in a hidden house (${houseTopic(hl)}): effort between you goes unseen or costs more than it returns.`,
          ...w(good ? 1.5 : -1.5),
        });
    };
    overlay(other, me, `${name}'s`, "your", "toMe");
    overlay(me, other, "Your", `${name}'s`, "toThem");

    // Lagna to lagna
    const c = houseFrom(me.lagnaSign, other.lagnaSign);
    const v = [1, 5, 9].includes(c) ? 2 : [3, 11].includes(c) ? 1 : [4, 7, 10].includes(c) ? 1 : [2, 12].includes(c) ? -1 : -2.5;
    add({
      id: "lagna-lagna",
      group: "Chart overlay",
      title: `${name}'s lagna ${RASI[other.lagnaSign].ta} is ${ordinal(c)} from yours`,
      detail:
        [1, 5, 9].includes(c) ? "Trine lagnas: you understand each other without effort."
        : [4, 7, 10].includes(c) ? "Kendra lagnas: you work well side by side, each holding a corner."
        : [3, 11].includes(c) ? "3 and 11 apart: friendly, good for effort and gains."
        : [2, 12].includes(c) ? "2 and 12 apart: one gives while the other spends."
        : "6 and 8 apart (shashtashtaka): the classic difficult placement; aims collide.",
      toMe: v,
      toThem: v,
    });
  }

  // ---- Malefics pressing on lagna and Moon ------------------------------------------------
  const pressure = (giver: Natal, taker: Natal, giverPoss: string, takerPoss: string, dir: "toMe" | "toThem") => {
    const w = (main: number) => (dir === "toMe" ? { toMe: main, toThem: 0 } : { toMe: 0, toThem: main });
    const spots: { sign: number; label: string; needsTime: boolean }[] = [
      { sign: taker.lagnaSign, label: `${takerPoss} lagna`, needsTime: true },
      { sign: taker.moonSign, label: `${takerPoss} Moon`, needsTime: false },
    ];
    for (const p of ["Sa", "Ma", "Ra", "Ke"] as PlanetId[]) {
      const from = signOf(giver.positions[p]);
      for (const s of spots) {
        if (s.needsTime && !both) continue;
        if (!sees(p, from, s.sign)) continue;
        const weight = p === "Sa" ? -1.5 : p === "Ma" ? -1 : -1.5;
        const note =
          p === "Sa" ? "weight, duty and delay; can be a strict teacher but rarely feels light"
          : p === "Ma" ? "heat and impatience; arguments start easily"
          : p === "Ra" ? "fascination and confusion; promises grow bigger than results"
          : "distance and sudden cooling";
        add({
          id: `press-${dir}-${p}-${s.label}`,
          group: "Pressure points",
          title: `${giverPoss} ${PLANET_INFO[p].ta} ${how(from, s.sign)} ${s.label}`,
          detail: `${PLANET_INFO[p].en} in ${RASI[from].ta} on ${RASI[s.sign].ta}: ${note}.`,
          ...w(weight),
        });
      }
    }
  };
  pressure(other, me, `${name}'s`, "your", "toMe");
  pressure(me, other, "Your", `${name}'s`, "toThem");

  // ---- Stars -----------------------------------------------------------------------------
  const poruthams: Porutham[] = [];
  const taraOf = (from: number, to: number) => (((to - from) % 27) + 27) % 9;
  const TARA_W = [0, 2.5, -2, 2, -2, 2.5, -3, 2, 2.5];
  const tMe = taraOf(me.star, other.star);
  const tThem = taraOf(other.star, me.star);
  add({
    id: "tara",
    group: "Stars",
    title: `${name}'s star is your ${TARA_NAMES[tMe]} tara`,
    detail: `${NAKSHATRA[other.star].ta} counted from your ${NAKSHATRA[me.star].ta}: the ${TARA_MEANING[tMe]}. Your star is their ${TARA_NAMES[tThem]} tara (${TARA_MEANING[tThem]}).`,
    toMe: TARA_W[tMe],
    toThem: TARA_W[tThem],
    tone: TARA_W[tMe] > 0 ? "good" : TARA_W[tMe] < 0 ? "bad" : "neutral",
  });
  const dinaGood = TARA_W[tMe] > 0 && TARA_W[tThem] > 0;
  poruthams.push({
    name: "Dina (tara)",
    tamil: "தினப் பொருத்தம்",
    status: dinaGood ? "good" : TARA_W[tMe] >= 0 || TARA_W[tThem] >= 0 ? "fair" : "poor",
    note: `${TARA_NAMES[tMe]} for you, ${TARA_NAMES[tThem]} for them.`,
  });

  const gMe = GANA_OF[me.star];
  const gOt = GANA_OF[other.star];
  const ganaStatus = gMe === gOt ? "good" : gMe !== 2 && gOt !== 2 ? "fair" : "poor";
  poruthams.push({ name: "Gana", tamil: "கணப் பொருத்தம்", status: ganaStatus, note: `You: ${GANA[gMe]}. ${name}: ${GANA[gOt]}.` });
  if (ganaStatus !== "fair")
    add({
      id: "gana",
      group: "Stars",
      title: ganaStatus === "good" ? `Same gana (${GANA[gMe]})` : `Gana clash: ${GANA[gMe]} and ${GANA[gOt]}`,
      detail: ganaStatus === "good" ? "Same temperament: you react to things the same way." : "Different temperaments: one finds the other too blunt, the other finds the first too soft.",
      toMe: ganaStatus === "good" ? 1.5 : -1.5,
      toThem: ganaStatus === "good" ? 1.5 : -1.5,
    });

  const yMe = YONI_OF[me.star];
  const yOt = YONI_OF[other.star];
  const yoniEnemy = pairIn(YONI_ENEMY, yMe, yOt);
  const yoniStatus = yMe === yOt ? "good" : yoniEnemy ? "poor" : "fair";
  poruthams.push({ name: "Yoni", tamil: "யோனிப் பொருத்தம்", status: yoniStatus, note: `You: ${YONI[yMe]}. ${name}: ${YONI[yOt]}.` });
  if (yoniStatus !== "fair")
    add({
      id: "yoni",
      group: "Stars",
      title: yoniStatus === "good" ? `Same yoni (${YONI[yMe]})` : `Enemy yonis: ${YONI[yMe]} and ${YONI[yOt]}`,
      detail: yoniStatus === "good" ? "Same instinctive nature: easy physical and working rhythm." : "The two star animals are natural enemies: instinctive dislike that takes effort to get past.",
      toMe: yoniStatus === "good" ? 2 : -2,
      toThem: yoniStatus === "good" ? 2 : -2,
    });

  const rc = houseFrom(me.moonSign, other.moonSign);
  const rasiV = [1, 7].includes(rc) ? 2 : [3, 11, 4, 10, 5, 9].includes(rc) ? 1.5 : [2, 12].includes(rc) ? -1 : -2;
  poruthams.push({
    name: "Rasi",
    tamil: "ராசிப் பொருத்தம்",
    status: rasiV > 0 ? "good" : rasiV === -1 ? "fair" : "poor",
    note: `${name}'s rasi ${RASI[other.moonSign].ta} is ${ordinal(rc)} from your ${RASI[me.moonSign].ta}.`,
  });
  add({
    id: "rasi",
    group: "Stars",
    title: `Rasis are ${rc === 1 ? "the same" : `${ordinal(rc)} and ${ordinal(houseFrom(other.moonSign, me.moonSign))} from each other`}`,
    detail:
      rc === 1 ? "Same rasi: you feel things alike."
      : rc === 7 ? "Opposite rasis: attraction and balance."
      : [6, 8].includes(rc) ? "6 and 8 apart: emotional aims work against each other."
      : [2, 12].includes(rc) ? "2 and 12 apart: one saves, the other spends."
      : "A friendly distance between the two Moons.",
    toMe: rasiV,
    toThem: rasiV,
  });

  const lMe = RASI[me.moonSign].lord;
  const lOt = RASI[other.moonSign].lord;
  const fr = regard(lMe, lOt) + regard(lOt, lMe);
  poruthams.push({
    name: "Rasi athipathi",
    tamil: "ராசி அதிபதி",
    status: fr >= 1 ? "good" : fr === 0 ? "fair" : "poor",
    note: `${PLANET_INFO[lMe].ta} and ${PLANET_INFO[lOt].ta} are ${fr >= 2 ? "friends" : fr === 1 ? "friendly" : fr === 0 ? "neutral" : "unfriendly"}.`,
  });
  if (fr !== 0)
    add({
      id: "lords",
      group: "Stars",
      title: `Rasi lords ${PLANET_INFO[lMe].ta} and ${PLANET_INFO[lOt].ta} ${fr > 0 ? "get along" : "do not get along"}`,
      detail: fr > 0 ? "The planets that rule your two minds cooperate." : "The planets that rule your two minds do not cooperate.",
      toMe: fr > 0 ? 1.5 : -1.5,
      toThem: fr > 0 ? 1.5 : -1.5,
    });

  const vasyaToMe = VASYA[me.moonSign].includes(other.moonSign);
  const vasyaToThem = VASYA[other.moonSign].includes(me.moonSign);
  poruthams.push({
    name: "Vasya",
    tamil: "வசியப் பொருத்தம்",
    status: vasyaToMe || vasyaToThem ? "good" : "fair",
    note: vasyaToMe && vasyaToThem ? "Each is drawn to the other." : vasyaToMe ? `${name} is drawn to you.` : vasyaToThem ? `You are drawn to ${name}.` : "No special pull either way.",
  });
  if (vasyaToMe || vasyaToThem)
    add({
      id: "vasya",
      group: "Stars",
      title: vasyaToMe ? `${name}'s rasi is vasya to yours` : `Your rasi is vasya to ${name}'s`,
      detail: vasyaToMe ? "They are naturally drawn to you and tend to go along with you." : "You are naturally drawn to them and tend to go along with them.",
      toMe: vasyaToMe ? 1 : 0,
      toThem: vasyaToThem ? 1 : 0,
      tone: "good",
    });

  const vedha = pairIn(VEDHA, me.star, other.star);
  poruthams.push({ name: "Vedha", tamil: "வேதைப் பொருத்தம்", status: vedha ? "poor" : "good", note: vedha ? "The two stars obstruct each other." : "No obstruction between the stars." });
  if (vedha)
    add({
      id: "vedha",
      group: "Stars",
      title: `Vedha between ${NAKSHATRA[me.star].ta} and ${NAKSHATRA[other.star].ta}`,
      detail: "These two stars are a vedha pair: each blocks the other's efforts. Tradition treats this as serious for any close tie.",
      toMe: -3,
      toThem: -3,
    });

  const sameRajju = RAJJU_OF[me.star] === RAJJU_OF[other.star];
  poruthams.push({
    name: "Rajju",
    tamil: "ரஜ்ஜுப் பொருத்தம்",
    status: sameRajju ? "poor" : "good",
    note: `You: ${RAJJU[RAJJU_OF[me.star]]}. ${name}: ${RAJJU[RAJJU_OF[other.star]]}.${sameRajju ? " Same rajju: avoided for marriage; it does not count for work or friendship." : ""}`,
  });

  // ---- Yoga tara: is their birth star lucky for you, and yours for them? ------------------
  const yogaLink = (owner: Natal, starOfOther: number, ownerPoss: string, otherPoss: string, dir: "toMe" | "toThem") => {
    const rel = starRelation(yogiInfo(owner), starOfOther);
    if (!rel) return;
    const v = rel === "yoga-tara" ? 3 : rel === "yogi-star" ? 1.5 : rel === "avayoga-tara" ? -2.5 : -1;
    add({
      id: `yogatara-${dir}`,
      group: "Stars",
      title:
        rel === "yoga-tara" ? `${otherPoss} star is ${ownerPoss} yoga tara`
        : rel === "yogi-star" ? `${otherPoss} star belongs to ${ownerPoss} Yogi`
        : rel === "avayoga-tara" ? `${otherPoss} star is ${ownerPoss} avayoga tara`
        : `${otherPoss} star belongs to ${ownerPoss} Avayogi`,
      detail:
        v > 0
          ? `${NAKSHATRA[starOfOther].ta} is ${rel === "yoga-tara" ? "the star of the yogi point" : "a star of the Yogi"}: luck tends to rise after this person arrives.`
          : `${NAKSHATRA[starOfOther].ta} is ${rel === "avayoga-tara" ? "the star of the avayogi point" : "a star of the Avayogi"}: plans slow down around this person.`,
      toMe: dir === "toMe" ? v : 0,
      toThem: dir === "toThem" ? v : 0,
    });
  };
  yogaLink(me, other.star, "your", `${name}'s`, "toMe");
  yogaLink(other, me.star, `${name}'s`, "Your", "toThem");

  // ---- Birds -----------------------------------------------------------------------------
  const myBird = me.bird as Bird;
  const theirBird = other.bird as Bird;
  const rel0 = relation(0, myBird, theirBird);
  const rel1 = relation(1, myBird, theirBird);
  const bv = (r: string) => (r === "enemy" ? -1 : 1);
  const birdScore = myBird === theirBird ? 1.5 : (bv(rel0) + bv(rel1)) * 0.75;
  add({
    id: "bird",
    group: "Birds",
    title:
      myBird === theirBird
        ? `Same bird (${BIRDS[myBird].ta})`
        : `${name}'s bird ${BIRDS[theirBird].ta} is ${rel0 === rel1 ? `a${rel0 === "enemy" ? "n enemy" : " friend"} of` : "a friend in one fortnight and an enemy in the other to"} your ${BIRDS[myBird].ta}`,
    detail:
      myBird === theirBird
        ? "You rise and fall at the same hours, so you help each other most in your shared ruling periods."
        : rel0 === rel1
          ? rel0 === "enemy"
            ? "The two birds are enemies in both fortnights: when your bird is strong theirs tends to be weak, so your timing rarely lines up."
            : "The two birds are friends in both fortnights: their good hours support yours."
          : `In valarpirai the two birds are ${rel0 === "enemy" ? "enemies" : "friends"}; in theipirai they are ${rel1 === "enemy" ? "enemies" : "friends"}. Deal with them in the fortnight when the birds are friends.`,
    toMe: birdScore,
    toThem: birdScore,
  });

  // Pressure from malefics is common between any two charts, so it is capped: it can pull a
  // match down but not decide it alone.
  const total = (k: "toMe" | "toThem") => {
    let pressure = 0;
    let rest = 0;
    for (const x of f) {
      if (x.group === "Pressure points") pressure += x[k];
      else rest += x[k];
    }
    // Any two charts share a few favourable links by chance (about 3.5 points' worth), so that
    // much is treated as the neutral baseline.
    return Math.round(Math.max(0, Math.min(100, 50 + 4.2 * (rest + Math.max(-4, pressure) - 3.5))));
  };
  f.sort((a, b) => Math.abs(b.toMe) + Math.abs(b.toThem) - (Math.abs(a.toMe) + Math.abs(a.toThem)));
  return { person, other, toMe: total("toMe"), toThem: total("toThem"), findings: f, poruthams, timeKnown: both };
}
