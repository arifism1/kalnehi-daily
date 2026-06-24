import { ChevronDown } from "lucide-react";
import Link from "next/link";

import {
  DPDP_SIGNUP_PROCESSORS,
  DPDP_SIGNUP_PURPOSES,
} from "@/lib/dpdp/constants";

type DpdpConsentNoticeProps = {
  /** When true (default) shows the "I agree" checkbox below the notice. */
  showCheckbox?: boolean;
  agreed?: boolean;
  onAgreedChange?: (value: boolean) => void;
  id?: string;
};

export function DpdpConsentNotice({
  showCheckbox = true,
  agreed = false,
  onAgreedChange,
  id = "dpdp-consent",
}: DpdpConsentNoticeProps) {
  return (
    <div className="rounded-xl border border-kal-border bg-kal-card/40 text-xs leading-relaxed text-kal-text-secondary">
      <details
        className="group"
        aria-label="DPDP notice before sign-up"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors hover:bg-kal-card-muted/40 marker:hidden [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-kal-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-kal-card">
          <span className="min-w-0">
            <span className="block font-semibold text-kal-text">
              Notice before sign-up (DPDP)
            </span>
            <span className="mt-0.5 block text-[11px] text-kal-text-secondary underline decoration-kal-border decoration-dotted underline-offset-2">
              Read data processing notice
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className="size-4 shrink-0 text-kal-accent transition-transform duration-200 group-open:rotate-180"
          />
        </summary>
        <div className="max-h-[min(40vh,240px)] overflow-y-auto border-t border-kal-border/50 px-3 pb-3 pt-2.5">
          <p>
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
            You can withdraw consent or exercise other data rights as described
            in our{" "}
            <Link
              href="/privacy"
              className="font-medium text-kal-accent underline underline-offset-2 hover:text-kal-accent/90"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </details>

      {showCheckbox && onAgreedChange ? (
        <label
          htmlFor={id}
          className="mx-3 mb-3 mt-2 flex cursor-pointer items-start gap-2.5 rounded-lg border border-kal-border/80 bg-kal-input-bg/60 p-2.5"
        >
          <input
            id={id}
            type="checkbox"
            checked={agreed}
            onChange={(e) => onAgreedChange(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-kal-border accent-kal-accent"
          />
          <span className="text-kal-text">
            I agree to the data processing described in the notice above for
            account creation and use of the Service.
          </span>
        </label>
      ) : null}
    </div>
  );
}
