import { firebaseConfig } from "./config";

/**
 * How a parent proves who they are. With a Firebase config: Google, or an emailed link — the
 * server verifies the ID token. Without one (dev server, demo): an email typed in, sent as
 * `dev:<email>`, which only a server started with DEV_AUTH=1 accepts.
 * The Firebase path is written to the SDK's documented API but has not been run against a real
 * Firebase project yet.
 */
export const realAuth = firebaseConfig !== null;

async function auth() {
  const { initializeApp, getApps } = await import("firebase/app");
  const mod = await import("firebase/auth");
  const app = getApps()[0] ?? initializeApp(firebaseConfig!);
  return { mod, auth: mod.getAuth(app) };
}

export async function signInWithGoogle(): Promise<void> {
  const { mod, auth: a } = await auth();
  await mod.signInWithPopup(a, new mod.GoogleAuthProvider());
}

const EMAIL_KEY = "learn-math:emailForSignIn";

export async function sendSignInLink(email: string): Promise<void> {
  const { mod, auth: a } = await auth();
  await mod.sendSignInLinkToEmail(a, email, { url: window.location.origin + window.location.pathname, handleCodeInApp: true });
  try {
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* the link can still be completed by typing the email again */
  }
}

/** Call on load: finishes a sign-in that arrived via the emailed link. Returns whether it did. */
export async function completeEmailLinkSignIn(): Promise<boolean> {
  if (!realAuth) return false;
  const { mod, auth: a } = await auth();
  if (!mod.isSignInWithEmailLink(a, window.location.href)) return false;
  const email = localStorage.getItem(EMAIL_KEY) ?? window.prompt("הקלידו את כתובת המייל שאליה נשלח הקישור") ?? "";
  if (!email) return false;
  await mod.signInWithEmailLink(a, email, window.location.href);
  try {
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* ignore */
  }
  window.history.replaceState(null, "", window.location.pathname);
  return true;
}

/** A fresh ID token (they expire hourly), or undefined when nobody is signed in. */
export async function currentIdToken(): Promise<string | undefined> {
  if (!realAuth) return undefined;
  const { auth: a } = await auth();
  await a.authStateReady();
  return a.currentUser ? await a.currentUser.getIdToken() : undefined;
}

export async function signOutParent(): Promise<void> {
  if (!realAuth) return;
  const { mod, auth: a } = await auth();
  await mod.signOut(a);
}
