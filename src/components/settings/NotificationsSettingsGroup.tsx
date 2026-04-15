"use client";

import { Bell } from "lucide-react";

import { CustomRemindersSettings } from "@/components/settings/CustomRemindersSettings";
import { SettingsExpandableSection } from "@/components/settings/SettingsExpandableSection";
import {
  NotificationsToastProvider,
} from "@/components/settings/notificationsToastContext";
import { PushNotificationsSettings } from "@/components/settings/PushNotificationsSettings";
import { SystemNotificationsSettings } from "@/components/settings/SystemNotificationsSettings";

/**
 * Premium grouping for Settings → Notifications: device push, system automations, custom reminders.
 */
export function NotificationsSettingsGroup() {
  return (
    <NotificationsToastProvider>
      <section
        aria-labelledby="notifications-main-heading"
        className="rounded-[1.1rem] border border-kal-border/50 bg-white/[0.04] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-5"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kal-accent/15 text-kal-accent">
            <Bell className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="notifications-main-heading"
              className="text-lg font-bold tracking-tight text-kal-text"
            >
              Notifications
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-kal-text-secondary">
              Control this device, Kalnehi automations (IST), and your own reminder
              schedule — all in one place. Automated product pushes share a limit of
              five per calendar day (IST).
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <SettingsExpandableSection
            sectionId="notifications-device"
            kicker="Device"
            title="Push on this device"
            description="Register for web push so alerts can reach you when the app is closed."
          >
            <PushNotificationsSettings embedded />
          </SettingsExpandableSection>

          <SettingsExpandableSection
            sectionId="notifications-system"
            kicker="Automations"
            title="System notifications"
            description="Morning kickstart, danger-zone signal, and evening wind-down — India Standard Time. Counts toward the five automated pushes per IST day."
          >
            <SystemNotificationsSettings embedded />
          </SettingsExpandableSection>

          <SettingsExpandableSection
            sectionId="notifications-custom"
            kicker="You"
            title="My custom reminders"
            description="Your titles and times. Respects the same daily send cap as system messages."
          >
            <CustomRemindersSettings embedded />
          </SettingsExpandableSection>
        </div>
      </section>
    </NotificationsToastProvider>
  );
}
