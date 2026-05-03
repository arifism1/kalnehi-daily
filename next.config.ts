import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

/**
 * App CSP (enforced + report-only duplicate for tuning in devtools).
 * Still allows inline/eval for third-party scripts (GA, Razorpay, MediaPipe); tighten with
 * nonces/hashes in a follow-up when feasible.
 * Covers Supabase, Firebase, Vercel Analytics, GA4, Meta Pixel, Razorpay checkout, MediaPipe CDNs.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // NOTE: "upgrade-insecure-requests" is valid here (enforced header) but
  // MUST NOT appear in the Report-Only variant — see REPORT_ONLY_CSP below.
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://connect.facebook.net",
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://checkout.razorpay.com",
    "https://www.gstatic.com",
    "https://cdn.jsdelivr.net",
  ].join(" "),
  ["style-src", "'self'", "'unsafe-inline'", "https://fonts.googleapis.com"].join(
    " ",
  ),
  ["font-src", "'self'", "data:", "https://fonts.gstatic.com"].join(" "),
  ["img-src", "'self'", "data:", "blob:", "https:"].join(" "),
  [
    "connect-src",
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://connect.facebook.net",
    "https://*.facebook.com",
    "https://*.fbcdn.net",
    "https://*.googleapis.com",
    "https://*.gstatic.com",
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
    "https://storage.googleapis.com",
    "https://cdn.jsdelivr.net",
    "https://*.firebaseio.com",
    "https://*.firebase.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firebase.googleapis.com",
    "https://checkout.razorpay.com",
    "https://api.razorpay.com",
    "https://lumberjack.razorpay.com",
  ].join(" "),
  ["worker-src", "'self'", "blob:"].join(" "),
  ["frame-src", "'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"].join(
    " ",
  ),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Report-Only CSP — identical to the enforced policy except:
 * - "upgrade-insecure-requests" is excluded: the spec forbids it in report-only
 *   mode and browsers log a security warning when it appears there.
 */
const REPORT_ONLY_CSP = CONTENT_SECURITY_POLICY.replace(
  /;\s*upgrade-insecure-requests/,
  "",
);

const marketingPublicCacheHeader = {
  key: "Cache-Control",
  value: "public, s-maxage=60, stale-while-revalidate=86400",
};

const marketingCacheSources = [
  "/guides",
  "/guides/:path*",
  "/what-can-kalnehi-do",
  "/best-study-practices",
  "/brain-yoga",
  "/jee-study-planner",
  "/neet-study-planner",
  "/neet-pg-study-planner",
  "/boards-study-planner",
  "/cuet-ug-study-planner",
  "/upsc-study-planner",
];

const nextConfig: NextConfig = {
  transpilePackages: ["@mediapipe/tasks-vision"],

  // Large payloads for planner uploads / media (e.g. study camera, attachments)
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
    // Enables the View Transitions API for route changes — gives iOS-style
    // cross-fade between pages on Chrome Android (Safari skips gracefully).
    viewTransition: true,
  },

  async redirects() {
    return [
      // Apex → www: any request to kalnehi.com (with or without a path) is
      // permanently redirected to www.kalnehi.com. This makes www the single
      // canonical origin for SEO, PWA install scope, and TWA asset-links.
      {
        source: "/:path*",
        has: [{ type: "host", value: "kalnehi.com" }],
        destination: "https://www.kalnehi.com/:path*",
        permanent: true,
      },
      {
        source: "/revision-engine",
        destination: "/revision-reminders",
        permanent: true,
      },
      {
        source: "/pending",
        destination: "/missed-tasks",
        permanent: true,
      },
      {
        source: "/my-plan",
        destination: "/my-subscription",
        permanent: true,
      },
      {
        source: "/planner/exam-timeline",
        destination: "/planner",
        permanent: true,
      },
      {
        source: "/prepbrain",
        destination: "/mastermind",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [];
  },

  async headers() {
    const marketingCacheHeaders = marketingCacheSources.map((source) => ({
      source,
      headers: [marketingPublicCacheHeader],
    }));

    return [
      ...marketingCacheHeaders,
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: CONTENT_SECURITY_POLICY,
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: REPORT_ONLY_CSP,
          },
        ],
      },
    ];
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);