"use client";

import { useSettingsStore } from "@/store/useSettingsStore";
import { useVoiceCommandStore } from "@/store/useVoiceCommandStore";
import { useWakeWord } from "@/hooks/useWakeWord";

/**
 * Mounts the wake word detection hook and renders a subtle pill indicator
 * in the bottom-left corner when actively listening for "Hi Kalnehi".
 * Renders nothing when disabled, unsupported, or when voice command sheet is open.
 */
export function WakeWordListener() {
  const wakeWordEnabled = useSettingsStore((s) => s.wakeWordEnabled);
  const voiceOpen = useVoiceCommandStore((s) => s.isOpen);
  const wakeWordSessionActive = useVoiceCommandStore((s) => s.wakeWordSessionActive);

  // Only listen after the user has explicitly clicked the mic button this session.
  // This prevents unsolicited mic permission requests on page load.
  const shouldListen = wakeWordEnabled && wakeWordSessionActive && !voiceOpen;

  const { isListening, isUnsupported } = useWakeWord(shouldListen);

  if (!shouldListen || isUnsupported || !isListening) return null;

  return (
    <div
      className="fixed bottom-[calc(3.5rem+max(0.75rem,env(safe-area-inset-bottom))+0.5rem)] left-3 z-[48] lg:bottom-5 lg:left-5"
      aria-hidden
    >
      <div className="flex items-center gap-1.5 rounded-full border border-kal-border/40 bg-white/70 px-2.5 py-1 text-[10px] font-medium text-kal-text-secondary/80 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/60">
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-kal-accent" />
        Hi Kalnehi / Hey Boss
      </div>
    </div>
  );
}
