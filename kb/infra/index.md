# infra

* [אימות מול Claude דרך Workload Identity Federation](/infra/claude-wif-auth.md) - בלי מפתח API: חשבון שירות ב-GCP, federation rule ב-Anthropic Console, וה-SDK מחליף OAuth בעצמו.
* [פריסת האתר ל-GitHub Pages](/infra/github-pages-deploy.md) - workflow Deploy to GitHub Pages בכל מיזוג ל-main; Source חייב להיות GitHub Actions.
* [פריסת השרת — מה חייב להישמר בכל דיפלוי](/infra/server-auto-deploy.md) - push ל-main שנוגע ב-server/ נפרס לבד ל-Cloud Run דרך GitHub Actions + Workload Identity Federation.
* [שרת המחברת (server/) ב-Cloud Run](/infra/notebook-server.md) - Node+Express: POST /render-page (תאים ← PNG) ו-POST /read-page (קריאה ב-Claude vision). פרויקט learn-math-506923, region me-west1.
* [שרת הקראה בעברית (server/) ב-Cloud Run](/infra/hebrew-tts-server.md) - Node+Express קטן: POST /synthesize מקבל טקסט עברי ומחזיר MP3 מ-Google Cloud TTS. השרת היחיד בפרויקט היום.
