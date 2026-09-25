/**
 * Saves a case where a student corrected the teacher's reading of a page — the raw
 * material for a future "test bank" to evaluate prompt/effort changes against real
 * failures instead of guesses (see docs/features/teacher-misread-log/). Every call here
 * happens *after* the response to the student has already gone out (see index.ts) — this
 * module never delays or affects what the client sees, and never throws past its own
 * boundary; a caller only needs to `.catch()` the returned promise and log it.
 *
 * Auth is plain IAM, not the Workload Identity Federation anthropicAuth.ts uses — Firestore
 * is a regular Google Cloud service in the *same* project this Cloud Run service already
 * runs in, so `new Firestore()` (Application Default Credentials) resolves straight to this
 * service's own attached service account. It just needs the `roles/datastore.user` grant
 * documented in architecture.md — a one-time step for the user, not code here.
 */

import { Firestore, FieldValue } from "@google-cloud/firestore";
import type { PageReading } from "./pageReading.js";

const firestore = new Firestore();

const COLLECTION = "misread-cases";

// A notebook page (1200x1600, see src/data/notebook.ts on the client) is mostly blank with
// sparse ink — PNG compresses that to tens of KB even at its busiest, comfortably inside
// Firestore's 1MiB document limit once base64-encoded. This is a hard ceiling regardless,
// so a freak case can't silently blow past that limit — see architecture.md, Edge Cases.
const MAX_IMAGE_BASE64_LENGTH = 700_000;

export interface QuestionMeta {
  questionId?: string;
  topic?: string;
  lessonTitle?: string;
}

export interface MisreadCaseInput {
  pngBuffer: Buffer;
  expectedPrompt: string;
  previousReading: PageReading;
  studentCorrection: string;
  correctedReading: PageReading;
  questionMeta?: QuestionMeta;
}

export async function saveMisreadCase(input: MisreadCaseInput): Promise<void> {
  const pageImagePngBase64 = input.pngBuffer.toString("base64");
  if (pageImagePngBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    console.warn("misread case image too large, skipping save", { length: pageImagePngBase64.length });
    return;
  }

  await firestore.collection(COLLECTION).add({
    createdAt: FieldValue.serverTimestamp(),
    expectedPrompt: input.expectedPrompt,
    questionId: input.questionMeta?.questionId ?? null,
    topic: input.questionMeta?.topic ?? null,
    lessonTitle: input.questionMeta?.lessonTitle ?? null,
    studentCorrection: input.studentCorrection,
    previousReading: input.previousReading,
    correctedReading: input.correctedReading,
    pageImagePngBase64,
  });
}
