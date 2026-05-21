"use client";

import Link from "next/link";
import { ArrowLeft, Image } from "lucide-react";
import clsx from "clsx";

import { AdminSendPushNotification } from "@/components/settings/AdminSendPushNotification";
import { DataAndThisDeviceSection } from "@/components/settings/DataAndThisDeviceSection";
import { CustomizeFeaturesSection } from "@/components/settings/CustomizeFeaturesSection";
import { PurposeModePhotos } from "@/components/settings/PurposeModePhotos";
import { NotificationsSettingsGroup } from "@/components/settings/NotificationsSettingsGroup";
import { SettingsExpandableSection } from "@/components/settings/SettingsExpandableSection";
import { SettingsSignOutFooter } from "@/components/settings/SettingsSignOutFooter";
import { SettingsToggles } from "@/components/settings/SettingsToggles";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileAccountSection } from "@/components/profile/ProfileAccountSection";
import { useSettingsStore, pickUiPrefsForSync } from "@/store/useSettingsStore";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { updateUserUiPrefs } from "@/actions/clientProfileExtras";
import type { Json } from "@/types/supabase";

export function SettingsPageClient() {
  const purposeMode = useSettingsStore((s) => s.purposeModeEnabled);
  const setPurposeMode = useSettingsStore((s) => s.setPurposeModeEnabled);
  const { onboardingDone } = useSubscriptionAccess();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-kal-text-secondary hover:text-kal-accent"
        >
          <ArrowLeft className="size-4" />
          Home
        </Link>
        <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          You &amp; this app
        </p>
        <h1 className="kal-feature-title mt-1">Settings</h1>
        <p className="mt-1 text-sm leading-relaxed text-kal-text-secondary">
          One place to shape your prep profile, sign-in, and app behaviour—expand a
          section to change it. Use <strong className="text-kal-text">Save profile</strong>{" "}
          for name, exams, and history; scroll for{" "}
          <Link
            href="/my-subscription"
            className="font-semibold text-kal-accent underline underline-offset-2"
          >
            My Subscription
          </Link>
          , then sign out.
        </p>
      </div>

      <ProfileForm />

      <div className="pt-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          App
        </p>
      </div>

      {onboardingDone ? <CustomizeFeaturesSection /> : null}

      <div
        id="purpose-fuel"
        aria-labelledby="purpose-photos-heading"
        className="scroll-mt-24 space-y-4"
      >
        <h2 id="purpose-photos-heading" className="sr-only">
          Purpose mode
        </h2>

        <SettingsExpandableSection
          sectionId="purpose-mode"
          title="Purpose mode"
          description={
            purposeMode
              ? "On — purpose photos and motivation strip on Home."
              : "Off — hide purpose strip on Home."
          }
          icon={Image}
        >
          <div className="kal-glass-panel rounded-[1rem] px-1">
            <div className="flex items-center justify-between gap-3 p-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-kal-text">
                    Purpose mode
                  </span>
                  <span
                    className={clsx(
                      "inline-flex min-w-11 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                      purposeMode
                        ? "bg-kal-accent/20 text-kal-accent"
                        : "bg-kal-border/70 text-kal-text-secondary",
                    )}
                  >
                    {purposeMode ? "On" : "Off"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-kal-text-secondary">
                  Shows your purpose photos and motivation strip on Home.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={purposeMode}
                aria-label="Toggle purpose mode"
                onClick={() => {
                  setPurposeMode(!purposeMode);
                  // Flush immediately so a fast refresh doesn't see a stale server value.
                  // Zustand set() is synchronous, so getState() already has the new value.
                  void updateUserUiPrefs(
                    pickUiPrefsForSync(useSettingsStore.getState()) as unknown as Json,
                  );
                }}
                className={clsx(
                  "relative h-9 w-14 shrink-0 rounded-full transition-[background-color] duration-200",
                  purposeMode ? "bg-kal-accent" : "bg-kal-border",
                )}
              >
                <span
                  className={clsx(
                    "absolute top-1 left-1 size-7 rounded-full bg-white shadow transition-transform duration-200",
                    purposeMode ? "translate-x-[1.35rem]" : "translate-x-0",
                  )}
                />
              </button>
            </div>
          </div>

          {purposeMode ? <PurposeModePhotos /> : null}
        </SettingsExpandableSection>
      </div>

      <section aria-labelledby="toggles-heading">
        <h2 id="toggles-heading" className="sr-only">
          Preferences
        </h2>
        <SettingsToggles />
      </section>

      <section aria-labelledby="data-device-heading">
        <h2 id="data-device-heading" className="sr-only">
          Data and device
        </h2>
        <DataAndThisDeviceSection />
      </section>

      <NotificationsSettingsGroup />

      <section aria-labelledby="admin-push-heading">
        <h2 id="admin-push-heading" className="sr-only">
          Admin push broadcast
        </h2>
        <AdminSendPushNotification />
      </section>

      <ProfileAccountSection />

      <SettingsSignOutFooter />
    </div>
  );
}
