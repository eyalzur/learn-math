# לוג גרסאות — Tests

## Coverage
- "קיימת דרך לפתוח מסך שמציג רשימת גרסאות עם תיאור" → `tests/e2e/version-log.spec.ts` ›
  `opens a log of versions, newest first, from the main screen`
- "נקודת הכניסה נמצאת באזור מספר הגרסה הקיים" → same test, uses the existing `גרסה ...`
  trigger rather than a new/separate button
- "מסך לא ריק כשיש רק גרסה אחת" → `the version log is never empty, even with a single entry`
- "כל גרסה חדשה מצטרפת עם מספר ותיאור" (structural check, applies to every entry present) →
  `every version entry has a version number and a description`
- "הגרסה הנוכחית מסומנת" (design.md copy: `(היום)`) → `marks the version currently open on
  this device as today's`
- סגירה חוזרת למסך הראשי בלי שינוי מצב אחר → `closing the log returns to the main screen untouched`

## How to run
`npm run test:e2e` (or `npm run test:e2e -- tests/e2e/version-log.spec.ts` for just this file)

## Status
Pass as of 2026-11-19 — `5/5` in this file, `301/301` in the full suite, single clean run.
