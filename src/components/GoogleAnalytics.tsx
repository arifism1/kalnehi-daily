"use client";

import Script from "next/script";

/**
 * Loads GA4 when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set (e.g. G-XXXXXXXXXX).
 * Should mount only after the user has opted into analytics cookies; sends a
 * Consent Mode update before `config` so tags align with choices.
 */
export function GoogleAnalytics({
  marketingConsent = false,
}: {
  marketingConsent?: boolean;
}) {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!id) return null;

  const adState = marketingConsent ? "granted" : "denied";

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="kalnehi-ga4" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'update', {
  analytics_storage: 'granted',
  ad_storage: '${adState}',
  ad_user_data: '${adState}',
  ad_personalization: '${adState}',
});
gtag('js', new Date());
gtag('config', '${id}', { send_page_view: true });
`}
      </Script>
    </>
  );
}
