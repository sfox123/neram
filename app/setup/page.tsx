"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { H2, Loading, PageTitle } from "@/components/ui";
import { buildNatal, DEFAULT_PROFILE, Profile } from "@/lib/astro/chart";
import { NAKSHATRA, PLANET_INFO, RASI } from "@/lib/astro/constants";
import { Bird, BIRDS } from "@/lib/astro/pakshi";
import { Place } from "@/lib/astro/panchang";

const PLACES: Place[] = [
  { name: "Colombo, Sri Lanka", latitude: 6.9271, longitude: 79.8612, tz: "Asia/Colombo" },
  { name: "Jaffna, Sri Lanka", latitude: 9.6615, longitude: 80.0255, tz: "Asia/Colombo" },
  { name: "Kandy, Sri Lanka", latitude: 7.2906, longitude: 80.6337, tz: "Asia/Colombo" },
  { name: "Batticaloa, Sri Lanka", latitude: 7.7102, longitude: 81.6924, tz: "Asia/Colombo" },
  { name: "Chennai, India", latitude: 13.0827, longitude: 80.2707, tz: "Asia/Kolkata" },
  { name: "Hyderabad, India", latitude: 17.385, longitude: 78.4867, tz: "Asia/Kolkata" },
  { name: "Singapore", latitude: 1.3521, longitude: 103.8198, tz: "Asia/Singapore" },
  { name: "Dubai, UAE", latitude: 25.2048, longitude: 55.2708, tz: "Asia/Dubai" },
  { name: "London, UK", latitude: 51.5072, longitude: -0.1276, tz: "Europe/London" },
];

function PlaceFields({ legend, value, onChange, allowDevice }: { legend: string; value: Place; onChange: (p: Place) => void; allowDevice?: boolean }) {
  const [status, setStatus] = useState("");
  const preset = PLACES.find((p) => p.name === value.name && p.latitude === value.latitude);
  const useDevice = () => {
    if (!navigator.geolocation) return setStatus("This browser does not share location.");
    setStatus("Asking your browser for the location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          name: "My location",
          latitude: +pos.coords.latitude.toFixed(4),
          longitude: +pos.coords.longitude.toFixed(4),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        setStatus("Location set from this device.");
      },
      () => setStatus("Location was not shared. Pick a city or type the coordinates."),
    );
  };
  return (
    <fieldset className="border-t border-line pt-5">
      <legend className="display float-left mb-4 w-full text-xl">{legend}</legend>
      <div className="clear-both grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm text-mute">City</span>
          <select
            value={preset ? preset.name : "custom"}
            onChange={(e) => {
              const p = PLACES.find((x) => x.name === e.target.value);
              if (p) onChange(p);
              else onChange({ ...value, name: value.name === preset?.name ? "Custom place" : value.name });
            }}
          >
            {PLACES.map((p) => (
              <option key={p.name}>{p.name}</option>
            ))}
            <option value="custom">Somewhere else (type coordinates)</option>
          </select>
        </label>
        {!preset && (
          <>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm text-mute">Name shown in the app</span>
              <input type="text" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-mute">Latitude (north positive)</span>
              <input type="number" step="0.0001" value={value.latitude} onChange={(e) => onChange({ ...value, latitude: +e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-mute">Longitude (east positive)</span>
              <input type="number" step="0.0001" value={value.longitude} onChange={(e) => onChange({ ...value, longitude: +e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm text-mute">Time zone (IANA name, such as Asia/Colombo)</span>
              <input type="text" value={value.tz} onChange={(e) => onChange({ ...value, tz: e.target.value })} />
            </label>
          </>
        )}
      </div>
      {allowDevice && (
        <p className="mt-3 text-[0.95rem]">
          <button type="button" onClick={useDevice} className="rounded border border-line px-3 py-1.5 hover:bg-panel">
            Use this device&rsquo;s location
          </button>
          <span className="ml-3 text-mute" role="status">
            {status}
          </span>
        </p>
      )}
    </fieldset>
  );
}

function validTz(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export default function SetupPage() {
  const { ready } = useStore();
  if (!ready) return <Loading label="Opening your details" />;
  return <SetupForm />;
}

function SetupForm() {
  const { profile, saveProfile } = useStore();
  const [draft, setDraft] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);

  const error = !validTz(draft.birthPlace.tz) || !validTz(draft.here.tz) ? "A time zone name is not recognised. Use a name such as Asia/Colombo." : !/^\d{2}:\d{2}$/.test(draft.birthTime) ? "Enter the birth time as hours and minutes." : "";
  const preview = useMemo(() => {
    if (error) return null;
    try {
      return buildNatal(draft);
    } catch {
      return null;
    }
  }, [draft, error]);

  const set = (patch: Partial<Profile>) => {
    setDraft({ ...draft, ...patch });
    setSaved(false);
  };

  return (
    <div>
      <PageTitle title="Setup and method" tamil="அமைப்பு">
        Your birth details stay in this browser. Nothing is uploaded.
      </PageTitle>

      <div className="grid gap-x-14 gap-y-12 lg:grid-cols-[1fr_22rem]">
        <form
          className="max-w-[40rem] space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (error) return;
            saveProfile({ ...draft, timeConfirmed: true });
            setSaved(true);
          }}
        >
          <fieldset>
            <legend className="display mb-4 text-xl">Birth</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm text-mute">Name</span>
                <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-mute">Date of birth</span>
                <input type="date" value={draft.birthDate} onChange={(e) => e.target.value && set({ birthDate: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-mute">Time of birth (local clock)</span>
                <input type="time" value={draft.birthTime} onChange={(e) => set({ birthTime: e.target.value })} required />
              </label>
            </div>
            <p className="mt-2 max-w-[60ch] text-sm text-mute">
              Use the time on your birth certificate or horoscope book. The clock offset for the place and year is applied for you (Sri Lanka ran on UTC+6:00
              in 1999).
            </p>
          </fieldset>

          <PlaceFields legend="Birth place" value={draft.birthPlace} onChange={(p) => set({ birthPlace: p })} />
          <PlaceFields legend="Where you are now" value={draft.here} onChange={(p) => set({ here: p })} allowDevice />
          <p className="-mt-4 max-w-[60ch] text-sm text-mute">
            Sunrise at this place sets Rahu kalam, the horas and the Pancha Pakshi yamas. Change it when you travel.
          </p>

          <fieldset className="border-t border-line pt-5">
            <legend className="display float-left mb-4 w-full text-xl">Pancha Pakshi bird</legend>
            <label className="clear-both block max-w-xs">
              <span className="mb-1 block text-sm text-mute">Bird</span>
              <select value={draft.birdOverride ?? "auto"} onChange={(e) => set({ birdOverride: e.target.value === "auto" ? null : (Number(e.target.value) as Bird) })}>
                <option value="auto">From my star and paksha (recommended)</option>
                {BIRDS.map((b, i) => (
                  <option key={b.en} value={i}>
                    {b.ta} ({b.en})
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 max-w-[60ch] text-sm text-mute">Choose a bird by hand only if your family astrologer uses a different assignment.</p>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
            <button type="submit" disabled={!!error} className="rounded bg-deep px-5 py-2.5 font-semibold text-paper disabled:opacity-50">
              Save details
            </button>
            <button
              type="button"
              className="rounded border border-line px-4 py-2.5 hover:bg-panel"
              onClick={() => {
                setDraft(DEFAULT_PROFILE);
                setSaved(false);
              }}
            >
              Reset to defaults
            </button>
            <span role="status" className={error ? "text-avoid" : "text-go"}>
              {error || (saved ? "Saved. Every page now uses these details." : "")}
            </span>
          </div>
        </form>

        <aside className="self-start rounded-md bg-panel p-6">
          <h2 className="display text-xl">With these details</h2>
          {preview ? (
            <dl className="mt-4 space-y-3 text-[0.95rem]">
              {(
                [
                  ["Lagna", RASI[preview.lagnaSign].ta],
                  ["Rasi", RASI[preview.moonSign].ta],
                  ["Star", `${NAKSHATRA[preview.star].ta}, pada ${preview.pada}`],
                  ["Born in", preview.paksha === 0 ? "Valarpirai (waxing)" : "Theipirai (waning)"],
                  ["Bird", `${BIRDS[preview.bird].ta} (${BIRDS[preview.bird].en})`],
                  ["Dasa at birth", PLANET_INFO[preview.mahas[0].lord].ta],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line pb-2">
                  <dt className="text-mute">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-[0.95rem] text-mute">Fix the highlighted field to see the chart.</p>
          )}
          <p className="mt-4 text-sm text-mute">
            This updates as you type. If the star here does not match your horoscope book, check the birth time before saving.
          </p>
        </aside>
      </div>

      <section id="method" className="mt-16 max-w-[74ch] scroll-mt-8">
        <H2>How the app reads time</H2>
        <div className="space-y-4 border-t border-line pt-5 text-[0.98rem] leading-relaxed">
          <p>
            <strong>Calculation.</strong> Planet positions are computed astronomically in the browser and converted to the sidereal zodiac with the Lahiri
            (Chitrapaksha) ayanamsa, which is what Thirukanitha panchangams use. On the dates checked, tithi, star, yoga and karana end times matched a published drik almanac
            to within a minute. Rahu and Ketu are the mean nodes. Houses are whole signs from the lagna.
          </p>
          <p>
            <strong>Score.</strong> Every moment starts at 50 and each factor adds or subtracts. The largest weights go to Pancha Pakshi (up to ±24), Chandrashtamam
            (−18), Rahu kalam (−12), tara bala (up to ±12), hora (±8) and Gowri (±8). Rahu kalam, a dying sub-period and Chandrashtamam also cap the score so they
            can never read as a green light. 75 and above reads Go, 60 Good, 46 Steady, 34 Hold, below that Wait. The weights live in{" "}
            <code>lib/astro/score.ts</code> if you want to tune them.
          </p>
          <p>
            <strong>Pancha Pakshi.</strong> Your bird comes from the birth star and paksha. The day and the night are each split into five yamas from the
            actual sunrise and sunset; the bird&rsquo;s state in each follows the traditional weekday tables for valarpirai and theipirai, and each yama is divided
            into five sub-periods with the traditional nazhigai lengths. Strength is the main state times the sub-period state, adjusted for friend and enemy
            birds and for padu pakshi days.
          </p>
          <p>
            <strong>Moon-based checks.</strong> Tara bala counts the day&rsquo;s star from your birth star. Chandra bala counts the Moon&rsquo;s sign from your rasi;
            the 8th is Chandrashtamam. Chandra Naadi reads the transit Moon joining, opposing or being aspected by your natal planets. The tithi group, the
            nature of the day&rsquo;s star, inauspicious yogas and Vishti karana adjust the score for beginnings.
          </p>
          <p>
            <strong>Muhurtha lagna.</strong> The sign rising in the east changes about every two hours. It is counted from your birth lagna: your 1st,
            5th, 9th, 10th and 11th houses rising help; the 8th and 12th are avoided, as is the 8th from your rasi.
          </p>
          <p>
            <strong>Planets over natal planets.</strong> When a transiting planet comes within a few degrees of a birth planet, that contact is listed and
            lightly scored: benefics (Guru, Sukran, Budhan, and the Sun over a benefic) count in favour; Sani, Rahu, Ketu and Sevvai count against.
          </p>
          <p>
            <strong>Money.</strong> Daily signals: the Moon in your 2nd or 11th house or 11th from your rasi, Sampat and Sadhana tara, the Moon over your 2nd
            and 11th lords, natal Guru or Sukran, or your Indu lagna, and the Moon in the 12th or 8th for expenses. Longer range: bhukti and antaram of your
            2nd and 11th lords, and Guru and Sani changing sign.
          </p>
          <p>
            <strong>What this is.</strong> A faithful calculator for these traditions, for planning your day the way an almanac does. It has no way of knowing
            outcomes. For decisions about health, law or large sums, use it alongside real advice, not instead of it.
          </p>
        </div>
      </section>

      <section className="mt-12 max-w-[74ch]">
        <H2>Sources for the tables</H2>
        <ul className="space-y-2 border-t border-line pt-5 text-[0.95rem]">
          {[
            ["Pancha Pakshi activity order and friend/enemy birds (Suzhimunai)", "https://suzhimunai.wordpress.com/2015/02/19/%E0%AE%AA%E0%AE%9E%E0%AF%8D%E0%AE%9A-%E0%AE%AA%E0%AE%9F%E0%AF%8D%E0%AE%9A%E0%AE%BF-%E0%AE%9A%E0%AE%BE%E0%AE%B8%E0%AF%8D%E0%AE%A4%E0%AE%BF%E0%AE%B0%E0%AE%AE%E0%AF%8D-%E0%AE%85%E0%AE%9F%E0%AF%8D/"],
            ["Pancha Pakshi weekday tables, padu pakshi days, birth birds (Aastrocrown)", "https://aastrocrown.wordpress.com/2010/11/23/panjapatchi/"],
            ["Sub-period (sookshma) lengths in nazhigai (Nithra, Pancha Patchi Sasthiram)", "https://www.nithrabooks.com/pdf_store/admin/pdf/1586238234.pdf"],
            ["Pancha Pakshi reference data used for cross-checking (PyJHora)", "https://github.com/naturalstupid/PyJHora"],
            ["Gowri panchangam order, after the Pambu panchangam (Drik Panchang)", "https://www.drikpanchang.com/tamil/tamil-gowri-panchangam.html"],
            ["Chandra Naadi, Tirupur S. Gopalakrishnan", "https://www.exoticindiaart.com/book/details/chandra-naadi-baf059/"],
            ["Astronomy Engine, the ephemeris library", "https://github.com/cosinekitty/astronomy"],
          ].map(([text, href]) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noreferrer" className="text-peacock underline underline-offset-2">
                {text}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
