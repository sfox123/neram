// Parikaram: how to strengthen or settle each planet, and how to recover on a bad day.
//
// The practices are the common Tamil ones (weekday, deity, navagraha grain, colour, temple,
// nama mantra) plus a plain-life habit for each planet, since a planet is strengthened most
// by living its qualities. Which planets to strengthen and which only to settle depends on
// the chart: helpers are strengthened, troublemakers are settled, never amplified.

import { functionalRole, Natal, ordinal } from "./chart";
import { NAKSHATRA, PLANET_INFO, PlanetId, PLANETS, RASI, signOf } from "./constants";
import { DashaGocharam } from "./dashaTransit";
import { dignity, isCombust } from "./dignity";
import { ACTIVITY } from "./pakshi";
import { DayContext, Reading } from "./score";
import { saturnPhase } from "./transits";
import { vargaStrength } from "./vargas";
import { findYogas } from "./yogas";
import { PLANET_DEITY, starRelation, YogiInfo } from "./yogi";

export interface PlanetRemedy {
  day: string;
  colour: string;
  give: string;
  worship: string;
  temple: string;
  mantra: string;
  habits: string[];
}

export const PLANET_REMEDY: Record<PlanetId, PlanetRemedy> = {
  Su: {
    day: "Sunday",
    colour: "red or orange",
    give: "wheat, jaggery, or a copper vessel",
    worship: "Surya at sunrise; Shiva. Offer water to the rising Sun and recite Aditya Hridayam.",
    temple: "Suriyanar Koil, near Kumbakonam",
    mantra: "Om Suryaya Namaha",
    habits: ["Wake before sunrise and take a few minutes of morning sun.", "Keep your word, especially to your father and to seniors.", "Do one thing each day that you would sign your name to."],
  },
  Mo: {
    day: "Monday",
    colour: "white",
    give: "rice, milk or curd",
    worship: "Ambal (Parvati) on Mondays and on Pournami, the full moon.",
    temple: "Thingalur, near Thanjavur",
    mantra: "Om Chandraya Namaha",
    habits: ["Keep regular sleep and meal times; the Moon is rhythm.", "Look after your mother, or call her.", "Spend time near water, and drink enough of it.", "Ten quiet minutes before the day starts."],
  },
  Ma: {
    day: "Tuesday",
    colour: "red",
    give: "thuvaram paruppu (toor dal) or red lentils",
    worship: "Murugan on Tuesdays: an archana, or Kanda Sashti Kavasam.",
    temple: "Vaitheeswaran Koil",
    mantra: "Om Angarakaya Namaha",
    habits: ["Hard exercise most days; Sevvai rusts without it.", "Finish what you start before picking the next fight.", "Give blood if you are able to.", "Answer anger an hour later, not in the moment."],
  },
  Me: {
    day: "Wednesday",
    colour: "green",
    give: "pachai payaru (green gram); green fodder for a cow",
    worship: "Vishnu (Perumal) on Wednesdays; Vishnu Sahasranamam.",
    temple: "Thiruvenkadu",
    mantra: "Om Budhaya Namaha",
    habits: ["Write something every day and keep your accounts tidy.", "Check facts and figures twice before sending.", "Learn in small daily portions.", "Say less than you know; keep promises exact."],
  },
  Ju: {
    day: "Thursday",
    colour: "yellow",
    give: "kondai kadalai (chickpeas), turmeric or yellow cloth",
    worship: "Dakshinamurthy on Thursdays, with a kondai kadalai garland and a ghee lamp.",
    temple: "Alangudi",
    mantra: "Om Gurave Namaha",
    habits: ["Respect your teachers and stay in touch with one.", "Teach or mentor someone without charge.", "Read a serious book a little each day.", "Be generous in small, regular amounts."],
  },
  Ve: {
    day: "Friday",
    colour: "white or pink",
    give: "mochai (field beans), white sweets or curd rice",
    worship: "Mahalakshmi on Fridays, with a ghee lamp at dusk.",
    temple: "Kanjanur",
    mantra: "Om Shukraya Namaha",
    habits: ["Keep your desk, clothes and home clean and pleasing.", "Treat your partner and the women in your life with respect.", "Make or enjoy something beautiful: music, design, food.", "Polish your work one pass more than is needed."],
  },
  Sa: {
    day: "Saturday",
    colour: "black or dark blue",
    give: "ellu (sesame), sesame rice for crows, a meal for a labourer or an elderly person",
    worship: "Saneeswaran with a sesame-oil lamp on Saturdays; Hanuman; Bhairavar.",
    temple: "Thirunallar",
    mantra: "Om Shanaischaraya Namaha",
    habits: ["Keep a fixed routine and be on time.", "Do the dull part of the work first.", "Serve elders, workers and people with less than you.", "Never cut corners; Sani pays exactly what is earned."],
  },
  Ra: {
    day: "Saturday, or during Rahu kalam",
    colour: "smoky blue or grey",
    give: "ulundhu (black gram)",
    worship: "Durga during Rahu kalam, especially on Tuesdays and Fridays.",
    temple: "Thirunageswaram",
    mantra: "Om Rahave Namaha",
    habits: ["Avoid shortcuts, hype and over-promising.", "Keep intoxicants and late nights in check.", "Stick to verifiable facts in deals with strangers.", "Ground yourself with routine when ambition runs ahead."],
  },
  Ke: {
    day: "Tuesday, or on Chaturthi",
    colour: "mixed or earthy colours",
    give: "kollu (horse gram); food for stray dogs",
    worship: "Vinayagar on Chaturthi with an arugampul (durva grass) garland and a ghee lamp.",
    temple: "Keezhperumpallam",
    mantra: "Om Ketave Namaha",
    habits: ["Meditate, or sit alone in silence for a while each day.", "Close old loops before opening new ones.", "Don't act on sudden urges to quit; wait a day.", "Keep one practice that has nothing to do with results."],
  },
};

export type CareMode = "strengthen" | "settle" | "honour" | "steady";

export interface PlanetCare {
  planet: PlanetId;
  mode: CareMode;
  headline: string;
  state: string[];
  why: string;
  priority: number;
  running: string | null;
}

export const MODE_LABEL: Record<CareMode, string> = {
  strengthen: "Strengthen",
  settle: "Settle",
  honour: "Honour",
  steady: "Keep steady",
};

export const MODE_RULE: Record<CareMode, string> = {
  strengthen: "A helper in your chart. Wear its colour on its day, chant its name, live its habits. Everything that feeds it feeds you.",
  settle: "A planet that tests you. Give its things away and worship its deity, and keep its matters orderly; don't wear its colour or stone, which would make it louder.",
  honour: "Worship comes first here. Greet it before you begin work; it is the key that gets things moving for you.",
  steady: "Neither a strong helper nor a troublemaker. Its weekday practice is enough.",
};

/** Which planets to strengthen, which to settle, and who needs attention first. */
export function planetCare(n: Natal, y: YogiInfo, g: DashaGocharam | null): PlanetCare[] {
  const yogas = findYogas(n);
  const amsa = vargaStrength(n);
  return PLANETS.map((p) => {
    const sign = signOf(n.positions[p]);
    const dig = dignity(p, sign);
    const role = functionalRole(n, p);
    const state: string[] = [];
    let weak = 0;
    const node = p === "Ra" || p === "Ke";

    state.push(`${ordinal(n.house[p])} house, ${RASI[sign].ta}${!node && dig !== "neutral" ? ` (${dig})` : ""}`);
    const cancelled = !node && dig === "debilitated" && yogas.some((x) => x.id === `nb-${p}`);
    if (!node && dig === "debilitated") weak += cancelled ? 1 : 2;
    if (!node && dig === "enemy") weak += 1;
    if (isCombust(p, n.positions[p], n.positions.Su)) { state.push("combust at birth"); weak += 1.5; }
    if (n.retro[p] && !node) state.push("retrograde at birth");
    const st = y.standing[p];
    if (st.boost <= -1) { state.push(st.reasons.join(" and ")); weak += 1; }
    if (st.boost >= 1) state.push(st.reasons.join(" and "));
    const deg = n.positions[p] % 30;
    if (deg < 1.5 || deg > 28.5) { state.push("at the edge of its sign"); weak += 1; }
    if (!node) {
      const a = amsa[p];
      if (a.vargottama) { state.push("vargottama"); weak = Math.max(0, weak - 1); }
      else if (a.d9 === "exalted" || a.d9 === "own") { state.push(`${a.d9 === "exalted" ? "exalted" : "own sign"} in navamsa`); weak = Math.max(0, weak - 1); }
      else if (a.d9 === "debilitated") { state.push("debilitated in navamsa"); weak += 1.5; }
    }

    const lord = g?.lords.find((l) => l.lord === p) ?? null;
    const runningLevels = g?.lords.filter((l) => l.lord === p).map((l) => l.level) ?? [];
    let running: string | null = null;
    if (lord) {
      running = `Runs your ${runningLevels.join(" and ")} now; ${lord.word.toLowerCase()} in the sky.`;
      if (lord.word === "Strained" || lord.word === "Weak") weak += 2;
    }

    const mahapurusha = ["Ma", "Me", "Ju", "Ve", "Sa"].includes(p) && (dig === "own" || dig === "exalted") && [1, 4, 7, 10].includes(n.house[p]);
    let mode: CareMode;
    let why: string;
    if (p === y.avayogi) { mode = "settle"; why = "Your Avayogi: the planet that applies the brake."; }
    else if (p === y.yogi) { mode = "strengthen"; why = "Your Yogi: the planet that opens the way."; }
    else if (role === "yogakaraka") { mode = "strengthen"; why = "Yogakaraka for your lagna: it carries career and luck together."; }
    else if (n.lordOf(1) === p) { mode = "strengthen"; why = `Your lagna lord${p === y.sahayogi ? " and Sahayogi" : ""}: your own vitality and direction.`; }
    else if (p === y.sahayogi) { mode = "strengthen"; why = "Your Sahayogi: the helper of your Yogi."; }
    else if (mahapurusha) { mode = "strengthen"; why = "It carries a Mahapurusha yoga in your chart; keeping it active keeps the yoga alive."; }
    else if (p === y.karanaLord) { mode = "honour"; why = `Your karana nathan (born in ${y.karana} karana): greeted first so that work gets going.`; }
    else if (p === y.ld) { mode = "honour"; why = `Your lowest-degree planet. Its deity, ${y.upasana.deity}, is your upasana deivam: steady worship here does more than any other remedy.`; }
    else if (role === "hard") { mode = "settle"; why = "A difficult house lord for your lagna."; }
    else if (role === "good") { mode = "strengthen"; why = "A helpful house lord for your lagna."; }
    else if (node) { mode = "settle"; why = `A shadow planet in your ${ordinal(n.house[p])} house: settle it, don't feed it.`; }
    else { mode = "steady"; why = "Mixed for your lagna: results follow where it sits."; }
    if (p === y.hd && mode !== "honour") why += " It also holds the highest degree in your chart.";
    if (cancelled) why += " Its debilitation is cancelled (neecha bhanga), so effort here pays back more than it seems to at first.";

    const priority = (lord ? 3 : 0) + weak * 1.5 + (mode === "strengthen" && weak > 0 ? 2 : 0) + (p === y.avayogi ? 2 : 0) + (p === y.ld ? 1.5 : 0) + (mode === "honour" ? 1 : 0);
    const headline =
      mode === "strengthen" ? (weak > 0 ? "A helper that needs help" : "A helper in good shape")
      : mode === "settle" ? "Keep it quiet and orderly"
      : mode === "honour" ? (p === y.ld ? "Your upasana planet" : "Greet it before work")
      : "Light upkeep";
    return { planet: p, mode, headline, state, why, priority, running };
  }).sort((a, b) => b.priority - a.priority);
}

// ---- Recovering from a bad day or a bad hour ----------------------------------------------

export interface Recovery {
  id: string;
  title: string;
  why: string;
  tips: string[];
  /** true if it applies to the whole day, false if only to this stretch. */
  allDay: boolean;
}

export function recoveryFor(ctx: DayContext, r: Reading): Recovery[] {
  const out: Recovery[] = [];
  const n = ctx.natal;
  const y = ctx.yogi;

  if (r.chandra.chandrashtama)
    out.push({
      id: "chandrashtamam",
      title: "Chandrashtamam",
      why: "The Moon is in the 8th from your rasi for about two and a quarter days. The mind is unsettled, so judgement and patience run short.",
      allDay: true,
      tips: [
        "Postpone new ventures, big decisions, investments, lending and borrowing, and long trips.",
        "Stay out of arguments; reply to provocations tomorrow. Drive and ride slowly.",
        "Before starting anything, say a short prayer to your kula deivam or Vinayagar.",
        "After your morning bath, chant Om Sri Chandraya Namaha eleven times.",
        "Feed birds a handful of raw rice, or offer milk for abhishekam.",
        `For ${RASI[n.moonSign].ta} rasi the usual offering is sesame or dark-coloured food given away, with a visit to Hanuman.`,
        "Do routine work only. What is already in motion can continue.",
      ],
    });

  if (r.tara.tone === "bad")
    out.push({
      id: "tara",
      title: `${r.tara.name} tara`,
      why: `Today's star ${NAKSHATRA[r.star.value].ta} counts as ${r.tara.name} from your birth star: ${r.tara.meaning.toLowerCase()}`,
      allDay: false,
      tips: [
        "Keep signatures, launches and first meetings for another star; continuing existing work is fine.",
        "If something must be done, do it in a Guru, Sukran or Budhan hora and in a strong Pakshi sub-period.",
        r.tara.index === 6 ? "Naidhana is the heaviest of the three: give food to someone before you begin the day." : "Give something small away before you start: a meal, grain, or coins.",
      ],
    });

  const rel = starRelation(y, r.star.value);
  if (rel === "avayoga-tara" || rel === "avayogi-star")
    out.push({
      id: "avayoga",
      title: rel === "avayoga-tara" ? "Moon in your avayoga tara" : "Moon in a star of your Avayogi",
      why: `The Moon is passing through ${NAKSHATRA[r.star.value].ta}, ${rel === "avayoga-tara" ? "your avayoga tara" : `a star ruled by your Avayogi ${PLANET_INFO[y.avayogi].ta}`}. Things started now tend to stall.`,
      allDay: false,
      tips: [
        `Settle ${PLANET_INFO[y.avayogi].ta}: give ${PLANET_REMEDY[y.avayogi].give.split(";")[0]} and worship ${PLANET_DEITY[y.avayogi]}.`,
        "Don't begin anything meant to grow; finish, repair and file instead.",
        `Lean on your Yogi instead: use a ${PLANET_INFO[y.yogi].ta} hora, and say a word to ${PLANET_DEITY[y.yogi]}.`,
      ],
    });

  if (r.inRahu)
    out.push({
      id: "rahu",
      title: "Rahu kalam",
      why: "About ninety minutes each day belong to Rahu. Beginnings made in it tend to twist.",
      allDay: false,
      tips: ["Don't start, sign, pay or set out now. Work already begun can go on.", "This is the traditional time for Durga worship: light a lamp if you want to use it well.", "Use the gap to prepare what you will send afterwards."],
    });
  else if (r.inYama)
    out.push({ id: "yama", title: "Yamagandam", why: "A daily stretch that is poor for beginnings.", allDay: false, tips: ["Hold new starts and journeys until it ends; routine work is fine."] });

  if (r.sub.power < 0.17)
    out.push({
      id: "pakshi",
      title: `Your bird is ${ACTIVITY[r.sub.activity].en.toLowerCase()}`,
      why: "In Pancha Pakshi your personal strength is near its lowest in this sub-period.",
      allDay: false,
      tips: ["Don't compete, negotiate or ask for anything now: you would be arguing from weakness.", "Rest, eat, plan or do quiet solo work.", "Check the Pancha Pakshi page for the next ruling or eating stretch and move the important thing there."],
    });

  if (ctx.gocharam)
    for (const l of ctx.gocharam.lords.filter((x, i, a) => a.findIndex((z) => z.lord === x.lord) === i)) {
      if (l.word !== "Strained" && l.word !== "Weak") continue;
      const rem = PLANET_REMEDY[l.lord];
      out.push({
        id: `lord-${l.lord}`,
        title: `${PLANET_INFO[l.lord].ta}, your ${l.level} lord, is ${l.word.toLowerCase()} in the sky`,
        why: `It is in ${RASI[l.sign].ta} with ${l.bav} Ashtakavarga points until it changes sign. The period's promises move slowly meanwhile.`,
        allDay: true,
        tips: [`On ${rem.day}s: ${rem.worship}`, `Give ${rem.give}.`, rem.habits[0], "Prepare rather than launch in this planet's matters until it moves on."],
      });
    }

  const sat = saturnPhase(n, ctx.positions);
  if (sat.active)
    out.push({
      id: "sani",
      title: sat.label,
      why: sat.note,
      allDay: true,
      tips: ["Saturdays: a sesame-oil lamp for Saneeswaran, and food for crows before you eat.", "Hanuman worship, or Hanuman Chalisa, steadies this period.", "Keep routine, be punctual, avoid shortcuts and new debt. Sani rewards patience in exactly this stretch.", "Help someone older or poorer than you each week."],
    });

  return out;
}

/** What to do on any day that is simply going badly. */
export const RESET_STEPS: { title: string; detail: string }[] = [
  { title: "Shrink the day", detail: "Drop to routine work. Move anything irreversible (signing, sending, paying, confronting) to the next good window on the Day plan." },
  { title: "Wash and light a lamp", detail: "A bath or at least hands, feet and face, then a lamp for your kula deivam or Vinayagar. It marks a clean restart." },
  { title: "Change the breath", detail: "Lie on your left side for ten minutes to open the right nostril when you need drive; on your right side to open the left when you need calm. See the Saram page." },
  { title: "Give something away", detail: "Feed a person, a crow, a cow or a dog before your own meal. Giving is the oldest reset there is, and it works on mood at once." },
  { title: "Use your Yogi", detail: "Wait for the hora of your Yogi planet, or a Guru hora, for the one thing that cannot wait." },
  { title: "Close early", detail: "Write down what is unfinished, decide nothing at night, and sleep on time. Tomorrow's star is a different star." },
];
