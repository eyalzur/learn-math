# kb-kit — בסיס ידע לכל אפליקציה

```bash
node kb-kit/install.mjs /path/to/other-app
```

מעתיק: `kb/tools/` (הכלים + הבדיקות), `.claude/agents/kb-*`, `.claude/skills/kb-*`, ו-`kb/_types.md` גנרי.
**המקור היחיד הוא הריפו הזה** — אין עותק שני שמתפזר.

מה שמשתנה בין אפליקציות: רק `kb/_types.md` (שם, שפה, תיקיות מותרות). הכלים לא יודעים כלום על learn-math.

## חילוץ לריפו נפרד (עוד לא נעשה)
יצירת ריפו חדש מחוץ להרשאות של סשן זה. כשרוצים: ריפו `kb-kit` ריק, ואז
`git subtree split -P kb/tools` + העתקת `.claude/agents/kb-*`, `.claude/skills/kb-*`, `kb-kit/template`. עד אז `install.mjs` מספיק.
