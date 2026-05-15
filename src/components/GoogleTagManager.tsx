import Script from "next/script";

const GTM_CONTAINER_ID = "GTM-K76BLZFN";

type Props = {
  /** When false, Google ad-related consent signals stay denied (analytics still granted). */
  marketingConsent: boolean;
};

/**
 * GTM bootstrap after explicit analytics consent. Emits a Consent Mode `update`
 * before `gtm.js` so tags that respect consent see the right state.
 *
 * Note: moved from `beforeInteractive` to `afterInteractive` so it only runs after
 * the cookie banner choice (client-gated parent).
 */
export function GoogleTagManagerHead({ marketingConsent }: Props) {
  const adState = marketingConsent ? "granted" : "denied";
  const bootstrap = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'update', {
  analytics_storage: 'granted',
  ad_storage: '${adState}',
  ad_user_data: '${adState}',
  ad_personalization: '${adState}',
});
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');
`;

  return (
    <Script id="google-tag-manager" strategy="afterInteractive">
      {bootstrap}
    </Script>
  );
}

/** GTM noscript fallback — only mount when GTM is actually loaded. */
export function GoogleTagManagerNoScript() {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
        height={0}
        width={0}
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
