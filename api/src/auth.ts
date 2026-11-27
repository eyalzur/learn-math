import { createHmac, timingSafeEqual } from "node:crypto";
import type { ChildIdentity, ParentIdentity } from "../../src/cloud/server/service.ts";

/** Parents: a Firebase ID token in production; `dev:<email>` only when DEV_AUTH=1. */
export type ParentVerifier = (bearer: string) => Promise<ParentIdentity>;

export function devParentVerifier(): ParentVerifier {
  return async (bearer) => {
    const m = /^dev:(.+@.+)$/.exec(bearer);
    if (!m) throw new Error("bad dev token");
    return { uid: `dev-${m[1].toLowerCase()}`, email: m[1].toLowerCase() };
  };
}

export async function firebaseParentVerifier(projectId?: string): Promise<ParentVerifier> {
  const { initializeApp, getApps } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  if (!getApps().length) initializeApp(projectId ? { projectId } : undefined);
  return async (bearer) => {
    const t = await getAuth().verifyIdToken(bearer);
    if (!t.email) throw new Error("token has no email");
    return { uid: t.uid, email: t.email };
  };
}

/** Child device tokens: `base64url(payload).base64url(hmac)`. Revocation is checked against the
 *  child's device list on every request, so a token alone is not enough. */
export function childTokens(secret: string) {
  const sign = (body: string) => createHmac("sha256", secret).update(body).digest("base64url");
  return {
    issue(p: ChildIdentity): string {
      const body = Buffer.from(JSON.stringify(p)).toString("base64url");
      return `${body}.${sign(body)}`;
    },
    verify(token: string): ChildIdentity | null {
      const [body, sig] = token.split(".");
      if (!body || !sig) return null;
      const want = Buffer.from(sign(body));
      const got = Buffer.from(sig);
      if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
      try {
        const p = JSON.parse(Buffer.from(body, "base64url").toString());
        return p.cid && p.did ? p : null;
      } catch {
        return null;
      }
    },
  };
}
