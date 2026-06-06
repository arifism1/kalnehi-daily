"use client";

import { Image } from "lucide-react";
import { useId } from "react";

import { PurposeModePhotos } from "@/components/settings/PurposeModePhotos";
import { AccountPageShell } from "@/components/settings/AccountPageShell";
import { DataAndThisDeviceSection } from "@/components/settings/DataAndThisDeviceSection";
import { NotificationsSettingsGroup } from "@/components/settings/NotificationsSettingsGroup";
import { SettingsExpandableSection } from "@/components/settings/SettingsExpandableSection";
import { SettingsJumpNav } from "@/components/settings/SettingsJumpNav";
import { SettingsSectionGroup } from "@/components/settings/SettingsSectionGroup";
import { SettingsSheetSwitch } from "@/components/settings/SettingsSheetSwitch";
import { SettingsSignOutFooter } from "@/components/settings/SettingsSignOutFooter";
import { SettingsToggles } from "@/components/settings/SettingsToggles";
import { useSettingsStore, pickUiPrefsForSync } from "@/store/useSettingsStore";
import { updateUserUiPrefs } from "@/actions/clientProfileExtras";
import type { Json } from "@/types/supabase";

export function SettingsPageClient() {
  const purposeMode = useSettingsStore((s) => s.purposeModeEnabled);
  const setPurposeMode = useSettingsStore((s) => s.setPurposeModeEnabled);
  const purposeSwitchId = useId();

  const purposeDescription = purposeMode
    ? "On — purpose photos and motivation strip on Home."
    : "Off — hide purpose strip on Home.";

  return (
    <AccountPageShell
      eyebrow="This app"
      title="Settings"
      lead="Preferences, notifications, and session."
      secondaryLink={{ href: "/profile", label: "Edit profile" }}
      jumpNav={<SettingsJumpNav />}
    >
      <SettingsSectionGroup id="settings-app" title="App">
        <div
          id="purpose-fuel"
          aria-labelledby="purpose-photos-heading"
          className="scroll-mt-24"
        >
          <h2 id="purpose-photos-heading" className="sr-only">
            Purpose mode
          </h2>

          <SettingsExpandableSection
            sectionId="purpose-mode"
            title="Purpose mode"
            description={purposeDescription}
            icon={Image}
            headerTrailing={
              <SettingsSheetSwitch
                id={purposeSwitchId}
                ariaLabel="Toggle purpose mode"
                checked={purposeMode}
                onChange={(next) => {
                  setPurposeMode(next);
                  void updateUserUiPrefs(
                    pickUiPrefsForSync(useSettingsStore.getState()) as unknown as Json,
                  );
                }}
              />
            }
          >
            {purposeMode ? <PurposeModePhotos /> : null}
          </SettingsExpandableSection>
        </div>

        <section aria-labelledby="toggles-heading">
          <h2 id="toggles-heading" className="sr-only">
            Preferences
          </h2>
          <SettingsToggles />
        </section>
      </SettingsSectionGroup>

      <SettingsSectionGroup id="settings-notifications" title="Notifications">
        <NotificationsSettingsGroup />
      </SettingsSectionGroup>

      <SettingsSectionGroup id="settings-data" title="Data & privacy">
        <div id="data-device" className="scroll-mt-24">
          <DataAndThisDeviceSection />
        </div>
      </SettingsSectionGroup>

      <SettingsSectionGroup id="settings-session" title="Session">
        <SettingsSignOutFooter />
      </SettingsSectionGroup>
    </AccountPageShell>
  );
}
