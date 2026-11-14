// Names and fixed tables shared by the whole engine.

export type PlanetId = "Su" | "Mo" | "Ma" | "Me" | "Ju" | "Ve" | "Sa" | "Ra" | "Ke";

export const PLANETS: PlanetId[] = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"];

export const PLANET_INFO: Record<
  PlanetId,
  { en: string; ta: string; tamil: string; benefic: boolean; karaka: string }
> = {
  Su: { en: "Sun", ta: "Suriyan", tamil: "சூரியன்", benefic: false, karaka: "authority, recognition, father, government" },
  Mo: { en: "Moon", ta: "Chandran", tamil: "சந்திரன்", benefic: true, karaka: "mind, mood, mother, the public" },
  Ma: { en: "Mars", ta: "Sevvai", tamil: "செவ்வாய்", benefic: false, karaka: "drive, courage, competition, land, engineering" },
  Me: { en: "Mercury", ta: "Budhan", tamil: "புதன்", benefic: true, karaka: "communication, analysis, paperwork, trade" },
  Ju: { en: "Jupiter", ta: "Guru", tamil: "குரு", benefic: true, karaka: "growth, wisdom, mentors, wealth, luck" },
  Ve: { en: "Venus", ta: "Sukran", tamil: "சுக்கிரன்", benefic: true, karaka: "money, comfort, relationships, design" },
  Sa: { en: "Saturn", ta: "Sani", tamil: "சனி", benefic: false, karaka: "discipline, labour, delay, long-term structure" },
  Ra: { en: "Rahu", ta: "Rahu", tamil: "ராகு", benefic: false, karaka: "ambition, foreign things, technology, sudden turns" },
  Ke: { en: "Ketu", ta: "Ketu", tamil: "கேது", benefic: false, karaka: "detachment, endings, research, intuition" },
};

export const RASI: { en: string; ta: string; tamil: string; lord: PlanetId }[] = [
  { en: "Aries", ta: "Mesham", tamil: "மேஷம்", lord: "Ma" },
  { en: "Taurus", ta: "Rishabam", tamil: "ரிஷபம்", lord: "Ve" },
  { en: "Gemini", ta: "Mithunam", tamil: "மிதுனம்", lord: "Me" },
  { en: "Cancer", ta: "Kadagam", tamil: "கடகம்", lord: "Mo" },
  { en: "Leo", ta: "Simmam", tamil: "சிம்மம்", lord: "Su" },
  { en: "Virgo", ta: "Kanni", tamil: "கன்னி", lord: "Me" },
  { en: "Libra", ta: "Thulam", tamil: "துலாம்", lord: "Ve" },
  { en: "Scorpio", ta: "Viruchigam", tamil: "விருச்சிகம்", lord: "Ma" },
  { en: "Sagittarius", ta: "Dhanusu", tamil: "தனுசு", lord: "Ju" },
  { en: "Capricorn", ta: "Makaram", tamil: "மகரம்", lord: "Sa" },
  { en: "Aquarius", ta: "Kumbam", tamil: "கும்பம்", lord: "Sa" },
  { en: "Pisces", ta: "Meenam", tamil: "மீனம்", lord: "Ju" },
];

// Nature groups used in muhurtham: what kind of work a star supports.
export type StarNature = "fixed" | "movable" | "swift" | "soft" | "fierce" | "sharp" | "mixed";

export const NAKSHATRA: { ta: string; sa: string; tamil: string; nature: StarNature }[] = [
  { ta: "Ashwini", sa: "Ashwini", tamil: "அஸ்வினி", nature: "swift" },
  { ta: "Bharani", sa: "Bharani", tamil: "பரணி", nature: "fierce" },
  { ta: "Karthigai", sa: "Krittika", tamil: "கார்த்திகை", nature: "mixed" },
  { ta: "Rohini", sa: "Rohini", tamil: "ரோகிணி", nature: "fixed" },
  { ta: "Mirugasirisham", sa: "Mrigashira", tamil: "மிருகசீரிஷம்", nature: "soft" },
  { ta: "Thiruvathirai", sa: "Ardra", tamil: "திருவாதிரை", nature: "sharp" },
  { ta: "Punarpoosam", sa: "Punarvasu", tamil: "புனர்பூசம்", nature: "movable" },
  { ta: "Poosam", sa: "Pushya", tamil: "பூசம்", nature: "swift" },
  { ta: "Ayilyam", sa: "Ashlesha", tamil: "ஆயில்யம்", nature: "sharp" },
  { ta: "Magam", sa: "Magha", tamil: "மகம்", nature: "fierce" },
  { ta: "Pooram", sa: "Purva Phalguni", tamil: "பூரம்", nature: "fierce" },
  { ta: "Uthiram", sa: "Uttara Phalguni", tamil: "உத்திரம்", nature: "fixed" },
  { ta: "Hastham", sa: "Hasta", tamil: "ஹஸ்தம்", nature: "swift" },
  { ta: "Chithirai", sa: "Chitra", tamil: "சித்திரை", nature: "soft" },
  { ta: "Swathi", sa: "Swati", tamil: "சுவாதி", nature: "movable" },
  { ta: "Visakam", sa: "Vishakha", tamil: "விசாகம்", nature: "mixed" },
  { ta: "Anusham", sa: "Anuradha", tamil: "அனுஷம்", nature: "soft" },
  { ta: "Kettai", sa: "Jyeshtha", tamil: "கேட்டை", nature: "sharp" },
  { ta: "Moolam", sa: "Mula", tamil: "மூலம்", nature: "sharp" },
  { ta: "Pooradam", sa: "Purva Ashadha", tamil: "பூராடம்", nature: "fierce" },
  { ta: "Uthiradam", sa: "Uttara Ashadha", tamil: "உத்திராடம்", nature: "fixed" },
  { ta: "Thiruvonam", sa: "Shravana", tamil: "திருவோணம்", nature: "movable" },
  { ta: "Avittam", sa: "Dhanishta", tamil: "அவிட்டம்", nature: "movable" },
  { ta: "Sathayam", sa: "Shatabhisha", tamil: "சதயம்", nature: "movable" },
  { ta: "Poorattathi", sa: "Purva Bhadrapada", tamil: "பூரட்டாதி", nature: "fierce" },
  { ta: "Uthirattathi", sa: "Uttara Bhadrapada", tamil: "உத்திரட்டாதி", nature: "fixed" },
  { ta: "Revathi", sa: "Revati", tamil: "ரேவதி", nature: "soft" },
];

export const STAR_NATURE_NOTE: Record<StarNature, string> = {
  fixed: "Fixed star: good for things meant to last, such as commitments, foundations and long projects.",
  movable: "Movable star: good for travel, changes and anything that should keep moving.",
  swift: "Swift star: good for quick starts, trade, learning and applications.",
  soft: "Soft star: good for people, creative work, learning and friendly asks.",
  fierce: "Fierce star: fine for tough, competitive or cutting work; not for gentle beginnings.",
  sharp: "Sharp star: fine for hard confrontations and breaking things off; avoid fresh starts.",
  mixed: "Mixed star: keep to routine work.",
};

// Vimshottari sequence, starting from Ashwini's lord.
export const DASHA_ORDER: PlanetId[] = ["Ke", "Ve", "Su", "Mo", "Ma", "Ra", "Ju", "Sa", "Me"];
export const DASHA_YEARS: Record<PlanetId, number> = {
  Ke: 7, Ve: 20, Su: 6, Mo: 10, Ma: 7, Ra: 18, Ju: 16, Sa: 19, Me: 17,
};

export const TITHI_NAMES = [
  "Prathamai", "Dwitiyai", "Tritiyai", "Chaturthi", "Panchami", "Shashti", "Saptami", "Ashtami",
  "Navami", "Dasami", "Ekadasi", "Dwadasi", "Trayodasi", "Chaturdasi",
];

export function tithiName(index0: number): string {
  // index0: 0..29. 14 = Pournami, 29 = Amavasai.
  if (index0 === 14) return "Pournami";
  if (index0 === 29) return "Amavasai";
  return TITHI_NAMES[index0 % 15];
}

export const YOGA_NAMES = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula",
  "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan",
  "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
];
export const BAD_YOGAS = new Set([0, 5, 8, 9, 12, 14, 16, 18, 26]);
export const VERY_BAD_YOGAS = new Set([16, 26]);

const MOVABLE_KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"];
export function karanaName(index0: number): string {
  // index0: 0..59 half-tithis from new moon.
  if (index0 === 0) return "Kimstughna";
  if (index0 === 57) return "Shakuni";
  if (index0 === 58) return "Chatushpada";
  if (index0 === 59) return "Naga";
  return MOVABLE_KARANAS[(index0 - 1) % 7];
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS_TAMIL = ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"];
export const WEEKDAY_LORD: PlanetId[] = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa"];

export const TAMIL_MONTHS = [
  "Chithirai", "Vaikasi", "Aani", "Aadi", "Aavani", "Purattasi",
  "Aippasi", "Karthigai", "Margazhi", "Thai", "Maasi", "Panguni",
];

// 60-year cycle; index 0 = Prabhava (started April 1987).
export const TAMIL_YEARS = [
  "Prabhava", "Vibhava", "Sukla", "Pramodoota", "Prachorpaththi", "Aangirasa", "Srimukha", "Bhava", "Yuva",
  "Dhaatu", "Eesvara", "Vehudhanya", "Pramathi", "Vikrama", "Vishu", "Chitrabanu", "Subhanu", "Dharana",
  "Parthiba", "Viya", "Sarvajith", "Sarvadhari", "Virodhi", "Vikruthi", "Kara", "Nandhana", "Vijaya", "Jaya",
  "Manmatha", "Dhunmuki", "Hevilambi", "Vilambi", "Vikari", "Sarvari", "Plava", "Subakrith", "Sobakrith",
  "Krodhi", "Visuvavasu", "Parabhava", "Plavanga", "Keelaka", "Saumya", "Sadharana", "Virodhikrith",
  "Paridhabi", "Pramadhicha", "Aanandha", "Rakshasa", "Nala", "Pingala", "Kalayukthi", "Siddharthi",
  "Raudhri", "Dunmathi", "Dhundubhi", "Rudhrodhgaari", "Raktakshi", "Krodhana", "Akshaya",
];

export const TARA_NAMES = [
  "Janma", "Sampat", "Vipat", "Kshema", "Pratyak", "Sadhana", "Naidhana", "Mitra", "Parama Mitra",
];
export const TARA_MEANING = [
  "birth star: sensitive, keep it low-key",
  "wealth star: gains and resources",
  "danger star: obstacles, avoid risk",
  "well-being star: safe and comfortable",
  "obstacle star: pushback and delays",
  "achievement star: efforts succeed",
  "destruction star: avoid important work",
  "friend star: support from others",
  "best-friend star: easy cooperation",
];

export const norm360 = (x: number) => ((x % 360) + 360) % 360;
export const signOf = (lon: number) => Math.floor(norm360(lon) / 30);
export const NAK_SPAN = 360 / 27;
export const nakOf = (lon: number) => Math.floor(norm360(lon) / NAK_SPAN);
export const padaOf = (lon: number) => Math.floor((norm360(lon) % NAK_SPAN) / (NAK_SPAN / 4)) + 1;
/** House number (1..12) of `sign` counted from `fromSign`. */
export const houseFrom = (fromSign: number, sign: number) => ((sign - fromSign + 12) % 12) + 1;

export function formatDeg(lon: number): string {
  const inSign = norm360(lon) % 30;
  const d = Math.floor(inSign);
  const m = Math.floor((inSign - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}′`;
}
