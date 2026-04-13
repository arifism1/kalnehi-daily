export type AutomatedPushChannel =
  | "system_push_morning"
  | "system_push_evening"
  | "custom_reminder"
  | "danger_zone";

/**
 * Structured server log for automated FCM (no tokens or message bodies).
 */
export function logAutomatedPushSent(opts: {
  channel: AutomatedPushChannel;
  userId: string;
  istDate: string;
  sent: number;
  extra?: Record<string, string | number | boolean | null | undefined>;
}): void {
  const payload: Record<string, string | number | boolean | null | undefined> = {
    kind: "push_automated_sent",
    channel: opts.channel,
    userId: opts.userId,
    istDate: opts.istDate,
    sent: opts.sent,
  };
  if (opts.extra) {
    for (const [k, v] of Object.entries(opts.extra)) {
      payload[k] = v;
    }
  }
  console.info(JSON.stringify(payload));
}

export function logAutomatedPushSkipped(opts: {
  channel: AutomatedPushChannel;
  userId: string;
  istDate: string;
  reason: string;
}): void {
  console.warn(
    JSON.stringify({
      kind: "push_automated_skipped",
      channel: opts.channel,
      userId: opts.userId,
      istDate: opts.istDate,
      reason: opts.reason,
    }),
  );
}
