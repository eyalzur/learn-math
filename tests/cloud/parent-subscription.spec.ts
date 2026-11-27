import { test, expect } from '@playwright/test';
import { API } from './helpers';
import { gradeById } from '../../src/data/curriculum';
import { createKidProfile, linkKid, moveClock, parentChildCode, signInAsParent, uniqueEmail } from './helpers';

test('the two apps are different pages: own look, own name, own install manifest, nothing of the other', async ({ page }) => {
  await page.goto('/learn-math/');
  await expect(page.getByRole('heading', { name: 'לומדים חשבון' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'פרופיל חדש' })).toBeVisible();
  await expect(page.getByLabel('מייל')).toHaveCount(0);
  await expect(page.getByText('הורים')).toHaveCount(0);
  const kidsManifest = await page.locator('link[rel=manifest]').getAttribute('href');
  const kidsTheme = await page.locator('meta[name=theme-color]').getAttribute('content');
  const kidsAccent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());

  await page.goto('/learn-math/parents/');
  await expect(page.getByRole('heading', { name: 'אפליקציית ההורים' })).toBeVisible();
  await expect(page.getByLabel('מייל')).toBeVisible();
  await expect(page.getByRole('button', { name: 'פרופיל חדש' })).toHaveCount(0);
  await expect(page.getByLabel('הקלידו את הקוד')).toHaveCount(0);
  const parentsManifest = await page.locator('link[rel=manifest]').getAttribute('href');
  const parentsTheme = await page.locator('meta[name=theme-color]').getAttribute('content');
  const parentsAccent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());

  expect(parentsManifest).not.toBe(kidsManifest);
  expect(parentsManifest).toContain('manifest-parents.json');
  expect(parentsTheme).not.toBe(kidsTheme);
  expect(parentsAccent, 'the parents app has its own colour').not.toBe(kidsAccent);
});

const PAYWALL = process.env.PAYWALL === '1';

test('a parent does not add children: there is no such form, only a code for them', async ({ page }) => {
  await signInAsParent(page, uniqueEmail());
  await expect(page.getByLabel('כינוי')).toHaveCount(0);
  await expect(page.getByText(/עוד לא חיברתם ילדים/)).toBeVisible();
  const code = await parentChildCode(page);
  expect(code).toMatch(/^\d{4}$/);
  await expect(page.getByRole('img', { name: 'QR לחיבור ילד' })).toBeVisible();
});

test('a child makes their own profile, sees the topics locked, and the parent\'s code opens them', async ({ browser }) => {
  const parent = await (await browser.newContext()).newPage();
  await signInAsParent(parent, uniqueEmail());
  if (PAYWALL) await expect(parent.getByText('שבוע ניסיון — נשארו 7 ימים')).toBeVisible();
  else await expect(parent.getByText(/ניסיון|₪|מנוי/)).toHaveCount(0);
  const code = await parentChildCode(parent);

  const kid = await (await browser.newContext()).newPage();
  await createKidProfile(kid, 'רותם');
  await expect(kid.locator('.topic-card').first()).toBeDisabled();
  await expect(kid.getByText('הקלידו את הקוד של ההורים')).toBeVisible();

  await linkKid(kid, '0000');
  await expect(kid.getByText('הקוד לא נכון')).toBeVisible();
  await linkKid(kid, code);
  await expect(kid.getByLabel('הקלידו את הקוד של ההורים')).toHaveCount(0);
  await expect(kid.locator('.topic-card').first()).toBeEnabled();
  await kid.locator('.topic-card').first().click();
  await expect(kid.getByText(/שאלה 1 מתוך/)).toBeVisible();

  await parent.goto('/learn-math/parents/');
  await expect(parent.getByText('רותם', { exact: false }).first()).toBeVisible();
});

test('a link or QR carries the code: opening it links the new profile by itself', async ({ browser }) => {
  const parent = await (await browser.newContext()).newPage();
  await signInAsParent(parent, uniqueEmail());
  const code = await parentChildCode(parent);
  const kid = await (await browser.newContext()).newPage();
  await createKidProfile(kid, 'עומר', 'כיתה ח׳', `/learn-math/?code=${code}`);
  await expect(kid.locator('.topic-card').first()).toBeEnabled();
});

test('paywall off (the default): no prices, trial or subscription anywhere, and a linked child is never locked out', async ({ browser }) => {
  test.skip(PAYWALL, 'covered by the paywall-on run');
  const parent = await (await browser.newContext()).newPage();
  await signInAsParent(parent, uniqueEmail());
  await expect(parent.getByRole('button', { name: 'מנוי' })).toHaveCount(0);
  await expect(parent.getByText(/₪|ניסיון|המנוי/)).toHaveCount(0);
  const code = await parentChildCode(parent);
  const kid = await (await browser.newContext()).newPage();
  await createKidProfile(kid, 'עומר', 'כיתה ח׳');
  await linkKid(kid, code);
  await moveClock(60); // far past any free week
  await kid.reload();
  await expect(kid.locator('.topic-card').first()).toBeEnabled();
  await expect(kid.getByText('בקשו מההורים להמשיך')).toHaveCount(0);
});

test('when the subscription ends the topics lock; paying opens them; cancelling locks them at once', async ({ browser }) => {
  test.skip(!PAYWALL, 'the subscription is off by default');
  const parent = await (await browser.newContext()).newPage();
  await signInAsParent(parent, uniqueEmail());
  const code = await parentChildCode(parent);
  const kid = await (await browser.newContext()).newPage();
  await createKidProfile(kid, 'עומר', 'כיתה ח׳');
  await linkKid(kid, code);
  await expect(kid.locator('.topic-card').first()).toBeEnabled();

  await moveClock(8);
  await kid.reload();
  await expect(kid.getByText('בקשו מההורים להמשיך')).toBeVisible();
  await expect(kid.locator('.topic-card').first()).toBeDisabled();
  await expect(kid.getByText(/₪/)).toHaveCount(0); // children never see prices

  await parent.goto('/learn-math/parents/');
  await expect(parent.getByText('המנוי הסתיים. חדשו כדי לראות עדכונים')).toBeVisible();
  await parent.getByRole('button', { name: 'מנוי' }).click();
  await expect(parent.getByText(/10 ₪ לחודש הראשון, אחר כך 30 ₪ לחודש/)).toBeVisible();
  await parent.getByRole('button', { name: /לשלם/ }).click();
  await expect(parent.getByText('שולם ✓')).toBeVisible();

  await kid.getByRole('button', { name: '↻ רענון' }).click();
  await expect(kid.locator('.topic-card').first()).toBeEnabled();

  parent.once('dialog', (d) => d.accept());
  await parent.getByRole('button', { name: 'ביטול מנוי' }).click();
  await expect(parent.getByText('המנוי הסתיים. חדשו כדי לראות עדכונים')).toBeVisible();
  await kid.reload();
  await expect(kid.locator('.topic-card').first()).toBeDisabled();
});

test('one code serves up to three children; a fourth is refused', async ({ browser }) => {
  const parent = await (await browser.newContext()).newPage();
  await signInAsParent(parent, uniqueEmail());
  const code = await parentChildCode(parent);
  for (const name of ['א', 'ב', 'ג']) {
    const kid = await (await browser.newContext()).newPage();
    await createKidProfile(kid, name, 'כיתה א׳');
    await linkKid(kid, code);
    await expect(kid.locator('.topic-card').first()).toBeEnabled();
  }
  const fourth = await (await browser.newContext()).newPage();
  await createKidProfile(fourth, 'ד', 'כיתה א׳');
  await linkKid(fourth, code);
  await expect(fourth.getByText('כבר מחוברים 3 ילדים')).toBeVisible();
  await expect(fourth.locator('.topic-card').first()).toBeDisabled();
});

test('deleting a child needs confirmation, removes them, and the device is sent back to the start', async ({ browser }) => {
  const parent = await (await browser.newContext()).newPage();
  await signInAsParent(parent, uniqueEmail());
  const code = await parentChildCode(parent);
  const kid = await (await browser.newContext()).newPage();
  await createKidProfile(kid, 'מיקה', 'כיתה א׳');
  await linkKid(kid, code);
  await expect(kid.locator('.topic-card').first()).toBeEnabled();

  await parent.goto('/learn-math/parents/');
  await parent.getByRole('button', { name: /מיקה/ }).click();
  await parent.getByRole('button', { name: 'מחק את הילד/ה' }).click();
  await expect(parent.getByText(/יימחק הכל: ההתקדמות וההגדרות/)).toBeVisible();
  await parent.getByRole('button', { name: 'ביטול' }).click();
  await expect(parent.getByRole('dialog')).toHaveCount(0);
  await parent.getByRole('button', { name: 'מחק את הילד/ה' }).click();
  await parent.getByRole('button', { name: 'מחק הכל' }).click();
  await expect(parent.getByText(/עוד לא חיברתם ילדים/)).toBeVisible();

  await kid.reload();
  await expect(kid.getByRole('button', { name: 'פרופיל חדש' })).toBeVisible();
});

test('a second parent joins with a code, or with the link; a third is refused', async ({ browser }) => {
  const mom = await (await browser.newContext()).newPage();
  await signInAsParent(mom, uniqueEmail());
  await mom.getByRole('button', { name: 'הזמנת הורה נוסף' }).click();
  await expect(mom.getByRole('img', { name: 'QR להצטרפות הורה' })).toBeVisible();
  await expect(mom.getByLabel('קוד', { exact: true })).toHaveText(/\d{4}/);
  const joinCode = (await mom.getByLabel('קוד', { exact: true }).innerText()).trim();

  const dad = await (await browser.newContext()).newPage();
  await dad.goto(`/learn-math/parents/?join=${joinCode}`);
  await expect(dad.getByLabel(/קוד הצטרפות/)).toHaveValue(joinCode); // the link filled it in
  await dad.getByLabel('מייל').fill(uniqueEmail());
  await dad.getByRole('button', { name: 'כניסה' }).click();
  await dad.getByRole('button', { name: 'חיבורים' }).click();
  await expect(dad.getByText('2/2')).toBeVisible();
  await expect(dad.getByRole('button', { name: 'הזמנת הורה נוסף' })).toHaveCount(0);
});

test('a parent sees a child\'s progress per topic, with the share of right answers and the latest practices', async ({ browser }) => {
  const parent = await (await browser.newContext()).newPage();
  await signInAsParent(parent, uniqueEmail());
  const code = await parentChildCode(parent);
  const kid = await (await browser.newContext()).newPage();
  await createKidProfile(kid, 'רותם');
  await linkKid(kid, code);
  await expect(kid.locator('.topic-card').first()).toBeEnabled();

  // One finished practice, driven through the same calls the app makes: every second answer right.
  const token = await kid.evaluate(() => localStorage.getItem('learn-math:cloud-child-token'));
  const post = (path: string, body?: unknown) =>
    fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body ?? {}) }).then((r) => r.json());
  const topic = gradeById('6').topicSets.find((t) => t.adaptive)!;
  const session = await post('/child/session', { gradeId: '6', topicId: topic.id });
  const n = session.questions.length;
  for (let i = 0; i < n; i++) await post(`/child/session/${encodeURIComponent(session.sessionId)}/answer`, { correct: i % 2 === 0 });
  await post(`/child/session/${encodeURIComponent(session.sessionId)}/finish`);
  const right = Math.ceil(n / 2);

  await parent.goto('/learn-math/parents/');
  await expect(parent.getByText('תרגלו 1 פעמים')).toBeVisible();
  await parent.getByRole('button', { name: /רותם/ }).click();
  const byTopic = parent.getByRole('list', { name: 'התקדמות לפי נושא' });
  await expect(byTopic).toContainText(topic.title);
  await expect(byTopic).toContainText(`${right}/${n}`);
  await expect(byTopic).toContainText(`${Math.round((100 * right) / n)}%`);
  await expect(parent.getByRole('list', { name: 'תרגולים אחרונים' }).getByRole('listitem')).toHaveCount(1);
});

test('a child\'s profile is made with the same dialog as always: a name, a grade card, and a picture of their choice', async ({ page }) => {
  await createKidProfile(page, 'נועה', 'כיתה ב׳', '/learn-math/', 'פנדה');
  // the picture they chose is in their greeting
  await expect(page.locator('.greeting')).toContainText('🐼');
  // nothing else about the child is asked for
  await expect(page.getByLabel(/מייל|טלפון|תאריך/)).toHaveCount(0);
});

test('every invitation can be sent by WhatsApp: the message carries the code and a link that opens the right app', async ({ page }) => {
  await signInAsParent(page, uniqueEmail());
  const childCode = await parentChildCode(page);
  const forKids = page.getByRole('link', { name: 'שליחה בוואטסאפ' });
  const kidsHref = new URL((await forKids.getAttribute('href'))!);
  expect(kidsHref.origin + kidsHref.pathname).toBe('https://wa.me/');
  const kidsText = kidsHref.searchParams.get('text')!;
  expect(kidsText).toContain(childCode);
  expect(kidsText).toMatch(new RegExp(`/learn-math/\\?code=${childCode}`)); // the kids' app, code filled in
  expect(kidsText).not.toContain('/parents/');
  await expect(forKids).toHaveAttribute('target', '_blank');

  await page.getByRole('button', { name: '← חזרה' }).click();
  await page.getByRole('button', { name: 'הזמנת הורה נוסף' }).click();
  await expect(page.getByLabel('קוד', { exact: true })).toHaveText(/\d{4}/);
  const joinCode = (await page.getByLabel('קוד', { exact: true }).innerText()).trim();
  const parentHref = new URL((await page.getByRole('link', { name: 'שליחה בוואטסאפ' }).getAttribute('href'))!);
  const parentText = parentHref.searchParams.get('text')!;
  expect(parentText).toContain(joinCode);
  expect(parentText).toContain(`/learn-math/parents/?join=${joinCode}`); // the parents' app, code filled in
});

test('a new phone: the parent makes a code for the child, the child types it, and keeps their profile; the old phone is detached', async ({ browser }) => {
  const parent = await (await browser.newContext()).newPage();
  await signInAsParent(parent, uniqueEmail());
  const code = await parentChildCode(parent);
  const oldPhone = await (await browser.newContext()).newPage();
  await createKidProfile(oldPhone, 'רותם', 'כיתה ו׳', '/learn-math/', 'פנדה');
  await linkKid(oldPhone, code);
  await expect(oldPhone.locator('.topic-card').first()).toBeEnabled();

  await parent.goto('/learn-math/parents/');
  await parent.getByRole('button', { name: /רותם/ }).click();
  await parent.getByRole('button', { name: 'מכשיר חדש' }).click();
  await expect(parent.getByRole('img', { name: 'QR למכשיר חדש' })).toBeVisible();
  await expect(parent.getByLabel('קוד', { exact: true })).toHaveText(/\d{4}/);
  const deviceCode = (await parent.getByLabel('קוד', { exact: true }).innerText()).trim();
  const wa = decodeURIComponent((await parent.getByRole('link', { name: 'שליחה בוואטסאפ' }).getAttribute('href'))!);
  expect(wa).toContain(deviceCode);
  expect(wa).toContain(`/learn-math/?device=${deviceCode}`);

  const newPhone = await (await browser.newContext()).newPage();
  await newPhone.goto('/learn-math/');
  await newPhone.getByRole('button', { name: 'כבר יש לי פרופיל' }).click();
  await newPhone.getByLabel('הקלידו את הקוד שההורים נתנו').fill('0000');
  await newPhone.getByRole('button', { name: 'חיבור', exact: true }).click();
  await expect(newPhone.getByText('הקוד לא נכון')).toBeVisible();
  await newPhone.getByLabel('הקלידו את הקוד שההורים נתנו').fill(deviceCode);
  await newPhone.getByRole('button', { name: 'חיבור', exact: true }).click();
  await expect(newPhone.getByText(/שלום רותם!/)).toBeVisible();
  await expect(newPhone.locator('.greeting')).toContainText('🐼'); // same profile, same picture
  await expect(newPhone.locator('.topic-card').first()).toBeEnabled(); // still linked: nothing to type

  await oldPhone.reload();
  await expect(oldPhone.getByRole('button', { name: 'פרופיל חדש' })).toBeVisible();
});

test('a "new phone" link carries the code: opening it reconnects the child by itself', async ({ browser }) => {
  const parent = await (await browser.newContext()).newPage();
  await signInAsParent(parent, uniqueEmail());
  const code = await parentChildCode(parent);
  const oldPhone = await (await browser.newContext()).newPage();
  await createKidProfile(oldPhone, 'מיקה', 'כיתה א׳');
  await linkKid(oldPhone, code);

  await parent.goto('/learn-math/parents/');
  await parent.getByRole('button', { name: /מיקה/ }).click();
  await parent.getByRole('button', { name: 'מכשיר חדש' }).click();
  await expect(parent.getByLabel('קוד', { exact: true })).toHaveText(/\d{4}/);
  const deviceCode = (await parent.getByLabel('קוד', { exact: true }).innerText()).trim();

  const newPhone = await (await browser.newContext()).newPage();
  await newPhone.goto(`/learn-math/?device=${deviceCode}`);
  await expect(newPhone.getByText(/שלום מיקה!/)).toBeVisible();
});
