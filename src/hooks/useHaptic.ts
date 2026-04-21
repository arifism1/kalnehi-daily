/**
 * Thin wrapper around the Vibration API for native-feel touch feedback.
 * Android vibrates; iOS silently ignores the call — zero downside on either.
 *
 * Usage:
 *   const haptic = useHaptic();
 *   haptic();              // default: short 8 ms tick (task check)
 *   haptic("success");     // double-pulse for milestone moments
 *   haptic("light");       // very short 4 ms for subtle feedback
 */

type HapticPreset = "light" | "medium" | "success";
type HapticInput = HapticPreset | VibratePattern;

const PRESETS: Record<HapticPreset, VibratePattern> = {
  light: 4,
  medium: 8,
  success: [10, 60, 20],
};

export function useHaptic() {
  return (pattern: HapticInput = "medium") => {
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    const resolved: VibratePattern =
      typeof pattern === "string" ? PRESETS[pattern] : pattern;
    navigator.vibrate(resolved);
  };
}
