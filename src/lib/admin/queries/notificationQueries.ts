import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type NotificationAnalyticsSnapshot = {
  totalSends: number;
  byType: { notification_type: string; count: number }[];
  byChannel: { channel: string; count: number }[];
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  rates: { deliveryPct: number; openPct: number; clickPct: number; convertPct: number };
};

export async function getNotificationAnalyticsSnapshot(): Promise<NotificationAnalyticsSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const { data: rows, error } = await admin
    .from("notification_sends")
    .select("notification_type, channel, delivered_at, opened_at, clicked_at, converted_at")
    .gte("sent_at", since)
    .limit(5000);

  if (error) {
    console.warn("[admin] notification_sends", error.message);
    return {
      totalSends: 0,
      byType: [],
      byChannel: [],
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      rates: { deliveryPct: 0, openPct: 0, clickPct: 0, convertPct: 0 },
    };
  }

  const list = (rows ?? []) as {
    notification_type: string;
    channel: string;
    delivered_at: string | null;
    opened_at: string | null;
    clicked_at: string | null;
    converted_at: string | null;
  }[];

  const byType = new Map<string, number>();
  const byChannel = new Map<string, number>();
  let delivered = 0;
  let opened = 0;
  let clicked = 0;
  let converted = 0;

  for (const r of list) {
    byType.set(r.notification_type, (byType.get(r.notification_type) ?? 0) + 1);
    byChannel.set(r.channel, (byChannel.get(r.channel) ?? 0) + 1);
    if (r.delivered_at) delivered++;
    if (r.opened_at) opened++;
    if (r.clicked_at) clicked++;
    if (r.converted_at) converted++;
  }

  const n = list.length || 1;

  return {
    totalSends: list.length,
    byType: [...byType.entries()].toSorted((a, b) => b[1] - a[1]).map(([notification_type, count]) => ({
      notification_type,
      count,
    })),
    byChannel: [...byChannel.entries()].toSorted((a, b) => b[1] - a[1]).map(([channel, count]) => ({
      channel,
      count,
    })),
    delivered,
    opened,
    clicked,
    converted,
    rates: {
      deliveryPct: (delivered / n) * 100,
      openPct: (opened / n) * 100,
      clickPct: (clicked / n) * 100,
      convertPct: (converted / n) * 100,
    },
  };
}
