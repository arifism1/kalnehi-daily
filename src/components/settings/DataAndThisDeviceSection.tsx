"use client";

import { Database } from "lucide-react";
import Link from "next/link";

import { CookieSettingsTrigger } from "@/components/consent/CookieSettingsTrigger";
import { SettingsExpandableSection } from "@/components/settings/SettingsExpandableSection";

export function DataAndThisDeviceSection() {
  return (
    <SettingsExpandableSection
      sectionId="data-device"
      title="Data & this device"
      description="What lives on your phone or laptop vs. on Kalnehi Daily servers."
      icon={Database}
      defaultOpen={false}
    >
      <div className="space-y-3 px-3 pb-4 text-xs leading-relaxed text-kal-text-secondary sm:px-4">
        <ul className="list-disc space-y-2 pl-4">
          <li>
            <strong className="text-kal-text">Account &amp; study data</strong>{" "}
            (tasks, plans, habits, profile, Mastermind history, and similar) is
            stored in your Kalnehi Daily account on our database. It is not removed when
            you only clear image/file cache. Preferences under Settings (theme,
            sounds, study camera options, etc.) are mirrored to your account when
            signed in so they can follow you across devices.
          </li>
          <li>
            <strong className="text-kal-text">Clearing site data</strong> in your
            browser removes cookies (you will be signed out), local preferences,
            and offline copies on this device. Changes that had not finished
            syncing may be lost.
          </li>
          <li>
            <strong className="text-kal-text">Purpose photos &amp; some local-only notes</strong>{" "}
            may stay only on this device until they sync — see feature screens for
            details.
          </li>
        </ul>
        <p>
          Full policy:{" "}
          <Link
            href="/privacy"
            className="font-semibold text-kal-accent underline underline-offset-2"
          >
            Privacy policy
          </Link>
          . Optional analytics &amp; marketing:{" "}
          <CookieSettingsTrigger className="font-semibold text-kal-accent underline underline-offset-2" />
          . For a full export of account data or deletion, email{" "}
          <a
            href="mailto:curioversitylearning@gmail.com"
            className="font-semibold text-kal-accent underline underline-offset-2"
          >
            curioversitylearning@gmail.com
          </a>
          .
        </p>
      </div>
    </SettingsExpandableSection>
  );
}
