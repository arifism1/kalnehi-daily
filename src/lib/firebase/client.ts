"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

import { readFirebasePublicConfig } from "@/lib/firebase/config";

let app: FirebaseApp | undefined;

export function getFirebaseAppBrowser(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("getFirebaseAppBrowser is browser-only");
  }
  if (app) return app;
  if (getApps().length) {
    app = getApp();
    return app;
  }
  app = initializeApp(readFirebasePublicConfig());
  return app;
}
