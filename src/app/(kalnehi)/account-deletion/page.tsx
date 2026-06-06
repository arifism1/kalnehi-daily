import Link from "next/link";
import type { Metadata } from "next";

import { ErasureRequestForm } from "@/components/dpdp/ErasureRequestForm";
import { GRIEVANCE_OFFICER_EMAIL } from "@/lib/dpdp/constants";
import { SUPPORT_EMAIL, SUPPORT_MAILTO_HREF } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  title: "Account Deletion — Kalnehi Daily",
  description:
    "How to request deletion of your Kalnehi Daily account and all associated data.",
  robots: { index: true, follow: true },
};

export default function AccountDeletionPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 pb-8 text-[15px] leading-relaxed text-kal-text sm:text-base">
      <h1 className="kal-feature-title">Account Deletion</h1>
      <p>
        <strong>Last updated:</strong> June 6, 2026
      </p>
      <p>
        You have the right to delete your Kalnehi Daily account and all
        associated personal data at any time. This page explains how to request
        deletion, what gets removed, and what the timeline looks like.
      </p>

      <section className="space-y-3 rounded-xl border border-kal-accent/25 bg-kal-accent/[0.04] p-4">
        <h2 className="text-lg font-semibold text-kal-text">
          Request account deletion (signed in)
        </h2>
        <ErasureRequestForm />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          Alternative: request by email
        </h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Send an email to{" "}
            <a
              href={SUPPORT_MAILTO_HREF}
              className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            from the email address registered to your Kalnehi Daily account.
          </li>
          <li>
            Use the subject line: <strong>Account Deletion Request</strong>.
          </li>
          <li>
            Include your account email address in the body of the message so we
            can verify your identity.
          </li>
          <li>
            We will confirm receipt within <strong>2 business days</strong> and
            complete the deletion within <strong>30 days</strong> of your
            confirmed request.
          </li>
        </ol>
        <p className="text-sm text-kal-text-secondary">
          If you use the Android app, you can also go to{" "}
          <strong>Settings → Data &amp; this device</strong> for a link to this
          page.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          What gets deleted
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Your account profile (name, email, exam preferences, and all
            settings).
          </li>
          <li>
            All study data: daily plans, task lists, planner entries, saved
            plans, and backlogs.
          </li>
          <li>
            Mastermind chat history and AI-generated content tied to your
            account.
          </li>
          <li>
            Study session logs, streaks, marks, mock test results, and
            performance analytics.
          </li>
          <li>
            Syllabus tracker progress, revision schedule, and habit data.
          </li>
          <li>Push notification tokens and device preferences.</li>
          <li>
            Uploaded photos (doubt photos, purpose images) stored on our
            servers.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          What is retained and why
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Billing and payment records</strong> — Razorpay transaction
            IDs and payment history are retained for up to{" "}
            <strong>7 years</strong> as required by Indian tax and accounting
            laws (GST compliance). These records do not contain full card
            details.
          </li>
          <li>
            <strong>Anonymised or aggregated analytics</strong> — data that has
            been de-identified before deletion cannot be traced back to you and
            may be retained.
          </li>
          <li>
            <strong>Legal hold</strong> — if your account is subject to a
            dispute, fraud investigation, or legal obligation, deletion may be
            deferred until resolution.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          Data export before deletion
        </h2>
        <p>
          If you would like a copy of your data before we delete it, email{" "}
          <a
            href={`mailto:${GRIEVANCE_OFFICER_EMAIL}`}
            className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
          >
            {GRIEVANCE_OFFICER_EMAIL}
          </a>{" "}
          or include that request in your deletion email. We will send you an
          export of your account data in a machine-readable format (JSON or CSV)
          within the same 30-day window.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">
          Subscription cancellation
        </h2>
        <p>
          Deleting your account does not automatically cancel an active
          Razorpay subscription. Please cancel your subscription first from{" "}
          <strong>Settings → Subscription → Cancel</strong> (or on the web at
          kalnehi.com/my-subscription) so no further charges occur. If you
          cannot access the app, include a cancellation request in your
          deletion email.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-kal-text">Contact</h2>
        <p>For questions about this process or to submit your request:</p>
        <p>
          Email:{" "}
          <a
            href={SUPPORT_MAILTO_HREF}
            className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p>
          Full privacy information:{" "}
          <Link
            href="/privacy"
            className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
          >
            Privacy Policy
          </Link>
        </p>
        <p>
          Neven Academy Assam
          <br />
          1000, Uday Nagar, Bono Durga Mandir, Karim Chowk, K.Chowka, Ward
          No.4, Mangaldoi, Darrang, Assam, 784125
          <br />
          Phone: 9101776379
        </p>
      </section>
    </article>
  );
}
