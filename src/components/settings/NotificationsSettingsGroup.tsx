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
      <section aria-labelledby="notifications-main-heading">
        <h2 id="notifications-main-heading" className="sr-only">
          Notifications
        </h2>
        <SettingsExpandableSection
          sectionId="notifications-root"
          title="Notifications"
          description="Web push on this device, Kalnehi Daily automations (IST), and custom reminders — up to five automated product pushes per IST calendar day."
          icon={Bell}
        >
          <div className="space-y-3">
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
        </SettingsExpandableSection>
      </section>
    </NotificationsToastProvider>
  );
}
