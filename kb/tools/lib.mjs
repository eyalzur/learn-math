// Shared helpers for the knowledge-base tools. No LLM, no network — plain files.
// Format: Open Knowledge Format (OKF) v0.2 — https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import YAML from "yaml";

export const RESERVED = new Set(["index.md", "log.md"]);
export const MAX_LINES_WARN = 300;
export const MAX_LINES_ERROR = 400;

const FINAL = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

/** Normalises text for matching: no niqqud, final letters folded (בלון ~ בלונים), lowercase. */
export function norm(s) {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[ךםןףץ]/g, (c) => FINAL[c])
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export const tokens = (s) => norm(s).split(" ").filter(Boolean);

export function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export function parseDoc(raw) {
  const text = raw.replace(/\r\n/g, "\n");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: null, body: text, error: "no frontmatter block" };
  try {
    const fm = YAML.parse(m[1]);
    if (!fm || typeof fm !== "object") return { fm: null, body: text.slice(m[0].length), error: "frontmatter is not a mapping" };
    return { fm, body: text.slice(m[0].length) };
  } catch (e) {
    return { fm: null, body: text.slice(m[0].length), error: `YAML error: ${e.message.split("\n")[0]}` };
  }
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "tools" || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

export function loadBundle(root) {
  root = path.resolve(root);
  const docs = [], reserved = [];
  for (const file of walk(root).sort()) {
    const rel = "/" + path.relative(root, file).split(path.sep).join("/");
    const raw = fs.readFileSync(file, "utf8");
    if (RESERVED.has(path.basename(file))) { reserved.push({ rel, file, raw }); continue; }
    const { fm, body, error } = parseDoc(raw);
    docs.push({ rel, file, raw, fm, body, error, lines: raw.split("\n").length });
  }
  return { root, docs, reserved };
}

export const aliasesOf = (d) => [].concat(d.fm?.aliases ?? []).map(String);
export const titleOf = (d) => String(d.fm?.title ?? path.basename(d.rel, ".md"));
export const isHidden = (d) => path.basename(d.rel).startsWith("_");

export function sha(file) {
  return crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 8);
}

/** Resolves a markdown link / source path against the bundle. Returns null for URLs. */
export function resolveLink(bundle, fromRel, target) {
  const t = target.split("#")[0];
  if (!t || /^[a-z][a-z0-9+.-]*:/i.test(t)) return null;
  return t.startsWith("/")
    ? path.join(bundle.root, t)
    : path.resolve(path.dirname(path.join(bundle.root, fromRel)), t);
}

// ───────── search ─────────
export function search(bundle, query, k = 5) {
  const q = tokens(query);
  const qn = norm(query);
  const out = [];
  for (const d of bundle.docs) {
    if (!d.fm || isHidden(d)) continue;
    const title = norm(titleOf(d));
    const aliases = aliasesOf(d).map(norm);
    const tags = [].concat(d.fm.tags ?? []).map(norm);
    const desc = tokens(d.fm.description);
    const body = tokens(d.body);
    let score = 0;
    const exact = title === qn || aliases.includes(qn);
    if (exact) score += 100;
    for (const t of q) {
      if (title.split(" ").includes(t)) score += 5;
      if (aliases.some((a) => a.split(" ").includes(t))) score += 5;
      if (tags.includes(t)) score += 3;
      if (desc.includes(t)) score += 2;
      if (norm(d.rel).includes(t)) score += 1;
      score += Math.min(3, body.filter((b) => b === t).length) * 0.5;
    }
    if (score > 0) out.push({ score, exact, rel: d.rel, title: titleOf(d), description: d.fm.description ?? "" });
  }
  return out.sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel)).slice(0, k);
}

// ───────── index.md generation ─────────
function meta(bundle) {
  const t = bundle.docs.find((d) => d.rel === "/_types.md");
  return { title: t?.fm?.kb_title ?? "Knowledge base", dirs: t?.fm?.dirs ?? {} };
}

export function buildIndexes(bundle) {
  const { title, dirs } = meta(bundle);
  const concepts = bundle.docs.filter((d) => d.fm && !isHidden(d));
  const byDir = new Map();
  for (const d of concepts) {
    const dir = path.posix.dirname(d.rel);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(d);
  }
  // every ancestor directory of a concept gets an index
  const allDirs = new Set(["/"]);
  for (const dir of byDir.keys()) {
    let cur = dir;
    while (cur !== "/" && cur !== ".") { allDirs.add(cur); cur = path.posix.dirname(cur); }
  }
  const countUnder = (dir) => concepts.filter((d) => dir === "/" || d.rel.startsWith(dir + "/")).length;
  const files = {};
  for (const dir of [...allDirs].sort()) {
    const own = (byDir.get(dir) ?? []).sort((a, b) => titleOf(a).localeCompare(titleOf(b), "he"));
    const subs = [...allDirs].filter((x) => x !== dir && path.posix.dirname(x) === dir).sort();
    const heading = dir === "/" ? title : dir.slice(1);
    let md = dir === "/" ? '---\nokf_version: "0.2"\n---\n' : "";
    md += `# ${heading}\n\n`;
    for (const s of subs) {
      const name = path.posix.basename(s);
      const d = dirs[s.slice(1)] ? ` - ${dirs[s.slice(1)]}` : "";
      md += `* [${name}/](${s}/index.md) (${countUnder(s)})${d}\n`;
    }
    for (const d of own) md += `* [${titleOf(d)}](${d.rel})${d.fm.description ? ` - ${d.fm.description}` : ""}\n`;
    files[dir === "/" ? "/index.md" : `${dir}/index.md`] = md;
  }
  return files;
}

export function writeIndexes(bundle, { check = false } = {}) {
  const want = buildIndexes(bundle);
  const stale = [];
  for (const [rel, md] of Object.entries(want)) {
    const file = path.join(bundle.root, rel);
    const have = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    if (have !== md) {
      stale.push(rel);
      if (!check) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, md); }
    }
  }
  // indexes of directories that no longer hold concepts
  for (const r of bundle.reserved) {
    if (path.basename(r.rel) === "index.md" && !(r.rel in want)) {
      stale.push(r.rel);
      if (!check) fs.rmSync(r.file);
    }
  }
  return stale;
}

// ───────── log.md ─────────
export function appendLog(root, kind, text, date = new Date().toISOString().slice(0, 10)) {
  const file = path.join(root, "log.md");
  const entry = `* **${kind}** ${text}\n`;
  let md = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "# Log\n\n";
  const head = `## ${date}\n`;
  if (md.includes(head)) md = md.replace(head, head + "\n" + entry).replace(head + "\n" + entry + "\n", head + "\n" + entry);
  else md = md.replace(/^# Log\n\n?/, `# Log\n\n${head}\n${entry}\n`);
  fs.writeFileSync(file, md);
}

// ───────── lint ─────────
const HAS_OFFSET = /(Z|[+-]\d\d:\d\d)$/;

export function lint(bundle, { dupes = false } = {}) {
  const errors = [], warns = [], report = [];
  const err = (rel, m) => errors.push(`${rel}: ${m}`);
  const ok = bundle.docs.filter((d) => d.fm && !d.error);

  for (const d of bundle.docs) {
    if (d.error) { err(d.rel, d.error); continue; }
    if (!String(d.fm.type ?? "").trim()) err(d.rel, "missing `type`");
    if (!isHidden(d)) {
      if (!d.fm.title) err(d.rel, "missing `title`");
      if (!d.fm.description) err(d.rel, "missing `description` (one sentence — it is what a reader sees before opening)");
      else if (/\n/.test(String(d.fm.description).trim())) err(d.rel, "`description` must be one line");
      if (!d.fm.generated?.by) err(d.rel, "missing `generated.by` (e.g. human:eyal or claude/<model>)");
    }
    for (const [k, v] of [["generated.at", d.fm.generated?.at], ["stale_after", d.fm.stale_after],
      ...[].concat(d.fm.verified ?? []).map((x) => ["verified.at", x?.at])]) {
      if (v != null && !HAS_OFFSET.test(String(v))) err(d.rel, `\`${k}\` must be ISO 8601 with a UTC offset (got "${v}")`);
    }
    if (d.lines > MAX_LINES_ERROR) err(d.rel, `${d.lines} lines — split it (limit ${MAX_LINES_ERROR})`);
    else if (d.lines > MAX_LINES_WARN) warns.push(`${d.rel}: ${d.lines} lines — consider splitting (target ≤${MAX_LINES_WARN})`);
  }

  for (const d of [...bundle.docs, ...bundle.reserved.map((r) => ({ ...r, body: r.raw }))]) {
    for (const m of d.body.matchAll(/\]\(([^)\s]+?)\)/g)) {
      const target = resolveLink(bundle, d.rel, m[1]);
      if (target && m[1].split("#")[0].endsWith(".md") && !fs.existsSync(target)) err(d.rel, `broken link ${m[1]}`);
    }
  }

  // identity: one title / alias → one file
  const owner = new Map();
  for (const d of ok.filter((x) => !isHidden(x))) {
    for (const name of [titleOf(d), ...aliasesOf(d)]) {
      const key = norm(name);
      if (!key) continue;
      const prev = owner.get(key);
      if (prev && prev !== d.rel) err(d.rel, `"${name}" is already a title/alias of ${prev} — merge or rename`);
      else owner.set(key, d.rel);
    }
  }

  // near-duplicates
  const visible = ok.filter((d) => !isHidden(d));
  const sig = new Map(visible.map((d) => [d.rel, tokens([titleOf(d), ...aliasesOf(d), d.fm.description, ...[].concat(d.fm.tags ?? [])].join(" "))]));
  const bodyTok = new Map(visible.map((d) => [d.rel, tokens(d.body)]));
  for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
    const a = visible[i], b = visible[j];
    const s = jaccard(sig.get(a.rel), sig.get(b.rel));
    const long = bodyTok.get(a.rel).length > 40 && bodyTok.get(b.rel).length > 40;
    const bj = long ? jaccard(bodyTok.get(a.rel), bodyTok.get(b.rel)) : 0;
    const top = Math.max(s, bj);
    if (top >= 0.8) err(a.rel, `near-duplicate of ${b.rel} (${top.toFixed(2)}) — merge them`);
    else if (dupes && top >= 0.5) report.push(`${a.rel} ~ ${b.rel} (${top.toFixed(2)})`);
  }

  for (const rel of writeIndexes(bundle, { check: true })) err(rel, "index is out of date — run `npm run kb -- index`");
  return { errors, warns, report };
}

// ───────── stale sources ─────────
export function stale(bundle) {
  const out = [];
  for (const d of bundle.docs) {
    if (!d.fm) continue;
    for (const s of [].concat(d.fm.sources ?? [])) {
      if (!s?.hash || !s.resource) continue;
      const file = resolveLink(bundle, d.rel, String(s.resource));
      if (!file) continue;
      if (!fs.existsSync(file)) out.push(`${d.rel}: source ${s.resource} no longer exists`);
      else if (sha(file) !== String(s.hash)) out.push(`${d.rel}: source ${s.resource} changed (${s.hash} → ${sha(file)})`);
    }
    if (d.fm.stale_after && Date.now() >= Date.parse(d.fm.stale_after)) out.push(`${d.rel}: past stale_after ${d.fm.stale_after}`);
  }
  return out;
}
