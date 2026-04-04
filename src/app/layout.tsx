import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/components/AuthProvider";
import { SyncProvider } from "@/components/SyncProvider";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kalnehi Daily",
  description:
    "WIN DAILY — competitive exam execution, syllabus mastery, and accountability.",
  manifest: "/manifest.json",
  applicationName: "Kalnehi Daily",
  appleWebApp: {
    capable: true,
    title: "Kalnehi Daily",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon-512x512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/icon-512x512.png", sizes: "512x512" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#020617] font-sans text-zinc-100">
        <AuthProvider>
          <SyncProvider>
            <AppShell>{children}</AppShell>
          </SyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
