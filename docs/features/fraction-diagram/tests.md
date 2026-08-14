# ציור לשברים — Tests

`tests/e2e/fraction-diagram.spec.ts` — 9 בדיקות במסך, ועוד 2 כללי תוכן ב-
`tests/e2e/content.spec.ts`.

## Coverage

### שהציור לא יסגיר את התשובה
| קריטריון | בדיקה |
|---|---|
| אין ציור לפני התשובה | `no diagram anywhere before the question is answered` |
| תשובה נכונה בלי ציור | `a correct answer shows no diagram` |

הראשונה היא **הסיבה שהפיצ'ר הזה בהסבר ולא ליד השאלה**. עבור "כמה זה חצי מ-`20`?"
העיגול נושא את התשובה בגלוי.

### שהציור מתאר את השאלה
| קריטריון | בדיקה |
|---|---|
| פרוסות = מכנה, מלאות = מונה | `the slices match the denominator and the filled ones match the numerator` |
| בכל פרוסה הערך | `every slice carries what one part is worth` |

**שתי הבדיקות רצות על שתי שאלות שונות** — `חצי מ-20` ו-`שלושה רבעים מ-100`. מימוש
שהיה מצייר תמיד את אותו עיגול היה עובר על אחת מהן.

### שהיעדר ציור תקין
| קריטריון | בדיקה |
|---|---|
| שש החריגות בלי ציור, וההסבר שלם | `questions the circle cannot describe get no circle, and still explain themselves` |
| כיתה בלי שברים לא מושפעת | `a grade with no fractions is untouched` |
| ההסבר הכתוב נשאר | `the written explanation is still there, above and below the picture` |

הבדיקה על החריגות דורשת שנמצאה **לפחות אחת** מהן, אחרת מסלול שלא הגיע לשום שאלה
חריגה היה נחשב הצלחה.

### נגישות וכיווניות
| קריטריון | בדיקה |
|---|---|
| הכיתוב זהה לתיאור לקורא מסך | `the caption and the screen reader description say the same thing` |
| מספרים בפרוסות נקראים שמאל-ימין | `numbers inside the slices read left to right` |

נבדק ה-`direction` המחושב בפועל, על ה-`<svg>` **וגם** על הטקסטים שבתוכו. אלמנט SVG
אינו יורש את הרגלי הדף, וזה בדיוק המקום שבו המלכודת החוזרת של הפרויקט מתחבאת.

### כללי תוכן, מול הנתונים
| כלל | מה הוא שומר |
|---|---|
| `every fraction-of-a-number question still draws its circle` | ניסוח מחדש של שאלה לא יוריד את הציור בשקט |
| `no diagram ever disagrees with its own question` | הפרוסות בונות את השלם, והמונה כפול הערך נותן את התשובה |

הראשון הוא **המענה לסיכון שהארכיטקטורה סימנה**: הציור נגזר מהניסוח, ולכן ניסוח
שישתנה היה מפיל אותו בלי שאיש ישים לב. הכלל סופר `24` והופך את השקט לכישלון.

## שהבדיקות יכולות להאדים

`every fraction-of-a-number question still draws its circle` אומתה במוטציה: שונה
ניסוח שאלה אחת מ-"כמה זה חצי מ-`20`?" ל-"מהו חצי מ-`20`?", והכלל האדים מיד.

## How to run
`npm run test:e2e`

## Status
✅ עובר — **109 בדיקות** נכון ל-2026-08-14, מתוכן 11 חדשות. build ו-lint נקיים.

**98 הבדיקות הקודמות לא שונו.** כל אלה שנוגעות בקופסת ההסבר רצות על כיתה א׳, שאין
בה שברים ולכן אין בה ציור — תוצאה של ההיקף, לא מזל.
