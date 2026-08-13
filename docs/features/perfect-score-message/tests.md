# הודעת עידוד לציון מושלם — Tests

## Coverage
- "כשכל התשובות נכונות (100%), מוצגת הודעה שונה מהודעת 80%-99%" →
  `tests/e2e/perfect-score-message.spec.ts` › `shows the perfect-score message when every
  answer is correct`
- "כשהציון נמוך מ-100%, ממשיכות להופיע שלוש ההודעות הקיימות ללא שינוי" →
  `tests/e2e/perfect-score-message.spec.ts` › `keeps the existing message when the score is
  below 100%`
- "ההודעה המיוחדת מוצגת רק במסך התוצאה" →
  `tests/e2e/perfect-score-message.spec.ts` › `the perfect-score message never appears
  during practice, only on the result screen`

## How to run
`npm run test:e2e`

(First run in this repo also set up Playwright: `playwright.config.ts` at the repo root,
tests under `tests/e2e/`, using the pre-installed Chromium at
`/opt/pw-browsers/chromium`.)

## Status
✅ 3/3 passing as of 2026-08-13.
