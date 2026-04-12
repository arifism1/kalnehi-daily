import * as admin from "firebase-admin";

function parseServiceAccountJson(raw: string): admin.ServiceAccount {
  let parsed: unknown = JSON.parse(raw);
  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }
  return parsed as admin.ServiceAccount;
}

export function getFirebaseMessagingAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (!raw) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
    }
    const cred = parseServiceAccountJson(raw);
    admin.initializeApp({
      credential: admin.credential.cert(cred),
    });
  }
  return admin.messaging();
}
