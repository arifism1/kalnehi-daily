# Android device QA matrix

Manual verification checklist for Kalnehi Daily on Android (feature areas touched by Capacitor / voice / push).

## Environments

| Shell | How |
| ----- | --- |
| Capacitor APK | Install debug/release build after `npx cap sync android`; open app (loads production URL per `capacitor.config.ts`). |
| Chrome Android (browser) | Open `https://www.kalnehi.com` signed in — **not** the Play Store shell. |
| PWA | Chrome → Add to Home screen → launch standalone. |

## Voice

| Case | Capacitor shell | Chrome Android |
| ---- | ---------------- | -------------- |
| Global voice (`⌘.` / voice sheet) | Native STT partials + command silence; retry restarts single session. | MediaRecorder → `/api/voice-transcribe` (no Web Speech). |
| Dictate my day / mistakes / reflection / doubts / revision dialog | Native long-form STT + partials where applicable. | Browser Whisper long session (`VOICE_LONG_FORM_MAX_SESSION_MS`). |

Confirm: no crash when opening mic; quota/errors surface readably.

## Push notifications

| Shell | Expected |
| ----- | -------- |
| Capacitor (with google-services.json) | Native FCM token obtained; Settings shows "Push notifications" toggle; test notification arrives. |
| Capacitor (without google-services.json) | Firebase plugin skipped; graceful degradation (no crash). |
| Chrome / PWA | Toggle obtains FCM token via service worker when Firebase + VAPID configured. |

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
