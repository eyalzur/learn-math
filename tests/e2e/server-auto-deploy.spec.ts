import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { parse } from "yaml";

/**
 * Acceptance criteria under test (docs/features/server-auto-deploy/product-spec.md).
 *
 * This feature has no screen — it is a GitHub Actions workflow plus a documentation
 * section — so there is no page to drive. These read the real files off disk and assert
 * the properties the spec promises, the same way notebook-server-relay.spec.ts's
 * dependency check and content.spec.ts's rules do.
 *
 * The YAML is parsed rather than pattern-matched on purpose. The most important assertion
 * here is that the workflow has *no* `paths:` filter — and the file explains in a comment
 * why it has none, so any regex looking for "paths:" would match that comment and fail
 * for entirely the wrong reason. Parsing asks the structure, not the text.
 *
 * What these tests CANNOT cover: whether the deploy actually works. That needs the
 * one-time Google Cloud setup, which only the account owner can perform, and until then
 * the workflow has never run. See tests.md.
 */

function workflow(name: string): Record<string, unknown> {
  return parse(readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), "utf8"));
}

/** `on:` is the YAML 1.1 boolean `true`, so it does not survive as the string "on". */
function triggers(wf: Record<string, unknown>): Record<string, unknown> {
  return (wf.on ?? wf[true as unknown as keyof typeof wf]) as Record<string, unknown>;
}

const DEPLOY_SERVER = "deploy-server.yml";
const SETUP_HEADING = "פריסה אוטומטית — הגדרה חד-פעמית";

function serverReadme(): string {
  return readFileSync(new URL("../../server/README.md", import.meta.url), "utf8");
}

// ------------------------------------------------------------------- when it deploys

test("deploying is triggered by code reaching main", () => {
  const on = triggers(workflow(DEPLOY_SERVER));
  expect(on).toHaveProperty("push");
  expect((on.push as { branches: string[] }).branches).toEqual(["main"]);
});

test("every push to main produces a run — there is no paths filter to silence it", () => {
  // The design's central decision: a paths filter produces no run at all, which makes
  // "nothing needed deploying" indistinguishable from "this broke before it started".
  // Adding one back would look like a harmless optimisation and would quietly undo the
  // whole point of the feature, so it is pinned here.
  const push = triggers(workflow(DEPLOY_SERVER)).push as Record<string, unknown>;
  expect(push).not.toHaveProperty("paths");
  expect(push).not.toHaveProperty("paths-ignore");
});

test("a deploy can be started by hand, without pushing code", () => {
  expect(triggers(workflow(DEPLOY_SERVER))).toHaveProperty("workflow_dispatch");
});

// ------------------------------------------------------------- the three visible states

test("all three run outcomes exist, each reporting to the run's own summary page", () => {
  const wf = workflow(DEPLOY_SERVER);
  const steps = ((wf.jobs as any).deploy.steps as { if?: string; run?: string; name?: string }[]);

  const skipped = steps.find((s) => s.if?.includes("!= 'true'"));
  const deployed = steps.find((s) => s.name === "Deploy to Cloud Run");
  const failed = steps.find((s) => s.if === "failure()");

  for (const [label, step] of [
    ["nothing to deploy", skipped],
    ["deployed", deployed],
    ["failed", failed],
  ] as const) {
    expect(step, `no step for the "${label}" outcome`).toBeDefined();
    // Written to the summary, not only the log: the summary is what shows on the run page
    // without opening and scrolling a log, which is the difference between a non-programmer
    // seeing the outcome and merely being able to find it.
    expect(step!.run, `the "${label}" outcome is not written to the step summary`).toContain(
      "GITHUB_STEP_SUMMARY",
    );
  }

  expect(skipped!.run).toContain("no changes under server/ — nothing to deploy");
  expect(deployed!.run).toContain("deployed:");
});

test("a failed deploy says what to check, and points at the setup section", () => {
  const wf = workflow(DEPLOY_SERVER);
  const steps = (wf.jobs as any).deploy.steps as { if?: string; run?: string }[];
  const guidance = steps.find((s) => s.if === "failure()")!.run!;

  expect(guidance).toContain("deploy failed. the usual causes, in order of likelihood:");
  // The reference has to survive: it is the only route from a red run to the fix.
  expect(guidance).toContain("server/README.md");
  expect(guidance).toContain(SETUP_HEADING);
});

// --------------------------------------------------------------------------- mechanics

test("the job can mint the OIDC token its authentication depends on", () => {
  // Without id-token: write the Google auth step fails with an error that never mentions
  // permissions, sending whoever reads it somewhere else entirely.
  const permissions = workflow(DEPLOY_SERVER).permissions as Record<string, string>;
  expect(permissions["id-token"]).toBe("write");
});

test("every deploy pins the runtime service account explicitly, not implicit carry-over", () => {
  // Regression test for a real production incident (2026-08-31): gcloud run deploy without
  // --service-account does not reliably carry the previous revision's identity forward — an
  // automated deploy silently reset notebook-server to the project's default compute
  // account, breaking its Workload Identity Federation trust with Anthropic until a human
  // noticed and fixed it by hand. The deploy step succeeded (green run) the whole time, so
  // nothing short of reading the actual command would have caught it — same reasoning as
  // "no paths filter" above: the deploy "working" and the deploy doing the right thing are
  // two different claims.
  const wf = workflow(DEPLOY_SERVER);
  const env = wf.env as Record<string, string>;
  expect(env.RUNTIME_SERVICE_ACCOUNT).toBe("notebook-server-claude@learn-math-506923.iam.gserviceaccount.com");

  const steps = (wf.jobs as any).deploy.steps as { name?: string; run?: string }[];
  const deploy = steps.find((s) => s.name === "Deploy to Cloud Run")!.run!;
  expect(deploy).toMatch(/--service-account\b/);
  expect(deploy).toContain("$RUNTIME_SERVICE_ACCOUNT");
});

test("concurrent deploys queue rather than cancel each other", () => {
  // Deliberately the opposite of the Pages workflow: a Pages deploy uploads a complete
  // snapshot so cancelling loses nothing, while cancelling a Cloud Run deploy midway can
  // leave a half-finished build and an unclear idea of which revision is serving.
  const concurrency = workflow(DEPLOY_SERVER).concurrency as Record<string, unknown>;
  expect(concurrency["cancel-in-progress"]).toBe(false);
});

test("no secret of any kind lives in the workflow", () => {
  const raw = readFileSync(
    new URL(`../../.github/workflows/${DEPLOY_SERVER}`, import.meta.url),
    "utf8",
  );
  // Workload Identity Federation's whole point is that there is nothing to store, so a
  // `secrets.` reference appearing here would mean that property had been given up.
  expect(raw).not.toMatch(/secrets\./);
  expect(raw).not.toMatch(/PRIVATE KEY|private_key|"type":\s*"service_account"/i);
});

// ------------------------------------------------------- the site's own deploy is untouched

test("the site's deploy to GitHub Pages still behaves exactly as it did", () => {
  // Checked as behaviour, not as bytes: a checksum would fail on any legitimate future
  // edit to that file (it was edited legitimately as recently as PR #55) and would say
  // nothing about what actually matters — that publishing the site still works the same
  // way and has not been entangled with the server's deploy.
  const site = workflow("deploy.yml");
  const on = triggers(site);
  expect((on.push as { branches: string[] }).branches).toEqual(["main"]);
  expect(on).toHaveProperty("workflow_dispatch");

  const jobs = site.jobs as Record<string, { steps?: { uses?: string }[] }>;
  expect(Object.keys(jobs)).toEqual(["build", "deploy"]);
  const uses = [...(jobs.build.steps ?? []), ...(jobs.deploy.steps ?? [])].map((s) => s.uses ?? "");
  expect(uses.some((u) => u.startsWith("actions/upload-pages-artifact"))).toBe(true);
  expect(uses.some((u) => u.startsWith("actions/deploy-pages"))).toBe(true);

  // And it has not quietly grown server-deploying responsibilities of its own.
  const raw = readFileSync(new URL("../../.github/workflows/deploy.yml", import.meta.url), "utf8");
  expect(raw).not.toMatch(/gcloud run deploy/);
});

// ------------------------------------------------------------------ the setup instructions

test("the setup the user must perform is documented, and says so before it is needed", () => {
  const readme = serverReadme();
  expect(readme).toContain(SETUP_HEADING);
  // A first red run has to read as expected rather than broken — an explicit acceptance
  // criterion, because the workflow ships before the setup can possibly be done.
  expect(readme).toContain(
    "עד שתסיימו את הצעדים כאן, הפריסה האוטומטית לא תעבוד וריצות הפריסה ב-GitHub",
  );
});

test("the setup instructions contain real values, never placeholders to fill in", () => {
  // Today's first manual deploy failed precisely because a placeholder was filled in with
  // the project's display name instead of its id. A placeholder is an invitation to guess.
  const readme = serverReadme();
  const setupSection = readme.slice(readme.indexOf(SETUP_HEADING));
  const nextSection = setupSection.indexOf("\n## ", 1);
  const setup = nextSection === -1 ? setupSection : setupSection.slice(0, nextSection);

  expect(setup).toContain("learn-math-506923");
  expect(setup).not.toMatch(/<[A-Z_]{3,}>/);
});

test("the manual deploy route is still documented alongside the automatic one", () => {
  // An explicit acceptance criterion: automation adds a path, it does not remove one.
  const readme = serverReadme();
  expect(readme).toContain("פריסה מחדש ל-Google Cloud Run");
  expect(readme).toContain("gcloud run deploy notebook-server");
});

test("the manual deploy example also pins the runtime service account", () => {
  // Same regression this file's workflow test guards against (2026-08-31 incident), but for
  // the copy-pasteable command a human runs by hand — the exact command that reset the
  // service account in the first place was copied from this file without the flag.
  const readme = serverReadme();
  const exampleStart = readme.indexOf("gcloud run deploy notebook-server");
  const exampleEnd = readme.indexOf("```", exampleStart);
  const example = readme.slice(exampleStart, exampleEnd);
  expect(example).toContain("--service-account notebook-server-claude@learn-math-506923.iam.gserviceaccount.com");
});
