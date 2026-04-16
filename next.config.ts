import type { NextConfig } from "next";

/**
 * Report-only CSP: tune using browser console / reporting endpoint before enforcing.
 * Covers Supabase, Firebase, Vercel Analytics, GA4, Razorpay checkout, MediaPipe CDNs.
 */
const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
  "default-src 'self'",
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
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

const nextConfig: NextConfig = {
  transpilePackages: ["@mediapipe/tasks-vision"],

  // Large payloads for planner uploads / media (e.g. study camera, attachments)
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },

  async rewrites() {
    return [
      {
        // TWA Digital Asset Links verification — Play Console reads this URL.
        source: "/.well-known/assetlinks.json",
        destination: "/api/digital-asset-links",
      },
    ];
  },

  async headers() {
    return [
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
        // Ensure correct content-type for asset links; Play Console is strict about this.
        source: "/.well-known/assetlinks.json",
        headers: [{ key: "Content-Type", value: "application/json" }],
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
            key: "Content-Security-Policy-Report-Only",
            value: CONTENT_SECURITY_POLICY_REPORT_ONLY,
          },
        ],
      },
    ];
  },
};

export default nextConfig;