"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CameraPlannerSettings } from "@/components/settings/CameraPlannerSettings";
import { PurposeModePhotos } from "@/components/settings/PurposeModePhotos";
import { PushNotificationsSettings } from "@/components/settings/PushNotificationsSettings";
import { SettingsToggles } from "@/components/settings/SettingsToggles";
import { useSettingsStore } from "@/store/useSettingsStore";

export function SettingsPageClient() {
  const purposeMode = useSettingsStore((s) => s.purposeModeEnabled);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-kal-text-secondary hover:text-kal-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          App
        </p>
        <h1 className="mt-1 text-xl font-bold text-kal-text">Settings</h1>
        <p className="mt-1 text-sm leading-relaxed text-kal-text-secondary">
          Shape how Kalnehi feels — every option here is optional. Subscription,
          billing, and AI credits live under{" "}
          <Link
            href="/my-plan"
            className="font-semibold text-kal-accent underline underline-offset-2"
          >
            My Plan
          </Link>
          .
        </p>
      </div>

      <section aria-labelledby="toggles-heading">
        <h2 id="toggles-heading" className="sr-only">
          Preferences
        </h2>
        <SettingsToggles />
      </section>

      <section aria-labelledby="push-notifications-heading">
        <h2 id="push-notifications-heading" className="sr-only">
          Push notifications
        </h2>
        <PushNotificationsSettings />
      </section>

      <section aria-labelledby="camera-planner-heading">
        <h2 id="camera-planner-heading" className="sr-only">
          Camera and planner scan
        </h2>
        <CameraPlannerSettings />
      </section>

      {purposeMode && (
        <section
          id="purpose-fuel"
          aria-labelledby="purpose-photos-heading"
          className="scroll-mt-24"
        >
          <h2 id="purpose-photos-heading" className="sr-only">
            Purpose photos
          </h2>
          <PurposeModePhotos />
        </section>
      )}

    </div>
  );
}
