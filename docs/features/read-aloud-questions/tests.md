# הקראת השאלה — Tests

`tests/e2e/read-aloud-questions.spec.ts` — 11 בדיקות.

מנוע הדיבור מוחלף במקליט לפני שקוד האפליקציה רץ, באותו דפוס שכבר קיים
ב-`read-aloud.spec.ts`: `speechSynthesis` הוא getter בלבד על `window`, ולכן השמה
רגילה נכשלת **בשקט** והמנוע האמיתי נשאר.

## Coverage

### לשמוע את השאלה
| קריטריון | בדיקה |
|---|---|
| בכל שאלה יש דרך לשמוע, בלי לטעות קודם | `every question can be heard before answering, without a mistake first` |
| החשבון נשמע כמילים עבריות | `the arithmetic is spoken as Hebrew words, not skipped symbols` |
| הרמזים נקראים | `a hint is read too — help that cannot be read is not help` |

בדיקת החשבון דורשת **גם** ש"ועוד" יופיע **וגם** שסימן `+` גולמי לא יגיע למנוע.
רק הראשונה הייתה עוברת גם אם הסימן היה נשלח בנוסף.

בדיקת הרמז משווה את **תחילת מה שנאמר** לתחילת הרמז שעל המסך, ולכן היא נכשלת אם
מה שהוקרא היה השאלה שוב במקום הרמז.

### ההגדרה
| קריטריון | בדיקה |
|---|---|
| ברירת המחדל כבויה | `the setting is off until someone turns it on` |
| כבוי = שקט עד שמבקשים | `with the setting off, nothing is spoken until it is asked for` |
| דלוק = שאלה חדשה נקראת מעצמה | `with the setting on, a new question reads itself` |
| נזכרת אחרי רענון | `the setting survives a reload` |
| שייכת לתלמיד/ה ולא למכשיר | `the setting belongs to the student, not the device` |

בדיקת השייכות עוברת בין שני ילדים **ואז חוזרת לראשון** ומוודאת שהבחירה שלו עדיין
שם. בלי החזרה, מימוש שפשוט מוחק הכל במעבר תלמיד היה עובר.

### עצירה
| קריטריון | בדיקה |
|---|---|
| "בדיקה" עוצרת הקראה שרצה | `checking an answer silences a reading in progress` |
| הכפתור הופך לעצירה ולהפך | `the speak button turns into a stop, and pressing it again stops` |

### בלי מנוע דיבור
| קריטריון | בדיקה |
|---|---|
| אין מתג, אין כפתור, ושאר המסך לא זז | `a browser with no speech engine shows no setting and no button` |

## שני באגים בבדיקות עצמן, ששווה לרשום

**הראשון החזיר ממצא שגוי.** ניסיתי לבטל את מנוע הדיבור בהצבת `undefined`, והבדיקה
נכשלה כאילו יש באג בקוד. אין: תמיכה נקבעת לפי `"speechSynthesis" in window`, ומאפיין
שערכו `undefined` עדיין **קיים**. הדפוס הקיים בפרויקט **מוחק** את המאפיין, ומשם הכל
עבד. תיקנתי את הבדיקה, לא את הקוד.

**השני**: המקליט סיים כל משפט אחרי 10ms, ולכן מצב "מדבר" נגמר לפני שאפשר היה לראות
אותו. המקליט קיבל משך שניתן לשליטה, והבדיקה על כפתור העצירה מבקשת משפט שנמשך.

## How to run
`npm run test:e2e`

## Status
✅ עובר — **100 בדיקות** נכון ל-2026-08-14, מתוכן 11 חדשות. build ו-lint נקיים.

**89 הבדיקות הקודמות לא שונו.** ברירת המחדל הכבויה היא מה שמגן עליהן: אף בדיקה
קיימת לא מדליקה את המתג, ולכן כולן ממשיכות לרוץ על המסך של היום.
