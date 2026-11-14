"use client";

import { useState } from "react";
import { Place } from "@/lib/astro/panchang";
import { PLACES } from "@/lib/places";

export function PlaceFields({ legend, value, onChange, allowDevice }: { legend: string; value: Place; onChange: (p: Place) => void; allowDevice?: boolean }) {
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

