"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { H2, Loading, PageTitle } from "@/components/ui";
import { buildNatal, DEFAULT_PROFILE, Profile } from "@/lib/astro/chart";
import { NAKSHATRA, PLANET_INFO, RASI } from "@/lib/astro/constants";
import { Bird, BIRDS } from "@/lib/astro/pakshi";
import { PlaceFields } from "@/components/PlaceFields";
import { validTz } from "@/lib/places";

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
            <strong>Score.</strong> Every moment starts at 49 and each factor adds or subtracts. The largest weights go to Pancha Pakshi (up to ±24), Chandrashtamam
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
            <strong>Yogi and avayogi.</strong> The yogi point is the Sun plus the Moon plus 93°20′ at birth; its star lord is the Yogi and its sign lord
            the Sahayogi. The avayogi point lies 186°40′ further on. The Moon crossing the yoga tara adds 8 to the score and the avayoga tara takes 7;
            horas, dasa lords and transiting planets are weighted by how they stand in this scheme. The karana nathan and the highest and lowest degree
            planets (HD and LD) are shown on the Yogi page.
          </p>
          <p>
            <strong>Yogas.</strong> The Yogas page checks about thirty classical combinations with whole-sign houses: the five Pancha Mahapurusha yogas
            (a planet in its own or exalted sign in a kendra), raja yogas (kendra and trine lords joined by conjunction, mutual sight or exchange),
            dhana yogas, neecha bhanga, parivartana and the Sun and Moon yogas. A yoga counts as switched on while one of its planets holds your dasa,
            bhukti or antaram; Guru passing over or looking at the planet is listed as an extra trigger.
          </p>
          <p>
            <strong>Period lords in transit.</strong> The dasa, bhukti and antaram lords are each weighed in the day&rsquo;s sky: dignity of the sign
            they are crossing, their own Ashtakavarga points there (four or more is favourable; Rahu is read through Sani and Ketu through Sevvai), the
            house from lagna and Moon, combustion, Guru and Sani over their birth position, and your yoga and avayoga taras. The weighted result moves
            every score by up to 4 points either way.
          </p>
          <p>
            <strong>Navamsa and dasamsa.</strong> The navamsa divides each sign into nine parts of 3°20′ counted on from Mesham; the dasamsa into ten
            parts of 3°, counted from the sign itself for odd signs and from the ninth sign for even signs. A planet in the same sign in rasi and
            navamsa is vargottama. For your running bhukti and antaram lords, navamsa dignity moves every score by up to about 1 point and dasamsa
            dignity moves work and applications by the same. The amsa lagnas change every twelve to fourteen minutes of birth time, so the page shows
            how close your recorded minute is to a change and reads both sides when it is within two minutes.
          </p>
          <p>
            <strong>Indu lagna.</strong> Add the kalas of the 9th lord from the lagna and the 9th lord from the Moon (Sun 30, Moon 16, Mars 6, Mercury
            8, Jupiter 10, Venus 12, Saturn 1), cast out twelves and count the remainder from the Moon. The sign is read as a lagna for money: planets in
            it, looking at it or in its kendras and trines produce wealth; those in the 3rd, 6th, 8th and 12th thin it. A bhukti or antaram lord&rsquo;s
            place from it moves the money score by up to 2 points, and the Moon, Guru or Sukran crossing it adds to the daily money signals.
          </p>
          <p>
            <strong>Travel abroad.</strong> The promise is scored from the 12th, 9th, 3rd and 7th houses and their lords, Rahu&rsquo;s house and
            sign, the count of planets in movable signs, the lagna lord&rsquo;s tie to the 12th lord, Sani or the nodes in the 4th, and ties between
            the 10th lord and the foreign houses. Timing adds the periods of the planets tied to those houses to the transits of Rahu, Guru and Sani
            over the 9th, 12th and lagna and the 12th from the Moon. Each moment is then ranked against your own adult life: the top sixth is high (and
            needs a period and a transit together), the next quarter raised. Departure days use the Moon&rsquo;s star (movable, swift and gentle stars
            favour journeys), tara bala, Chandrashtamam, tithi and the weekday&rsquo;s blocked direction (soolai: Sunday and Friday west, Monday and
            Saturday east, Tuesday and Wednesday north, Thursday south).
          </p>
          <p>
            <strong>Marriage.</strong> The promise is scored from Sukran (the significator in a man&rsquo;s chart), the 7th lord and house, the 2nd
            house and the 7th of the navamsa. Delay marks are counted separately: Sani&rsquo;s sight on the 7th, its lord or Sukran, the nodes across
            the lagna and 7th, a 7th lord in the 6th, 8th or 12th, and Sevvai on the 7th. Timing adds the periods of the 7th lord, planets in the 7th,
            Sukran and the planets tied to them to the transits of Guru and Sani over the 7th house, its lord, Sukran and the lagna, with extra weight
            for the double transit and for Guru balam (Guru in the 2nd, 5th, 7th, 9th or 11th from the Moon). Each moment is ranked against your years
            from 21 to 45. Sevvai dosham is checked from lagna, Moon and Sukran in the 1st, 2nd, 4th, 7th, 8th and 12th, and counted as cancelled when
            Sevvai is exalted or in its own sign, or joined or seen by Guru or Budhan.
          </p>
          <p>
            <strong>Career.</strong> The promise is scored from the 10th house and its lord (with their navamsa and dasamsa dignity), the 6th and
            11th lords, the lagna lord, Suriyan and Sani, the amatyakaraka (second in degree among the seven planets) and the career yogas. Employment
            against own venture weighs the 6th lord and Sani&rsquo;s influence against Rahu in the 7th or 10th, ties between the 2nd and 11th lords and
            between the 7th and 10th lords, and an active 3rd house. Timing adds the periods of the planets tied to these houses to the transits of
            Guru and Sani over the 10th house, its lord, the 6th and the 11th, with extra weight for the double transit on the 10th and a small mark
            when a bhukti changes. Each moment is ranked against your years from 21 to 60. Career windows do not change the daily scores.
          </p>
          <p>
            <strong>Pushkara navamsa.</strong> Two navamsas in each sign are pushkara: the 7th and 9th in fire signs, the 3rd and 5th in earth signs,
            the 6th and 8th in air signs, the 1st and 3rd in water signs. Each sign also has a pushkara degree (Mesham 21, Rishabam 14, Mithunam 18,
            Kadagam 8, Simmam 19, Kanni 9, Thulam 24, Viruchigam 11, Dhanusu 23, Makaram 14, Kumbam 19, Meenam 9), counted here within one degree. In
            the birth chart a planet in pushkara gains amsa strength. In timing, the Moon in a pushkara navamsa adds 2.5 points and the rising lagna in
            one adds 2.5 (5 for starting things, 4.5 for applications), with 1.5 more when both hold; a pushkara navamsa that is the 6th, 8th or 12th
            sign from your lagna counts at half. Because these only ever add, the starting score was lowered from 50 to 49 so the share of each tier
            stays the same.
          </p>
          <p>
            <strong>Remedies.</strong> The Strengthen and recover page is advice only and never changes a score. Helpers in your chart (Yogi, Sahayogi,
            lagna lord, yogakaraka) are strengthened; the Avayogi, difficult lords and the nodes are settled by giving and worship.
          </p>
          <p>
            <strong>Ashtakavarga.</strong> Each birth planet and the lagna give points to certain signs (337 in all). The points in the sign the Moon is
            crossing add or take up to 5 from the score. The full table is on the Chart page.
          </p>
          <p>
            <strong>Sarvatobhadra chakra.</strong> Each planet throws lines across the 81-cell board from the star it is in. Malefic lines on your birth
            star, rasi, lagna, tithi, weekday and name sound are weighed (the slow planets at half, since they sit for weeks) and compared with the middle
            day of the twelve months around the date. Only the difference enters the score, up to 6 down or 5 up, so a standing load does not drag every
            day. The classical one-line school is the default; the Sarvatobhadra page can switch to all three lines.
          </p>
          <p>
            <strong>Shadbala.</strong> The six-fold strength of each birth planet is worked out in full on the Shadbala page. A bhukti or antaram lord
            above its own pass mark adds up to about 1 to every score while it runs, and one below takes as much away. It sits beside the navamsa and
            dasamsa strength; it does not replace the other weights.
          </p>
          <p>
            <strong>This year and Jaimini.</strong> The annual chart (Varshaphal and Tithi Pravesha) and the Jaimini page (chara dasa, arudha padas) are
            readings only and never change a score. Jaimini is there as a second opinion on the career and marriage stretches.
          </p>
          <p>
            <strong>Saram.</strong> The nostril your breath is flowing through is something only you can check, so it is not part of the score. The Saram
            page sets it beside the time verdict: left (Chandra kalai) for lasting, gentle, auspicious things; right (Surya kalai) for effort and contest;
            both (Suzhumunai) for stillness. The dawn expectation follows the Tamil weekday rule, with the Siva Swarodaya tithi rule shown alongside.
          </p>
          <p>
            <strong>People.</strong> Two charts are compared in three ways: eight of the ten poruthams from the birth stars (the two defined only for bride
            and groom are left out), chart overlay with Guru&rsquo;s sight weighted most, and Pancha Pakshi bird friendship. Any two charts share a few good
            links by chance, so the score treats that much as neutral.
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
            ["Yogi, Tithi, Karana and Indu Lagna, Tirupur S. Gopalakrishnan (GK)", "https://books.google.com/books/about/Yogi_Thithi_Karana_and_Indu_Lagna.html?id=H6MKEQAAQBAJ"],
            ["GK win Degree System of Astrology (HD and LD planets)", "https://notionpress.com/author/Gopalakrishnan"],
            ["Yogi and avayogi points: calculation (Tuning My Melody)", "http://tuningmymelody.blogspot.com/2019/03/the-concept-of-yogi-and-avayogi.html"],
            ["Yogi, avayogi, sahayogi: lagna rules and exceptions (Thirukanitha Panchangam)", "https://thirukanithapanchangam.com/yogi-avayogi-saha-yogi-palangal-tamil/"],
            ["Karana nathan table and karana worship (Dinakaran)", "https://www.dinakaran.com/spirtual_aanmeegam/worship-is-the-key-to-success-in-business/"],
            ["Paagai (degree) astrology: HD, LD and upasana (Lanka4)", "https://www.lanka4.com/news/1044222/what-is-bhagai-astrology"],
            ["Pancha Mahapurusha yogas: formation and conditions (VedicBirth)", "https://www.vedicbirth.com/blog/panch-mahapurusha-yoga-guide"],
            ["Pancha Mahapurusha yogas in B. V. Raman's Three Hundred Important Combinations", "https://barbarapijan.com/bpa/Yoga/300ComBVRaman/300Raman_019-023_Panchmahapurusha.htm"],
            ["Navamsa: calculation, vargottama and reading planetary strength (Hindutone)", "https://hindutone.com/astrology/navamsa-chart-d9-explained/"],
            ["Navamsa: exalted in rasi but debilitated in navamsa, and the lagna lord's place (Wikipedia)", "https://en.wikipedia.com/wiki/Navamsa_(astrology)"],
            ["Vargottama degrees and limits (Vedic Marga)", "https://vedicmarga.com/vargottama-calculator/"],
            ["Dasamsa: calculation and how to read it (Jagannatha Hora)", "https://jagannathhora.com/?p=1246"],
            ["Dasamsa: reading signatures against the rasi chart (Jagannatha Hora)", "https://jagannathhora.com/d10-chart-career-reading-examples/"],
            ["Indu lagna: the Uttara Kalamrita calculation, step by step (PanchangBodh)", "https://panchangbodh.com/indu-lagna-calculator"],
            ["Indu lagna: reading the lord, occupants and wealth-producing places (Vaya)", "https://vaya.so/blog/indu-lagna-il"],
            ["Foreign travel: houses, Rahu, movable signs and timing by dasa and transit (AstroMedha)", "https://astromedha.in/insights/vedic/foreign-travel-yoga-in-kundli"],
            ["Astrological factors causing foreign travel (Daily Mirror, Sri Lanka)", "https://dailymirror.lk/jyotisha-news/Astrological-factors-causing-foreign-travel/312-165091"],
            ["Videsh yog: the ten checks, including the 4th house and lagna-lord ties (PanchangBodh)", "https://panchangbodh.com/videsh-yog"],
            ["Travel, work, study or settlement: which house combinations (AstroSight)", "https://astrosight.ai/kundli/predicting-foreign-travel-birth-chart"],
            ["Agni Purana ch. 233: taras to avoid when setting out", "https://www.wisdomlib.org/hinduism/book/the-agni-purana/d/doc1083462.html"],
            ["Marriage timing: dasa and the double transit of Guru and Sani (Dekho Panchang)", "https://dekhopanchang.com/en/learn/marriage"],
            ["Marriage timing and delay marks (AstroMedha)", "https://astromedha.in/insights/vedic/when-will-i-get-married"],
            ["Love or arranged: the 5th and 7th lords and Rahu (AstroMedha)", "https://astromedha.in/insights/vedic/love-marriage-or-arranged-marriage"],
            ["Kuja (Sevvai) dosham and its cancellations (OnlineJyotish)", "https://www.onlinejyotish.com/articles/marriage-matching/english/kuja-dosha-nivarana.php"],
            ["Promotion timing: the period lord and Guru and Sani on the 10th (AstroMedha)", "https://astromedha.in/insights/career/astrology-for-promotion-timing"],
            ["Job change: dasa links and Sani over the 10th house or lord (Kundli Matching)", "https://kundli-matching.com/blogs/how-can-we-predict-a-job-change-in-vedic-astrology/"],
            ["Job or business: the 6th house against the 7th (AstroMedha)", "https://astromedha.in/insights/vedic/business-or-job-which-suits-me"],
            ["Amatyakaraka, the career significator (Vedic Marga)", "https://vedicmarga.com/amatyakaraka-calculator/"],
            ["Career in Vedic astrology: double transit on the 10th (Dekho Panchang)", "https://dekhopanchang.com/en/learn/career"],
            ["Pushkara navamsa and pushkara bhaga: the table by sign (AAPS)", "https://aaps.space/docs/navamsa/pushkara-navamsa/"],
            ["Notes on navamsa and pushkara navamsa, with the Jataka Parijata degrees", "https://www.slideshare.net/slideshow/cedic-astrologynavamsa-and-pushkar-navamsa/44527771"],
            ["Lagna times with pushkaramsa for muhurtha (OnlineJyotish)", "https://www.onlinejyotish.com/astrology-tools/today-lagna-times.php"],
            ["Dasa lords and Ashtakavarga points in transit (Dekho Panchang)", "https://dekhopanchang.com/en/learn/ashtakavarga-dasha"],
            ["Reading order: promise, dasa, transit, bindus (Jagannatha Hora)", "https://jagannathhora.com/?p=30277"],
            ["Chandrashtamam: what to avoid and what to do (AstroVed, Tamil)", "https://www.astroved.com/articles/chandrashtama-in-tamil"],
            ["Sara sastram: weekday rule and effects of each nostril (Maalaimalar)", "https://www.maalaimalar.com/health/others/kadhambam/tamil-news-kadhambam-sangati-singing-strings-685298"],
            ["Sara sastram: directions and switching sides (Sitharkal Sankamam)", "http://sitharkalsankamam.blogspot.com/2013/07/blog-post_12.html"],
            ["Siva Swarodaya tithi and sunrise rule (Swara Yoga)", "https://www.swarayoga.org/SwaraCycle.htm"],
            ["The ten poruthams explained (Hindutone)", "https://hindutone.com/astrology/porutham-10-poruthams-south-indian-marriage-matching/"],
            ["Varshaphal: solar return, muntha, office-bearers and mudda dasa (Dekho Panchang)", "https://dekhopanchang.com/en/learn/varshaphal"],
            ["Tithi Pravesha: the lunar return (Dekho Panchang)", "https://dekhopanchang.com/gu/learn/tithi-pravesha"],
            ["Sarvatobhadra chakra: construction of the board and the three schools of vedha (PanchangBodh)", "https://panchangbodh.com/sarvatobhadra-chakra-calculator"],
            ["Shadbala: the six strengths and their parts (Varahamihira blog)", "https://varahamihira.blogspot.com/2004/07/strength-of-planets-shadbala-i.html"],
            ["Ayana bala from declination (Saravali)", "https://saravali.github.io/astrology/bala_ayana.html"],
            ["Jaimini: karakas, rasi drishti, arudha and chara dasa (Dekho Panchang)", "https://dekhopanchang.com/en/learn/jaimini"],
            ["The Moon's ashtakavarga, used to correct the table (Indian Astrology Software)", "https://blog.indianastrologysoftware.com/?p=255"],
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
