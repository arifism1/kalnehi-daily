export type AppUpdateCategory =
  | "New Feature"
  | "Improvement"
  | "Bug Fix"
  | "Announcement";

export const APP_UPDATE_CATEGORIES: AppUpdateCategory[] = [
  "New Feature",
  "Improvement",
  "Bug Fix",
  "Announcement",
];

export type AdminAppUpdate = {
  id: string;
  title: string;
  message: string;
  category: string;
  created_at: string;
  read_count: number;
};
