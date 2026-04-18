"use client";

import Script from "next/script";

/**
 * Loads GA4 when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set (e.g. G-XXXXXXXXXX).
 * Configure the data stream in Google Analytics; pair with Search Console.
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="lazyOnload"
      />
      <Script id="kalnehi-ga4" strategy="lazyOnload">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}', { send_page_view: true });
`}
      </Script>
    </>
  );
}
