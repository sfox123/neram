"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RasiChart } from "@/components/RasiChart";
import { useStore, useStored, useToday } from "@/components/store";
import { H2, LineList, Loading, PageTitle, TierTag, ToneDot } from "@/components/ui";
import { Natal, ordinal } from "@/lib/astro/chart";
import { houseFrom, PLANET_INFO, PlanetId, RASI, WEEKDAYS } from "@/lib/astro/constants";
import { runningDasha } from "@/lib/astro/dasha";
import { induReading, induTransits, InduWord, ROLE_LABEL } from "@/lib/astro/indu";
import { dayFrame, Place } from "@/lib/astro/panchang";
import { bestWindows, Tier } from "@/lib/astro/score";
import { addDaysKey, dateKey, fmtDate, fmtDateLong, fmtTime } from "@/lib/astro/time";
import {
  debtNotes,
  ENTRY_LABEL,
  ENTRY_STREAM,
  EntryKind,
  entryPattern,
  loanBalance,
  MONEY_DIARY_KEY,
  MoneyDay,
  MoneyEntry,
  moneyDay,
  moneyIngresses,
  moneyPeriods,
  moneyStream,
  repayDays,
  sevvaiHoras,
  STREAM_KEYS,
  streamDay,
  StreamKey,
  streamWindows,
} from "@/lib/astro/wealth";
import { activation } from "@/lib/astro/yogas";

const INDU_TIER: Record<InduWord, string> = { Rich: "tier-go", Good: "tier-good", Moderate: "tier-steady", Thin: "tier-hold" };

const moneyTier = (score: number): Tier => (score >= 72 ? "go" : score >= 60 ? "good" : score >= 43 ? "steady" : score >= 30 ? "hold" : "avoid");

type View = "all" | StreamKey;
const VIEW_LABEL: Record<View, string> = { all: "All inflow", salary: "Salary", clients: "Freelance and clients", loan: "Loans and dues" };
const KINDS: EntryKind[] = ["salary", "client", "loan-in", "repay", "other"];
const name = (p: PlanetId) => PLANET_INFO[p].ta;
const money = (x: number) => x.toLocaleString("en-IN");

function readEntry(natal: Natal, place: Place, e: MoneyEntry): MoneyDay {
  const f = dayFrame(e.date, place);
  const s = ENTRY_STREAM[e.kind];
  return s ? streamDay(natal, f, s) : moneyDay(natal, f);
}

function Diary({ natal, place, todayKey, diary, setDiary }: { natal: Natal; place: Place; todayKey: string; diary: MoneyEntry[]; setDiary: (d: MoneyEntry[]) => void }) {
  const tz = place.tz;
  const [draft, setDraft] = useState<{ date: string; kind: EntryKind; amount: string; owed: string; note: string; expected: boolean }>({ date: todayKey, kind: "client", amount: "", owed: "", note: "", expected: false });
  const [bulk, setBulk] = useState("");
  const [bulkKind, setBulkKind] = useState<EntryKind>("salary");
  const rows = useMemo(() => [...diary].sort((a, b) => b.date.localeCompare(a.date)).map((e) => ({ e, day: readEntry(natal, place, e) })), [diary, natal, place]);
  const id = () => Math.random().toString(36).slice(2, 10);
  const num = (s: string) => (s.trim() ? Number(s.replace(/[,\s]/g, "")) || undefined : undefined);

  const addBulk = () => {
    const dates = [...bulk.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]).filter((d) => !diary.some((x) => x.date === d && x.kind === bulkKind));
    if (!dates.length) return;
    setDiary([...diary, ...dates.map((date) => ({ id: id(), date, kind: bulkKind, expected: date > todayKey }))]);
    setBulk("");
  };

  return (
    <div>
      <form
        className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[10rem_12rem_1fr_1fr]"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!draft.date) return;
          setDiary([...diary, { id: id(), date: draft.date, kind: draft.kind, amount: num(draft.amount), owed: draft.kind === "loan-in" ? num(draft.owed) : undefined, note: draft.note.trim() || undefined, expected: draft.expected || undefined }]);
          setDraft({ ...draft, amount: "", owed: "", note: "", expected: false });
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm text-mute">Date</span>
          <input type="date" value={draft.date} onChange={(e) => e.target.value && setDraft({ ...draft, date: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-mute">What</span>
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as EntryKind })}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {ENTRY_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-mute">Amount</span>
          <input type="text" inputMode="numeric" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="optional" />
        </label>
        {draft.kind === "loan-in" ? (
          <label className="block">
            <span className="mb-1 block text-sm text-mute">To pay back</span>
            <input type="text" inputMode="numeric" value={draft.owed} onChange={(e) => setDraft({ ...draft, owed: e.target.value })} placeholder="optional" />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm text-mute">Note</span>
            <input type="text" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="optional" />
          </label>
        )}
        <label className="flex items-center gap-2 text-[0.95rem] sm:col-span-2">
          <input type="checkbox" checked={draft.expected} onChange={(e) => setDraft({ ...draft, expected: e.target.checked })} className="h-4 w-4 accent-[var(--color-peacock)]" />
          Promised or expected, not yet in hand
        </label>
        <button type="submit" className="rounded border border-deep bg-deep px-5 py-2 text-paper hover:opacity-90 sm:col-span-2 sm:justify-self-end">
          Add to the diary
        </button>
      </form>

      <details className="mt-4 text-[0.95rem]">
        <summary className="cursor-pointer text-mute hover:text-ink">Add many dates at once (a year of salary days, say)</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-sm text-mute">Dates as YYYY-MM-DD, separated by spaces, commas or lines</span>
            <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={3} className="w-full rounded border border-line bg-paper p-2" placeholder="2026-12-21, 2027-01-22" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-mute">All of them are</span>
            <select value={bulkKind} onChange={(e) => setBulkKind(e.target.value as EntryKind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {ENTRY_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={addBulk} className="rounded border border-line px-4 py-2 hover:border-peacock">
            Add these
          </button>
        </div>
      </details>

      {rows.length > 0 && (
        <ul className="mt-6 border-t border-line text-[0.95rem]">
          {rows.map(({ e, day }) => (
            <li key={e.id} className="grid gap-x-6 gap-y-1 border-b border-line py-2.5 sm:grid-cols-[9rem_1fr_auto]">
              <span className="tabular-nums">
                {fmtDate(dayFrame(e.date, place).sunrise, tz, { weekday: "short" })}
                {e.date > todayKey && <span className="ml-1.5 text-sm text-peacock">ahead</span>}
              </span>
              <span>
                <span className="font-semibold">{ENTRY_LABEL[e.kind]}</span>
                {e.amount ? ` ${money(e.amount)}` : ""}
                {e.owed ? <span className="text-mute"> (pay back {money(e.owed)})</span> : null}
                {e.expected && <span className="ml-1.5 text-sm text-mute">expected</span>}
                {e.note && <span className="text-mute"> {e.note}</span>}
                <span className="block text-sm text-mute">{day.signals.find((s) => s.weight !== 0)?.text ?? "No strong sign either way."}</span>
              </span>
              <span className="flex items-center gap-3 text-sm">
                <TierTag tier={moneyTier(day.score)} />
                <span className="tabular-nums text-mute">{day.score}</span>
                <button type="button" className="text-mute underline hover:text-avoid" onClick={() => setDiary(diary.filter((x) => x.id !== e.id))} aria-label="Remove this entry">
                  remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-mute">Kept in this browser only. Entries in the next three days also show in the bell.</p>
    </div>
  );
}

export default function MoneyPage() {
  const { ready, now, natal, profile } = useStore();
  const today = useToday();
  const todayKey = ready ? dateKey(now, profile.here.tz) : null;
  const [picked, setPicked] = useState<string | null>(null);
  const [storedView, setView] = useStored<View>("neram.money.view", "all");
  const [diary, setDiary] = useStored<MoneyEntry[]>(MONEY_DIARY_KEY, []);
  const view: View = profile.timeConfirmed ? storedView : "all";

  const days = useMemo(() => {
    if (!todayKey) return [];
    return Array.from({ length: 30 }, (_, i) => {
      const f = dayFrame(addDaysKey(todayKey, i), profile.here);
      return view === "all" ? moneyDay(natal, f) : streamDay(natal, f, view);
    });
  }, [todayKey, natal, profile.here, view]);
  const streams = useMemo(() => {
    if (!todayKey || !profile.timeConfirmed) return [];
    const f = dayFrame(todayKey, profile.here);
    const t = new Date();
    return STREAM_KEYS.map((k) => ({ st: moneyStream(natal, k), today: streamDay(natal, f, k), windows: streamWindows(natal, k, t, 150) }));
  }, [todayKey, natal, profile.here, profile.timeConfirmed]);
  const loans = useMemo(() => {
    if (!todayKey) return null;
    const bal = loanBalance(diary);
    const best = repayDays(natal, profile.here, todayKey, 70).slice(0, 4).sort((a, b) => a.frame.sunrise.getTime() - b.frame.sunrise.getTime());
    return { bal, best };
  }, [todayKey, diary, natal, profile.here]);
  const patterns = useMemo(
    () => (profile.timeConfirmed ? (["salary", "client", "loan-in", "repay"] as EntryKind[]).map((k) => entryPattern(natal, profile.here, diary, k)).filter((p) => p !== null) : []),
    [natal, profile.here, profile.timeConfirmed, diary],
  );
  const longRun = useMemo(() => {
    if (!todayKey) return null;
    const t = new Date();
    return { periods: moneyPeriods(natal, t), ingresses: moneyIngresses(natal, t) };
  }, [todayKey, natal]);

  const indu = useMemo(() => {
    if (!todayKey || !profile.timeConfirmed) return null;
    const t = new Date();
    const reading = induReading(natal, runningDasha(natal.mahas, t));
    const key = [reading.lord, ...reading.producers, ...reading.supports].filter((p, i, a) => p !== "Ra" && p !== "Ke" && a.indexOf(p) === i);
    return { reading, transits: induTransits(natal, t), timing: key.map((p) => ({ planet: p, act: activation(natal, [p], t) })) };
  }, [todayKey, natal, profile.timeConfirmed]);

  if (!ready || !today || !days.length || !longRun || !loans || !todayKey) return <Loading />;
  const tz = profile.here.tz;
  const known = profile.timeConfirmed;
  const sel = days.find((d) => d.frame.dateKey === picked) ?? days[0];
  const isToday = sel === days[0];
  const windows = bestWindows(today.segments, "money", now, 15, 4);
  const topDays = [...days].sort((a, b) => b.score - a.score).slice(0, 5).sort((a, b) => a.frame.sunrise.getTime() - b.frame.sunrise.getTime());
  const onDay = (key: string) => diary.filter((e) => e.date === key);
  const selEntries = onDay(sel.frame.dateKey);
  const scored = sel.signals.filter((s) => s.weight !== 0);
  const behind = sel.signals.filter((s) => s.weight === 0);
  const selDebt = view === "loan" ? debtNotes(sel.frame, natal) : [];
  const selHoras = view === "loan" && sel.frame.weekday === 2 ? sevvaiHoras(sel.frame) : [];

  return (
    <div>
      <PageTitle title="Money outlook" tamil="தன வரவு">
        Each kind of money is read the way the tradition reads any matter: its house (bhavam), that house&rsquo;s lord in your chart (bhavadhipathi), and the
        fixed significator (karakan). Salary, client payments and loans each have their own.
      </PageTitle>

      {known && (
        <div className="mb-6 flex flex-wrap gap-1.5" role="group" aria-label="Which money to read">
          {(["all", ...STREAM_KEYS] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded border px-3 py-1.5 text-[0.95rem] ${view === v ? "border-deep bg-deep text-paper" : "border-line bg-paper text-ink hover:border-peacock"}`}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
      )}

      <section>
        <H2 aside="Taller bars: more signs. 50 is your ordinary day. Dots mark your diary.">{view === "all" ? "Next 30 days" : `Next 30 days: ${VIEW_LABEL[view].toLowerCase()}`}</H2>
        <div className="flex h-44 items-end gap-[3px]" role="group" aria-label={`${VIEW_LABEL[view]} score for each of the next 30 days`}>
          {days.map((d, i) => {
            const tier = moneyTier(d.score);
            const active = d === sel;
            const marks = onDay(d.frame.dateKey);
            return (
              <div key={d.frame.dateKey} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                {marks.length > 0 && (
                  <span className="mx-auto mb-1 block h-2 w-2 rounded-full bg-peacock" title={marks.map((m) => ENTRY_LABEL[m.kind]).join(", ")} aria-hidden />
                )}
                <button
                  type="button"
                  onClick={() => setPicked(d.frame.dateKey)}
                  aria-pressed={active}
                  aria-label={`${fmtDate(d.frame.sunrise, tz)}: ${d.label}, ${d.score}${marks.length ? `; ${marks.map((m) => ENTRY_LABEL[m.kind]).join(", ")}` : ""}`}
                  className={`skyline-bar tier-${tier} ${tier === "avoid" ? "bar-avoid" : ""} w-full rounded-t-sm ${active ? "outline outline-2 outline-offset-2 outline-ink" : ""}`}
                  style={{ height: `${12 + (78 * d.score) / 100}%`, animationDelay: `${i * 12}ms` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between border-t border-ink/60 pt-1 text-[0.75rem] text-mute">
          <span>{fmtDate(days[0].frame.sunrise, tz)}</span>
          <span>{fmtDate(days[10].frame.sunrise, tz)}</span>
          <span>{fmtDate(days[20].frame.sunrise, tz)}</span>
          <span>{fmtDate(days[29].frame.sunrise, tz)}</span>
        </div>
        <p className="mt-3 text-[0.95rem]">
          Strongest days:{" "}
          {topDays.map((d, i) => (
            <span key={d.frame.dateKey}>
              {i > 0 && ", "}
              <button type="button" className="font-semibold underline decoration-line underline-offset-4 hover:decoration-peacock" onClick={() => setPicked(d.frame.dateKey)}>
                {fmtDate(d.frame.sunrise, tz)}
              </button>
            </span>
          ))}
          .
        </p>
      </section>

      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <H2 aside={<TierTag tier={moneyTier(sel.score)} />}>
            {isToday ? "Today" : fmtDate(sel.frame.sunrise, tz, { weekday: "long", month: "long" })}: {sel.label.toLowerCase()}
          </H2>
          {selEntries.length > 0 && (
            <p className="mb-3 text-[0.95rem]">
              In your diary:{" "}
              {selEntries.map((e) => `${ENTRY_LABEL[e.kind]}${e.amount ? ` ${money(e.amount)}` : ""}${e.expected ? " (expected)" : ""}`).join(", ")}.
            </p>
          )}
          {scored.length ? (
            <ul className="space-y-2.5 border-t border-line pt-4">
              {scored.map((s) => (
                <li key={s.text} className="flex gap-3 text-[0.95rem]">
                  <ToneDot tone={s.tone} />
                  <span>{s.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-line pt-4 text-[0.95rem] text-mute">No sign either way: an ordinary day for this.</p>
          )}
          {behind.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-mute">
              {behind.map((s) => (
                <li key={s.text}>{s.text}</li>
              ))}
            </ul>
          )}
          {selDebt.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t border-line pt-3 text-[0.95rem]">
              {selDebt.map((x) => (
                <li key={x.act + x.text} className="flex gap-3">
                  <ToneDot tone={x.tone} />
                  <span>
                    <span className="font-semibold">{x.act === "repay" ? "Repaying" : x.act === "borrow" ? "Borrowing" : "Lending"}:</span> {x.text}.
                  </span>
                </li>
              ))}
              {selHoras.length > 0 && (
                <li className="text-sm text-mute">Sevvai horas: {selHoras.map((h) => `${fmtTime(h.start, tz)} to ${fmtTime(h.end, tz)}`).join(", ")}.</li>
              )}
            </ul>
          )}
          {!known && (
            <p className="mt-4 text-[0.95rem] text-mute">
              Only Moon-based signals are counted.{" "}
              <Link className="text-peacock underline underline-offset-2" href="/setup">
                Set your birth time
              </Link>{" "}
              to read salary, clients and loans by house.
            </p>
          )}
        </section>

        <section>
          <H2>Best money hours left today</H2>
          {windows.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {windows.map((b) => (
                <li key={b.start.getTime()} className="flex items-center justify-between py-2.5 tabular-nums">
                  <span className="font-semibold">
                    {fmtTime(b.start, tz)} to {fmtTime(b.end, tz)}
                  </span>
                  <TierTag tier={b.tier} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.95rem] text-mute">Nothing favourable is left today for money matters.</p>
          )}
          <p className="mt-3 text-sm text-mute">
            Use these for sending invoices, asking about pay, pricing conversations and planned purchases. Guru, Sukran and Budhan horas and the Laabam and
            Dhanam Gowri periods weigh most here.
          </p>
        </section>
      </div>

      {streams.length > 0 && (
        <section className="mt-14">
          <H2 aside="bhavam, bhavadhipathi, karakan">Your money streams</H2>
          <div className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-3">
            {streams.map(({ st, today: td, windows: ws }) => {
              const next = ws.filter((w) => w.end > now).slice(0, 3);
              return (
                <div key={st.key} className="bg-paper p-5 sm:p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="display text-xl">
                      {st.label} <span className="tamil text-base text-mute">{st.tamil}</span>
                    </p>
                    <button type="button" onClick={() => setView(st.key)} className="text-sm text-peacock underline underline-offset-2">
                      read days
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-mute">{st.blurb}</p>
                  <dl className="mt-4 space-y-2 text-[0.95rem]">
                    <div>
                      <dt className="text-sm text-mute">Bhavam (houses)</dt>
                      <dd>{st.houses.map((h) => `${ordinal(h.h)} ${RASI[(natal.lagnaSign + h.h - 1) % 12].ta}`).join(", ")}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-mute">Bhavadhipathi (their lords)</dt>
                      <dd>
                        {st.lords.map((l, i) => (
                          <span key={l.p}>
                            {i > 0 && "; "}
                            <strong>{name(l.p)}</strong> for the {l.houses.map(ordinal).join(" and ")}, in your {ordinal(natal.house[l.p])}
                          </span>
                        ))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-mute">Karakan (fixed significators)</dt>
                      <dd>
                        {st.karakas.map((k, i) => (
                          <span key={k.p}>
                            {i > 0 && "; "}
                            <strong>{name(k.p)}</strong> for {k.why.split(" (")[0]}
                          </span>
                        ))}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 flex items-center gap-2 text-[0.95rem]">
                    <span className="text-mute">Today</span> <TierTag tier={moneyTier(td.score)} /> <span className="tabular-nums text-mute">{td.score}</span>
                  </p>
                  <p className="mt-4 text-sm font-semibold">Weeks the periods favour it</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {next.map((w) => (
                      <li key={w.start.getTime()}>
                        <span className={`tabular-nums ${w.strong ? "font-semibold text-go" : ""}`}>
                          {w.start <= now ? "Now" : fmtDateLong(w.start, tz)} to {fmtDateLong(w.end, tz)}
                        </span>
                        <span className="block text-mute">{w.text}.</span>
                      </li>
                    ))}
                    {next.length === 0 && <li className="text-mute">No sookshma of its lords in the next five months.</li>}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-3 max-w-[72ch] text-sm text-mute">
            The lords change with the lagna; the karakans are the same for everyone. Green weeks: both the antaram and the sookshma lord belong to the stream.
          </p>
        </section>
      )}

      <section className="mt-14 scroll-mt-6" id="diary">
        <H2 aside="salary days, client payments, loans">Your money diary</H2>
        <p className="mb-5 max-w-[72ch] text-[0.98rem] text-mute">
          Record money as it comes and goes, and money you are promised. Each entry is read for its own stream, and once a few are in, the page shows what
          their days have in common.
        </p>
        <Diary natal={natal} place={profile.here} todayKey={todayKey} diary={diary} setDiary={setDiary} />
      </section>

      <section className="mt-14 scroll-mt-6" id="loans">
        <H2 aside="6th house, Sevvai">Loans and paying back</H2>
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
          <div>
            {loans.bal.owed > 0 ? (
              <>
                <p className="text-[1.05rem]">
                  Still to pay back: <strong className="tabular-nums">{money(loans.bal.left)}</strong>
                  <span className="text-mute">
                    {" "}
                    of {money(loans.bal.owed)}
                    {loans.bal.repaid > 0 ? `, ${money(loans.bal.repaid)} repaid` : ""}
                  </span>
                </p>
                {loans.bal.open.map((e) => {
                  const d = readEntry(natal, profile.here, e);
                  const top = d.signals.filter((s) => s.weight !== 0).slice(0, 2);
                  return (
                    <p key={e.id} className="mt-2 text-sm text-mute">
                      Taken {fmtDateLong(dayFrame(e.date, profile.here).sunrise, tz)}
                      {e.amount ? `, ${money(e.amount)}` : ""}
                      {e.owed && e.amount ? ` to repay ${money(e.owed)} (${Math.round(((e.owed - e.amount) / e.amount) * 100)}% more)` : ""}. That day: {top.map((s) => s.text.replace(/\.$/, "")).join("; ")}.
                    </p>
                  );
                })}
              </>
            ) : (
              <p className="text-[0.95rem] text-mute">No loans in your diary. Add one (and its payback amount) to track it and get repayment days.</p>
            )}
            <p className="mt-5 font-semibold">Tuesdays to repay in the next ten weeks</p>
            <ul className="mt-2 border-t border-line text-[0.95rem]">
              {loans.best.map((r) => (
                <li key={r.frame.dateKey} className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line py-2">
                  <span className="font-semibold tabular-nums">{fmtDate(r.frame.sunrise, tz, { weekday: "short" })}</span>
                  <span className="text-sm text-mute">Sevvai hora {r.horas.map((h) => `${fmtTime(h.start, tz)} to ${fmtTime(h.end, tz)}`).join(" or ")}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-mute">Ranked by the loans stream, with Chandrashtamam Tuesdays left out. Paying part of a debt in a Sevvai hora counts too.</p>
          </div>
          <div className="text-[0.95rem]">
            <p className="font-semibold">The traditional rules</p>
            <ul className="mt-2 space-y-2">
              <li className="flex gap-3">
                <ToneDot tone="good" />
                <span>
                  <strong>Repay on a Tuesday</strong>, ideally in a Sevvai hora. Sevvai is the runa karakan, the significator of debt; the Runa Vimochana
                  Angaraka Stotram, the prayer for release from debt, is addressed to him.
                </span>
              </li>
              <li className="flex gap-3">
                <ToneDot tone="bad" />
                <span>
                  <strong>Do not borrow on a Tuesday</strong>, on the day the Sun changes sign, in Vriddhi yoga, or in Hastham on a Sunday: such debts are said
                  to linger or grow.
                </span>
              </li>
              <li className="flex gap-3">
                <ToneDot tone="bad" />
                <span>
                  <strong>Do not lend on a Wednesday</strong>: money given on Budhan&rsquo;s day is said to be slow to return.
                </span>
              </li>
              <li className="flex gap-3">
                <ToneDot tone="bad" />
                <span>
                  <strong>Avoid Chandrashtamam</strong> for any money promise.
                </span>
              </li>
            </ul>
            {known && (
              <p className="mt-4 text-sm text-mute">
                In your chart the 6th house is {RASI[(natal.lagnaSign + 5) % 12].ta}, ruled by {name(natal.lordOf(6))} (in your {ordinal(natal.house[natal.lordOf(6)])}); Sevvai,
                the karakan, sits in your {ordinal(natal.house.Ma)} and also rules your {natal.rules.Ma.map(ordinal).join(" and ")}.
              </p>
            )}
          </div>
        </div>
      </section>

      {patterns.length > 0 && (
        <section className="mt-14">
          <H2 aside="measured against chance">What your money days have in common</H2>
          <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
            {patterns.map((p) => {
              const st = moneyStream(natal, ENTRY_STREAM[p.kind]!);
              const set = [...new Set([...st.lords.map((l) => l.p), ...st.karakas.map((k) => k.p)])];
              const over = p.planets.filter((x) => x.days >= 2 && x.days >= x.chance * 2);
              return (
                <div key={p.kind}>
                  <p className="font-semibold">
                    {ENTRY_LABEL[p.kind]}: {p.count} day{p.count === 1 ? "" : "s"}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[0.95rem]">
                    <li className="border-l-2 border-peacock pl-3">
                      On {p.tied} of {p.count} the Moon was in a star of {set.map(name).join(", ")} (its lords and karakans). Chance alone gives about {p.tiedChance}.
                    </li>
                    <li className="border-l-2 border-peacock pl-3">
                      On {p.inHouse} the Moon was in one of its houses ({st.houses.map((h) => ordinal(h.h)).join(", ")}). Chance gives about {p.houseChance}.
                    </li>
                    {over.map((x) => (
                      <li key={x.planet} className="border-l-2 border-go pl-3">
                        {name(x.planet)}&rsquo;s stars held the Moon on {x.days} of them, {Math.round((x.days / x.chance) * 10) / 10} times chance
                        {x.tie ? `: ${name(x.planet)} is ${x.tie}` : ""}.
                      </li>
                    ))}
                    <li className="text-sm text-mute">
                      Weekdays:{" "}
                      {p.weekdays
                        .map((c, i) => (c ? `${WEEKDAYS[i].slice(0, 3)} ${c}` : ""))
                        .filter(Boolean)
                        .join(", ")}
                      .
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-4 max-w-[72ch] text-sm text-mute">
            Salary dates are set by a payroll calendar, so a match there is a coincidence worth noticing rather than a cause. Freelance payments and loans,
            which other people decide day by day, are the fairer test. A handful of days proves little; the comparison sharpens as the diary grows.
          </p>
        </section>
      )}

      {indu && (
        <section className="mt-14 scroll-mt-6" id="indu">
          <H2 aside={`${RASI[indu.reading.sign].ta}, your ${ordinal(houseFrom(natal.lagnaSign, indu.reading.sign))} house`}>Indu lagna: your wealth ascendant</H2>
          <div className="grid gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[1fr_1.35fr]">
            <div className={`${INDU_TIER[indu.reading.word]} p-6 sm:p-7`}>
              <p className="opacity-85">The reading from {RASI[indu.reading.sign].ta}</p>
              <p className="verdict-word mt-2 text-6xl leading-none">{indu.reading.word}</p>
              <p className="mt-4 max-w-[40ch] text-[1.02rem] opacity-90">{indu.reading.summary}</p>
            </div>
            <div className="bg-paper p-6 sm:p-7">
              <p className="text-mute">How it is found</p>
              <ol className="mt-3 space-y-2 text-[0.98rem]">
                {[
                  `The 9th from your lagna is ${RASI[indu.reading.working.ninthFromLagna].ta}. Its lord ${PLANET_INFO[indu.reading.working.lordA].ta} carries ${indu.reading.working.kalaA} kalas.`,
                  `The 9th from your Moon is ${RASI[indu.reading.working.ninthFromMoon].ta}. Its lord ${PLANET_INFO[indu.reading.working.lordB].ta} carries ${indu.reading.working.kalaB} kalas.`,
                  `${indu.reading.working.kalaA} + ${indu.reading.working.kalaB} = ${indu.reading.working.sum}. Divided by 12, the remainder is ${indu.reading.working.remainder}.`,
                  `Counting ${RASI[natal.moonSign].ta}, your Moon sign, as the first, the ${ordinal(indu.reading.working.remainder)} sign is ${RASI[indu.reading.sign].ta}.`,
                ].map((step, i) => (
                  <li key={step} className="grid grid-cols-[1.4rem_1fr] gap-2">
                    <span className="font-semibold tabular-nums text-peacock">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-mute">Kalas: Suriyan 30, Chandran 16, Sevvai 6, Budhan 8, Guru 10, Sukran 12, Sani 1.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-x-12 gap-y-8 xl:grid-cols-[26rem_1fr]">
            <RasiChart title="From Indu lagna" subtitle="read for money only" positions={natal.positions} lagnaSign={indu.reading.sign} lagnaLabel="Indu" retro={natal.retro} highlightSign={indu.reading.sign} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] border-collapse text-[0.95rem]">
                <thead>
                  <tr className="border-y border-line text-left text-sm text-mute">
                    <th className="py-2 pr-3 font-normal">Planet</th>
                    <th className="py-2 pr-3 font-normal">Place from it</th>
                    <th className="py-2 pr-3 font-normal">Role for money</th>
                  </tr>
                </thead>
                <tbody>
                  {[...indu.reading.planets]
                    .sort((a, b) => b.weight - a.weight)
                    .map((x) => (
                      <tr key={x.planet} className="border-b border-line">
                        <th scope="row" className="py-2 pr-3 text-left font-semibold">
                          {PLANET_INFO[x.planet].ta}
                          {x.planet === indu.reading.lord && <span className="ml-2 font-normal text-peacock">its lord</span>}
                        </th>
                        <td className="py-2 pr-3">
                          {ordinal(x.house)}, {RASI[x.sign].ta}
                          {x.planet !== "Ra" && x.planet !== "Ke" && (x.dignity === "exalted" || x.dignity === "own" || x.dignity === "debilitated") && (
                            <span className={`ml-1.5 text-sm font-semibold ${x.dignity === "debilitated" ? "text-avoid" : "text-go"}`}>{x.dignity === "own" ? "own sign" : x.dignity}</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="inline-flex items-baseline gap-2">
                            <ToneDot tone={x.weight >= 1.5 ? "good" : x.weight < 0 ? "bad" : "neutral"} />
                            {ROLE_LABEL[x.role]}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8">
            <LineList lines={indu.reading.lines} />
          </div>

          <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-2">
            <div>
              <h3 className="display text-xl">Periods that carry it</h3>
              <ul className="mt-3 border-t border-line text-[0.95rem]">
                {indu.timing.map(({ planet, act }) => {
                  const next = act.upcoming.slice(0, 2);
                  const name = (p: PlanetId) => PLANET_INFO[p].ta;
                  return (
                    <li key={planet} className="border-b border-line py-3">
                      <strong>{name(planet)}</strong>
                      <span className="text-mute">
                        {planet === indu.reading.lord ? ", lord of the Indu lagna" : indu.reading.producers.includes(planet) ? ", wealth-producing" : ", support"}
                      </span>
                      <ul className="mt-1 space-y-0.5 tabular-nums">
                        {act.runningNow.map((r) => (
                          <li key={r.level + r.period.start.getTime()}>
                            <span className="font-semibold text-go">Now:</span> {r.level} until {fmtDateLong(r.period.end, tz)}
                          </li>
                        ))}
                        {next.map((u) => (
                          <li key={u.level + u.period.start.getTime()}>
                            {name(u.period.lord)} {u.level}
                            {u.level !== "dasa" && <span className="text-mute"> in {name(u.within)}</span>}: {fmtDateLong(u.period.start, tz)} to {fmtDateLong(u.period.end, tz)}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="display text-xl">Planets crossing or looking at it</h3>
              <ul className="mt-3 border-t border-line text-[0.95rem]">
                {indu.transits.map((t) => (
                  <li key={t.planet + t.start.getTime()} className="grid grid-cols-[auto_1fr] gap-x-3 border-b border-line py-3">
                    <ToneDot tone={t.tone} />
                    <span>
                      <span className="tabular-nums">
                        {t.live ? <span className="font-semibold text-go">Now</span> : fmtDateLong(t.start, tz)} to {fmtDateLong(t.end, tz)}
                      </span>
                      <span className="block text-mute">{t.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 max-w-[72ch] text-sm text-mute">
            The method is from Kalidasa&rsquo;s Uttara Kalamrita. It is one measure of money among several on this page: your 2nd and 11th lords and the
            dhana yogas on the Yogas page are read separately, and a moderate Indu lagna does not cancel them.
          </p>
        </section>
      )}

      <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-2">
        <section>
          <H2>Dasa periods tied to money</H2>
          {longRun.periods.length ? (
            <ol className="border-t border-line">
              {longRun.periods.slice(0, 10).map((m) => {
                const live = now >= m.period.start && now < m.period.end;
                return (
                  <li key={m.period.level + "-" + m.period.start.getTime()} className={`border-b border-line py-2.5 text-[0.95rem] ${live ? "bg-panel px-3 -mx-3" : ""}`}>
                    <span className="font-semibold">
                      {PLANET_INFO[m.period.lord].ta} {m.period.level === 2 ? "bhukti" : "antaram"}
                    </span>{" "}
                    <span className="text-mute">in {PLANET_INFO[m.parent.lord].ta} {m.period.level === 2 ? "dasa" : "bhukti"}</span>
                    <span className="block tabular-nums">
                      {fmtDateLong(m.period.start, tz)} to {fmtDateLong(m.period.end, tz)}
                      {live ? " (running now)" : ""}
                    </span>
                    <span className="block text-sm text-mute">{m.reasons.join(", ")}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="border-t border-line pt-4 text-[0.95rem] text-mute">
              {known ? "No bhukti or antaram of a money lord in the next few years." : "Needs your birth time."}
            </p>
          )}
        </section>

        <section>
          <H2>Slow transits that move money</H2>
          {longRun.ingresses.length ? (
            <ol className="border-t border-line">
              {longRun.ingresses.slice(0, 10).map((i) => (
                <li key={i.planet + i.date.getTime()} className="grid grid-cols-[7rem_1fr] gap-x-3 border-b border-line py-2.5 text-[0.95rem]">
                  <span className="tabular-nums text-mute">{fmtDateLong(i.date, tz)}</span>
                  <span>{i.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="border-t border-line pt-4 text-[0.95rem] text-mute">No wealth-related sign change in the coming months.</p>
          )}
        </section>
      </div>

      <p className="mt-10 max-w-[72ch] text-sm text-mute">
        These are traditional indicators, useful for choosing when to ask, invoice or buy. They cannot tell you how much money will arrive or promise that any
        will, so don&rsquo;t use them alone for loans or investments.
      </p>
    </div>
  );
}
