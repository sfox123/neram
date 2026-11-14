// Sara vithai (Sara sastram, the Swara tradition): the nostril your breath is flowing
// through decides what kind of action suits the moment.
//   Left  = Chandra kalai (Idakalai): cool, steady, lasting.
//   Right = Surya kalai (Pingalai): hot, quick, forceful.
//   Both  = Suzhumunai: for stillness only.

import { ActivityKey } from "./score";

export type Flow = "left" | "right" | "both";

export interface FlowInfo {
  name: string;
  tamil: string;
  nature: string;
  dos: string[];
  donts: string[];
  /** Which of the app's activities this breath suits (+1), is neutral for (0), or works against (-1). */
  fit: Record<Exclude<ActivityKey, "overall">, number>;
  direction: string;
  foot: string;
}

export const FLOW: Record<Flow, FlowInfo> = {
  left: {
    name: "Chandra kalai (left nostril)",
    tamil: "சந்திர கலை",
    nature: "Cool, calm and steady. Things begun now are meant to last.",
    dos: [
      "Begin anything you want to be stable and long-lasting: a job, a course, a savings plan, a house move.",
      "Sign agreements, deposit or store money, buy things you will keep.",
      "Meet seniors and important people; ask for help, advice or a favour.",
      "Set out on a long journey.",
      "Study, plan, write calmly, do creative and devotional work.",
      "Take medicine, start a treatment, make peace after a quarrel.",
    ],
    donts: [
      "Don't pick this moment for arguments, contests or hard bargaining.",
      "Don't start heavy physical work or anything that needs force and speed.",
      "Avoid risky, aggressive or one-off gambles.",
    ],
    fit: { work: 0, apply: -1, start: 1, money: 1, people: 1, travel: 1 },
    direction: "Journeys toward the south and west go well; avoid setting out north or east.",
    foot: "Step out with your left foot first.",
  },
  right: {
    name: "Surya kalai (right nostril)",
    tamil: "சூரிய கலை",
    nature: "Hot, quick and forceful. Good for effort, contest and anything that must be pushed through.",
    dos: [
      "Compete: exams, interviews, pitches, debates, tough negotiations.",
      "Do hard physical or mentally demanding work: difficult problems, maths, debugging, deadlines.",
      "Sell, bargain, collect dues, expand a business.",
      "Eat your main meal, bathe, exercise.",
      "Drive, handle machines and tools, take short quick trips.",
      "Receive teaching or instruction from a teacher.",
    ],
    donts: [
      "Don't begin things you want to be gentle and permanent, such as a long-term commitment or a peace-making talk.",
      "Don't ask for favours or approach someone you need to soften.",
      "Avoid starting long journeys.",
    ],
    fit: { work: 1, apply: 1, start: -1, money: 0, people: -1, travel: -1 },
    direction: "Journeys toward the north and east go well; avoid setting out south or west.",
    foot: "Step out with your right foot first.",
  },
  both: {
    name: "Suzhumunai (both nostrils)",
    tamil: "சுழுமுனை",
    nature: "Both nostrils flow equally. The tradition treats this as a time for stillness, not for worldly work.",
    dos: ["Meditate, pray, do breathing practice.", "Sit quietly and let it pass; it usually lasts only a few minutes."],
    donts: [
      "Don't begin, sign, buy, travel or decide anything: results are said to come to nothing.",
      "Don't ask for anything or make a request now.",
    ],
    fit: { work: -1, apply: -1, start: -1, money: -1, people: -1, travel: -1 },
    direction: "Don't set out anywhere until one side takes over.",
    foot: "Wait.",
  },
};

/** Tamil sara nool rule: which nostril should be flowing around dawn (4 to 6 am) on each weekday. */
export function dawnFlowTamil(weekday: number, paksha: 0 | 1): Flow {
  if (weekday === 1 || weekday === 3 || weekday === 5) return "left"; // Mon, Wed, Fri
  if (weekday === 0 || weekday === 2 || weekday === 6) return "right"; // Sun, Tue, Sat
  return paksha === 0 ? "left" : "right"; // Thursday follows the fortnight
}

/** Siva Swarodaya rule: the sunrise nostril follows the tithi in groups of three. */
export function sunriseFlowSwarodaya(tithi: number): Flow {
  const paksha = tithi < 15 ? 0 : 1;
  const group = Math.floor((tithi % 15) / 3); // 0..4
  const leftInShukla = group % 2 === 0;
  return (paksha === 0) === leftInShukla ? "left" : "right";
}

export const SWITCH_TIPS = [
  "To open the right nostril, lie on your left side for a few minutes; to open the left, lie on your right side.",
  "Sitting up, press a fist or a folded cloth firmly into the armpit on the side that is flowing; the breath moves to the other side.",
  "A few minutes of slow alternate-nostril breathing also shifts it.",
];

export interface SaramCheck {
  flow: Flow;
  at: number; // ms
}
export const SARAM_KEY = "neram.saram.v1";
export const SARAM_FRESH_MS = 75 * 60000; // the flow usually changes within one to two hours
