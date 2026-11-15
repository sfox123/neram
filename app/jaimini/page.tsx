"use client";

import { useMemo } from "react";
import Link from "next/link";
import { RasiChart } from "@/components/RasiChart";
import { useStore } from "@/components/store";
import { H2, Loading, PageTitle } from "@/components/ui";
import { careerBaseline, careerPromise, careerWindows } from "@/lib/astro/career";
import { ordinal } from "@/lib/astro/chart";
import { formatDeg, houseFrom, PLANET_INFO, PlanetId, RASI } from "@/lib/astro/constants";
import { runningDasha } from "@/lib/astro/dasha";
import { ARUDHA_NAME, charaAt, charaSubs, CrossCheck, crossCheck, dasaReading, jaimini, KARAKA_INFO, KARAKA_ORDER, Topic } from "@/lib/astro/jaimini";
import { marriageBaseline, marriagePromise, marriageWindows } from "@/lib/astro/marriage";
import { fmtDateLong, MS_DAY } from "@/lib/astro/time";

const name = (p: PlanetId) => PLANET_INFO[p].ta;
const VERDICT: Record<CrossCheck["verdict"], { word: string; cls: string; line: string }> = {
  agrees: { word: "Agrees", cls: "tier-go", line: "Both systems point here, which is the stronger signal." },
  partly: { word: "Partly", cls: "tier-steady", line: "Chara dasa backs part of this stretch only." },
  silent: { word: "Silent", cls: "tier-hold", line: "Chara dasa does not single this stretch out. It rests on the Vimshottari reading alone." },
};

interface Checked {
  topic: Topic;
  start: Date;
  end: Date;
  level: "high" | "raised";
  strongest: { start: Date; end: Date }[];
  check: CrossCheck;
}

export default function JaiminiPage() {
  const { ready, now, natal, profile } = useStore();
  const dayStamp = Math.floor(now.getTime() / MS_DAY);

  const data = useMemo(() => {
    if (!ready || !profile.timeConfirmed) return null;
    const at = new Date(dayStamp * MS_DAY);
    const j = jaimini(natal);
    const run = charaAt(j.dasa, at);
    const cp = careerPromise(natal);
    const cw = careerWindows(natal, cp, careerBaseline(natal, cp), at, 5).windows;
    const mp = marriagePromise(natal);
    const mw = marriageWindows(natal, mp, marriageBaseline(natal, mp), at, 5).windows;
    const pick = (topic: Topic, list: { start: Date; end: Date; level: string; strongest: { start: Date; end: Date }[] }[]): Checked[] => {
      const high = list.filter((w) => w.level === "high" && w.end.getTime() - w.start.getTime() >= 20 * MS_DAY);
      const use = high.length ? high : list.filter((w) => w.level === "raised" && w.end.getTime() - w.start.getTime() >= 45 * MS_DAY).slice(0, 4);
      return use.map((w) => ({ topic, start: w.start, end: w.end, level: w.level as "high" | "raised", strongest: w.strongest, check: crossCheck(natal, j, w.start, w.end, topic) }));
    };
    return { at, j, run, career: pick("career", cw), marriage: pick("marriage", mw) };
  }, [ready, natal, profile.timeConfirmed, dayStamp]);

  if (!ready) return <Loading />;
  if (!profile.timeConfirmed)
    return (
      <div>
        <PageTitle title="Jaimini" tamil="ஜைமினி">
          Chara dasa starts from the lagna sign and the arudha padas are counted from it, so this page needs your birth time.
        </PageTitle>
        <Link href="/setup" className="underline">
          Add your birth time in Setup
        </Link>
      </div>
    );
  if (!data) return <Loading />;

  const { at, j, run, career, marriage } = data;
  const tz = profile.here.tz;
  const d = (x: Date) => fmtDateLong(x, tz);
  const sign = (s: number) => RASI[s].ta;
  const vim = runningDasha(natal.mahas, at);
  const next = run ? j.dasa.periods[j.dasa.periods.indexOf(run.dasa) + 1] : undefined;
  const subs = run ? charaSubs(j.dasa, run.dasa) : [];
  const shown = j.dasa.periods.filter((p) => p.end.getTime() > natal.birth.getTime() && p.start.getTime() < natal.birth.getTime() + 100 * 365.25 * MS_DAY);

  const checkList = (title: string, aside: string, list: Checked[], href: string, page: string) => (
    <section className="mt-12">
      <H2 aside={aside}>{title}</H2>
      {list.length === 0 ? (
        <p className="max-w-[70ch] text-mute">The Vimshottari engine finds no raised stretch in the next five years to test.</p>
      ) : (
        <ul className="border-t border-line">
          {list.map((w) => {
            const vd = VERDICT[w.check.verdict];
            return (
              <li key={`${w.topic}${w.start.getTime()}`} className="grid gap-x-8 gap-y-2 border-b border-line py-4 lg:grid-cols-[17rem_1fr]">
                <div>
                  <p className="font-semibold tabular-nums">
                    {d(w.start)} to {d(w.end)}
                  </p>
                  <p className="text-sm text-mute">
                    Vimshottari and transits: {w.level === "high" ? "high" : "raised"}
                    {w.strongest.length ? `, strongest ${w.strongest.map((x) => `${d(x.start)} to ${d(x.end)}`).join("; ")}` : ""}
                  </p>
                  <p className="mt-2">
                    <span className={`${vd.cls} inline-block rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none`}>Chara dasa: {vd.word}</span>
                  </p>
                </div>
                <div className="text-[0.95rem]">
                  <p className="text-mute">
                    {vd.line} It backs {Math.round(w.check.share * 100)}% of the stretch.
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {w.check.spans.slice(0, 3).map((s) => (
                      <li key={`${s.dasa}-${s.sub}-${s.start.getTime()}`} className={`border-l-2 pl-3 ${s.level === "strong" ? "border-go" : s.level === "some" ? "border-good" : "border-line"}`}>
                        <span className="font-semibold">
                          {sign(s.dasa)} dasa, {sign(s.sub)} sub-period
                        </span>{" "}
                        <span className="tabular-nums text-mute">
                          ({d(s.start)} to {d(s.end)})
                        </span>
                        <span className="block text-mute">{s.reasons.length ? s.reasons.join("; ") + "." : "Nothing in these two signs speaks to the matter."}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-sm text-mute">
        The stretches come from the{" "}
        <Link href={href} className="underline">
          {page}
        </Link>{" "}
        page.
      </p>
    </section>
  );

  return (
    <div>
      <PageTitle title="Jaimini" tamil="ஜைமினி">
        A second opinion. Jaimini reads signs where the rest of this app reads planets: periods belong to signs, signs look at signs, and each house
        throws an image called its arudha. Its use here is as an independent check on what the Vimshottari dasa and transits say.
      </PageTitle>

      <section className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[1fr_1.25fr]">
        <div className="bg-deep p-6 text-paper sm:p-8">
          <p className="text-paper/70">Chara dasa running</p>
          <p className="verdict-word mt-2 text-6xl leading-none sm:text-7xl">{run ? sign(run.dasa.sign) : "None"}</p>
          {run && (
            <p className="mt-4 max-w-[44ch] text-[1.02rem] text-paper/90">
              {run.dasa.years} years, {d(run.dasa.start)} to {d(run.dasa.end)}. Sub-period of {sign(run.sub.sign)} until {d(run.sub.end)}.
              {next ? ` Then ${sign(next.sign)} for ${next.years} years.` : ""}
            </p>
          )}
        </div>
        <div className="bg-paper p-6 sm:p-8">
          <p className="text-mute">The fixed points of your chart in this system</p>
          <dl className="mt-3 grid grid-cols-[9.5rem_1fr] gap-x-4 gap-y-2 text-[0.98rem]">
            <dt className="text-mute">Atmakaraka</dt>
            <dd>
              {name(j.karakas.AK.planet)}, at {formatDeg(natal.positions[j.karakas.AK.planet])} the planet furthest along in its sign
            </dd>
            <dt className="text-mute">Karakamsa</dt>
            <dd>{sign(j.karakamsa)}, the navamsa sign of the atmakaraka</dd>
            <dt className="text-mute">Arudha lagna</dt>
            <dd>
              {sign(j.al)}, your {ordinal(houseFrom(natal.lagnaSign, j.al))} house
            </dd>
            <dt className="text-mute">Upapada</dt>
            <dd>
              {sign(j.ul)}, your {ordinal(houseFrom(natal.lagnaSign, j.ul))} house
            </dd>
            {vim && (
              <>
                <dt className="text-mute">Beside it</dt>
                <dd>
                  Vimshottari {name(vim.maha.lord)} dasa, {name(vim.bhukti.lord)} bhukti
                </dd>
              </>
            )}
          </dl>
        </div>
      </section>

      {checkList("Career stretches, checked", "next five years", career, "/career", "Career")}
      {checkList("Marriage stretches, checked", "next five years", marriage, "/marriage", "Marriage")}
      <p className="mt-4 max-w-[76ch] text-sm text-mute">
        For career a chara period counts when its sign holds or is seen by your amatyakaraka or atmakaraka, is your 10th house, rajya pada or arudha
        lagna, or has the amatyakaraka in the 10th from it. For marriage: the darakaraka in or looking at the sign, its navamsa sign, the upapada, your
        7th house, the dara pada, Sukran, or the darakaraka in the 7th from it. The sub-period dates an event inside the dasa, so it counts in full and
        the dasa sign at three quarters.
      </p>

      <section className="mt-14">
        <H2 aside="ranked by degree within the sign">The seven chara karakas</H2>
        <ul className="border-t border-line">
          {KARAKA_ORDER.map((k) => {
            const c = j.karakas[k];
            return (
              <li key={k} className="grid gap-x-6 gap-y-1 border-b border-line py-3 sm:grid-cols-[4rem_11rem_1fr]">
                <span className="font-semibold text-peacock">{k}</span>
                <span>
                  <span className="font-semibold">{name(c.planet)}</span>
                  <span className="block text-sm tabular-nums text-mute">
                    {formatDeg(natal.positions[c.planet])} {sign(c.sign)}
                  </span>
                </span>
                <span className="text-[0.95rem] text-mute">
                  {KARAKA_INFO[k].name}: {KARAKA_INFO[k].stands}. In your {ordinal(natal.house[c.planet])} house; navamsa {sign(c.navamsa)}.
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-12">
        <H2 aside="the arudha lagna is shaded">Arudha padas: the image each house throws</H2>
        <div className="grid gap-8 lg:grid-cols-[26rem_1fr]">
          <RasiChart title="Rasi" subtitle={`AL ${sign(j.al)}, UL ${sign(j.ul)}`} positions={natal.positions} lagnaSign={natal.lagnaSign} retro={natal.retro} highlightSign={j.al} />
          <ul className="border-t border-line text-[0.95rem]">
            {j.padas.map((p) => (
              <li key={p.house} className="grid grid-cols-[7.5rem_1fr] gap-x-4 border-b border-line py-2">
                <span className="font-semibold">{sign(p.sign)}</span>
                <span className="text-mute">
                  {ARUDHA_NAME[p.house]}
                  {p.moved ? " (moved by the rule for the 1st and 7th)" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {run && (
        <section className="mt-12 max-w-[92ch]">
          <H2 aside={`twelve equal parts of ${run.dasa.years} year${run.dasa.years === 1 ? "" : "s"}`}>Sub-periods in {sign(run.dasa.sign)} dasa</H2>
          <ol className="border-t border-line">
            {subs.map((s) => {
              const isNow = at >= s.start && at < s.end;
              return (
                <li key={s.start.getTime()} className={`grid grid-cols-[6.5rem_1fr] gap-x-4 border-b border-line py-2.5 sm:grid-cols-[7.5rem_15rem_1fr] ${isNow ? "bg-panel px-3 -mx-3" : ""} ${s.end <= at ? "text-mute" : ""}`}>
                  <span className="font-semibold">
                    {sign(s.sign)}
                    {isNow && <span className="ml-2 rounded-sm bg-deep px-1.5 py-0.5 text-[0.7rem] font-semibold text-paper">now</span>}
                  </span>
                  <span className="tabular-nums">
                    {d(s.start)} to {d(s.end)}
                  </span>
                  <span className="col-span-2 text-[0.9rem] text-mute sm:col-span-1">{dasaReading(natal, j, s.sign)}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="mt-12 max-w-[92ch]">
        <H2 aside={j.dasa.forward ? "signs in zodiac order" : "signs in reverse order"}>All chara dasas</H2>
        <ol className="border-t border-line">
          {shown.map((p) => {
            const isNow = run?.dasa === p;
            return (
              <li key={p.start.getTime()} className={`grid grid-cols-[7.5rem_1fr] gap-x-4 border-b border-line py-2.5 sm:grid-cols-[9rem_15rem_1fr] ${isNow ? "bg-panel px-3 -mx-3" : ""} ${p.end <= at ? "text-mute" : ""}`}>
                <span className="font-semibold">
                  {sign(p.sign)} <span className="font-normal text-mute">{p.years}y</span>
                  {isNow && <span className="ml-2 rounded-sm bg-deep px-1.5 py-0.5 text-[0.7rem] font-semibold text-paper">now</span>}
                </span>
                <span className="tabular-nums">
                  {d(p.start)} to {d(p.end)}
                </span>
                <span className="col-span-2 text-[0.9rem] text-mute sm:col-span-1">
                  {dasaReading(natal, j, p.sign)} Length: {p.cycle === 2 ? "second round, what is left of twelve" : p.note}.
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-sm text-mute">
          Worked by K. N. Rao&rsquo;s method with seven karakas. The sutras are terse and other teachers count the order, the lengths and the sub-periods
          differently, so dates here can differ from another program&rsquo;s. That is the reason to use it as a cross-check: agreement with Vimshottari
          is worth more than either alone, and silence is not a contradiction.
        </p>
      </section>
    </div>
  );
}
