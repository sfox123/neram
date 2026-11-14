"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Graha } from "./Graha";
import { useStore } from "./store";

const NAV = [
  { href: "/", label: "Now", tamil: "இப்போது" },
  { href: "/day", label: "Day plan", tamil: "நாள்" },
  { href: "/find", label: "Find a time", tamil: "முகூர்த்தம்" },
  { href: "/saram", label: "Saram (breath)", tamil: "சரம்" },
  { href: "/pakshi", label: "Pancha Pakshi", tamil: "பட்சி" },
  { href: "/dasa", label: "Dasa", tamil: "தசை" },
  { href: "/yogi", label: "Yogi and avayogi", tamil: "யோகி" },
  { href: "/vargas", label: "Navamsa, Dasamsa", tamil: "அம்சம்" },
  { href: "/yogas", label: "Yogas", tamil: "யோகங்கள்" },
  { href: "/remedies", label: "Remedies", tamil: "பரிகாரம்" },
  { href: "/sky", label: "Chart and transits", tamil: "கோசாரம்" },
  { href: "/money", label: "Money", tamil: "தனம்" },
  { href: "/people", label: "People", tamil: "கூட்டு" },
  { href: "/setup", label: "Setup and method", tamil: "அமைப்பு" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { profile, ready } = useStore();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1320px] flex-col lg:flex-row">
      <header className="shrink-0 border-line lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:border-r lg:py-8 lg:pl-8 lg:pr-6">
        <div className="flex items-baseline justify-between px-5 pt-5 lg:block lg:px-0 lg:pt-0">
          <Link href="/" className="block">
            <span className="flex items-center gap-2">
              <Graha id="Su" size={26} title="Neram" />
              <span className="tamil block text-3xl leading-none text-peacock">நேரம்</span>
            </span>
            <span className="mt-1 hidden text-sm text-mute lg:block">Neram, {profile.name}&rsquo;s almanac</span>
          </Link>
          <span className="text-sm text-mute lg:hidden">{profile.name}&rsquo;s almanac</span>
        </div>
        <nav aria-label="Sections" className="mt-4 lg:mt-10">
          <ul className="flex gap-1 overflow-x-auto px-3 pb-2 lg:block lg:space-y-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
            {NAV.map((n) => (
              <li key={n.href} className="shrink-0">
                <Link
                  href={n.href}
                  aria-current={active(n.href) ? "page" : undefined}
                  className={`flex items-baseline justify-between gap-3 rounded px-2.5 py-1.5 text-[0.95rem] lg:-mx-2.5 ${
                    active(n.href) ? "bg-deep text-paper" : "text-ink hover:bg-panel"
                  }`}
                >
                  <span className="whitespace-nowrap">{n.label}</span>
                  <span className={`tamil hidden text-sm lg:inline ${active(n.href) ? "text-paper/70" : "text-mute"}`}>{n.tamil}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="min-w-0 flex-1 px-5 pb-20 pt-4 lg:px-10 lg:pt-8">
        {ready && !profile.timeConfirmed && path !== "/setup" && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded border border-hold/60 bg-hold/15 px-4 py-3 text-[0.95rem]">
            <p className="max-w-[62ch]">
              Your birth time is not set, so the app is assuming {profile.birthTime}. Lagna, dasa and the house-based
              money checks depend on it. Until it is set, only Moon-based rules are scored.
            </p>
            <Link href="/setup" className="rounded bg-ink px-3 py-1.5 text-paper">
              Set birth time
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
