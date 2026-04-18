"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatVoiceMinutesFractionalCompact } from "@/lib/freeTrial";

type Props = {
  open: boolean;
  remaining: number;
  limit: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function UsageConfirmDialog({
  open,
  remaining,
  limit,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <ConfirmDialog
      open={open}
      title="Start voice session?"
      description={`You have ${formatVoiceMinutesFractionalCompact(remaining)} left of ${formatVoiceMinutesFractionalCompact(limit)} voice time this month.`}
      confirmLabel="Continue"
      cancelLabel="Cancel"
      danger={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
