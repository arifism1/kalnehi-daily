# Google Play Store Submission Guide — Kalnehi Daily

Step-by-step instructions for submitting `com.kalnehi.daily` to Google Play.
Values are pre-filled from the codebase. Keep this document updated each release.

---

## Step 0: Pre-flight checklist (before opening Play Console)

- [ ] `google-services.json` placed at `android/app/google-services.json`
- [ ] `android/keystore.properties` created with keystore credentials
- [ ] Release AAB built: `cd android && ./gradlew bundleRelease`
- [ ] AAB found at `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] AAB tested on a real Android device (auth, voice, camera, trial lockout, refresh)
- [ ] `versionCode` incremented in `android/app/build.gradle` (must be unique per upload)

---

## Step 1: Create app in Play Console

URL: https://play.google.com/console

1. Click **Create app**
2. App name: **Kalnehi Daily**
3. Default language: **English (India) (en-IN)**
4. App or game: **App**
5. Free or paid: **Free**
6. Accept policies → **Create app**

---

## Step 2: Upload AAB (Internal testing track first)

1. Go to **Testing → Internal testing**
2. Click **Create new release**
3. Upload `app-release.aab` (Play Console manages signing — enroll in **Play App Signing**)
4. Release name: `1.0 (versionCode 1)`
5. Release notes: *"Initial release of Kalnehi Daily — voice-controlled study planner for JEE, NEET, UPSC and competitive exams."*
6. **Save and publish**

> After upload: go to **Setup → App integrity → App signing** and copy the **SHA-256 fingerprint of the App signing key certificate**. Set this in Vercel:
> - `TWA_PACKAGE_NAME=com.kalnehi.daily`
> - `TWA_SHA256_FINGERPRINTS=<paste fingerprint here>`
>
> Then redeploy and verify: `curl https://www.kalnehi.com/.well-known/assetlinks.json`

---

## Step 3: Store listing

### Main store listing

| Field | Value |
|-------|-------|
| **App name** | Kalnehi Daily |
| **Short description** (≤80 chars) | Voice-controlled study planner for JEE, NEET, UPSC & competitive exams |
| **Full description** (≤4000 chars) | See the text block below |
| **Category** | Education |
| **Tags** | exam preparation, study planner, JEE, NEET, UPSC, voice control |
| **Email** | curioversitylearning@gmail.com |
| **Website** | https://www.kalnehi.com |
| **Privacy policy** | https://www.kalnehi.com/privacy |

#### Full description (copy-paste ready)

```
Kalnehi Daily is the study planning OS built for serious competitive exam aspirants — JEE, NEET, UPSC, CLAT, GATE, CAT, and all other major exams.

Plan smarter. Study focused. Track everything.

──────────────────────────────────────
KEY FEATURES
──────────────────────────────────────

📋 DAILY PLANNER
Build your study day with tasks tied to your syllabus. See what's due, what's missed, and what's next — all in one view.

🎙️ VOICE CONTROL
Dictate your entire study day hands-free. Say "log 2 hours physics", "add doubt on integration", or "plan tomorrow" — Kalnehi understands.

📚 SYLLABUS TRACKER
Track chapter and topic coverage for JEE, NEET, or UPSC. Know exactly how much you've covered and what remains.

🔁 REVISION TRACKER
Auto-schedules revision based on spaced repetition. Never let a topic go cold.

🧠 MASTERMIND AI
Your personal exam coach. Ask for topic explanations, weak-area analysis, test strategy, or motivational guidance anytime.

📊 MARKS ENGINE
Log mock test scores. Track subject-wise trends. Identify weak chapters before the real exam.

📷 ON-CAMERA STUDY
Enable your front camera to keep yourself accountable during study sessions. All processing is on-device — nothing is uploaded.

🔔 SMART REMINDERS
Push notifications timed to your study schedule — morning briefing, evening review, custom reminders.

──────────────────────────────────────
HOW IT WORKS
──────────────────────────────────────

This is a companion app that syncs with your Kalnehi Daily account. Sign up and subscribe at kalnehi.com, then use this app to access all your study data on Android.

Your trial and subscription are managed at kalnehi.com — no in-app purchase required.

──────────────────────────────────────
PRIVACY
──────────────────────────────────────

Camera: used only for on-device focus monitoring. No video is recorded or uploaded.
Microphone: used for voice commands. Audio is sent to our servers only while recording.
Full details: https://www.kalnehi.com/privacy
```

### Graphic assets required

| Asset | Size | Notes |
|-------|------|-------|
| App icon | 512×512 px PNG | Use `public/icon-512x512.png` |
| Feature graphic | 1024×500 px JPG/PNG | Create in Figma/Canva — orange gradient with Kalnehi logo and tagline |
| Phone screenshots | min 2, max 8 — portrait 1080×1920 px | Use files in `public/screenshots/narrow-*.png` |
| Tablet screenshots | optional — landscape 1920×1080 px | Use files in `public/screenshots/wide-*.png` |

---

## Step 4: Content rating (IARC questionnaire)

1. Go to **Policy → App content → Content rating**
2. Click **Start questionnaire** → Category: **Utility / Productivity**
3. Answer the questions:
   - Violence: **No**
   - Sexual content: **No**
   - Language: **No**
   - Controlled substances: **No**
   - User-generated content (UGC): **Yes** — users can add doubt photos and notes
   - UGC moderation: **No real-time social features** — private per user
   - Location sharing: **No**
   - Digital purchases: **No** (companion app — no in-app purchase)
4. Result should be **Everyone** or **Everyone 10+**

---

## Step 5: Data safety form

URL: **Policy → App content → Data safety**

### Data collected and shared

| Data type | Collected | Shared | Optional? | Purpose |
|-----------|-----------|--------|-----------|---------|
| Name | Yes | No | No | Account profile |
| Email address | Yes | No | No | Account authentication |
| Audio files | Yes | No | No | Voice planning (sent to transcription API while recording) |
| Photos | Yes | No | Yes | Doubt tracking (user-initiated upload) |
| App activity | Yes | No | No | Study logs, streaks, daily plans |
| Device or other IDs | Yes | No | No | Push notification token (FCM) |
| Crash logs | Yes (Firebase Crashlytics if enabled) | No | No | App stability |

### Data not collected

- Location
- Financial info (payments handled entirely on the website, not in this app)
- Health and fitness
- Contacts, SMS, call logs, calendar

### Security practices

- [ ] **Data is encrypted in transit** — all server communication uses HTTPS
- [ ] **You can request data deletion** — see https://www.kalnehi.com/account-deletion

### Answers per section in the form

**Location:** No location data collected.

**Personal info:** Name and email collected. Not shared with third parties. Used to provide the app's core features.

**Financial info:** Not collected in the app. (Payments happen at kalnehi.com in the user's browser.)

**Health and fitness:** Not collected.

**Messages:** Not collected.

**Photos and videos:** Users may optionally upload photos when tracking doubts. Stored securely on Supabase servers.

**Audio:** Voice recordings captured while user is actively dictating. Sent to Groq/Whisper transcription API. Not stored persistently after transcription.

**Files and docs:** Not collected.

**Calendar:** Not collected.

**Contacts:** Not collected.

**App activity:** Study plans, tasks, progress, streaks, and session logs collected. Used to provide core features. Not shared with third parties.

**Web browsing:** Not collected.

**App info and performance:** App crash logs may be collected if Firebase Crashlytics is enabled.

**Device or other IDs:** FCM registration token collected for push notifications. Not shared.

---

## Step 6: App access

1. Go to **Testing → Internal testing → Manage → App access**
2. Select: **All functionality is available without special access** — OR —
3. If reviewers cannot create an account: select **All or some functionality is restricted** and provide:
   - **Test account email:** *(create a dedicated test account)*
   - **Test account password:** *(set a simple test password)*
   - **Instructions:** "Create a new account via Google Sign-In on the sign-in screen. The 7-day trial activates automatically after sign-in."

---

## Step 7: Declarations

### Ads
- **Does your app contain ads?** → No
  (GA4 / Meta Pixel load on the website with cookie consent, not in the Android app shell.)

### In-app purchases / subscriptions
- **Does your app offer in-app purchases?** → No
  (This is a companion app. Subscriptions are managed at kalnehi.com.)

### Target audience
- **Target age group:** 13 and over (or 18+ if you prefer — exam prep audience)
- **Does the app appeal to children?** → No

### News apps
- Not a news app → No

### COVID-19 contact tracing
- Not applicable → No

---

## Step 8: Review and publish

1. All sections in the left sidebar should show a green tick
2. Click **Publish to internal testing**
3. Share the internal testing opt-in URL with yourself / a test device
4. Install and verify:
   - [ ] App installs and loads kalnehi.com
   - [ ] Google sign-in works (returns to app after OAuth)
   - [ ] Voice recording triggers mic permission prompt
   - [ ] Study camera triggers camera permission prompt
   - [ ] Trial lockout shows "Your trial has ended" with **no** subscribe button
   - [ ] Tapping "Refresh status" after subscribing on the web unlocks the app
   - [ ] Deep links (e.g. `https://www.kalnehi.com/home`) open the app (requires assetlinks set up)
   - [ ] `/pricing` and `/upgrade` redirect to `/home` (billing URLs blocked)
5. Once internal testing passes, promote to **Closed testing → Open testing → Production**

---

## Step 9: App signing key → Asset Links

After uploading the first AAB to any track:

1. **Play Console → Setup → App integrity → App signing**
2. Copy the **SHA-256 certificate fingerprint** (format: `AB:CD:EF:...`)
3. Set in Vercel Dashboard (Production environment):
   - `TWA_PACKAGE_NAME` = `com.kalnehi.daily`
   - `TWA_SHA256_FINGERPRINTS` = the fingerprint from step 2
4. Trigger a Vercel redeploy
5. Verify the endpoint: `curl https://www.kalnehi.com/.well-known/assetlinks.json`
   - Should return a JSON array with your package name and fingerprint

---

## Version bump checklist (every release)

- [ ] Bump `versionCode` (must be unique, monotonically increasing) in `android/app/build.gradle`
- [ ] Update `versionName` (human-readable, e.g. `"1.1"`)
- [ ] Run `npx cap sync android` to sync latest web assets / config
- [ ] Run `cd android && ./gradlew bundleRelease`
- [ ] Upload new AAB to Play Console on the appropriate track
- [ ] Write release notes

---

## Reference URLs

- Privacy policy: https://www.kalnehi.com/privacy
- Terms: https://www.kalnehi.com/terms
- Refund policy: https://www.kalnehi.com/refund
- Account deletion: https://www.kalnehi.com/account-deletion
- Support: curioversitylearning@gmail.com
- Play Console: https://play.google.com/console
