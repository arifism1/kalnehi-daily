"use client";

import { useEffect } from "react";

/**
 * Next.js App Router global error boundary — catches errors in the root layout itself.
 * Must include its own <html> and <body> since the root layout may be broken.
 * Fonts and Tailwind are loaded via inline styles to avoid asset dependency failures.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Kalnehi] Global error:", error);
  }, [error]);

  return (
    <html lang="en-IN">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAF7F2",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "360px",
            width: "100%",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: "rgba(255,122,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            ⚠️
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "#1a1a1a",
              }}
            >
              Kalnehi Daily crashed
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                lineHeight: 1.6,
                color: "#666",
              }}
            >
              An unexpected error occurred. Your study data is safe. Tap below
              to restart the app.
            </p>
          </div>

          <button
            type="button"
            onClick={reset}
            style={{
              width: "100%",
              minHeight: 48,
              borderRadius: 12,
              backgroundColor: "#FF7A00",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.9375rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Restart the app
          </button>

          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            style={{
              background: "none",
              border: "none",
              color: "#FF7A00",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Back to start
          </button>
        </div>
      </body>
    </html>
  );
}
