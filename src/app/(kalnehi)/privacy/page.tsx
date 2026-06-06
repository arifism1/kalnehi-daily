import Link from "next/link";

import {
  DPDP_GRIEVANCE_ACK_HOURS,
  DPDP_GRIEVANCE_RESOLVE_DAYS,
  DPDP_RIGHTS_SLA_DAYS,
  GRIEVANCE_OFFICER_EMAIL,
  GRIEVANCE_OFFICER_NAME,
} from "@/lib/dpdp/constants";
import {
  SITE_NAME,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO_HREF,
} from "@/lib/seo-metadata";

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 pb-8 text-[15px] leading-relaxed text-kal-text sm:text-base">
      <h1 className="kal-feature-title">Privacy Policy</h1>
      <p>
        <strong>Last updated:</strong> June 6, 2026
      </p>
      <p>
        Neven Academy Assam (“<strong>we</strong>”, “<strong>us</strong>”) operates{" "}
        {SITE_NAME} (the “<strong>Service</strong>”), available at www.kalnehi.com.
        This Privacy Policy explains what personal data we process, why we process
        it, how long we keep it, who we work with, and what choices you have. If
        anything here conflicts with stricter rules in your country, those rules
        apply where the law says they must.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">1. Data controller</h2>
        <p>
          The controller responsible for personal data processed in connection with
          the Service is Neven Academy Assam (contact details under{" "}
          <strong>Contact</strong> and <strong>Grievance Officer</strong> below).
          For product support and privacy requests, you can also reach us at{" "}
          <a
            href={SUPPORT_MAILTO_HREF}
            className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          2. Categories of personal data
        </h2>
        <p>Depending on how you use the Service, we may process:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Account &amp; profile:</strong> name, email address, phone
            number (if you provide it), exam targets, class/year, preferences you
            save in Settings, and similar profile fields.
          </li>
          <li>
            <strong>Product usage content:</strong> tasks, study logs, planner
            uploads, syllabi selections, habit and timer data, Mastermind / chat
            history you generate in the product, doubt notes, mock scores, and
            related study metadata.
          </li>
          <li>
            <strong>Media you choose to send to our servers:</strong> e.g. voice
            recordings or images where a feature uploads or processes them for you.
            Features that are explicitly on-device only (such as on-device study
            camera processing described in-product) do not upload your video to our
            servers.
          </li>
          <li>
            <strong>Transactional &amp; billing:</strong> subscription status,
            payment-related references from our payment provider (we do not store
            full card numbers on our systems), and billing support messages you
            send us.
          </li>
          <li>
            <strong>Technical &amp; security:</strong> IP address, device/browser
            type, coarse location derived from IP, headers, approximate timestamps,
            diagnostic logs, fraud-prevention signals, and similar metadata needed to
            operate and secure the Service.
          </li>
          <li>
            <strong>Support communications:</strong> the contents of emails or
            in-app support messages you send to us.
          </li>
          <li>
            <strong>Marketing &amp; analytics identifiers:</strong> cookies and
            similar technologies, and advertising/analytics IDs, when you consent via
            our cookie banner (see section 4).
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          3. Purposes and legal bases
        </h2>
        <p>We use personal data for the following purposes:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Providing the Service</strong> (contract / steps prior to
            contract): account creation, authentication, syncing your data across
            devices, core product features, customer support, and billing.
          </li>
          <li>
            <strong>Security &amp; abuse prevention</strong> (legitimate interests,
            and legal obligations where applicable): rate limiting, debugging
            serious incidents, enforcing our Terms, and protecting users.
          </li>
          <li>
            <strong>Product improvement</strong> (legitimate interests, and where
            required, consent): aggregated or de-identified analytics; optional
            analytics cookies only if you opt in (section 4).
          </li>
          <li>
            <strong>AI-assisted features</strong> (contract / legitimate interests):
            processing inputs you send to AI features to generate outputs for you.
          </li>
          <li>
            <strong>Marketing measurement</strong> (consent): optional Meta Pixel
            and related cookies if you opt in.
          </li>
          <li>
            <strong>Legal compliance:</strong> responding to lawful requests and
            meeting accounting, tax, or regulatory obligations.
          </li>
        </ul>
        <p>
          Where we rely on <strong>consent</strong>, you can withdraw it at any time
          without affecting the lawfulness of processing based on consent before its
          withdrawal (for example by changing choices in{" "}
          <strong>Cookie settings</strong>, using our{" "}
          <Link
            href="/dpdp-rights"
            className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
          >
            Data Principal Rights portal
          </Link>
          , or emailing us).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          4. Cookies and similar technologies
        </h2>
        <p>
          We use <strong>essential</strong> first-party cookies and storage (for
          example session / authentication tokens managed by our auth provider) that
          are needed for login and security. Those are not toggled off by the cookie
          banner because the Service cannot function without them.
        </p>
        <p>
          We use <strong>optional</strong> analytics and marketing technologies only
          if you opt in via the cookie banner (available on first visit and from{" "}
          <strong>Cookie settings</strong> in the app and marketing site footer).
          Currently:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Analytics:</strong> Google Analytics 4 and Google Tag Manager
            (Google LLC) — helps us understand traffic and product usage.
          </li>
          <li>
            <strong>Marketing / measurement:</strong> Meta Pixel (Meta Platforms,
            Inc.) — helps us measure ads and build custom audiences where permitted.
          </li>
        </ul>
        <p>
          You can change your mind anytime via <strong>Cookie settings</strong>.
          Your browser may also let you block cookies; blocking essential cookies may
          break sign-in.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          5. Subprocessors and recipients
        </h2>
        <p>
          We use vetted service providers (“subprocessors”) who process personal
          data on our behalf under appropriate agreements. Depending on your use of
          the Service, this may include categories of providers such as:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Hosting &amp; edge:</strong> Vercel Inc. (application hosting,
            edge configuration, observability).
          </li>
          <li>
            <strong>Database &amp; authentication:</strong> Supabase (managed
            Postgres, auth, storage APIs).
          </li>
          <li>
            <strong>Email &amp; transactional messaging:</strong> Resend and similar
            providers for account and product email.
          </li>
          <li>
            <strong>Payments:</strong> Razorpay (or other processors we enable for
            your region) for checkout and subscription billing.
          </li>
          <li>
            <strong>Push notifications:</strong> Firebase Cloud Messaging /
            Google infrastructure when you enable web push.
          </li>
          <li>
            <strong>AI inference:</strong> model providers we route requests through
            (for example Groq, DeepInfra, Google Gemini for specific features), only
            for content you submit to those features.
          </li>
          <li>
            <strong>Analytics &amp; ads (with consent):</strong> Google (GA4 / GTM)
            and Meta (Pixel), as described in section 4.
          </li>
          <li>
            <strong>Rate limiting / abuse protection:</strong> Upstash or comparable
            infrastructure for distributed rate limits.
          </li>
          <li>
            <strong>Error monitoring:</strong> Sentry (diagnostic logs for security
            and reliability).
          </li>
        </ul>
        <p>
          We may also disclose information if required by law, to protect rights and
          safety, or in connection with a merger or acquisition, as permitted by
          applicable law.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          6. International transfers
        </h2>
        <p>
          Our subprocessors may process data in India, the European Economic Area,
          the United States, and other regions. Personal data may be transferred to
          US-based processors including Vercel, Groq, Firebase, Google (analytics/AI),
          Meta (with consent), and Sentry. Where personal data is transferred from
          the EEA, UK, Switzerland, or where otherwise required, we rely on
          appropriate safeguards (such as Standard Contractual Clauses) in addition
          to technical and organizational measures.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">7. Retention</h2>
        <p>
          We keep personal data only as long as needed for the purposes above,
          including legal, accounting, and dispute-resolution needs. Exact retention
          varies by data category (for example billing records may be kept longer
          than transient security logs). When data is no longer needed we delete or
          de-identify it where possible.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">8. Security</h2>
        <p>
          We implement reasonable administrative, technical, and physical
          safeguards designed to protect personal data (including transport
          encryption, access controls on production systems, and separation of
          privileged keys on the server). No method of transmission over the
          internet is 100% secure; if you believe your account is compromised,
          contact us promptly.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">9. AI features</h2>
        <p>
          Some features use third-party AI models to process inputs you provide and
          generate suggestions or structured data.{" "}
          <strong>Outputs can be wrong, incomplete, or misleading.</strong> AI is an
          assistive tool, not a source of legal, medical, financial, or official exam
          advice. You remain responsible for how you use outputs and for verifying
          important information through authoritative sources.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          10. Your rights under DPDP and applicable law
        </h2>
        <p>
          Under India&apos;s Digital Personal Data Protection Act, 2023 (DPDP Act)
          and applicable law, you may have the following rights regarding your
          personal data:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Right to access information:</strong> obtain a summary of
            personal data we process about you and the processing activities
            undertaken.
          </li>
          <li>
            <strong>Right to correction:</strong> request correction of inaccurate
            or incomplete personal data.
          </li>
          <li>
            <strong>Right to erasure:</strong> request deletion of your personal
            data when it is no longer necessary for the stated purpose or when you
            withdraw consent (subject to legal retention requirements).
          </li>
          <li>
            <strong>Right to nominate:</strong> designate another individual to
            exercise your rights on your behalf in the event of your death or
            incapacity.
          </li>
          <li>
            <strong>Right to grievance redressal:</strong> raise a complaint with our
            Grievance Officer (section 11).
          </li>
          <li>
            <strong>Consent withdrawal:</strong> where processing is based on
            consent, withdraw consent at any time via{" "}
            <Link
              href="/dpdp-rights"
              className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
            >
              Data Principal Rights
            </Link>{" "}
            or by emailing us.
          </li>
        </ul>
        <p>
          You can submit requests through our{" "}
          <Link
            href="/dpdp-rights"
            className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
          >
            Data Principal Rights portal
          </Link>{" "}
          (when signed in) or email{" "}
          <a
            href={SUPPORT_MAILTO_HREF}
            className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          from the email address associated with your account. We will acknowledge
          grievances within {DPDP_GRIEVANCE_ACK_HOURS} hours and aim to resolve them
          within {DPDP_GRIEVANCE_RESOLVE_DAYS} days. Rights requests will be
          fulfilled within {DPDP_RIGHTS_SLA_DAYS} days as required by the DPDP Act,
          unless a shorter period applies under other law.
        </p>
        <p>
          Depending on where you live, you may also have additional rights (such as
          objection, restriction, or portability under GDPR) and the right to lodge
          a complaint with a supervisory authority.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          11. Grievance Officer (DPDP)
        </h2>
        <p>
          For questions, complaints, or requests relating to your personal data under
          the DPDP Act, contact our designated Grievance Officer:
        </p>
        <p>
          <strong>{GRIEVANCE_OFFICER_NAME}</strong>
          <br />
          Email:{" "}
          <a
            href={`mailto:${GRIEVANCE_OFFICER_EMAIL}`}
            className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
          >
            {GRIEVANCE_OFFICER_EMAIL}
          </a>
          <br />
          Neven Academy Assam, 1000, Uday Nagar, Bono Durga Mandir, Karim Chowk,
          K.Chowka, Ward No.4, Mangaldoi, Darrang, Assam, 784125
        </p>
        <p>
          We will acknowledge your grievance within{" "}
          <strong>{DPDP_GRIEVANCE_ACK_HOURS} hours</strong> and work to resolve it
          within <strong>{DPDP_GRIEVANCE_RESOLVE_DAYS} days</strong>. If unresolved,
          you may escalate to the Data Protection Board of India as provided under
          the DPDP Act.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          12. Children&apos;s privacy
        </h2>
        <p>
          The Service is not directed to children under <strong>18</strong> years of
          age. We do not knowingly process personal data of children without
          verifiable parental consent as required under the DPDP Act. If you believe a
          child under 18 has provided personal data, contact us and we will take
          appropriate steps.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          13. Changes to this policy
        </h2>
        <p>
          We may update this Privacy Policy to reflect product, legal, or operational
          changes. We will post the updated version on this page and adjust the “Last
          updated” date. If a change materially affects you, we will provide notice
          as required by law (for example via email or an in-app message).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">14. Contact</h2>
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
      </section>
    </article>
  );
}
