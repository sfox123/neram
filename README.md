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
```

It deploys to Vercel as a plain Next.js app with no configuration.

## Pages

| Page | What it shows |
| --- | --- |
| Now | The verdict for this minute (Go, Good, Steady, Hold, Wait), per-activity scores, the day as a skyline, the reasons, do's and don'ts, best windows ahead |
| Day plan | Any date: every activity across the day, best windows, hour-by-hour list, full panchangam, hora and Gowri tables |
| Pancha Pakshi | Your bird, its friends and enemies, all ten yamas with their five sub-periods and ratings |
| Dasa | Running dasa, bhukti, antaram and sookshma with dates, and what each lord rules in your chart |
| Chart and transits | Birth chart, today's sky, Chandra Naadi, planets crossing natal planets, gochara, Elarai Sani, sign changes ahead |
| Money | 30-day money signals, best money hours today, your money lords and Indu lagna, dasa periods and slow transits tied to income |
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

This is a calculator for traditional rules, meant for planning. It cannot know outcomes.
