import { ApiError } from "./server/types";

/** What a person sees for each thing that can go wrong — short, no codes, no blame. */
export function errorText(e: unknown): string {
  const code = e instanceof ApiError ? e.code : "";
  return (
    {
      bad_code: "הקוד לא נכון",
      too_many_attempts: "יותר מדי ניסיונות. נסו שוב עוד כמה דקות",
      offline: "אין חיבור עכשיו",
      children_full: "כבר מחוברים 3 ילדים",
      parents_full: "כבר מחוברים 2 הורים",
      bad_name: "כתבו שם של עד 20 תווים",
      devices_full: "כבר מחוברים 3 מכשירים לילד/ה הזה",
    } as Record<string, string>
  )[code] ?? "משהו השתבש. נסו שוב";
}
