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
      <div className="space-y-3 px-3 pb-4 text-xs leading-relaxed text-kal-text-secondary sm:px-4">
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
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-kal-border text-kal-text">
              <th className="py-1.5 pr-2 font-semibold">Feature</th>
              <th className="py-1.5 font-semibold">Offline</th>
            </tr>
          </thead>
          <tbody>
            {OFFLINE_ROWS.map((row) => (
              <tr key={row.feature} className="border-b border-kal-border/60">
                <td className="py-1.5 pr-2 align-top">{row.feature}</td>
                <td className="py-1.5 align-top">{row.offline}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          First launch with no internet uses a built-in app shell; connect on Wi‑Fi once to download
          your full syllabus and latest updates.
        </p>
      </div>
    </SettingsExpandableSection>
  );
}
