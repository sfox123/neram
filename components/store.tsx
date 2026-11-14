"use client";

// One shared place for your birth details, the ticking clock, and the computed chart.
// Everything is calculated in the browser; nothing is sent anywhere.

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { buildNatal, DEFAULT_PROFILE, Natal, Profile } from "@/lib/astro/chart";
import { DayFrame, dayFrame, frameContaining } from "@/lib/astro/panchang";
import { dayContext, DayContext, Segment, timeline } from "@/lib/astro/score";

const STORAGE_KEY = "neram.profile.v2";

interface Store {
  ready: boolean; // false until the browser has mounted (no clock on the server)
  now: Date;
  profile: Profile;
  natal: Natal;
  saveProfile: (p: Profile) => void;
}

const Ctx = createContext<Store | null>(null);

// The saved profile and the clock both live outside React, so they are read with
// useSyncExternalStore. On the server (and during hydration) there is no clock and no
// storage; the app shows a short loading state until the browser takes over.

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribeProfile(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
let memoryProfile: string | null = null; // fallback when storage is unavailable
function readProfile(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryProfile;
  } catch {
    return memoryProfile;
  }
}

const TICK_MS = 20000;
function subscribeClock(cb: () => void) {
  const id = window.setInterval(cb, 5000);
  return () => window.clearInterval(id);
}
const readClock = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

export function Providers({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribeProfile, readProfile, () => null);
  const tick = useSyncExternalStore(subscribeClock, readClock, () => 0);

  const profile = useMemo<Profile>(() => {
    if (!raw) return DEFAULT_PROFILE;
    try {
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_PROFILE;
    }
  }, [raw]);

  const saveProfile = useCallback((p: Profile) => {
    memoryProfile = JSON.stringify(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, memoryProfile);
    } catch {
      // Private mode: the change still applies for this visit.
    }
    emit();
  }, []);

  const natal = useMemo(() => buildNatal(profile), [profile]);
  const now = useMemo(() => new Date(tick), [tick]);

  const value = useMemo<Store>(
    () => ({ ready: tick !== 0, now, profile, natal, saveProfile }),
    [tick, now, profile, natal, saveProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <Providers>");
  return s;
}

export interface DayData {
  frame: DayFrame;
  ctx: DayContext;
  segments: Segment[];
}

/** The day (sunrise to sunrise) that contains "now". Recomputed only when the day rolls over. */
export function useToday(): DayData | null {
  const { ready, now, natal, profile } = useStore();
  const frameKey = ready ? frameContaining(now, profile.here).dateKey : null;
  return useMemo(() => (frameKey ? buildDay(natal, frameKey) : null), [frameKey, natal]);
}

/** Any calendar date at your current place. */
export function useDay(dateKey: string | null): DayData | null {
  const { natal } = useStore();
  return useMemo(() => (dateKey ? buildDay(natal, dateKey) : null), [dateKey, natal]);
}

function buildDay(natal: Natal, dateKey: string): DayData {
  const frame = dayFrame(dateKey, natal.profile.here);
  const ctx = dayContext(natal, frame);
  return { frame, ctx, segments: timeline(ctx) };
}

// ---- Small saved lists (people, breath check) -------------------------------------------------

const storedListeners = new Set<() => void>();
const storedMemory = new Map<string, string>();
function subscribeStored(cb: () => void) {
  storedListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    storedListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** A JSON value kept in this browser's local storage. Returns [value, save]. */
export function useStored<T>(key: string, fallback: T): [T, (v: T) => void] {
  const raw = useSyncExternalStore(
    subscribeStored,
    () => {
      try {
        return window.localStorage.getItem(key) ?? storedMemory.get(key) ?? null;
      } catch {
        return storedMemory.get(key) ?? null;
      }
    },
    () => null,
  );
  const value = useMemo<T>(() => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);
  const save = useCallback(
    (v: T) => {
      const text = JSON.stringify(v);
      storedMemory.set(key, text);
      try {
        window.localStorage.setItem(key, text);
      } catch {
        // Private mode: kept for this visit only.
      }
      storedListeners.forEach((l) => l());
    },
    [key],
  );
  return [value, save];
}
