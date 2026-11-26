---
type: Trap
title: "האתר החי למטה בלי שקוד נגע בו — Pages כבוי בהגדרות"
description: "workflow הפריסה נכשל ב-404: Settings → Pages → Source חייב להיות GitHub Actions. הגדרה שרק בעל החשבון משנה."
tags: [trap, pages, deploy, 404]
aliases: ["pages 404", "האתר לא עובד", "Deploy to GitHub Pages"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
# מה קרה (2026-09-13)
האתר לא עבד. ה-workflow `Deploy to GitHub Pages` נכשל בכל ריצה מאז PR #65 עם `Failed to create deployment (status: 404) ... Ensure GitHub Pages has been enabled`. הסיבה: Source היה "Deploy from a branch" בעוד ה-workflow מפרסם ב"GitHub Actions". build ו-lint עברו — אף בדיקה לא הייתה תופסת.
הרצה חוזרת בלי שינוי נכשלה שוב (לא flake). אחרי שהמשתמש שינה את Source — עברה.

# הכלל
אתר "לא עובד" בלי PR חשוד ← בודקים קודם את ריצת `Deploy to GitHub Pages` האחרונה על `main`, לא את הקוד. 404 עם "Ensure GitHub Pages has been enabled" = בעיה ב-Settings → Pages. Claude מאבחן ומריץ מחדש; **לא** משנה את ה-Source — רק בעל החשבון. ראו [פריסה](/infra/github-pages-deploy.md).
