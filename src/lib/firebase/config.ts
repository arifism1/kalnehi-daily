/**
 * Public Firebase web config (NEXT_PUBLIC_*). Safe to expose in the browser.
 * Must stay in sync with the injected block in public/sw.js (via merge-service-worker script).
 */
export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

export function isFirebaseConfigured(): boolean {
  try {
    readFirebasePublicConfig();
    return true;
  } catch {
    return false;
  }
}

export function readFirebasePublicConfig(): FirebasePublicConfig {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const messagingSenderId =
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();

  if (!apiKey || !authDomain || !projectId || !messagingSenderId || !appId) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_* env vars");
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId,
    appId,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim(),
  };
}

/** Web Push key from Firebase Console → Project settings → Cloud Messaging. */
export function readFirebaseWebVapidKey(): string {
  const k = process.env.NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY?.trim();
  if (!k) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY");
  }
  return k;
}
