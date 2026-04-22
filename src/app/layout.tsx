import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/components/AuthProvider";
import { SubscriptionAccessProvider } from "@/hooks/useSubscriptionAccess";
import { FcmForegroundListener } from "@/components/FcmForegroundListener";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { OrganicEntryCapture } from "@/components/OrganicEntryCapture";
import { JsonLd } from "@/components/seo/JsonLd";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ThemeSync } from "@/components/ThemeSync";
import { defaultSiteMetadata, SITE_NAME } from "@/lib/seo-metadata";

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

/** Pixel-accurate launch images — must match each file in /public/splash. */
const appleStartupImages = [
  {
    url: "/splash/apple-1290x2796.png",
    media:
      "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
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
  {
    url: "/splash/apple-1536x2048.png",
    media:
      "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    url: "/splash/apple-1668x2388.png",
    media:
      "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    url: "/splash/apple-2048x2732.png",
    media:
      "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
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
    title: SITE_NAME,
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
    ],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    // PWA / TWA chrome signals
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": SITE_NAME,
    // Disable tap highlight flash inside the TWA chrome shell
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
      className={`${dmSans.variable} ${dmSerifDisplay.variable} h-full antialiased`}
    >
      <body className="flex min-h-full min-h-dvh flex-col bg-kal-page font-sans text-kal-text">
        <JsonLd />
        <OrganicEntryCapture />
        <GoogleAnalytics />
        <ThemeSync />
        <ServiceWorkerRegister />
        <AuthProvider>
          <SubscriptionAccessProvider>
            <FcmForegroundListener />
            <AppShell>{children}</AppShell>
          </SubscriptionAccessProvider>
        </AuthProvider>
        <Analytics />
        <SpeedInsights sampleRate={0.5} />
      </body>
    </html>
  );
}
