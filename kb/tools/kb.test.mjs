import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadBundle, norm, search, lint, writeIndexes, stale, sha, appendLog } from "./lib.mjs";

function bundle(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kb-"));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
}
const doc = (o = {}, body = "גוף") => `---
type: Trap
title: ${o.title ?? "כותרת"}
description: ${o.description ?? "תיאור קצר."}
generated: {by: "human:t", at: "2026-11-26T10:00:00Z"}
${o.extra ?? ""}---
${body}
`;

test("norm folds final letters and niqqud", () => {
  assert.equal(norm("בלון"), "בלונ");
  assert.equal(norm("בלונים"), "בלונימ");
  assert.notEqual(norm("זהה"), "");
  assert.equal(norm("שָׁלוֹם"), norm("שלום"));
});

test("search finds by alias, prefers exact", () => {
  const root = bundle({ "traps/a.md": doc({ title: "כיווניות", extra: "aliases: [rtl, bidi]\n" }), "traps/b.md": doc({ title: "אחר", description: "על משהו אחר." }) });
  const hits = search(loadBundle(root), "RTL");
  assert.equal(hits[0].rel, "/traps/a.md");
  assert.equal(search(loadBundle(root), "כיווניות")[0].exact, true);
});

test("lint: clean bundle passes once indexes are written", () => {
  const root = bundle({ "traps/a.md": doc({ title: "א" }) });
  assert.ok(lint(loadBundle(root)).errors.some((e) => e.includes("index is out of date")));
  writeIndexes(loadBundle(root));
  assert.deepEqual(lint(loadBundle(root)).errors, []);
});

test("lint: duplicate title/alias, near-duplicate, bad timestamp, broken link, missing type", () => {
  const root = bundle({
    "traps/a.md": doc({ title: "זהה" }),
    "traps/b.md": doc({ title: "זהה", description: "משהו שונה לגמרי." }),
    "traps/c.md": doc({ title: "ג", extra: "aliases: [זהה]\n" }),
    "traps/d.md": doc({ title: "ד" }, "[x](./nope.md)"),
    "traps/e.md": "---\ntitle: ה\n---\nx\n",
    "traps/f.md": doc({ title: "ו" }).replace("2026-11-26T10:00:00Z", "2026-11-26"),
  });
  writeIndexes(loadBundle(root));
  const e = lint(loadBundle(root)).errors.join("\n");
  assert.match(e, /already a title\/alias/);
  assert.match(e, /broken link/);
  assert.match(e, /missing `type`/);
  assert.match(e, /UTC offset/);
});

test("lint: near-duplicate bodies are rejected", () => {
  const long = Array.from({ length: 60 }, (_, i) => `מילה${i}`).join(" ");
  const root = bundle({ "traps/a.md": doc({ title: "אחד", description: "ראשון." }, long), "traps/b.md": doc({ title: "שניים", description: "שני." }, long) });
  writeIndexes(loadBundle(root));
  assert.match(lint(loadBundle(root)).errors.join("\n"), /near-duplicate/);
});

test("stale: detects a changed source", () => {
  const root = bundle({ "src.txt": "v1", "traps/a.md": "" });
  const h = sha(path.join(root, "src.txt"));
  fs.writeFileSync(path.join(root, "traps/a.md"), doc({ extra: `sources:\n  - {resource: ../src.txt, hash: ${h}}\n` }));
  assert.deepEqual(stale(loadBundle(root)), []);
  fs.writeFileSync(path.join(root, "src.txt"), "v2");
  assert.match(stale(loadBundle(root))[0], /changed/);
});

test("log groups by date, newest first", () => {
  const root = bundle({});
  appendLog(root, "Creation", "a", "2026-11-25");
  appendLog(root, "Update", "b", "2026-11-26");
  appendLog(root, "Update", "c", "2026-11-26");
  const md = fs.readFileSync(path.join(root, "log.md"), "utf8");
  assert.ok(md.indexOf("2026-11-26") < md.indexOf("2026-11-25"));
  assert.equal(md.match(/## 2026-11-26/g).length, 1);
});

test("search matches Hebrew prefixes and plurals", () => {
  const root = bundle({ "traps/a.md": doc({ title: "בדיקות מקביליות", description: "ריצה." }) });
  assert.equal(search(loadBundle(root), "הבדיקה")[0]?.rel, "/traps/a.md");
});

test("lint: unquoted numeric-looking hash is rejected (YAML reads 1217e735 as a number)", () => {
  const root = bundle({ "src.txt": "x", "traps/a.md": doc({ extra: "sources:\n  - {resource: ../src.txt, hash: 1217e735}\n" }) });
  writeIndexes(loadBundle(root));
  assert.match(lint(loadBundle(root)).errors.join("\n"), /quoted string/);
});
