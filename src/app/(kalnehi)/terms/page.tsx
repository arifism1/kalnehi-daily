import {
  SITE_NAME,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO_HREF,
} from "@/lib/seo-metadata";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 pb-8 text-[15px] leading-relaxed text-kal-text sm:text-base">
      <h1 className="kal-feature-title">
        Terms &amp; Conditions
      </h1>
      <p>
        <strong>Last updated:</strong> May 16, 2026
      </p>
      <p>
        These Terms &amp; Conditions govern your use of {SITE_NAME} operated
        by Neven Academy Assam. Our{" "}
        <a
          href="/privacy"
          className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
        >
          Privacy Policy
        </a>{" "}
        explains how we process personal data and cookies.
      </p>
      <p>
        <strong>Acceptance of Terms</strong>
      </p>
      <p>
        By accessing or using {SITE_NAME}, you agree to these Terms. If you
        do not agree, you must not use the app.
      </p>
      <p>
        <strong>Description of Service</strong>
      </p>
      <p>
        {SITE_NAME} is a digital study planning tool for competitive exam
        preparation. It includes AI-powered features like voice dictation,
        planner scanning, progress tracking, and more.
      </p>
      <p>
        <strong>User Responsibilities</strong>
      </p>
      <p>
        You are solely responsible for your use of the app and all outcomes.
        You must use the app only for lawful purposes.
      </p>
      <p>
        <strong>AI Features – Strong Disclaimer</strong>
      </p>
      <p>
        The app uses Artificial Intelligence.{" "}
        <strong>We are not responsible</strong> for any AI output.         AI may
        produce wrong, inaccurate, incomplete, or misleading results. You use
        all AI features <strong>entirely at your own risk</strong>.
      </p>
      <p>
        <strong>No Warranties</strong>
      </p>
      <p>
        The app is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; with{" "}
        <strong>zero warranties</strong>. We do not guarantee that the app
        will help you improve your exam scores, work without errors, or meet
        your expectations.
      </p>
      <p>
        <strong>Limitation of Liability</strong>
      </p>
      <p>
        To the maximum extent permitted by law, Neven Academy Assam and its
        owner shall have <strong>ZERO LIABILITY</strong> and{" "}
        <strong>ZERO RESPONSIBILITY</strong> for any loss, damage, missed
        opportunity, financial loss, emotional distress, or any other harm
        resulting from your use of the app.
      </p>
      <p>
        <strong>Indemnification</strong>
      </p>
      <p>
        You agree to indemnify and hold us harmless from any claims, damages,
        or losses arising from your use of the app.
      </p>
      <p>
        <strong>Intellectual Property</strong>
      </p>
      <p>
        All content and features belong to Neven Academy Assam. You may not copy
        or distribute any part of the app.
      </p>
      <p>
        <strong>Cookies and marketing technologies</strong>
      </p>
      <p>
        Optional analytics and marketing tags (for example Google Analytics / Tag
        Manager and Meta Pixel) load only if you opt in via the cookie banner or{" "}
        <strong>Cookie settings</strong>. Essential cookies needed for sign-in and
        security may still be set. See the Privacy Policy for details.
      </p>
      <p>
        <strong>Statutory rights</strong>
      </p>
      <p>
        Nothing in these Terms excludes or limits any consumer, data-protection, or
        other rights that applicable law guarantees you and that cannot lawfully be
        waived. If a court or regulator finds part of these Terms unenforceable, the
        remainder stays in effect to the fullest extent permitted.
      </p>
      <p>
        <strong>Governing Law</strong>
      </p>
      <p>
        These Terms are governed by the laws of India. Any dispute shall be
        subject to the exclusive jurisdiction of courts in Mangaldoi, Assam.
      </p>
      <p>
        <strong>Contact</strong>
      </p>
      <p>
        Neven Academy Assam
        <br />
        1000, Uday Nagar, Bono Durga Mandir, Karim Chowk, K.Chowka, Ward No.4,
        Mangaldoi, Darrang, Assam, 784125
        <br />
        Phone: 9101776379
        <br />
        Email:{" "}
        <a
          href={SUPPORT_MAILTO_HREF}
          className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
    </article>
  );
}
