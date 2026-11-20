import type { Page } from "@playwright/test";

let counter = 0;

/**
 * Creates a fresh student through the real create-student dialog and selects them.
 *
 * The roster starts empty for every fresh profile now (manage-students) — no test can
 * assume a pre-seeded student exists any more, the way the old hardcoded מיקה/רותם/עומר
 * let every other spec file just click `.student-card.nth(i)`. Each call makes its own
 * uniquely-named student (a counter suffix) so a test creating more than one in the same
 * run never collides with another.
 */
export async function createAndSelectStudent(
  page: Page,
  gradeId: "1" | "2" | "6" | "8" = "1",
  name?: string,
): Promise<string> {
  const studentName = name ?? `טסט${++counter}`;
  await page.locator(".student-card-add").click();
  await page.getByLabel("שם").fill(studentName);
  if (gradeId !== "1") await page.locator(`.grade-card-${gradeId}`).click();
  await page.getByRole("button", { name: "יצירה" }).click();
  await page.locator(".student-card", { hasText: studentName }).click();
  return studentName;
}
