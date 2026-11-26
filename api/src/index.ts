import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { MemoryStore, type Store } from "../../src/cloud/server/store.ts";
import { createApp } from "./app.ts";
import { childTokens, devParentVerifier, firebaseParentVerifier } from "./auth.ts";

const dev = process.env.DEV_AUTH === "1";
const secret = process.env.CHILD_TOKEN_SECRET ?? (dev ? "dev-secret-not-for-production" : "");
if (!secret) throw new Error("CHILD_TOKEN_SECRET is required unless DEV_AUTH=1");

let store: Store;
if (process.env.STORE === "firestore") {
  store = await (await import("./firestoreStore.ts")).firestoreStore(process.env.FIREBASE_PROJECT_ID);
} else {
  const file = process.env.DEV_DATA_FILE;
  let timer: NodeJS.Timeout | undefined;
  const mem: MemoryStore = new MemoryStore(file && existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined, () => {
    if (!file) return;
    clearTimeout(timer);
    timer = setTimeout(() => writeFileSync(file, JSON.stringify(mem.snapshot())), 200);
  });
  store = mem;
}

const tokens = childTokens(secret);
const devClock = dev ? { offsetMs: 0 } : null;
const app = createApp({
  deps: {
    store,
    now: () => Date.now() + (devClock?.offsetMs ?? 0),
    rng: Math.random,
    newId: () => randomUUID(),
    issueChildToken: tokens.issue,
  },
  verifyParent: dev ? devParentVerifier() : await firebaseParentVerifier(process.env.FIREBASE_PROJECT_ID),
  verifyChildToken: tokens.verify,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",").filter(Boolean),
  devClock,
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`api listening on ${port}${dev ? " (DEV_AUTH — not for production)" : ""}`));
