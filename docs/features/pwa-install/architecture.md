# התקנת האפליקציה כ-PWA באייפון ובאנדרואיד — Architecture

## Overview
קבצים סטטיים בלבד — מניפסט JSON חדש, חמש תמונות PNG שנגזרות פעם אחת מ-
`favicon.svg` הקיים ונשמרות כ-assets רגילים, ושורות `<link>`/`<meta>` נוספות
ב-`index.html`. אין קוד React חדש, אין state, אין build-step חדש — תואם לאילוץ
הקיים "האתר עצמו נשאר סטטי".

## Affected Files / Components
- **`public/manifest.json`** (חדש) — המניפסט: `name`, `short_name`, `start_url`,
  `scope`, `display`, `theme_color`, `background_color`, `icons`.
- **`public/icons/icon-192.png`, `icon-512.png`** (חדשים) — איקונים רגילים
  (`purpose: "any"`), נגזרים מ-`favicon.svg` המלא.
- **`public/icons/icon-192-maskable.png`, `icon-512-maskable.png`** (חדשים) —
  גרסאות עם safe-zone (`purpose: "maskable"`), ככל הנראה פשוטות יותר (ראו
  Technical Approach).
- **`public/icons/apple-touch-icon.png`** (חדש, 180×180) — אייפון.
- **`index.html`** — שורות חדשות בתוך `<head>`, לצד ה-`<link rel="icon">` הקיים
  שלא משתנה (ראו Technical Approach לרשימה המדויקת).
- **לא נוגעים:** `vite.config.ts`, כל קובץ ב-`src/`, שום workflow ב-
  `.github/workflows/`.

## Data / State Changes
None — אין state חדש, אין prop, אין טיפוס חדש. זה שינוי-אסטים+HTML בלבד.

## Technical Approach

### נתיבים מתחת ל-`base: '/learn-math/'`
שני מקומות שונים, שני כללים שונים — **חשוב לא לבלבל ביניהם:**
1. **תוך `index.html`:** Vite כבר מתרגם `href`/`src` יחסיים-לשורש (כמו
   `<link rel="icon" href="/favicon.svg">` הקיים) לכלול את ה-`base` בבנייה —
   בדקתי בפועל: ה-`dist/index.html` שנבנה מכיל `href="/learn-math/favicon.svg"`
   אף שהמקור כותב `/favicon.svg"`. **לכן:** שורות ה-`<link>`/`<meta>` החדשות
   ב-`index.html` נכתבות עם נתיב-שורש פשוט (`/manifest.json`,
   `/icons/apple-touch-icon.png`) — **בלי** `/learn-math/` ידני — בדיוק כמו
   השורה הקיימת, ו-Vite יתרגם אותן אוטומטית בבנייה.
2. **תוך `manifest.json` עצמו:** Vite **לא** מעבד תוכן JSON — זה מועתק כפי
   שהוא מ-`public/` ל-`dist/`. **לכן** `start_url`/`scope`/`icons[].src`
   בתוך המניפסט חייבים לכלול את `/learn-math/` **במפורש**, ביד:
   `start_url: "/learn-math/"`, `scope: "/learn-math/"`,
   `icons[].src: "/learn-math/icons/icon-192.png"` וכו׳.

### `index.html` — התוספות המדויקות
בתוך `<head>`, אחרי שורת ה-favicon הקיימת:
```html
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<meta name="theme-color" content="#aa3bff" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="חשבון" />
```
**שתי הערות חשובות ל-iOS, לא להשאיר ל-developer לגלות:**
- `apple-mobile-web-app-status-bar-style` נבחר `"default"` (פס-מצב אטום, לא
  שקוף) ולא `"black-translucent"` — האפליקציה לא תוכננה עם padding ל-safe-area
  (אזור מתחת לפס-המצב/notch); `black-translucent` היה דורש את זה כדי שלא
  יחפוף לתוכן. `"default"` בטוח יותר בלי עבודה נוספת, במחיר "לא immersive
  לגמרי" — tradeoff מתועד, לא פספוס.
- `apple-mobile-web-app-title` **חייב** להיות נפרד מה-`<title>` הקיים
  ("לומדים חשבון") — Safari לא קורא את `short_name` מהמניפסט בשביל תווית-מסך-
  הבית, הוא קורא את ה-meta הזה (ובלעדיו, את ה-`<title>` המלא, שנחתך). בלי
  השורה הזו, אייפון יציג "לומדים חשבון" חתוך, לא "חשבון".

### `manifest.json`
```json
{
  "name": "לומדים חשבון",
  "short_name": "חשבון",
  "start_url": "/learn-math/",
  "scope": "/learn-math/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#aa3bff",
  "icons": [
    { "src": "/learn-math/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/learn-math/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/learn-math/icons/icon-192-maskable.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/learn-math/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
סיומת `.json` (לא `.webmanifest`) בכוונה: GitHub Pages הוא שרת-קבצים-סטטי בלי
אפשרות להגדיר `Content-Type` ידנית (אין `_headers` כמו ב-Netlify) — `.json`
מוגש כ-`application/json` בביטחון, בעוד `.webmanifest` עלול להגיע MIME לא-צפוי.
דפדפנים מודרניים מקבלים מניפסט תחת כל אחד מהם בפועל, אבל `.json` הוא הבחירה
הבטוחה-יותר כשאין שליטה בכותרות-שרת.

### יצירת האיקונים — חד-פעמי, לא build-step
נגזרים פעם אחת מ-`favicon.svg` הקיים ונשמרים כ-PNG סטטיים ב-`public/icons/` —
**לא** שלב-בנייה (`vite.config.ts` לא משתנה, אין תלות-build חדשה ב-
`package.json`). תואם לעיקרון "האתר נשאר סטטי" ולעובדה שהאיקון עצמו לא משתנה
בין בניות.

הסביבה הזו כוללת `convert` (ImageMagick) אבל לא `sharp`/חלופה ב-`node_modules`.
**developer צריך לבדוק בפועל** אם `convert`'s רינדור-SVG (דרך librsvg אם מותקן,
או ה-delegate המובנה) שומר על שכבות-הטשטוש (`feGaussianBlur`) של `favicon.svg`
באיכות מספקת ב-512/192, ו**לרנדר ולהסתכל** — לא להניח. אם האיכות לא מספקת,
או לגרסאות ה-maskable/apple-touch (180, עם safe-zone צפוף), הפתרון שdesign.md
כבר אישר מראש: SVG מפושט (רק הצורה המרכזית החדה, בלי שכבות-הטשטוש, על רקע
אחיד בצבע-הזהות) שנגזר מה-SVG הקיים — לא איור חדש.

## Edge Cases
- **safe-zone ל-maskable:** אנדרואיד עלול למסך לעיגול — הצורה המרכזית צריכה
  לשבת בתוך ~80% האמצעיים של הקנבס, לא להיצמד לקצוות. חובה לבדוק ויזואלית איך
  זה נראה ממוסך בעיגול, לא רק לבדוק את ה-PNG כריבוע.
- **`.json` MIME על GitHub Pages:** אם בפועל מתגלה ש-GitHub Pages מגיש `.json`
  בלי `Content-Type` תקין (לא סביר, אבל לא נבדק עדיין בפרויקט הזה), הפתרון הוא
  לבדוק ב-DevTools על הדיפלוי האמיתי, לא לנחש מראש.
- **Safari לא מכבד `scope`/`start_url` בצורה זהה לכרום** — ידוע ומתועד
  (מגבלת-פלטפורמה, לא באג שלנו); אם פתיחה מהאיקון באייפון נוחתת לא במקום
  הנכון, זה nothing-to-fix-in-code אלא לתעד כמגבלה.
- **איקון-הטאב הקיים (`favicon.svg`) לא מוחלף ולא נוגעים בו** — PWA icons
  ו-favicon הם שני דברים נפרדים בכוונה.

## Risks / Tradeoffs
- **`status-bar-style: "default"` ולא `"black-translucent"`** — נבחר כדי לא
  לדרוש עבודת safe-area-inset שלא קיימת היום באפליקציה. תוצאה: פס-מצב לבן
  רגיל, לא "שקוף משולב" — פחות immersive, אבל אפס סיכון לתוכן-מתחת-לנוץ'.
  אם בעתיד ירצו את המראה ה-immersive יותר, זו עבודת CSS נפרדת (padding ל-
  `env(safe-area-inset-top)`), לא כלולה כאן.
- **אין ולידציה אוטומטית שהאיקונים "נראים טוב"** — הבדיקה היחידה האפשרית היא
  חזותית (התקנה בפועל על מכשיר, או צילום-מסך של ה-PNG בגודל האמיתי). אין
  בדיקת-e2e שיכולה לאשר "זה קריא" — זו מגבלה מוכרת, לא פער בתכנון.
- **`convert`/ImageMagick כפתרון-רינדור** — לא נבדק מראש שזה מניב תוצאה
  נאמנה ל-`favicon.svg`; אם זה מתגלה כלא-מספק, developer עובר לגרסה המפושטת
  (ראו Technical Approach) — זה כבר ההחלטה הקיימת ל"מה לעשות אם," לא open
  question.

## Open Questions
None.
