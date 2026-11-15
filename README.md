# Neram (நேரம்)

A personal Tamil almanac for one person. It answers one question first, "is this a good time?", and
shows the working: dasa/bhukti/antaram, Pancha Pakshi, hora, Gowri nalla neram, Rahu kalam, tara bala,
Chandrashtamam, Chandra Naadi, transits over the birth chart, and a money outlook.

Everything is calculated in the browser. There is no server, database or API key.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Your birth details (15 Dec 1999, 10:25 am, Colombo) are set in `DEFAULT_PROFILE` in `lib/astro/chart.ts`,
which gives Makaram lagna, Kumbam rasi, Sathayam star and the bird Mayil. Change them, or your current
location, on the **Setup and method** page; changes are saved in the browser's local storage.

```bash
npm run build && npm start   # production
npm run check                # prints today's panchangam and a chart summary for comparison with an almanac
npx tsx scripts/check-new.ts # prints Shadbala, the annual chart, the Sarvatobhadra board and chara dasa
```

It deploys to Vercel as a plain Next.js app with no configuration.

## Pages

| Page | What it shows |
| --- | --- |
| Now | The verdict for this minute (Go, Good, Steady, Hold, Wait), per-activity scores, the day as a skyline, the reasons, do's and don'ts, best windows ahead |
| Day plan | Any date: every activity across the day, best windows, the day's pushkara windows (rising lagna in a nourishing navamsa), hour-by-hour list, full panchangam, hora and Gowri tables |
| Pancha Pakshi | Your bird, its friends and enemies, all ten yamas with their five sub-periods and ratings |
| Dasa | Running dasa, bhukti, antaram and sookshma with dates, what each lord rules in your chart, and how strong each lord is in today's sky (gocharam) |
| This year | The annual chart: the solar return (Varshaphal) with the muntha, the five office-bearers, the likely year lord and the mudda dasa; the lunar return (Tithi Pravesha) with its weekday and hora lords; this year and the next |
| Yogi and avayogi | Yogi, Sahayogi and Avayogi planets and stars, Moon and planet passes over them, karana nathan, HD and LD planets, upasana deivam |
| Navamsa, Dasamsa | Rasi, navamsa (D9) and dasamsa (D10) charts side by side, vargottama planets, pushkara navamsa and pushkara degrees, each planet's dignity across the three, the inner-person and career readings, and how firm each amsa lagna is against your birth minute |
| Shadbala | The six-fold strength of the seven planets in rupas against each planet's pass mark, every component with its working, ishta and kashta, and the strength of the running period lords |
| Yogas | Pancha Mahapurusha, raja, dhana and other yogas found in your chart; how each is formed, what weakens or helps it, when its planets' periods switch it on, how to use it |
| Strengthen and recover | What is weighing on this hour or day and its fix, a reset routine for a bad day, and each planet's practice (strengthen, settle or honour) ranked by need |
| Chart and transits | Birth chart, today's sky, Chandra Naadi, planets crossing natal planets, gochara, Elarai Sani, Ashtakavarga, sign changes ahead |
| Sarvatobhadra | The 81-cell board for any date: where each planet sits, the lines it throws, which of your birth points are pierced or supported, ranked against your own year; choice of school and name sound |
| Money | 30-day money signals, best money hours today, your money lords, the Indu lagna read in full (working, chart from it, each planet's role, periods and transits), dasa periods and slow transits tied to income |
| Find a time | Pick an activity and a range (3 to 30 days); lists the strongest windows ranked, and day by day |
| Saram (breath) | Tell it which nostril is flowing; do's and don'ts, and how the breath sits with the time verdict |
| Career | The chart's promise for work and standing, employment against own venture, the kinds of work it points to, four years of windows leaning to rise, change or own venture, and past windows to test it against |
| Travel abroad | The chart's promise of foreign travel and what kind (work, leisure, longer stay), windows for the next three years ranked against your own life, past windows to test it against, your travel planets and their periods, and the best days to set out with the weekday's blocked direction |
| Marriage | The chart's promise of marriage, early or late, arranged or self-chosen, Sevvai dosham with cancellations, a sketch of the partner, Guru balam spans, and five years of windows ranked against your marriageable years |
| Jaimini | Chara karakas, arudha padas, chara dasa and sub-periods (K. N. Rao's method), and the career and marriage stretches from the other pages checked against the chara periods |
| People | Add someone's birth details; what the two charts do to each other (poruthams, Guru's sight, chart overlay, bird friendship) |
| Setup and method | Birth details, current location, how the score is built, sources |

## Where the logic lives

```
lib/astro/
  ephemeris.ts   sidereal positions (Lahiri), lagna, sunrise/sunset   (astronomy-engine)
  panchang.ts    tithi, star, yoga, karana with end times; Rahu kalam, hora, Gowri, Tamil date
  chart.ts       birth chart, houses, lordships, Indu lagna, default profile
  dasha.ts       Vimshottari, four levels
  pakshi.ts      Pancha Pakshi tables, yamas and sub-periods
  transits.ts    tara bala, chandra bala, gochara, Chandra Naadi, contacts, sign changes
  wealth.ts      money signals
  ashtaka.ts     Ashtakavarga points per sign
  yogi.ts        yogi and avayogi points, karana nathan, HD and LD planets
  dignity.ts     exaltation, own sign, friendships, planetary sight, combustion
  career.ts      career: promise, job or venture, fields, amatyakaraka, windows from dasa and transits
  marriage.ts    marriage: promise, pace, love or arranged, Sevvai dosham, partner sketch, windows from dasa and transits
  travel.ts      foreign travel: natal promise, travel planets, windows from dasa and transits, departure days
  indu.ts        Indu lagna: working, reading, wealth-producing planets, transits over it
  pushkara.ts    pushkara navamsa and pushkara bhaga: birth chart, and the day's lagna and Moon windows
  vargas.ts      navamsa and dasamsa signs, vargottama, amsa strength, birth-minute sensitivity, readings
  yogas.ts       yoga detection, activation by dasa periods, Guru and Sani triggers
  dashaTransit.ts  the dasa, bhukti and antaram lords judged in the current sky
  remedies.ts    per-planet practices, which planets to strengthen or settle, bad-day recovery
  varsha.ts      annual chart: solar return, muntha, office-bearers, mudda dasa; Tithi Pravesha
  sbc.ts         Sarvatobhadra chakra: the board, vedha lines, hits on your birth points, your year's yardstick
  shadbala.ts    Shadbala: sthana, dig, kala, cheshta, naisargika and drik bala, pass marks
  jaimini.ts     chara karakas, rasi drishti, arudha padas, chara dasa, cross-check of career and marriage windows
  match.ts       two-chart comparison (koottu vilaivu)
  saram.ts       Sara vithai rules
  score.ts       muhurtha lagna, and the weights that combine everything into 0-100 scores  <- tune here
```

`score.ts` is deliberately one readable file. Each factor is a small object with a title, an
explanation and a number per activity, so changing how much a tradition counts is a one-line edit.

## Accuracy

- Positions use the Lahiri (Chitrapaksha) ayanamsa, as Thirukanitha panchangams do. For 14 Nov 2026 the
  tithi, nakshatra, yoga and karana end times match a published drik panchangam to within a minute.
- Rahu and Ketu are mean nodes. Houses are whole signs.
- Pancha Pakshi main-activity tables were checked against a second independent data set (all 700
  bird/weekday/paksha/yama combinations agree). Sub-period lengths follow the Tamil nazhigai values,
  which differ between sources; they are in `SUB_MINUTES` in `pakshi.ts` if your tradition differs.
- Sunrise is the astronomical one for your coordinates, so Rahu kalam and yama times move through the year.

- Shadbala, Varshaphal, Sarvatobhadra and chara dasa each have rival ways of being worked. The choices
  made are written at the top of `shadbala.ts`, `varsha.ts`, `sbc.ts` and `jaimini.ts`. Two are worth knowing:
  the Tajika year lord is ranked without the hadda table, and the tri-rasi lords in `varsha.ts` were entered
  from memory of the Tajika Neelakanthi table and should be checked against a printed copy.

This is a calculator for traditional rules, meant for planning. It cannot know outcomes.
