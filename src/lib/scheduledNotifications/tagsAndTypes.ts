export const SCHEDULED_NOTIFICATION_TAGS = [
  "Revision",
  "Study",
  "Break",
  "Admin",
  "Other",
] as const;
export type ScheduledNotificationTag = (typeof SCHEDULED_NOTIFICATION_TAGS)[number];

export type ScheduledNotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  tag: string;
  subject: string | null;
  chapter: string | null;
  next_fire_at: string;
  user_timezone: string;
  repeat_type: string;
  is_active: boolean;
  last_fired_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateScheduledNotificationInput = {
  title: string;
  body?: string;
  tag: string;
  subject?: string | null;
  chapter?: string | null;
  next_fire_at: string;
  user_timezone: string;
  repeat_type: string;
};

export type UpdateScheduledNotificationInput = {
  title?: string;
  body?: string;
  tag?: string;
  subject?: string | null;
  chapter?: string | null;
  next_fire_at?: string;
  user_timezone?: string;
  repeat_type?: string;
  is_active?: boolean;
};
