"use client";

import { Bell } from "lucide-react";

import { CustomRemindersSettings } from "@/components/settings/CustomRemindersSettings";
import { SettingsExpandableSection } from "@/components/settings/SettingsExpandableSection";
import { SettingsSubsection } from "@/components/settings/SettingsSubsection";
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
      <SettingsExpandableSection
        sectionId="notifications-root"
        title="Notifications"
        description="Web push on this device, Kalnehi Daily automations (IST), and custom reminders — up to five automated product pushes per IST calendar day."
        icon={Bell}
      >
        <div className="space-y-3">
          <SettingsSubsection
            kicker="Device"
            title="Push on this device"
            description="Register for web push so alerts can reach you when the app is closed."
          >
            <PushNotificationsSettings embedded />
          </SettingsSubsection>

          <SettingsSubsection
            kicker="Automations"
            title="System notifications"
            description="Morning kickstart, danger-zone signal, and evening wind-down — India Standard Time. Counts toward the five automated pushes per IST day."
          >
            <SystemNotificationsSettings embedded />
          </SettingsSubsection>

          <SettingsSubsection
            kicker="You"
            title="My custom reminders"
            description="Your titles and times. Respects the same daily send cap as system messages."
          >
            <CustomRemindersSettings embedded />
          </SettingsSubsection>
        </div>
      </SettingsExpandableSection>
    </NotificationsToastProvider>
  );
}
