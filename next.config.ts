import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mediapipe/tasks-vision"],

  // This fixes the "Body exceeded 1 MB limit" error when uploading handwritten planner photos
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
    ];
  },
};

export default nextConfig;