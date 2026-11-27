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

export async function addChild(page: Page, name: string, grade = 'כיתה ו׳'): Promise<string> {
  await page.getByRole('button', { name: 'חבר/י ילד/ה' }).click();
  await page.getByLabel('כינוי').fill(name);
  await page.getByLabel('כיתה').selectOption({ label: grade });
  await page.getByRole('button', { name: 'הוספה' }).click();
  // the code arrives from the server a moment after the screen opens
  await expect(page.getByLabel('קוד חיבור')).toHaveText(/\d{4}/);
  return (await page.getByLabel('קוד חיבור').innerText()).trim();
}

export async function connectChildDevice(page: Page, code: string) {
  await page.goto('/learn-math/');
  await page.getByLabel('הקלידו את הקוד').fill(code);
  await page.getByRole('button', { name: 'התחבר' }).click();
}

export const moveClock = (days: number) =>
  fetch(`${API}/dev/clock`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ addDays: days }) });
