#!/usr/bin/env node
// Knowledge-base CLI. Usage: npm run kb -- <command>
//   index [--check]          rebuild every index.md from frontmatter (--check: fail if out of date)
//   search "text" [-k N]     ranked matches (path — title — description). 0 LLM tokens.
//   lint [--dupes]           structure, links, identity, near-duplicates, index freshness
//   stale                    concepts whose source file changed since they were written
//   hash <file>              short hash to paste into a source's `hash:`
//   log <Creation|Update|Deprecation> "text"
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBundle, writeIndexes, search, lint, stale, sha, appendLog } from "./lib.mjs";

const root = process.env.KB_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [cmd, ...args] = process.argv.slice(2);
const flag = (n) => args.includes(n);

switch (cmd) {
  case "index": {
    const changed = writeIndexes(loadBundle(root), { check: flag("--check") });
    console.log(changed.length ? `${flag("--check") ? "out of date" : "updated"}: ${changed.join(", ")}` : "indexes up to date");
    process.exit(flag("--check") && changed.length ? 1 : 0);
  }
  case "search": {
    const kIdx = args.indexOf("-k");
    const k = kIdx >= 0 ? Number(args[kIdx + 1]) : 5;
    const q = args.filter((a, i) => a !== "-k" && i !== kIdx + 1 && !a.startsWith("--")).join(" ");
    const hits = search(loadBundle(root), q, k);
    if (flag("--json")) console.log(JSON.stringify(hits, null, 1));
    else if (!hits.length) console.log("no match");
    else for (const h of hits) console.log(`${h.exact ? "EXACT " : ""}${h.score.toFixed(1)}  ${h.rel} — ${h.title} — ${h.description}`);
    break;
  }
  case "lint": {
    const { errors, warns, report } = lint(loadBundle(root), { dupes: flag("--dupes") });
    for (const w of warns) console.log(`warn  ${w}`);
    for (const r of report) console.log(`similar  ${r}`);
    for (const e of errors) console.log(`ERROR ${e}`);
    console.log(errors.length ? `${errors.length} error(s)` : "kb ok");
    process.exit(errors.length ? 1 : 0);
  }
  case "stale": {
    const out = stale(loadBundle(root));
    console.log(out.length ? out.join("\n") : "nothing stale");
    break;
  }
  case "hash":
    console.log(sha(args[0]));
    break;
  case "log":
    appendLog(root, args[0], args.slice(1).join(" "));
    console.log("logged");
    break;
  default:
    console.log("usage: npm run kb -- index|search|lint|stale|hash|log  (see header of kb/tools/kb.mjs)");
    process.exit(cmd ? 1 : 0);
}
