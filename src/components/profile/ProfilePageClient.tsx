"use client";

import { AccountPageShell } from "@/components/settings/AccountPageShell";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileAccountSection } from "@/components/profile/ProfileAccountSection";
import { ProfileJumpNav } from "@/components/profile/ProfileJumpNav";
import { SettingsSectionGroup } from "@/components/settings/SettingsSectionGroup";
import { SettingsSignOutFooter } from "@/components/settings/SettingsSignOutFooter";

export function ProfilePageClient() {
  return (
    <AccountPageShell
      eyebrow="Your account"
      title="Profile"
      lead="Exam details, marks, and how you sign in."
      secondaryLink={{ href: "/settings", label: "App preferences" }}
      jumpNav={<ProfileJumpNav />}
    >
      <SettingsSectionGroup id="profile-details" title="You">
        <ProfileForm />
      </SettingsSectionGroup>

      <SettingsSectionGroup id="profile-account" title="Account">
        <ProfileAccountSection />
      </SettingsSectionGroup>

      <SettingsSectionGroup id="profile-session" title="Session">
        <SettingsSignOutFooter />
      </SettingsSectionGroup>
    </AccountPageShell>
  );
}
