"use client";

import { useMemo, useState } from "react";
import { PlaceFields } from "@/components/PlaceFields";
import { RasiChart } from "@/components/RasiChart";
import { useStore, useStored } from "@/components/store";
import { H2, Loading, Meter, PageTitle, ToneDot } from "@/components/ui";
import { NAKSHATRA, RASI } from "@/lib/astro/constants";
import { Finding, matchLabel, matchPeople, MatchResult, Person } from "@/lib/astro/match";
import { BIRDS } from "@/lib/astro/pakshi";
import { PLACES, validTz } from "@/lib/places";

const PEOPLE_KEY = "neram.people.v1";
const GROUPS: Finding["group"][] = ["Guru links", "Chart overlay", "Pressure points", "Stars", "Birds"];
const GROUP_NOTE: Record<Finding["group"], string> = {
  "Guru links": "Guru's sight is the clearest sign of benefit between two charts.",
  "Chart overlay": "Their planets laid on your houses, and yours on theirs.",
  "Pressure points": "Sani, Sevvai, Rahu and Ketu touching the other's lagna or Moon.",
  Stars: "Agreement between the two birth stars and Moon signs.",
  Birds: "Whether your Pancha Pakshi birds are friends.",
};

const blank = (): Person => ({ id: "", name: "", birthDate: "", birthTime: "", timeKnown: true, place: PLACES[0] });

export default function PeoplePage() {
  const { ready, natal, profile } = useStore();
  const [people, setPeople] = useStored<Person[]>(PEOPLE_KEY, []);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Person>(blank);
  const [open, setOpen] = useState(false);

  const results = useMemo<MatchResult[]>(() => {
    if (!ready) return [];
    const out: MatchResult[] = [];
    for (const p of people) {
      try {
        out.push(matchPeople(natal, p));
      } catch {
        // A saved entry with unusable details is skipped rather than breaking the page.
      }
    }
    return out;
  }, [ready, people, natal]);

  if (!ready) return <Loading />;
  const current = results.find((r) => r.person.id === selected) ?? results[0] ?? null;
  const error = !draft.name.trim()
    ? "Enter a name."
    : !/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate)
      ? "Enter the date of birth."
      : draft.timeKnown && !/^\d{2}:\d{2}$/.test(draft.birthTime)
        ? "Enter the birth time, or tick that it is not known."
        : !validTz(draft.place.tz)
          ? "The time zone name is not recognised."
          : "";
  const showForm = open || people.length === 0;

  const save = () => {
    if (error) return;
    const id = `${Date.now().toString(36)}${Math.round(Math.random() * 1e6).toString(36)}`;
    setPeople([...people, { ...draft, id, name: draft.name.trim() }]);
    setSelected(id);
    setDraft(blank());
    setOpen(false);
  };

  return (
    <div>
      <PageTitle title="People" tamil="இரு ஜாதக கூட்டு விளைவு">
        Add someone&rsquo;s birth details to see what the two horoscopes do to each other: what they bring you, what you bring them, and where the
        friction sits.
      </PageTitle>

      {people.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {results.map((r) => {
            const on = current?.person.id === r.person.id;
            return (
              <button
                key={r.person.id}
                type="button"
                aria-pressed={on}
                onClick={() => setSelected(r.person.id)}
                className={`flex items-center gap-2 rounded px-3 py-2 ${on ? "bg-deep text-paper" : "bg-panel hover:bg-line"}`}
              >
                <span className="font-semibold">{r.person.name}</span>
                <span className={`tier-${matchLabel(r.toMe).tier} rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none`}>{matchLabel(r.toMe).word}</span>
              </button>
            );
          })}
          {!open && (
            <button type="button" onClick={() => setOpen(true)} className="rounded border border-line px-3 py-2 hover:bg-panel">
              Add a person
            </button>
          )}
        </div>
      )}

      {showForm && (
        <form
          className="mb-12 max-w-[40rem] space-y-6 rounded-md bg-panel p-6"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <h2 className="display text-2xl">Add a person</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm text-mute">Name</span>
              <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-mute">Date of birth</span>
              <input type="date" value={draft.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-mute">Time of birth</span>
              <input type="time" value={draft.birthTime} disabled={!draft.timeKnown} onChange={(e) => setDraft({ ...draft, birthTime: e.target.value })} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-[0.95rem]">
            <input type="checkbox" checked={!draft.timeKnown} onChange={(e) => setDraft({ ...draft, timeKnown: !e.target.checked })} className="h-4 w-4 accent-[var(--color-peacock)]" />
            Birth time not known (only star, rasi and planet-to-planet links are used)
          </label>
          <PlaceFields legend="Birth place" value={draft.place} onChange={(p) => setDraft({ ...draft, place: p })} />
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={!!error} className="rounded bg-deep px-5 py-2.5 font-semibold text-paper disabled:opacity-50">
              Add and compare
            </button>
            {people.length > 0 && (
              <button type="button" onClick={() => setOpen(false)} className="rounded border border-line px-4 py-2.5 hover:bg-paper">
                Cancel
              </button>
            )}
            <span className="text-[0.95rem] text-mute" role="status">
              {draft.name || draft.birthDate ? error : ""}
            </span>
          </div>
        </form>
      )}

      {current && <Result r={current} myName={profile.name} myLagna={natal.lagnaSign} onRemove={() => {
        setPeople(people.filter((p) => p.id !== current.person.id));
        setSelected(null);
      }} />}

      {people.length === 0 && (
        <p className="max-w-[66ch] text-[0.95rem] text-mute">
          People you add are saved in this browser only. A known birth time gives the full reading; without it the lagna-based parts are left out.
        </p>
      )}
    </div>
  );
}

function Result({ r, myName, myLagna, onRemove }: { r: MatchResult; myName: string; myLagna: number; onRemove: () => void }) {
  const name = r.person.name;
  const me = matchLabel(r.toMe);
  const them = matchLabel(r.toThem, true);
  const o = r.other;
  return (
    <div>
      <section className="grid gap-px overflow-hidden rounded-md bg-line md:grid-cols-2">
        <div className={`tier-${me.tier} p-6 sm:p-8`}>
          <p className="opacity-85">What {name} brings you</p>
          <p className="verdict-word mt-3 text-5xl sm:text-6xl">{me.word}</p>
          <p className="mt-4 max-w-[36ch] text-[1.02rem] leading-snug">{me.line}</p>
          <p className="mt-2 text-sm opacity-85">Score {r.toMe} of 100</p>
        </div>
        <div className="bg-paper p-6 sm:p-8">
          <p className="text-mute">What you bring {name}</p>
          <p className="display mt-3 text-4xl">{them.word}</p>
          <div className="mt-4 max-w-xs">
            <Meter score={r.toThem} tier={them.tier} />
          </div>
          <p className="mt-3 max-w-[40ch] text-[0.95rem] text-mute">{them.line}</p>
        </div>
      </section>

      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,22rem)_1fr]">
        <div>
          <RasiChart
            title={name}
            subtitle={`${r.person.birthDate}${r.person.timeKnown ? `, ${r.person.birthTime}` : ""}`}
            positions={o.positions}
            lagnaSign={r.person.timeKnown ? o.lagnaSign : null}
            retro={o.retro}
            highlightSign={myLagna}
          />
          <p className="mt-3 text-[0.95rem] text-mute">
            {r.person.timeKnown ? `Lagna ${RASI[o.lagnaSign].ta}, ` : ""}rasi {RASI[o.moonSign].ta}, star {NAKSHATRA[o.star].ta}, bird {BIRDS[o.bird].ta}. The shaded
            box is your lagna, {RASI[myLagna].ta}.
          </p>
          {!r.timeKnown && (
            <p className="mt-3 rounded border border-hold/60 bg-hold/15 px-3 py-2 text-[0.9rem]">
              Without a birth time the star may be off if the Moon changed star that day, and all lagna-based links are left out.
            </p>
          )}
        </div>

        <section>
          <H2>Star agreement</H2>
          <table className="w-full border-collapse text-[0.95rem]">
            <tbody>
              {r.poruthams.map((p) => (
                <tr key={p.name} className="border-y border-line align-top">
                  <th scope="row" className="py-2 pr-3 text-left font-semibold">
                    {p.name}
                    <span className="tamil block text-sm font-normal text-mute">{p.tamil}</span>
                  </th>
                  <td className="py-2 pr-3">
                    <span className={`tier-${p.status === "good" ? "good" : p.status === "fair" ? "steady" : "avoid"} inline-block rounded-sm px-1.5 py-0.5 text-[0.8rem] font-semibold leading-none`}>
                      {p.status === "good" ? "Agrees" : p.status === "fair" ? "Middling" : "Does not agree"}
                    </span>
                  </td>
                  <td className="py-2 text-mute">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-sm text-mute">
            Mahendra and Stree Deergha are left out: they are defined only for a bride and groom. Rajju is shown but counted only for marriage.
          </p>
        </section>
      </div>

      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-2">
        {GROUPS.map((g) => {
          const list = r.findings.filter((x) => x.group === g);
          if (!list.length) return null;
          return (
            <section key={g}>
              <H2>{g}</H2>
              <p className="mb-3 text-[0.9rem] text-mute">{GROUP_NOTE[g]}</p>
              <ul className="space-y-3 border-t border-line pt-4">
                {list.map((x) => (
                  <li key={x.id} className="flex gap-3 text-[0.95rem]">
                    <ToneDot tone={x.tone} />
                    <span>
                      <strong>{x.title}.</strong> {x.detail}
                      <span className="mt-0.5 block text-[0.8rem] text-peacock">
                        {x.toMe !== 0 && `For ${myName}: ${x.toMe > 0 ? "+" : "−"}${Math.abs(x.toMe).toFixed(1)}`}
                        {x.toMe !== 0 && x.toThem !== 0 && ", "}
                        {x.toThem !== 0 && `for ${name}: ${x.toThem > 0 ? "+" : "−"}${Math.abs(x.toThem).toFixed(1)}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p className="max-w-[68ch] text-sm text-mute">
          This compares two charts by traditional rules. It describes the fit between the horoscopes, not the character of the person, and it cannot
          see what either of you chooses to do.
        </p>
        <button type="button" onClick={onRemove} className="rounded border border-line px-3 py-1.5 text-[0.95rem] hover:bg-panel">
          Remove {name}
        </button>
      </div>
    </div>
  );
}
