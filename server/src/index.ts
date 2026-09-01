import cors from "cors";
import express, { type Response } from "express";
import { ensureFreshIdentityToken } from "./anthropicAuth.js";
import { readPage } from "./readPage.js";
import { renderMatrix, type RenderMatrixInput } from "./renderMatrix.js";
import type { PageReading } from "./pageReading.js";

/**
 * The static client lives on GitHub Pages; this is a real cross-origin call. Kept as an
 * explicit allow-list (not "*") since there's no reason to let any other site call this.
 */
const ALLOWED_ORIGINS = new Set(["https://eyalzur.github.io", "http://localhost:5173"]);

const app = express();

// Cloud Run sits behind a load balancer — without this, req.ip is the balancer's own
// address for every request, and the /read-page rate limiter below would count all
// traffic as one caller (or none, depending which way that fails).
app.set("trust proxy", true);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.has(origin)) callback(null, true);
      else callback(new Error("origin not allowed"));
    },
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.post("/render-page", (req, res) => {
  const validated = validateRequest(req.body);
  if (!validated) {
    res.status(400).json({ error: "invalid request body" });
    return;
  }
  try {
    const buffer = renderMatrix(validated);
    res.status(200).json({ imageDataUrl: `data:image/png;base64,${buffer.toString("base64")}` });
  } catch {
    res.status(500).json({ error: "failed to render page" });
  }
});

// A real cost lands behind this endpoint (a Claude call), unlike /render-page above (local
// PNG drawing, free). Not distributed and not durable across a restart — a best-effort
// backstop against gross abuse, sized generously above any real usage by the three actual
// students this app is for. The real backstop is the org-level spend cap (see
// server/README.md) — this just keeps a single misbehaving client from running it up alone.
const READ_PAGE_RATE_LIMIT = 30;
const READ_PAGE_RATE_WINDOW_MS = 60 * 60 * 1000;
const readPageHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (readPageHits.get(ip) ?? []).filter((t) => now - t < READ_PAGE_RATE_WINDOW_MS);
  recent.push(now);
  readPageHits.set(ip, recent);
  return recent.length > READ_PAGE_RATE_LIMIT;
}

app.post("/read-page", (req, res) => {
  if (isRateLimited(req.ip ?? "unknown")) {
    res.status(429).json({ error: "rate limit exceeded" });
    return;
  }

  const validated = validateReadPageRequest(req.body);
  if (!validated) {
    res.status(400).json({ error: "invalid request body" });
    return;
  }

  void handleReadPage(validated, res);
});

async function handleReadPage(input: RenderMatrixInput & { expectedPrompt: string }, res: Response): Promise<void> {
  try {
    const buffer = renderMatrix(input);

    // Nothing to transcribe on a blank page, and a real Claude call costs real money —
    // this case is already fully known without asking the model.
    if (input.filledCells.length === 0) {
      res.status(200).json({ reading: { certain: false } satisfies PageReading });
      return;
    }

    await ensureFreshIdentityToken();
    const reading = await readPage(buffer, input.expectedPrompt);
    res.status(200).json({ reading });
  } catch (error) {
    // Cloud Run captures stdout/stderr into Cloud Logging automatically — without this,
    // a live failure here is invisible: the client only ever sees the generic 500 below,
    // and `gcloud run services logs read` showed nothing but the request line itself
    // (discovered 2026-08-31 while diagnosing a real production failure).
    console.error("failed to read page:", error);
    res.status(500).json({ error: "failed to read page" });
  }
}

function validateRequest(body: unknown): RenderMatrixInput | null {
  if (!body || typeof body !== "object") return null;
  const { cols, rows, cell, filledCells } = body as Record<string, unknown>;
  if (typeof cols !== "number" || !(cols > 0)) return null;
  if (typeof rows !== "number" || !(rows > 0)) return null;
  if (typeof cell !== "number" || !(cell > 0)) return null;
  if (!Array.isArray(filledCells) || !filledCells.every((key) => typeof key === "string")) return null;
  return { cols, rows, cell, filledCells };
}

// The exercise the student was given — never the correct answer — grounds the teacher's
// reading (see readPage.ts). Required and non-empty: without it the model would be back to
// guessing what exercise this even is from handwriting alone, the exact unreliability this
// feature is meant to remove.
function validateReadPageRequest(body: unknown): (RenderMatrixInput & { expectedPrompt: string }) | null {
  const validated = validateRequest(body);
  if (!validated) return null;
  const { expectedPrompt } = body as Record<string, unknown>;
  if (typeof expectedPrompt !== "string" || expectedPrompt.trim() === "") return null;
  return { ...validated, expectedPrompt };
}

// Cloud Run injects the port to listen on via $PORT — it is not a fixed value.
const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`notebook server listening on ${port}`);
});
