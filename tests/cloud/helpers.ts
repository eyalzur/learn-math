import { expect, type Page } from '@playwright/test';

export const API = 'http://localhost:8788';
let n = 0;
export const uniqueEmail = () => `parent${Date.now()}${++n}@example.com`;

/** The parents' app is its own page. */
export async function signInAsParent(page: Page, email: string, joinCode = '') {
  await page.goto('/learn-math/parents/');
  await page.getByLabel('מייל').fill(email);
  if (joinCode) await page.getByLabel(/קוד הצטרפות/).fill(joinCode);
  await page.getByRole('button', { name: 'כניסה' }).click();
  await expect(page.getByRole('heading', { name: 'הורים', exact: true })).toBeVisible();
}

/** A child makes their own profile in the kids' app — no parent involved. Same dialog as the app's
 *  always had: a name, a grade card, optionally a picture. */
export async function createKidProfile(page: Page, name: string, grade = 'כיתה ו׳', path = '/learn-math/', avatar?: string) {
  await page.goto(path);
  await page.getByRole('button', { name: 'פרופיל חדש' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('שם', { exact: true }).fill(name);
  await dialog.locator('.grade-card', { hasText: grade }).click();
  if (avatar) await dialog.getByRole('button', { name: avatar }).click();
  await dialog.getByRole('button', { name: 'יצירה' }).click();
  await expect(page.getByText(`שלום ${name}!`)).toBeVisible();
}

/** The code the parent reads out for the children. */
export async function parentChildCode(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'חיבור ילד/ה: קוד' }).click();
  await expect(page.getByLabel('קוד', { exact: true })).toHaveText(/\d{4}/);
  return (await page.getByLabel('קוד', { exact: true }).innerText()).trim();
}

export async function linkKid(page: Page, code: string) {
  await page.getByLabel('הקלידו את הקוד של ההורים').fill(code);
  await page.getByRole('button', { name: 'חיבור', exact: true }).click();
}

export const moveClock = (days: number) =>
  fetch(`${API}/dev/clock`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ addDays: days }) });
