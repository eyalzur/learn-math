# Firebase setup walkthrough (English, for the project owner)

This guide covers only the Firebase and Google Cloud steps that you must do yourself. It follows the source files `FIREBASE_SETUP.md` (repo root) and `api/README.md`. If this guide and those files ever disagree, the source files win.

Menu names can change slightly over time. Where a label may differ, the guide says so and tells you what to look for.

Time needed: about 15 to 20 minutes.

---

## What you need before starting

- A Google account that owns the Google Cloud / Firebase project **`learn-math-506923`**. Use that account for every step below.
- A web browser (Chrome, Safari or similar) and access to your GitHub account for the `learn-math` repository.
- A terminal is **not** required for the main steps. You need one short command in Step 3 to generate a secret. On a Mac, the terminal app is called **Terminal** (find it with Spotlight: press Cmd+Space and type `Terminal`). Cloud Shell (Step 1) runs in the browser, so it needs no installation.
- Note: the API workflows must be on the `main` branch of GitHub before you run them. The source README lists "merge the `feature/parent-subscription` PR" as step 0. That merge is handled separately and is not part of this guide.

---

## Two places where you paste a value to the assistant

These are the only two values you send back to the assistant. Both are marked with **PASTE POINT** below.

- **PASTE POINT A: the `firebaseConfig` JSON** (Step 2c). This is public. It is safe to share in the chat.
- **PASTE POINT B: the Cloud Run service URL** (Step 4a). It starts with `https://` and ends with `.run.app`. Safe to share.

**Never share the `CHILD_TOKEN_SECRET` value.** Not in the chat, not in email, not in a document, not in a screenshot. It goes only into the GitHub Secrets field in Step 3. Details are in Step 3.

---

## Step 1 — Google Cloud setup in Cloud Shell (one time only)

**Where:** open https://shell.cloud.google.com in your browser. Sign in with the project owner account.

1. On the Cloud Shell page, wait until a black terminal appears at the bottom of the screen.
   - **You should see:** a prompt line that ends with `$`.
   - If Cloud Shell asks you to authorize, click **Authorize** (label may differ slightly; look for an "Authorize" or "Continue" button).
2. Copy and paste the first command. Press Enter.
   ```bash
   gcloud config set project learn-math-506923
   ```
   - **You should see:** `Updated property [core/project].`
3. Copy and paste the following command block. Press Enter after the block.
   ```bash
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
   - **You should see:** each command ends with a success line, or with a message containing `already exists`. **`already exists` is not an error. Continue.**
4. **Exception:** if you already created a Firestore database in this project before, skip the line that starts with `gcloud firestore databases create`. Then run the rest.
   - **You should see:** no error about the database. Other messages may appear; they are fine as long as none of them is a red "ERROR" that stops the command.

**Done with Step 1 when:** all the commands ran, and any `already exists` messages were ignored.

---

## Step 2 — Firebase Console

**Where:** open https://console.firebase.google.com and select the project **`learn-math-506923`**.

- **You should see:** the project's overview page with the project name `learn-math-506923` at the top.

### 2a. Sign-in methods (Google and email link)

1. In the left menu, click **Build**, then **Authentication**. If you see a **Get started** button, click it.
   - **You should see:** the Authentication page with a tab row that includes **Users**, **Sign-in method**, and **Settings**.
2. Click the **Sign-in method** tab.
3. Click **Google**. Turn on the **Enable** switch. In **Project support email**, choose your own email address. Click **Save**.
   - **You should see:** Google listed as **Enabled**.
4. Click **Email/Password** (label may differ slightly; look for "Email/Password" in the provider list). Turn on the **Enable** switch. Then turn on **Email link (passwordless sign-in)**, which is inside the same panel. Click **Save**.
   - **You should see:** Email/Password listed as **Enabled**, with the email link option switched on.

### 2b. Authorized domains

1. On the Authentication page, click the **Settings** tab.
2. In the left list of the Settings page, click **Authorized domains** (label may differ slightly; look for "Authorized domains").
3. Click **Add domain**. Type exactly this and click **Add**:
   ```
   eyalzur.github.io
   ```
   - **You should see:** `eyalzur.github.io` in the list. `localhost` was already there.

### 2c. Web app config (the firebaseConfig JSON)

1. Click the **gear icon** next to **Project Overview** (top left). Click **Project settings** (label may differ slightly).
2. Scroll to the **Your apps** section. Under the **General** tab, check whether a web app already exists.
   - If there is **no** web app yet: click **Add app**, then the **Web** icon (it looks like `</>`). For the app nickname, type exactly `learn-math-web`. Do **not** tick "Set up Firebase Hosting". Click **Register app**.
   - **You should see:** a box titled **Add Firebase SDK** or a block of code with `const firebaseConfig = { ... }`.
3. Find the `firebaseConfig` object. It looks like this (your values will differ):
   ```json
   {"apiKey":"…","authDomain":"learn-math-506923.firebaseapp.com","projectId":"learn-math-506923","appId":"…"}
   ```
   Copy the whole object, from the opening `{` to the closing `}`.
4. Put it on **one line** (no line breaks). If you are not sure how, just copy it as it is; the assistant can fix the format.

**PASTE POINT A (1 of 2):** send the `firebaseConfig` JSON to the assistant in the chat. It is public and safe to share. You will also paste it into GitHub in Step 4b.

- **You should see:** the same JSON, with the keys `apiKey`, `authDomain`, `projectId`, `appId`. `projectId` must read `learn-math-506923`.

---

## Step 3 — GitHub secret `CHILD_TOKEN_SECRET`

This secret signs the connection tokens of your children's devices. Treat it like a password.

### 3a. Generate the secret on your own computer

1. Open **Terminal** on your Mac (Cmd+Space, type `Terminal`, press Enter).
2. Type exactly this and press Enter:
   ```bash
   openssl rand -hex 32
   ```
   - **You should see:** one line of 64 random letters and digits (`0`–`9`, `a`–`f`). Example shape only: `3f9a…` (64 characters long).
3. Select the whole line and copy it (Cmd+C).

**Warning:** do not paste this value into the chat, an email, a note, or any document. Only paste it into the GitHub field in step 3b. After you have pasted it, you may close the Terminal window. If you need the value again later, generate a new one only if the secret was never saved; changing it later signs out every child device.

### 3b. Save it as a GitHub Secret

1. Open your repository on GitHub.
2. Click **Settings** (top tab row of the repo).
3. In the left menu, click **Secrets and variables**, then **Actions**. (Label may differ slightly; look for "Secrets and variables" and then "Actions".)
4. Make sure the **Secrets** tab is selected. Click **New repository secret**.
5. In **Name**, type exactly:
   ```
   CHILD_TOKEN_SECRET
   ```
6. In **Secret**, paste the value you copied in step 3a (Cmd+V).
7. Click **Add secret**.
   - **You should see:** `CHILD_TOKEN_SECRET` in the list of secrets. The value itself is hidden. That is expected.

**Do not** paste the secret anywhere except this field. Keep the value only in this one place.

---

## Step 4 — Deploy the API and the apps

### 4a. Deploy the API to Cloud Run

1. On GitHub, open the repository and click the **Actions** tab (top tab row).
2. In the left list of workflows, click **Deploy parents-and-kids API to Cloud Run** (exact name from the source).
3. Click **Run workflow** (a button above the run list). In the small panel, click the green **Run workflow** button again.
   - **You should see:** a new run appears in the list. Wait until it finishes. It can take a few minutes.
   - **Note:** the **first run may finish green with the message "not deployed"**. This is normal until Steps 1 to 3 are complete. When that happens, run the workflow again after setup.
4. When the run is finished, click it to open the run summary. Scroll to the end of the summary.
   - **You should see:** a Cloud Run service URL that looks like `https://…run.app`.
5. Copy that URL. **Remove any trailing slash** at the end.

**PASTE POINT B:** send this Cloud Run service URL to the assistant in the chat. It is not a secret. You will also paste it into GitHub in Step 4b.

### 4b. Set the two GitHub Variables

1. On GitHub, go to **Settings**, then **Secrets and variables**, then **Actions**.
2. Click the **Variables** tab. Click **New repository variable**.
3. Add the first variable:
   - **Name:** `NEXT_API_URL`
   - **Value:** the Cloud Run URL from Step 4a, with no trailing slash.
   - Click **Add variable**.
4. Click **New repository variable** again. Add the second variable:
   - **Name:** `NEXT_FIREBASE_CONFIG`
   - **Value:** the `firebaseConfig` JSON from Step 2c, on one line.
   - Click **Add variable**.
   - **You should see:** both `NEXT_API_URL` and `NEXT_FIREBASE_CONFIG` in the Variables list.

### 4c. Build the Pages site

1. On GitHub, go to the **Actions** tab.
2. In the left list of workflows, click **Deploy to GitHub Pages**.
3. Click **Run workflow**, then the green **Run workflow** button.
   - **You should see:** a new run that finishes green. This builds the `/next/` apps.

When this is finished, these two links open in a browser:

- Kids: https://eyalzur.github.io/learn-math/next/
- Parents: https://eyalzur.github.io/learn-math/next/parents/

---

## Step 5 — Install on each phone (optional for the setup, needed for daily use)

Open the link in the phone's browser.

- **iPhone (Safari):** tap the **Share** button (square with an arrow), then **Add to Home Screen**.
  - **You should see:** the app icon on the home screen.
- **Android (Chrome):** tap the **menu** (three dots), then **Install app** (or **Add to Home screen**).
  - **You should see:** the app icon on the home screen.

---

## Not covered here: subscription (paywall)

The paywall is **off** by default: no prices, no trial, no lock. Do not turn it on (`PAYWALL=1`) until pricing and payment are decided. Payment is not built yet.

---

## Troubleshooting

Copied from `FIREBASE_SETUP.md` and translated to English.

| Symptom | Likely cause |
|---|---|
| Google sign-in shows `auth/unauthorized-domain` | Step 2b: `eyalzur.github.io` missing from Authorized domains |
| Sign-in fails with `auth/configuration-not-found` or similar | `NEXT_FIREBASE_CONFIG` missing or wrong; re-run the Pages build |
| API deploy says "not deployed" | Step 1–3 not finished, or `CHILD_TOKEN_SECRET` missing |
| Children are signed out after the secret changes | Expected. Children re-link with a new code. |

---

## Never do

- Do **not** set `DEV_AUTH=1` on the deployed API. It skips real sign-in.
- Do **not** commit `CHILD_TOKEN_SECRET` or any service-account key file to the repo.
- Do **not** turn on `PAYWALL=1` before the pricing and privacy wording are final.
- Do **not** send `CHILD_TOKEN_SECRET` to anyone or anywhere except the GitHub Secrets field in Step 3b.

---

## Done when

- [ ] Step 1: all Cloud Shell commands ran (`already exists` messages ignored).
- [ ] Step 2a: Google and Email/Password (with Email link) are **Enabled** in Sign-in method.
- [ ] Step 2b: `eyalzur.github.io` is in Authorized domains.
- [ ] Step 2c: the `firebaseConfig` JSON was copied, and sent to the assistant (PASTE POINT A).
- [ ] Step 3: `CHILD_TOKEN_SECRET` is listed under GitHub Actions Secrets, and the value was never shared.
- [ ] Step 4a: the API workflow finished without "not deployed", and the Cloud Run URL was sent to the assistant (PASTE POINT B).
- [ ] Step 4b: `NEXT_API_URL` and `NEXT_FIREBASE_CONFIG` are set under GitHub Actions Variables.
- [ ] Step 4c: the Deploy to GitHub Pages workflow finished green.
- [ ] Step 5: both links open in a browser, and at least one phone has the app on its home screen.
- [ ] Checks after setup (from `FIREBASE_SETUP.md`):
  - [ ] A parent can sign in with Google.
  - [ ] A parent can sign in with an email link (the link opens the app on the same device).
  - [ ] A child profile can be created on a phone and linked with the 4-digit code shown by the parent.
  - [ ] A practice session shows up on the parent's screen.
