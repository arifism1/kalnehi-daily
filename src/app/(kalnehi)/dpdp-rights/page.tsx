import type { Metadata } from "next";

import { DpdpRightsClient } from "@/components/dpdp/DpdpRightsClient";
import {
  DPDP_GRIEVANCE_ACK_HOURS,
  DPDP_GRIEVANCE_RESOLVE_DAYS,
  DPDP_RIGHTS_SLA_DAYS,
  GRIEVANCE_OFFICER_EMAIL,
  GRIEVANCE_OFFICER_NAME,
} from "@/lib/dpdp/constants";

export const metadata: Metadata = {
  title: "Data Principal Rights — Kalnehi Daily",
  description:
    "Exercise your rights under India's Digital Personal Data Protection Act: access, correction, erasure, and nomination.",
  robots: { index: true, follow: true },
};

export default function DpdpRightsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 pb-8 text-[15px] leading-relaxed text-kal-text sm:text-base">
      <h1 className="kal-feature-title">Data Principal Rights</h1>
      <p>
        Under India&apos;s Digital Personal Data Protection Act, 2023, you can
        request access to your data, corrections, account erasure, or designate a
        nominee. We respond to rights requests within{" "}
        <strong>{DPDP_RIGHTS_SLA_DAYS} days</strong>.
      </p>
      <p className="text-sm text-kal-text-secondary">
        Grievance Officer: {GRIEVANCE_OFFICER_NAME} —{" "}
        <a
          href={`mailto:${GRIEVANCE_OFFICER_EMAIL}`}
          className="font-medium text-kal-accent underline underline-offset-2"
        >
          {GRIEVANCE_OFFICER_EMAIL}
        </a>{" "}
        (acknowledge within {DPDP_GRIEVANCE_ACK_HOURS}h, resolve within{" "}
        {DPDP_GRIEVANCE_RESOLVE_DAYS} days).
      </p>

      <DpdpRightsClient />
    </article>
  );
}
