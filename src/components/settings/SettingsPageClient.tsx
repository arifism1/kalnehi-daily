"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";

import { AdminSendPushNotification } from "@/components/settings/AdminSendPushNotification";
import { CameraPlannerSettings } from "@/components/settings/CameraPlannerSettings";
import { CustomizeFeaturesSection } from "@/components/settings/CustomizeFeaturesSection";
import { PurposeModePhotos } from "@/components/settings/PurposeModePhotos";
import { NotificationsSettingsGroup } from "@/components/settings/NotificationsSettingsGroup";
import { SettingsToggles } from "@/components/settings/SettingsToggles";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

export function SettingsPageClient() {
  const purposeMode = useSettingsStore((s) => s.purposeModeEnabled);
  const setPurposeMode = useSettingsStore((s) => s.setPurposeModeEnabled);
  const { hasPaidAccess } = useSubscriptionAccess();

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
        <h1 className="kal-feature-title mt-1">Settings</h1>
        <p className="mt-1 text-sm leading-relaxed text-kal-text-secondary">
          Start with Theme and Home experience toggles, then set up
          notifications. Every option here is optional. Subscription, billing,
          and AI credits live under{" "}
          <Link
            href="/my-plan"
            className="font-semibold text-kal-accent underline underline-offset-2"
          >
            My Plan
          </Link>
          .
        </p>
      </div>

      {hasPaidAccess && <CustomizeFeaturesSection />}

      <section aria-labelledby="toggles-heading">
        <h2 id="toggles-heading" className="sr-only">
          Preferences
        </h2>
        <SettingsToggles />
      </section>

      <NotificationsSettingsGroup />

      <section aria-labelledby="admin-push-heading">
        <h2 id="admin-push-heading" className="sr-only">
          Admin push broadcast
        </h2>
        <AdminSendPushNotification />
      </section>

      <section aria-labelledby="camera-planner-heading">
        <h2 id="camera-planner-heading" className="sr-only">
          Camera and planner scan
        </h2>
        <CameraPlannerSettings />
      </section>

      <section
        id="purpose-fuel"
        aria-labelledby="purpose-photos-heading"
        className="scroll-mt-24 space-y-4"
      >
        <h2 id="purpose-photos-heading" className="sr-only">
          Purpose photos
        </h2>

        {/* Purpose mode toggle — lives here so it stays with its photos */}
        <div className="kal-glass-panel rounded-[1rem] px-1">
          <div className="flex items-center justify-between gap-3 px-3 py-3.5">
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
              onClick={() => setPurposeMode(!purposeMode)}
              className={clsx(
                "relative h-9 w-14 shrink-0 rounded-full transition-[background-color] duration-200",
                purposeMode ? "bg-kal-accent" : "bg-kal-border",
              )}
            >
              <span
                className={clsx(
                  "absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200",
                  purposeMode ? "translate-x-[1.35rem]" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>

        {purposeMode && <PurposeModePhotos />}
      </section>

    </div>
  );
}
