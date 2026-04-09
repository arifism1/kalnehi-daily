"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Props = {
  open: boolean;
  feature: "photo_scan" | "voice";
  remaining: number;
  limit: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function UsageConfirmDialog({
  open,
  feature,
  remaining,
  limit,
  onConfirm,
  onCancel,
}: Props) {
  const isPhoto = feature === "photo_scan";
  const title = isPhoto ? "Use a photo scan?" : "Start voice session?";
  const description = isPhoto
    ? `You have ${remaining} of ${limit} photo scans remaining this month. This will use 1 scan.`
    : `You have ${remaining} of ${limit} voice minutes remaining this month.`;

  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel="Continue"
      cancelLabel="Cancel"
      danger={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
