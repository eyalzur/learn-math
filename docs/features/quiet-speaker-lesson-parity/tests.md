# בדיקות

שינוי חזותי טהור — לא נוספה בדיקה חדשה. הסוויטה הקיימת (`no-scroll-screens`, `read-aloud*`,
`topic-lesson`) מכסה את ההתנהגות שלא אמורה להשתנות.

- `topic-lesson.spec.ts` נשען על `.lesson-page-badge` (מחלקה פנימית שנמחקה); עודכן לקרוא את המונה
  מ-`.practice-header .progress`, ובמקרה הלא-אדפטיבי מוודא שאין טקסט "דוגמה N מתוך".
- ריצה בודדת ונקייה, `--workers=1`, פורט חופשי: `413/415` (2 skip קיימים) + ריצה חוזרת של
  `topic-lesson` + `no-scroll-screens` — `14/14`.
- אימות ידני ב-iPhone 13 (390x844): `scrollHeight == innerHeight == 664` בתרגול של מיקה (ללא גלילה).
