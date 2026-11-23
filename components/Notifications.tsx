"use client";

// The bell: what is coming in the next days, and the longer windows, in one drawer.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Graha } from "./Graha";
import { useDay, useStore, useStored, useToday } from "./store";
import { ToneDot } from "./ui";
import { coreEvents, HORIZON_MS, lifeEvents, moneyEvents, NeramEvent } from "@/lib/astro/events";
import { MONEY_DIARY_KEY, MoneyEntry } from "@/lib/astro/wealth";
import { addDaysKey, dateKey, fmtDate, fmtTime, MS_DAY, MS_HOUR } from "@/lib/astro/time";

const SEEN_KEY = "neram.notify.seen.v1";

function KindIcon({ e }: { e: NeramEvent }) {
  if (e.planet) return <Graha id={e.planet} size={22} animate={false} />;
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (e.kind === "temple")
    return (
      <svg {...common} className="text-peacock">
        <path d="M12 3l1.5 3h-3L12 3zM8 8h8l1 4H7l1-4zM5 12h14v2H5zM6 14v6h12v-6" />
        <path d="M10 20v-3h4v3" />
      </svg>
    );
  if (e.kind === "money")
    return (
      <svg {...common} className="text-go">
        <circle cx="12" cy="12" r="9" />
        <path d="M15 8.5h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9M12 6.5v2M12 16.5v2" />
      </svg>
    );
  if (e.kind === "window")
    return (
      <svg {...common} className="text-go">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  return (
    <svg {...common} className="text-peacock">
      <path d="M5 19L19 5M9 5h10v10" />
    </svg>
  );
}

export function Notifications() {
  const { ready, now, natal, profile } = useStore();
  const today = useToday();
  const tomorrow = useDay(today ? addDaysKey(today.frame.dateKey, 1) : null);
  // A #notify link opens the drawer straight away (the component renders nothing until the clock is ready, so hydration is unaffected).
  const fromHash = () => typeof window !== "undefined" && window.location.hash === "#notify";
  const [open, setOpen] = useState(fromHash);
  const [opened, setOpened] = useState(fromHash);
  const [seen, setSeen] = useStored<string[]>(SEEN_KEY, []);
  const tz = profile.here.tz;

  // Day-to-day events are cheap; refresh them hourly. Life windows only once the drawer is opened.
  const hourStamp = Math.floor(now.getTime() / MS_HOUR);
  const dayStamp = Math.floor(now.getTime() / MS_DAY);
  const core = useMemo(
    () => (ready && today ? coreEvents({ natal, now: new Date(hourStamp * MS_HOUR), tz, frame: today.frame, place: profile.here, today: today.segments, tomorrow: tomorrow?.segments ?? null }) : []),
    [ready, natal, today, tomorrow, hourStamp, tz, profile.here],
  );
  const life = useMemo(() => (opened ? lifeEvents(natal, new Date(dayStamp * MS_DAY), tz) : []), [opened, natal, dayStamp, tz]);
  const [diary] = useStored<MoneyEntry[]>(MONEY_DIARY_KEY, []);
  const money = useMemo(() => (ready ? moneyEvents(natal, diary, new Date(hourStamp * MS_HOUR), profile.here) : []), [ready, natal, diary, hourStamp, profile.here]);

  // Drop windows that have already closed, and running events whose end has passed.
  const events = useMemo(() => [...core, ...money, ...life].filter((e) => !e.until || e.until > now).sort((a, b) => a.at.getTime() - b.at.getTime()), [core, money, life, now]);
  const soon = events.filter((e) => e.at.getTime() - now.getTime() <= HORIZON_MS);
  const unseen = soon.filter((e) => !seen.includes(e.id));
  const good = soon.filter((e) => e.tone === "good").length;

  const openDrawer = () => {
    setOpen(true);
    setOpened(true);
    const ids = Array.from(new Set([...seen, ...soon.map((e) => e.id)])).slice(-300);
    if (ids.length !== seen.length) setSeen(ids);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!ready) return null;

  const todayKey = dateKey(now, tz);
  const tomorrowKey = addDaysKey(todayKey, 1);
  const groupOf = (e: NeramEvent) => {
    if (e.at <= now) return "Now";
    const k = dateKey(e.at, tz);
    if (k === todayKey) return "Today";
    if (k === tomorrowKey) return "Tomorrow";
    if (e.at.getTime() - now.getTime() <= HORIZON_MS) return fmtDate(e.at, tz, { weekday: "long" });
    return "Later";
  };
  const groups: { label: string; items: NeramEvent[] }[] = [];
  for (const e of events) {
    const label = groupOf(e);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(e);
    else groups.push({ label, items: [e] });
  }
  const GROUP_TAMIL: Record<string, string> = { Now: "இப்போது", Today: "இன்று", Tomorrow: "நாளை", Later: "பின்னர்" };

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        aria-label={unseen.length ? `${unseen.length} new things coming up` : "What is coming up"}
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-panel"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={unseen.length ? "bell-ring" : ""}>
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unseen.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-avoid px-1 text-[0.7rem] font-semibold leading-none text-paper">
            {unseen.length}
          </span>
        )}
      </button>

      {open &&
        createPortal(
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Coming up">
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/35 backdrop-blur-[1px]" />
          <aside className="drawer-in absolute right-0 top-0 flex h-dvh w-[min(27rem,100vw)] flex-col bg-paper shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="display text-xl">
                  Coming up <span className="tamil ml-2 text-lg font-medium text-peacock">வரப்போகிறது</span>
                </p>
                <p className="mt-0.5 text-sm text-mute">
                  {soon.length === 0 ? "Nothing notable in the next two days." : `${soon.length} in the next two days${good ? `, ${good} good` : ""}.`}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded px-2 py-1 text-sm text-mute hover:bg-panel" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
              {groups.map((g) => (
                <section key={g.label} className="mt-5">
                  <h3 className="mb-2 text-[0.8rem] font-semibold uppercase tracking-wide text-mute">
                    {g.label}
                    {GROUP_TAMIL[g.label] && <span className="tamil ml-2 font-medium normal-case tracking-normal text-peacock">{GROUP_TAMIL[g.label]}</span>}
                  </h3>
                  <ul className="divide-y divide-line border-y border-line">
                    {g.items.map((e) => (
                      <li key={e.id} className="py-3">
                        <Link href={e.href} onClick={() => setOpen(false)} className="grid grid-cols-[1.6rem_1fr_auto] items-start gap-x-3 rounded hover:bg-panel/60">
                          <span className="mt-0.5 flex justify-center">
                            <KindIcon e={e} />
                          </span>
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-baseline gap-x-2">
                              <span className="font-semibold leading-snug">
                                <ToneDot tone={e.tone} /> {e.title}
                              </span>
                              <span className="tamil text-sm text-peacock">{e.tamil}</span>
                            </span>
                            <span className="mt-0.5 block text-[0.9rem] leading-snug text-mute">{e.detail}</span>
                          </span>
                          <span className="whitespace-nowrap pt-0.5 text-right text-[0.8rem] tabular-nums text-mute">
                            {e.at <= now ? (e.until ? `till ${e.until.getTime() - now.getTime() > MS_DAY ? fmtDate(e.until, tz) : fmtTime(e.until, tz)}` : "now") : groupOf(e) === "Later" ? fmtDate(e.at, tz) : fmtTime(e.at, tz)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {!opened && <p className="mt-6 text-sm text-mute">Reading the longer windows…</p>}
              {groups.length === 0 && <p className="mt-6 text-[0.95rem] text-mute">A quiet stretch. Nothing is changing in the sky or your dasa for the next two days.</p>}
              <p className="mt-8 text-[0.8rem] text-mute">
                Planets changing sign, vakram and vakra nivarthi a week ahead, your dasa, bhukti and antaram changes, the Moon&rsquo;s sign and star for you, the Vanisai karanam, your Wednesday temple day, the best windows today and tomorrow, and career, travel and marriage windows within two months.
              </p>
            </div>
          </aside>
        </div>,
        document.body,
        )}
    </>
  );
}
