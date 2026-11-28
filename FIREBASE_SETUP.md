# Firebase setup — learn-math (parents and kids apps)

One-time setup, done by the project owner. Takes about 15–20 minutes. The Google Cloud project
is `learn-math-506923`. Nothing here is needed for the demo (`VITE_CLOUD=mock`), which runs with no
accounts at all.

What each step does:
- **Firebase Authentication** lets parents sign in (Google, or an email link). Children never sign in;
  they use a code.
- **Firestore** stores households, children, codes and progress.
- **The API** (Cloud Run, `api/`) checks every request against Firebase. Without it, the apps cannot connect.
- **Secret `CHILD_TOKEN_SECRET`** signs the tokens of children's devices.

Until all steps are done, the two-app version at `/learn-math/next/` is not built, and the live site
at `/learn-math/` is not affected.

---

## Step 1 — Google Cloud (Cloud Shell, once)

Open https://shell.cloud.google.com with the project owner account, then:

```bash
gcloud config set project learn-math-506923
gcloud services enable firestore.googleapis.com run.googleapis.com
gcloud firestore databases create --location=me-west1
gcloud iam service-accounts create learn-math-api --display-name="learn-math api"
gcloud projects add-iam-policy-binding learn-math-506923 \
  --member="serviceAccount:learn-math-api@learn-math-506923.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
gcloud iam service-accounts add-iam-policy-binding \
  learn-math-api@learn-math-506923.iam.gserviceaccount.com \
  --member="serviceAccount:github-deployer@learn-math-506923.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

Notes:
- `already exists` is not an error.
- If a Firestore database already exists in this project, skip the `firestore databases create` line.

---

## Step 2 — Firebase Console

Open https://console.firebase.google.com and select project `learn-math-506923`.

**2a. Sign-in methods**
1. Build → Authentication → Get started (if shown).
2. Sign-in method tab:
   - Enable **Google**. Set a project support email.
   - Enable **Email/Password**, then turn on **Email link (passwordless sign-in)** inside it.

**2b. Authorized domains**
1. Authentication → Settings → Authorized domains.
2. Add `eyalzur.github.io`. (`localhost` is already listed.)

**2c. Web app config**
1. Project settings (gear icon) → General → Your apps.
2. If there is no web app yet: **Add app** → Web (`</>`) → name it `learn-math-web` → register (no hosting needed).
3. Copy the `firebaseConfig` object. It looks like:
   ```json
   {"apiKey":"…","authDomain":"learn-math-506923.firebaseapp.com","projectId":"learn-math-506923","appId":"…"}
   ```
4. Paste it into one line for Step 4 (`NEXT_FIREBASE_CONFIG`). It is public, not a secret.

---

## Step 3 — GitHub secret

GitHub repo → Settings → Secrets and variables → Actions → **Secrets** → New repository secret:

- Name: `CHILD_TOKEN_SECRET`
- Value: a long random string. Generate one locally:
  ```bash
  openssl rand -hex 32
  ```

Keep this value. Changing it later signs out every child device.

---

## Step 4 — Deploy the API and the apps

**4a. API (Cloud Run)**
1. GitHub → Actions → **Deploy parents-and-kids API to Cloud Run** → Run workflow.
2. The first run may finish green with the message "not deployed" until the Step 1–3 setup is complete. Re-run after setup.
3. At the end of the run summary, copy the service URL (`https://…run.app`).

**4b. Variables**
GitHub → Settings → Secrets and variables → Actions → **Variables** → New repository variable:
- `NEXT_API_URL` = the service URL from 4a (no trailing slash)
- `NEXT_FIREBASE_CONFIG` = the `firebaseConfig` JSON from Step 2c, in one line

**4c. Pages build**
GitHub → Actions → **Deploy to GitHub Pages** → Run workflow. This builds `/learn-math/next/`.

After that, these open in a browser:
- Kids: https://eyalzur.github.io/learn-math/next/
- Parents: https://eyalzur.github.io/learn-math/next/parents/

---

## Step 5 — Install on a phone

Open the link in the phone's browser:
- **iPhone (Safari):** Share → Add to Home Screen.
- **Android (Chrome):** menu → Install app (or Add to Home screen).

---

## Optional — Subscription (paywall)

The paywall is off by default: no prices, no trial, no lock. To turn it on:
1. GitHub → Variables → add `PAYWALL` = `1`.
2. Run **Deploy parents-and-kids API to Cloud Run** again.

Do not turn it on before pricing and payment are decided. Payment is not built.

---

## Checks after setup

- [ ] Parent can sign in with Google.
- [ ] Parent can sign in with an email link (the link opens the app on the same device).
- [ ] A child profile can be created on a phone and linked with the 4-digit code shown by the parent.
- [ ] A practice session shows up on the parent's screen.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Google sign-in shows `auth/unauthorized-domain` | Step 2b: `eyalzur.github.io` missing from Authorized domains |
| Sign-in fails with `auth/configuration-not-found` or similar | `NEXT_FIREBASE_CONFIG` missing or wrong; re-run the Pages build |
| API deploy says "not deployed" | Step 1–3 not finished, or `CHILD_TOKEN_SECRET` missing |
| Children are signed out after the secret changes | Expected. Children re-link with a new code. |

## Never do

- Do not set `DEV_AUTH=1` on the deployed API. It skips real sign-in.
- Do not commit `CHILD_TOKEN_SECRET` or any service-account key file to the repo.
- Do not turn on `PAYWALL=1` before the pricing and privacy wording are final.
