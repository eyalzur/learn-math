import { expect, type Page } from '@playwright/test';

export const API = 'http://localhost:8788';
let n = 0;
export const uniqueEmail = () => `parent${Date.now()}${++n}@example.com`;

export async function signInAsParent(page: Page, email: string, joinCode = '') {
  await page.goto('/learn-math/');
  await page.getByRole('button', { name: /הורים/ }).click();
  const q = await page.locator('.cloud-card p .ltr').innerText();
  const [a, b] = q.split('×').map((s) => parseInt(s));
  await page.getByLabel('תשובה').fill(String(a * b));
  await page.getByRole('button', { name: 'המשך' }).click();
  await page.getByLabel('מייל').fill(email);
  if (joinCode) await page.getByLabel(/קוד הצטרפות/).fill(joinCode);
  await page.getByRole('button', { name: 'כניסה' }).click();
  await expect(page.getByRole('heading', { name: 'הורים' })).toBeVisible();
}

export async function addChild(page: Page, name: string, grade = 'כיתה ו׳'): Promise<string> {
  await page.getByRole('button', { name: 'חבר/י ילד/ה' }).click();
  await page.getByLabel('כינוי').fill(name);
  await page.getByLabel('כיתה').selectOption({ label: grade });
  await page.getByRole('button', { name: 'הוספה' }).click();
  const code = (await page.getByLabel('קוד חיבור').innerText()).trim();
  expect(code).toMatch(/^\d{4}$/);
  return code;
}

export async function connectChildDevice(page: Page, code: string) {
  await page.goto('/learn-math/');
  await page.getByLabel('הקלידו את הקוד').fill(code);
  await page.getByRole('button', { name: 'התחבר' }).click();
}

export const moveClock = (days: number) =>
  fetch(`${API}/dev/clock`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ addDays: days }) });
