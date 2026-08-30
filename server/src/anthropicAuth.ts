/**
 * Keeps the identity token that the Anthropic SDK's Workload Identity Federation support
 * reads from disk (ANTHROPIC_IDENTITY_TOKEN_FILE) fresh.
 *
 * The SDK exchanges that token for an Anthropic access token itself, and refreshes the
 * access token itself too — see server/README.md, "חיבור ל-Claude — Workload Identity
 * Federation". What it can't do is mint a *new* Google identity token; that's a token
 * about this Cloud Run service's own identity, and only Google's metadata server can issue
 * one. This module's only job is keeping that file from going stale.
 */

import { writeFileSync } from "node:fs";

const TOKEN_FILE = "/tmp/anthropic-identity-token";
// Google identity tokens from the metadata server are valid for about an hour; refreshing
// well before that means a slightly-late request never races an expiring token.
const MAX_AGE_MS = 45 * 60 * 1000;

// This is a fixed local path, not a secret or an Anthropic-side identifier, so it's set
// here rather than added to the list of env vars a human has to configure on Cloud Run.
// The other four (ANTHROPIC_FEDERATION_RULE_ID and friends) stay real deploy-time config —
// see server/README.md.
process.env.ANTHROPIC_IDENTITY_TOKEN_FILE = TOKEN_FILE;

const METADATA_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity" +
  "?audience=https://api.anthropic.com&format=full";

let cached: { fetchedAt: number; promise: Promise<void> } | null = null;

async function fetchAndWrite(): Promise<void> {
  const res = await fetch(METADATA_URL, { headers: { "Metadata-Flavor": "Google" } });
  if (!res.ok) throw new Error(`metadata server responded ${res.status}`);
  const token = await res.text();
  writeFileSync(TOKEN_FILE, token, "utf8");
}

/**
 * Resolves once a reasonably-fresh identity token is on disk at TOKEN_FILE. Concurrent
 * calls around a refresh share the same in-flight fetch instead of hitting the metadata
 * server twice. Throws if the metadata server is unreachable — expected and harmless in
 * local dev (there is no metadata server outside Cloud Run); callers treat that exactly
 * like any other failure to reach the teacher.
 */
export function ensureFreshIdentityToken(): Promise<void> {
  if (cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) return cached.promise;
  const promise = fetchAndWrite();
  cached = { fetchedAt: Date.now(), promise };
  return promise;
}

export const ANTHROPIC_IDENTITY_TOKEN_FILE = TOKEN_FILE;
