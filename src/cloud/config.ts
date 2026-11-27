/**
 * Cloud mode is off unless the build says so — the live site keeps running the old,
 * localStorage app until the switch is deliberately made.
 *   VITE_CLOUD=1     talk to a real server at VITE_API_URL
 *   VITE_CLOUD=mock  the same server code runs inside the page (demo / preview, no network)
 */
const mode = import.meta.env.VITE_CLOUD as string | undefined;
export const cloudMode: "off" | "http" | "mock" = mode === "mock" ? "mock" : mode === "1" ? "http" : "off";
export const apiUrl: string = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8787";
/** Real parent sign-in (Google / email link) needs this; without it, the dev sign-in is used. */
export const firebaseConfig: Record<string, string> | null = (() => {
  try {
    const raw = import.meta.env.VITE_FIREBASE_CONFIG as string | undefined;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();
