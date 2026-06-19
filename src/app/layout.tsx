import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display, Syne } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/components/AuthProvider";
import { SubscriptionAccessProvider } from "@/hooks/useSubscriptionAccess";
import { FcmForegroundListener } from "@/components/FcmForegroundListener";
import { FcmNativeListener } from "@/components/FcmNativeListener";
import { OrganicEntryCapture } from "@/components/OrganicEntryCapture";
import { ReferralCapture } from "@/components/ReferralCapture";
import { JsonLd } from "@/components/seo/JsonLd";
import { PwaServiceWorkerUpdateProvider } from "@/components/pwa/PwaServiceWorkerUpdateProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { StoragePersistenceInit } from "@/components/StoragePersistenceInit";
import { ThemeSync } from "@/components/ThemeSync";
import { UiPrefsRemoteSync } from "@/components/UiPrefsRemoteSync";
import {
  defaultSiteMetadata,
  PWA_STANDALONE_DISPLAY_NAME,
  SITE_NAME,
} from "@/lib/seo-metadata";
import { OAuthAuthAnalytics } from "@/components/OAuthAuthAnalytics";
import { CookieConsentProvider } from "@/components/consent/CookieConsentProvider";
import { CapacitorDeepLinkHandler } from "@/components/CapacitorDeepLinkHandler";
import { CapacitorNativeSwPilot } from "@/components/CapacitorNativeSwPilot";
import { CapacitorNetworkSyncBridge } from "@/components/CapacitorNetworkSyncBridge";
import { CapacitorOfflineWarmup } from "@/components/CapacitorOfflineWarmup";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { NativeSyncPolicyInit } from "@/components/NativeSyncPolicyInit";
import { VercelWebVitalsGate } from "@/components/VercelWebVitalsGate";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-syne",
  display: "swap",
});

/** Pixel-accurate launch images — must match each file in /public/splash and SPLASH_SIZES in scripts/pwa-assets.mjs. */
const appleStartupImages = [
  // ── iPhone (newest first) ────────────────────────────────────────────────
  {
    url: "/splash/apple-1320x2868.png",
    media:
      "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    url: "/splash/apple-1206x2622.png",
    media:
      "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    url: "/splash/apple-1290x2796.png",
    media:
      "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    url: "/splash/apple-1179x2556.png",
    media:
      "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    url: "/splash/apple-1170x2532.png",
    media:
      "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    url: "/splash/apple-1284x2778.png",
    media:
      "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    url: "/splash/apple-1242x2688.png",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    url: "/splash/apple-828x1792.png",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    url: "/splash/apple-750x1334.png",
    media:
      "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
  },
  // ── iPad ─────────────────────────────────────────────────────────────────
  {
    url: "/splash/apple-2064x2752.png",
    media:
      "(device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    url: "/splash/apple-2048x2732.png",
    media:
      "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    url: "/splash/apple-1668x2388.png",
    media:
      "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    url: "/splash/apple-1640x2360.png",
    media:
      "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    url: "/splash/apple-1488x2266.png",
    media:
      "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    url: "/splash/apple-1536x2048.png",
    media:
      "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
  },
] as const;

const baseMeta = defaultSiteMetadata();
const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ??
  process.env.GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  ...baseMeta,
  // Shown in browser tab UI and used by TWA as the app label fallback.
  applicationName: SITE_NAME,
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
  appleWebApp: {
    capable: true,
    title: PWA_STANDALONE_DISPLAY_NAME,
    statusBarStyle: "black-translucent",
    startupImage: [...appleStartupImages],
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-167.png", sizes: "167x167", type: "image/png" },
      { url: "/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/apple-touch-icon-120.png", sizes: "120x120", type: "image/png" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    // Disable tap highlight flash on Windows/Edge
    "msapplication-tap-highlight": "no",
    // Tile colour for Windows/Edge "pin to start"
    "msapplication-TileColor": "#FF7A00",
  },
};

// Allow pinch-to-zoom and browser zoom (WCAG 1.4.4 / PageSpeed accessibility).
// Audit key layouts at ~200–400% zoom if regressions appear.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF7A00",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-IN"
      data-scroll-behavior="smooth"
      className={`${dmSans.variable} ${dmSerifDisplay.variable} ${syne.variable} h-full min-h-dvh min-h-[-webkit-fill-available] antialiased`}
    >
      <body className="flex min-h-dvh min-h-[-webkit-fill-available] flex-col bg-kal-page font-sans text-kal-text">
        <CookieConsentProvider>
          <OAuthAuthAnalytics />
          <CapacitorDeepLinkHandler />
          <PwaServiceWorkerUpdateProvider>
            <JsonLd />
            <OrganicEntryCapture />
            <ReferralCapture />
            <ThemeSync />
            <ServiceWorkerRegister />
            <AuthProvider>
              <SubscriptionAccessProvider>
                <UiPrefsRemoteSync />
                <StoragePersistenceInit />
                <FcmForegroundListener />
                <FcmNativeListener />
                <CapacitorNetworkSyncBridge />
                <CapacitorOfflineWarmup />
                <CapacitorNativeSwPilot />
                <NativeSyncPolicyInit />
                <GlobalErrorBoundary>
                  <AppShell>{children}</AppShell>
                </GlobalErrorBoundary>
              </SubscriptionAccessProvider>
            </AuthProvider>
            <VercelWebVitalsGate />
          </PwaServiceWorkerUpdateProvider>
        </CookieConsentProvider>
      </body>
    </html>
  );
}
