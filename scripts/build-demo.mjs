#!/usr/bin/env node
/**
 * Builds the cloud-mode preview as ONE self-contained HTML file (for publishing as an artifact):
 *   node scripts/build-demo.mjs [out.html]
 * Both apps (kids + parents) run on an in-page backend — the real service code, no network.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? "demo.html";
execFileSync("npx", ["vite", "build", "-c", "vite.demo.config.ts"], {
  stdio: "inherit",
  // The preview shows the full thing, free week included; the real apps start with the paywall off.
  env: { ...process.env, VITE_CLOUD: "mock", VITE_PAYWALL: process.env.VITE_PAYWALL ?? "1" },
});
const dir = "dist-demo/assets";
const read = (ext) => readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
const html = readFileSync("dist-demo/index.html", "utf8");
const fonts = html.match(/<link[^>]+fonts\.(?:googleapis|gstatic)[^>]*>/g) ?? [];
const js = read(".js").replaceAll("</script", "<\\/script");
writeFileSync(
  out,
  `<title>דמו מנוי הורים</title>\n${fonts.join("\n")}\n<style>${read(".css")}\n</style>\n<div id="root"></div>\n<script type="module">${js}</script>\n`,
);
console.log(`wrote ${out} (${Math.round((js.length + read(".css").length) / 1024)} KB)`);
