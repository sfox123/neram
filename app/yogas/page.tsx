"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/components/store";
import { H2, Loading, PageTitle } from "@/components/ui";
import { PLANET_INFO, PlanetId } from "@/lib/astro/constants";
import { DashaPeriod, runningDasha, subPeriods } from "@/lib/astro/dasha";
import { fmtDateLong, MS_DAY } from "@/lib/astro/time";
import { activation, Activation, findYogas, transitTriggers, TransitTrigger, Yoga, YogaGroup } from "@/lib/astro/yogas";

const GROUPS: { key: YogaGroup; note: string }[] = [
  { key: "Pancha Mahapurusha", note: "a planet in its own or exalted sign in a kendra" },
  { key: "Raja yogas", note: "status, authority and rise" },
  { key: "Dhana yogas", note: "earning and keeping money" },
  { key: "Sun and Moon yogas", note: "planets beside the two lights" },
  { key: "Other yogas", note: "" },
  { key: "To watch", note: "combinations that ask for care" },
];

const CHECKED = [
  "Ruchaka", "Bhadra", "Hamsa", "Malavya", "Sasa", "Yogakaraka", "Raja yoga", "Dharma-karmadhipati", "Neecha bhanga", "Vipareeta raja yoga",
  "Dhana yoga", "Parivartana", "Chandra-Mangala", "Gajakesari", "Guru-Mangala", "Budhaditya", "Sunapha", "Anapha", "Durudhara", "Vesi", "Vasi",
  "Ubhayachari", "Amala", "Adhi", "Saraswati", "Kemadruma", "Sakata", "Kala sarpa",
];

const HEAT_WORD = ["Resting", "Lightly on", "On", "Fully on"];

function Heat({ heat }: { heat: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm" title={HEAT_WORD[heat]}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-3 w-3 rounded-[2px] ${i <= heat ? "bg-go" : "bg-ink/12"}`} />
        ))}
      </span>
      <span className={heat ? "font-semibold text-go" : "text-mute"}>{HEAT_WORD[heat]}</span>
    </span>
  );
}

interface Row {
  yoga: Yoga;
  act: Activation;
  triggers: TransitTrigger[];
}

export default function YogasPage() {
  const { ready, now, natal, profile } = useStore();
  const dayStamp = Math.floor(now.getTime() / MS_DAY);

  const data = useMemo(() => {
    if (!ready || !profile.timeConfirmed) return null;
    const at = new Date(dayStamp * MS_DAY);
    const yogas = findYogas(natal);
    const triggerCache = new Map<PlanetId, TransitTrigger[]>();
    const trig = (p: PlanetId) => {
      if (!triggerCache.has(p)) triggerCache.set(p, transitTriggers(natal, p, at));
      return triggerCache.get(p)!;
    };
    const rows: Row[] = yogas.map((yoga) => ({ yoga, act: activation(natal, yoga.planets, at), triggers: yoga.planets[0] === "Ra" ? [] : trig(yoga.planets[0]) }));
    const run = runningDasha(natal.mahas, at);

    // The coming antarams and which yogas each one switches on.
    const coming: { maha: PlanetId; bhukti: PlanetId; p: DashaPeriod; yogas: { name: string; full: boolean }[] }[] = [];
    if (run) {
      const horizon = at.getTime() + 3 * 365.25 * MS_DAY;
      for (const maha of natal.mahas) {
        if (maha.end <= at || maha.start.getTime() > horizon) continue;
        for (const bh of subPeriods(maha)) {
          if (bh.end <= at || bh.start.getTime() > horizon) continue;
          for (const an of subPeriods(bh)) {
            if (an.end <= at || an.start.getTime() > horizon) continue;
            const lords = [maha.lord, bh.lord, an.lord];
            const hit = yogas
              .filter((y) => y.tone === "good" && y.planets.includes(an.lord))
              .map((y) => ({ name: y.name, full: y.planets.length > 1 && y.planets.every((q) => lords.includes(q)) }));
            coming.push({ maha: maha.lord, bhukti: bh.lord, p: an, yogas: hit });
          }
        }
      }
    }
    return { rows, run, coming };
  }, [ready, natal, profile.timeConfirmed, dayStamp]);

  if (!ready) return <Loading />;
  if (!profile.timeConfirmed)
    return (
      <div>
        <PageTitle title="Yogas in your chart" tamil="யோகங்கள்">
          Yogas depend on the lagna, which needs your birth time.
        </PageTitle>
        <Link href="/setup" className="underline">
          Add your birth time in Setup
        </Link>
      </div>
    );
  if (!data) return <Loading />;

  const tz = profile.here.tz;
  const d = (x: Date) => fmtDateLong(x, tz);
  const name = (p: PlanetId) => PLANET_INFO[p].ta;
  const { rows, run, coming } = data;
  const good = rows.filter((r) => r.yoga.tone === "good");
  const on = good.filter((r) => r.act.heat >= 2).sort((a, b) => b.act.heat - a.act.heat);
  const found = rows.map((r) => r.yoga.name).join(" ");
  const absent = CHECKED.filter((c) => !found.toLowerCase().includes(c.toLowerCase().replace(" yoga", "")));
  const mp = rows.filter((r) => r.yoga.group === "Pancha Mahapurusha");

  return (
    <div>
      <PageTitle title="Yogas in your chart" tamil="யோகங்கள்">
        A yoga is a promise written at birth. It pays out when its planets hold your dasa, bhukti or antaram, and more so when Guru looks at them from the
        sky. This page lists the yogas you have, how clean each one is, when it switches on, and what to do with it.
      </PageTitle>

      <section className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[1.1fr_1fr]">
        <div className="bg-deep p-6 text-paper sm:p-8">
          <p className="text-paper/70">Found in your chart</p>
          <p className="verdict-word mt-2 text-6xl leading-none sm:text-7xl">{good.length} yogas</p>
          <p className="mt-4 max-w-[46ch] text-[1.02rem] text-paper/90">
            {mp.length > 0 && (
              <>
                Among them {mp.length === 1 ? "one" : mp.length === 2 ? "two" : mp.length} of the five Pancha Mahapurusha yogas: {mp.map((r) => r.yoga.name.replace(" yoga", "")).join(" and ")}.{" "}
              </>
            )}
            {run && (
              <>
                You are in {name(run.maha.lord)} dasa, {name(run.bhukti.lord)} bhukti, {name(run.antaram.lord)} antaram.
              </>
            )}
          </p>
        </div>
        <div className="bg-paper p-6 sm:p-8">
          <p className="text-mute">Switched on right now</p>
          {on.length === 0 ? (
            <p className="mt-3 text-lg">No yoga is fully on in this antaram. See the coming periods below for the next one.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {on.slice(0, 7).map((r) => (
                <li key={r.yoga.id} className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <a href={`#${r.yoga.id}`} className="font-semibold underline decoration-line underline-offset-4 hover:decoration-peacock">
                    {r.yoga.name}
                  </a>
                  <Heat heat={r.act.heat} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-12">
        <H2 aside="next three years">Coming periods and the yogas they switch on</H2>
        <ol className="border-t border-line">
          {coming.map((c, i) => {
            const live = c.p.start <= now;
            return (
              <li key={c.p.start.getTime()} className={`grid gap-x-4 gap-y-1 border-b border-line py-3 sm:grid-cols-[13.5rem_11rem_1fr] ${live ? "-mx-3 bg-panel px-3" : ""}`}>
                <span className="tabular-nums">
                  {d(c.p.start)} to {d(c.p.end)}
                </span>
                <span>
                  <strong>{name(c.p.lord)}</strong> antaram
                  {live && <span className="ml-2 rounded-sm bg-deep px-1.5 py-0.5 text-[0.7rem] font-semibold text-paper">now</span>}
                  {(i === 0 || coming[i - 1].bhukti !== c.bhukti) && <span className="block text-sm text-mute">in {name(c.bhukti)} bhukti</span>}
                </span>
                <span className="text-[0.95rem]">
                  {c.yogas.length === 0 ? (
                    <span className="text-mute">No yoga planet in charge: a plain stretch, good for groundwork.</span>
                  ) : (
                    c.yogas.map((y, j) => (
                      <span key={y.name}>
                        {j > 0 && ", "}
                        <span className={y.full ? "font-semibold text-go" : ""}>{y.name}</span>
                      </span>
                    ))
                  )}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 max-w-[72ch] text-sm text-mute">
          A name in green means every planet of that yoga holds one of the three running periods at once, which is when it gives the most.
        </p>
      </section>

      {GROUPS.map((g) => {
        const list = rows.filter((r) => r.yoga.group === g.key);
        if (!list.length) return null;
        return (
          <section key={g.key} className="mt-14">
            <H2 aside={g.note}>{g.key}</H2>
            <div className="border-t border-line">
              {list.map((r) => (
                <YogaRow key={r.yoga.id} row={r} now={now} d={d} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-14 max-w-[72ch]">
        <H2>Checked and not present</H2>
        <p className="text-[0.98rem] text-mute">{absent.join(", ")}.</p>
        <p className="mt-4 text-sm text-mute">
          Rules are the standard classical ones with whole-sign houses. Books differ on finer points, such as whether a Mahapurusha yoga counts from the
          Moon, so each entry shows exactly how it is formed. For what to do when a yoga planet is weak, see{" "}
          <Link href="/remedies" className="underline">
            Strengthen and recover
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function YogaRow({ row, now, d }: { row: Row; now: Date; d: (x: Date) => string }) {
  const { yoga, act, triggers } = row;
  const name = (p: PlanetId) => PLANET_INFO[p].ta;
  const next = act.upcoming.slice(0, 3);
  const guru = triggers.filter((t) => t.planet === "Ju" && t.end > now).slice(0, 2);
  const bad = yoga.tone === "bad";
  return (
    <article id={yoga.id} className="grid scroll-mt-6 gap-x-10 gap-y-4 border-b border-line py-7 lg:grid-cols-[17rem_1fr]">
      <div>
        <h3 className="display text-[1.7rem] leading-tight">{yoga.name}</h3>
        <p className="mt-1 text-peacock">{yoga.planets.map(name).join(" and ")}</p>
        {!bad && (
          <p className="mt-3">
            <Heat heat={act.heat} />
          </p>
        )}
      </div>
      <div className="max-w-[70ch] space-y-4 text-[0.98rem]">
        <p>{yoga.formed}</p>
        {yoga.modifiers.length > 0 && (
          <ul className="space-y-1 text-mute">
            {yoga.modifiers.map((m) => (
              <li key={m} className="border-l-2 border-line pl-3">
                {m}
              </li>
            ))}
          </ul>
        )}
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="font-semibold">{bad ? "What it does" : "What it gives"}</dt>
            <dd className="mt-1 text-mute">{yoga.gives}</dd>
          </div>
          <div>
            <dt className="font-semibold">{bad ? "How to handle it" : "How to use it"}</dt>
            <dd className="mt-1 text-mute">{yoga.use}</dd>
          </div>
        </dl>
        <div className="rounded bg-panel px-4 py-3">
          <p className="font-semibold">{bad ? "When it is felt" : "When it is on"}</p>
          <ul className="mt-1.5 space-y-1 tabular-nums">
            {act.runningNow.map((r) => (
              <li key={r.level + r.period.start.getTime()}>
                <span className="font-semibold text-go">Now:</span> {name(r.period.lord)} {r.level} until {d(r.period.end)}
              </li>
            ))}
            {next.map((r) => (
              <li key={r.level + r.period.start.getTime()}>
                {name(r.period.lord)} {r.level}
                {r.level !== "dasa" && <span className="text-mute"> in {name(r.within)}</span>}: {d(r.period.start)} to {d(r.period.end)}
              </li>
            ))}
            {guru.map((t) => (
              <li key={t.start.getTime()} className="text-mute">
                {t.how}: {t.start <= now ? "now" : d(t.start)} to {d(t.end)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
