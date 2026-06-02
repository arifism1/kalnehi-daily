# Android device QA matrix

Manual verification checklist for Kalnehi Daily on Android (feature areas touched by Capacitor / voice / push).

## Environments

| Shell | How |
| ----- | --- |
| Capacitor APK | Install debug/release build after `npx cap sync android`; open app (loads production URL per `capacitor.config.ts`). |
| Chrome Android (browser) | Open `https://www.kalnehi.com` signed in — **not** the Play Store shell. |
| PWA | Chrome → Add to Home screen → launch standalone. |

## Voice

Routing is in `useVoiceSttRouting`: **Capacitor Android** uses `@capacitor-community/speech-recognition` (on-device, no upload). **Chrome / PWA on Android** uses Web Speech when available; **Android WebView without the app shell** falls back to MediaRecorder → `/api/voice-transcribe` (Groq).

| Case | Capacitor APK | Chrome Android / PWA |
| ---- | ------------- | --------------------- |
| Global voice (`⌘.` / voice sheet) | Native STT; partials + command silence; retry restarts one session. | Web Speech → `/api/voice-command` (text only). |
| Dictate my day / mistakes / reflection / doubts / revision | Native long-form STT + live partials; Stop finalizes transcript. | Web Speech (long session); same parse APIs after text is captured. |
| Whisper fallback (non-app WebView only) | Not used when native STT is active. | N/A unless Web Speech unavailable (`; wv)` UA without Kalnehi shell). |

Confirm: no crash when opening mic; mic permission prompt on first use; no generic “Transcription failed” after a normal 5–10s English phrase; quota/errors surface readably.

**Debug:** Chrome → `chrome://inspect` → WebView → Network: Capacitor dictation should **not** call `/api/voice-transcribe` on success (native path). Failed Whisper fallback shows transcribe status + `errorCode` in JSON.

## Push notifications

| Shell | Expected |
| ----- | -------- |
| Capacitor (with google-services.json) | Native FCM token obtained; Settings shows "Push notifications" toggle; test notification arrives; **tap opens the correct in-app route** (`/plan`, `/focus`, `/settings`, etc.). |
| Capacitor (without google-services.json) | Firebase plugin skipped; graceful degradation (no crash). |
| Chrome / PWA | Toggle obtains FCM token via service worker when Firebase + VAPID configured; **foreground and background taps route via `data.path`**. |

### Push tap routing (manual)

| Case | Capacitor APK | PWA / Chrome |
| ---- | ------------- | -------------- |
| App in background, tap morning push | Opens `/plan` | Opens `/plan` |
| App in foreground, tap test push | Navigates to `/settings` | Navigates to `/settings` |
| Token refresh after app update | Settings → Refresh push registration re-syncs token | Same via dev tools or toggle off/on |
| Custom reminder tap | Opens `/plan` | Opens `/plan` |

Confirm: `node scripts/verify-notification-tap-routing.mjs` passes after push-related changes.

## Billing / trial (companion-app model)

The Android shell is a **companion app** — no in-app purchase or checkout.

| Shell | Expected |
| ----- | -------- |
| UA contains `KalnehiAndroidApp` (trial active) | Full app access; no paywall. |
| UA contains `KalnehiAndroidApp` (trial expired, not subscribed) | `NativeLockoutScreen` shown — informational copy only, **no** "Subscribe" or checkout button. Refresh button polls subscription status. |
| UA contains `KalnehiAndroidApp` (subscribed via web) | Full access after tapping "Refresh status" or reopening the app. |
| Billing URLs (`/pricing`, `/upgrade`, `/my-subscription`, etc.) | Server redirects to `/home` for Android UA — no Razorpay script loads. |
| `/pricing` link in `FeatureGate` | Hidden on Android (`isApp` check) — shows "Available with Smart Plan" text only. |

## Study camera (heavy WebView)

| Device tier | Check |
| ----------- | ----- |
| Mid-range phone | Study camera + MediaPipe: startup delay, thermal throttle, camera permission prompt. |
| Low memory | Tab discard / background return — session recovery acceptable? |

## Auth

Google sign-in: native path succeeds or falls back to OAuth + `com.kalnehi.daily://` return to app.

Record failures with **device model**, **Android version**, **Chrome/WebView version**, and **which shell** (APK vs browser).

## Offline + metered sync (Capacitor)

| Case | Expected |
| ---- | -------- |
| Airplane mode after one online session | Home/planner usable from IndexedDB; `SyncStatusBanner` shows offline; no repeated Supabase errors in logcat. |
| Cellular only (no Wi‑Fi) | Background task/syllabus/execution refreshes deferred; outbox still flushes when online per reachability probe. |
| Wi‑Fi restored | Silent syllabus refresh allowed after native TTL; tasks refresh on focus. |
| Vercel Analytics | Not loaded in Capacitor shell (`VercelWebVitalsGate`). |

## Cold-start offline (APK cache seed)

| Case | Expected |
| ---- | -------- |
| Fresh install → airplane mode before any online use | App opens (seeded `/home` or fallback HTML); no blank white WebView |
| Fresh install → Wi‑Fi → open `/home` → airplane mode | Planner works; syllabus visible after sync; task edits queue offline |
| `versionCode` bump without re-running `android:cache-seed` | Release process must run seed script before `bundleRelease` |
| Old APK + new server HTML | Network-first when online; seed only when offline |

## Offline capabilities (Settings)

Settings → **Offline & data use** lists which features work without internet. Confirm copy matches device behavior after changes.
