import { Place } from "./astro/panchang";

// Common birth and living places. Time zones carry their own history
// (Sri Lanka's clock changed several times; India has been UTC+5:30 throughout).
export const PLACES: Place[] = [
  { name: "Colombo, Sri Lanka", latitude: 6.9271, longitude: 79.8612, tz: "Asia/Colombo" },
  { name: "Jaffna, Sri Lanka", latitude: 9.6615, longitude: 80.0255, tz: "Asia/Colombo" },
  { name: "Kandy, Sri Lanka", latitude: 7.2906, longitude: 80.6337, tz: "Asia/Colombo" },
  { name: "Batticaloa, Sri Lanka", latitude: 7.7102, longitude: 81.6924, tz: "Asia/Colombo" },
  { name: "Trincomalee, Sri Lanka", latitude: 8.5874, longitude: 81.2152, tz: "Asia/Colombo" },
  { name: "Galle, Sri Lanka", latitude: 6.0535, longitude: 80.221, tz: "Asia/Colombo" },
  { name: "Vavuniya, Sri Lanka", latitude: 8.7514, longitude: 80.4971, tz: "Asia/Colombo" },
  { name: "Nuwara Eliya, Sri Lanka", latitude: 6.9497, longitude: 80.7891, tz: "Asia/Colombo" },
  { name: "Kurunegala, Sri Lanka", latitude: 7.4863, longitude: 80.3623, tz: "Asia/Colombo" },
  { name: "Chennai, India", latitude: 13.0827, longitude: 80.2707, tz: "Asia/Kolkata" },
  { name: "Madurai, India", latitude: 9.9252, longitude: 78.1198, tz: "Asia/Kolkata" },
  { name: "Coimbatore, India", latitude: 11.0168, longitude: 76.9558, tz: "Asia/Kolkata" },
  { name: "Tiruchirappalli, India", latitude: 10.7905, longitude: 78.7047, tz: "Asia/Kolkata" },
  { name: "Bengaluru, India", latitude: 12.9716, longitude: 77.5946, tz: "Asia/Kolkata" },
  { name: "Hyderabad, India", latitude: 17.385, longitude: 78.4867, tz: "Asia/Kolkata" },
  { name: "Kochi, India", latitude: 9.9312, longitude: 76.2673, tz: "Asia/Kolkata" },
  { name: "Mumbai, India", latitude: 19.076, longitude: 72.8777, tz: "Asia/Kolkata" },
  { name: "Delhi, India", latitude: 28.6139, longitude: 77.209, tz: "Asia/Kolkata" },
  { name: "Kolkata, India", latitude: 22.5726, longitude: 88.3639, tz: "Asia/Kolkata" },
  { name: "Singapore", latitude: 1.3521, longitude: 103.8198, tz: "Asia/Singapore" },
  { name: "Kuala Lumpur, Malaysia", latitude: 3.139, longitude: 101.6869, tz: "Asia/Kuala_Lumpur" },
  { name: "Dubai, UAE", latitude: 25.2048, longitude: 55.2708, tz: "Asia/Dubai" },
  { name: "London, UK", latitude: 51.5072, longitude: -0.1276, tz: "Europe/London" },
];

export function validTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
