import Link from "next/link";

import {
  DPDP_SIGNUP_PROCESSORS,
  DPDP_SIGNUP_PURPOSES,
} from "@/lib/dpdp/constants";

type DpdpConsentNoticeProps = {
  agreed: boolean;
  onAgreedChange: (value: boolean) => void;
  id?: string;
};

export function DpdpConsentNotice({
  agreed,
  onAgreedChange,
  id = "dpdp-consent",
}: DpdpConsentNoticeProps) {
  return (
    <div className="rounded-xl border border-kal-border bg-kal-card/40 p-3 text-xs leading-relaxed text-kal-text-secondary">
      <p className="font-semibold text-kal-text">Notice before sign-up (DPDP)</p>
      <p className="mt-1.5">
        By creating an account, we will process your personal data for these
        purposes:
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4">
        {DPDP_SIGNUP_PURPOSES.map((purpose) => (
          <li key={purpose}>{purpose}</li>
        ))}
      </ul>
      <p className="mt-2">
        We may share data with these categories of processors:{" "}
        {DPDP_SIGNUP_PROCESSORS.join("; ")}.
      </p>
      <p className="mt-2">
        You can withdraw consent or exercise your rights at any time via{" "}
        <Link
          href="/dpdp-rights"
          className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
        >
          Data Principal Rights
        </Link>{" "}
        or our{" "}
        <Link
          href="/privacy"
          className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
        >
          Privacy Policy
        </Link>
        .
      </p>
      <label
        htmlFor={id}
        className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-kal-border/80 bg-kal-input-bg/60 p-2.5"
      >
        <input
          id={id}
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgreedChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-kal-border accent-kal-accent"
        />
        <span className="text-kal-text">
          I have read this notice and agree to the processing described above for
          account creation and use of the Service.
        </span>
      </label>
    </div>
  );
}
