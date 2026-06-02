"use client";

import { CloudOff } from "lucide-react";

import { SettingsExpandableSection } from "@/components/settings/SettingsExpandableSection";
import { useSyncStore } from "@/store/useSyncStore";

const OFFLINE_ROWS: { feature: string; offline: string }[] = [
  { feature: "Daily plan & tasks", offline: "Yes — create and edit; syncs when online" },
  { feature: "Focus timer & study sessions", offline: "Yes" },
  { feature: "Habits & motivation notes", offline: "Yes — queued sync" },
  { feature: "Doubts (photos & notes)", offline: "Yes — stored on device" },
  { feature: "Syllabus tracker (view & mark progress)", offline: "Yes after one Wi‑Fi sync" },
  { feature: "Voice (native Android)", offline: "Often yes — device speech recognition" },
  { feature: "Mastermind / AI coach", offline: "No — needs internet" },
  { feature: "Study camera (MediaPipe)", offline: "No — downloads models when opened" },
  { feature: "Sign-in & billing", offline: "No" },
];

export function OfflineCapabilitiesSection() {
  const isOnline = useSyncStore((s) => s.isOnline);

  return (
    <SettingsExpandableSection
      sectionId="offline-capabilities"
      title="Offline & data use"
      description="What works without internet on this device (especially the Android app)."
      icon={CloudOff}
      defaultOpen={false}
    >
      <div className="space-y-3 text-xs leading-relaxed text-kal-text-secondary">
        {!isOnline && (
          <p className="rounded-lg border border-kal-border bg-kal-card-muted px-3 py-2 text-kal-text">
            You&apos;re offline now. Your recent work is saved on this device and will sync when
            you&apos;re back on Wi‑Fi.
          </p>
        )}
        <p>
          On <strong className="text-kal-text">cellular</strong>, Kalnehi defers large background
          downloads (full syllabus refresh) until you&apos;re on Wi‑Fi to save data.
        </p>
        <div className="kal-glass-panel divide-y divide-kal-border/60 overflow-hidden rounded-[1rem]">
          {OFFLINE_ROWS.map((row) => (
            <div key={row.feature} className="px-3.5 py-3 sm:px-4">
              <p className="text-[15px] font-medium text-kal-text">{row.feature}</p>
              <p className="mt-0.5 text-xs text-kal-text-secondary">{row.offline}</p>
            </div>
          ))}
        </div>
        <p>
          First launch with no internet uses a built-in app shell; connect on Wi‑Fi once to download
          your full syllabus and latest updates.
        </p>
      </div>
    </SettingsExpandableSection>
  );
}
