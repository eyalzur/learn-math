/**
 * Hebrew math read-aloud server — the one endpoint the app's browser bundle calls so that
 * no Google Cloud credential ever has to live in that bundle or in this repo (see
 * CLAUDE.md, and docs/features/hebrew-math-tts/architecture.md).
 *
 * Deliberately tiny and independent from the main client app, same as the old
 * `server/` this repo had before (removed with docs/features/scored-answer-practice/ when
 * the notebook feature it served was removed) — see its README.md in git history for the
 * precedent this one follows for structure and deployment shape. `npm run build`/
 * `npm run lint`/`npm run test:e2e` at the repo root never touch this directory, and no CI
 * here builds or deploys it except the dedicated workflow (see README.md).
 */

import express from "express";
import cors from "cors";
import { synthesizeSpeech, TextTooLongError } from "./synthesize.js";

const app = express();
app.use(express.json({ limit: "64kb" }));

/**
 * Reflects only the app's own origins, not "*". This is not the access-control boundary —
 * a plain `curl` never sends an `Origin` header a server can be fooled by — the rate
 * limiter below is. It simply keeps some other site's browser page from quietly spending
 * this app's free quota on its own visitors.
 */
const ALLOWED_ORIGINS = new Set([
  "https://eyalzur.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header at all (curl, server-to-server) is let through: it is exactly
      // what the rate limiter exists to bound, not something CORS can see or stop.
      if (!origin || ALLOWED_ORIGINS.has(origin)) return callback(null, true);
      callback(null, false);
    },
  }),
);

/**
 * A plain in-memory fixed-window limiter — this process never has more than one instance's
 * worth of state to track, and Cloud Run's own per-instance request concurrency already
 * keeps any one instance's memory use bounded. Not meant to stop a determined attacker,
 * only to keep one runaway client (a bug, a stuck retry loop) from quietly burning through
 * the monthly free quota before anyone notices. Same spirit as the rate limiting
 * `/read-page` already used for this exact reason — see git history,
 * docs/features/notebook-teacher-understanding/architecture.md.
 */
const REQUESTS_PER_MINUTE = 60;
const requestLog = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const recent = (requestLog.get(key) ?? []).filter((t) => t > windowStart);
  recent.push(now);
  requestLog.set(key, recent);
  return recent.length > REQUESTS_PER_MINUTE;
}

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.post("/synthesize", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    res.status(400).json({ error: "missing text" });
    return;
  }

  if (rateLimited(req.ip ?? "unknown")) {
    res.status(429).json({ error: "rate limited" });
    return;
  }

  try {
    const audio = await synthesizeSpeech(text);
    res.status(200).set("Content-Type", "audio/mpeg").send(audio);
  } catch (err) {
    if (err instanceof TextTooLongError) {
      res.status(400).json({ error: "text too long" });
      return;
    }
    // Logged for operator visibility (Cloud Run captures stdout/stderr); the client only
    // ever sees the generic message and falls back to the device voice either way.
    console.error("synthesize failed:", err);
    res.status(500).json({ error: "synthesis failed" });
  }
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`hebrew-tts-server listening on ${port}`);
});
