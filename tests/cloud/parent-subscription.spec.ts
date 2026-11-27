import { test, expect } from '@playwright/test';
import { addChild, connectChildDevice, moveClock, signInAsParent, uniqueEmail } from './helpers';

test('a parent adds a child, the child connects with the code and starts practising', async ({ browser }) => {
  const parent = await (await browser.newContext()).newPage();
  await signInAsParent(parent, uniqueEmail());
  await expect(parent.getByText('שבוע ניסיון — נשארו 7 ימים')).toBeVisible();
  const code = await addChild(parent, 'רותם');

  const child = await (await browser.newContext()).newPage();
  await connectChildDevice(child, code);
  await expect(child.getByText('שלום רותם!')).toBeVisible();
  await child.locator('.topic-card').first().click();
  await expect(child.getByText(/שאלה 1 מתוך/)).toBeVisible();

  // the code works once
  const other = await (await browser.newContext()).newPage();
  await connectChildDevice(other, code);
  await expect(other.getByText('הקוד לא נכון')).toBeVisible();

  // the parent sees the child on the home screen
  await parent.getByRole('button', { name: '← חזרה' }).click();
  await expect(parent.getByText('עוד לא תרגלו השבוע')).toBeVisible();
});

test('the kids app has no way into the parents app, and the parents app has no child screen', async ({ page }) => {
  await page.goto('/learn-math/');
  await expect(page.getByLabel('הקלידו את הקוד')).toBeVisible();
  await expect(page.getByText('הורים')).toHaveCount(0);
  await expect(page.getByLabel('מייל')).toHaveCount(0);
  await page.goto('/learn-math/parents/');
  await expect(page.getByLabel('מייל')).toBeVisible();
  await expect(page.getByLabel('הקלידו את הקוד')).toHaveCount(0);
  const manifest = await page.locator('link[rel=manifest]').getAttribute('href');
  expect(manifest).toContain('manifest-parents.json');
});

test('a wrong code says so and does not connect', async ({ page }) => {
  await connectChildDevice(page, '0000');
  await expect(page.getByText('הקוד לא נכון')).toBeVisible();
  await expect(page.getByLabel('הקלידו את הקוד')).toBeVisible();
});

test('when the subscription ends the child stops; paying brings practice back; cancelling stops it at once', async ({ browser }) => {
  const parent = await (await browser.newContext()).newPage();
  await signInAsParent(parent, uniqueEmail());
  const code = await addChild(parent, 'עומר', 'כיתה ח׳');
  const child = await (await browser.newContext()).newPage();
  await connectChildDevice(child, code);
  await expect(child.getByText('שלום עומר!')).toBeVisible();

  await moveClock(8);
  await child.reload();
  await expect(child.getByText('בקשו מההורים להמשיך')).toBeVisible();
  await expect(child.getByText(/₪/)).toHaveCount(0); // children never see prices

  await parent.reload();
  await parent.getByRole('button', { name: /הורים|יציאה/ }).first().isVisible();
  await expect(parent.getByText('המנוי הסתיים. חדשו כדי לראות עדכונים')).toBeVisible();
  await parent.getByRole('button', { name: 'מנוי' }).click();
  await expect(parent.getByText(/10 ₪ לחודש הראשון, אחר כך 30 ₪ לחודש/)).toBeVisible();
  await parent.getByRole('button', { name: /לשלם/ }).click();
  await expect(parent.getByText('שולם ✓')).toBeVisible();

  await child.getByRole('button', { name: '↻' }).click();
  await expect(child.getByText('שלום עומר!')).toBeVisible();

  parent.once('dialog', (d) => d.accept());
  await parent.getByRole('button', { name: 'ביטול מנוי' }).click();
  await expect(parent.getByText('המנוי הסתיים. חדשו כדי לראות עדכונים')).toBeVisible();
  await child.reload();
  await expect(child.getByText('בקשו מההורים להמשיך')).toBeVisible();
});

test('at most three children', async ({ page }) => {
  await signInAsParent(page, uniqueEmail());
  for (const name of ['א', 'ב', 'ג']) {
    await addChild(page, name, 'כיתה א׳');
    await page.getByRole('button', { name: '← חזרה' }).click();
  }
  await expect(page.getByText('כבר מחוברים 3 ילדים')).toBeVisible();
  await expect(page.getByRole('button', { name: 'חבר/י ילד/ה' })).toHaveCount(0);
});

test('deleting a child needs confirmation, removes them, and the device is sent back to the code screen', async ({ browser }) => {
  const parent = await (await browser.newContext()).newPage();
  await signInAsParent(parent, uniqueEmail());
  const code = await addChild(parent, 'מיקה', 'כיתה א׳');
  const child = await (await browser.newContext()).newPage();
  await connectChildDevice(child, code);
  await expect(child.getByText('שלום מיקה!')).toBeVisible();

  await parent.getByRole('button', { name: '← חזרה' }).click();
  await parent.getByRole('button', { name: /מיקה/ }).click();
  await parent.getByRole('button', { name: 'מחק את הילד/ה' }).click();
  await expect(parent.getByText(/יימחק הכל: ההתקדמות וההגדרות/)).toBeVisible();
  await parent.getByRole('button', { name: 'ביטול' }).click();
  await expect(parent.getByRole('dialog')).toHaveCount(0);
  await parent.getByRole('button', { name: 'מחק את הילד/ה' }).click();
  await parent.getByRole('button', { name: 'מחק הכל' }).click();
  await expect(parent.getByText('עוד לא חיברתם ילדים.')).toBeVisible();

  await child.reload();
  await expect(child.getByLabel('הקלידו את הקוד')).toBeVisible();
});

test('a second parent joins with a code; a third is refused', async ({ browser }) => {
  const mom = await (await browser.newContext()).newPage();
  await signInAsParent(mom, uniqueEmail());
  await mom.getByRole('button', { name: 'חיבורים' }).click();
  await mom.getByRole('button', { name: 'הזמנת הורה נוסף' }).click();
  const joinCode = (await mom.getByLabel('קוד הצטרפות להורה').innerText()).trim();

  const dad = await (await browser.newContext()).newPage();
  await signInAsParent(dad, uniqueEmail(), joinCode);
  await dad.getByRole('button', { name: 'חיבורים' }).click();
  await expect(dad.getByText('2/2')).toBeVisible();
  await expect(dad.getByRole('button', { name: 'הזמנת הורה נוסף' })).toHaveCount(0);
});
