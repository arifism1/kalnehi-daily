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
| Capacitor | Settings shows banner: web push not registered in shell; open site in Chrome for reminders. |
| Chrome / PWA | Toggle can obtain FCM token when Firebase + VAPID configured. |

## Billing / trial

| Shell | Expected |
| ----- | -------- |
| UA contains `KalnehiAndroidApp` | Paywall shows native lockout copy (no Razorpay script); server redirects billing URLs away from checkout when applicable. |

## Study camera (heavy WebView)

| Device tier | Check |
| ----------- | ----- |
| Mid-range phone | Study camera + MediaPipe: startup delay, thermal throttle, camera permission prompt. |
| Low memory | Tab discard / background return — session recovery acceptable? |

## Auth

Google sign-in: native path succeeds or falls back to OAuth + `com.kalnehi.daily://` return to app.

Record failures with **device model**, **Android version**, **Chrome/WebView version**, and **which shell** (APK vs browser).
