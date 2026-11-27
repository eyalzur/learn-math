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

/** A child makes their own profile in the kids' app — no parent involved. */
export async function createKidProfile(page: Page, name: string, grade = 'כיתה ו׳', path = '/learn-math/') {
  await page.goto(path);
  await page.getByRole('button', { name: 'פרופיל חדש' }).click();
  await page.getByLabel('איך קוראים לך?').fill(name);
  await page.getByRole('button', { name: grade }).click();
  await page.getByRole('button', { name: 'יצירת פרופיל' }).click();
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
