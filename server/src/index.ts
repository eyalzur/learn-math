import cors from "cors";
import express from "express";
import { renderMatrix, type RenderMatrixInput } from "./renderMatrix.js";

/**
 * The static client lives on GitHub Pages; this is a real cross-origin call. Kept as an
 * explicit allow-list (not "*") since there's no reason to let any other site call this.
 */
const ALLOWED_ORIGINS = new Set(["https://eyalzur.github.io", "http://localhost:5173"]);

const app = express();

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

function validateRequest(body: unknown): RenderMatrixInput | null {
  if (!body || typeof body !== "object") return null;
  const { cols, rows, cell, filledCells } = body as Record<string, unknown>;
  if (typeof cols !== "number" || !(cols > 0)) return null;
  if (typeof rows !== "number" || !(rows > 0)) return null;
  if (typeof cell !== "number" || !(cell > 0)) return null;
  if (!Array.isArray(filledCells) || !filledCells.every((key) => typeof key === "string")) return null;
  return { cols, rows, cell, filledCells };
}

// Cloud Run injects the port to listen on via $PORT — it is not a fixed value.
const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`notebook server listening on ${port}`);
});
