import Script from "next/script";

const GTM_CONTAINER_ID = "GTM-K76BLZFN";

/**
 * GTM bootstrap — `beforeInteractive` is emitted into `<head>` even though this component is
 * rendered under `<body>` in the root layout (Next.js rejects `<script>` / `next/script` under `<head>` in the tree).
 */
export function GoogleTagManagerHead() {
  return (
    <Script id="google-tag-manager" strategy="beforeInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`}
    </Script>
  );
}

/** GTM noscript fallback — place immediately after opening <body>. */
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
