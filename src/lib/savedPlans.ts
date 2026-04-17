import {
  addDays,
  endOfDay,
  endOfToday,
  endOfWeek,
  format,
  startOfDay,
  startOfToday,
  startOfWeek,
  subDays,
  subYears,
} from "date-fns";

export const SAVED_PLANS_PAGE_SIZE = 50;
export const SAVED_PLANS_PREVIEW_COUNT = 3;

export type SavedPlansFilterId =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "last30Days"
  | "last3Months"
  | "last1Year"
  | "futurePlans";

export type SavedPlansFilterOption = {
  id: SavedPlansFilterId;
  label: string;
};

export const SAVED_PLANS_FILTER_OPTIONS: SavedPlansFilterOption[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "thisWeek", label: "This Week" },
  { id: "last30Days", label: "Last 30 Days" },
  { id: "last3Months", label: "Last 3 Months" },
  { id: "last1Year", label: "Last 1 Year" },
  { id: "futurePlans", label: "Future Plans" },
];

export type SavedPlansDateWindow = {
  startDate: string;
  endDate: string;
};

export type SavedPlansRangeValidation =
  | { ok: true; window: SavedPlansDateWindow }
  | { ok: false; error: string };

export type SavedPlanTaskMini = {
  status: string | null;
  title: string | null;
};

export type SavedPlanListRowRaw = {
  id: string;
  plan_date: string;
  daily_tasks?: SavedPlanTaskMini[] | null;
};

export type SavedPlanListItem = {
  id: string;
  planDate: string;
  formattedDate: string;
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
  previewTitles: string[];
};

export function getSavedPlansDateWindow(filterId: SavedPlansFilterId): SavedPlansDateWindow {
  const now = new Date();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  switch (filterId) {
    case "today":
      return {
        startDate: format(todayStart, "yyyy-MM-dd"),
        endDate: format(todayEnd, "yyyy-MM-dd"),
      };
    case "yesterday": {
      const y = subDays(now, 1);
      return {
        startDate: format(startOfDay(y), "yyyy-MM-dd"),
        endDate: format(endOfDay(y), "yyyy-MM-dd"),
      };
    }
    case "thisWeek":
      return {
        startDate: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        endDate: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    case "last30Days":
      return {
        startDate: format(subDays(todayStart, 29), "yyyy-MM-dd"),
        endDate: format(todayEnd, "yyyy-MM-dd"),
      };
    case "last3Months":
      return {
        startDate: format(subDays(todayStart, 89), "yyyy-MM-dd"),
        endDate: format(todayEnd, "yyyy-MM-dd"),
      };
    case "futurePlans":
      return {
        startDate: format(addDays(todayStart, 1), "yyyy-MM-dd"),
        endDate: format(addDays(todayEnd, 30), "yyyy-MM-dd"),
      };
    case "last1Year":
    default:
      return {
        startDate: format(subYears(todayStart, 1), "yyyy-MM-dd"),
        endDate: format(addDays(todayEnd, 30), "yyyy-MM-dd"),
      };
  }
}

export function toSavedPlanListItem(row: SavedPlanListRowRaw): SavedPlanListItem {
  const tasks = row.daily_tasks ?? [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const completionPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const previewTitles = tasks
    .map((task) => task.title?.trim() ?? "")
    .filter((title) => title.length > 0)
    .slice(0, SAVED_PLANS_PREVIEW_COUNT);

  return {
    id: row.id,
    planDate: row.plan_date,
    formattedDate: format(new Date(`${row.plan_date}T00:00:00`), "d MMMM yyyy - EEEE"),
    totalTasks,
    completedTasks,
    completionPercent,
    previewTitles,
  };
}

const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateSavedPlansCustomRange(
  startDate: string,
  endDate: string,
): SavedPlansRangeValidation {
  const start = startDate.trim();
  const end = endDate.trim();

  if (!start || !end) {
    return { ok: false, error: "Select both start and end dates." };
  }
  if (!YYYY_MM_DD_REGEX.test(start) || !YYYY_MM_DD_REGEX.test(end)) {
    return { ok: false, error: "Enter valid dates in YYYY-MM-DD format." };
  }
  if (start > end) {
    return { ok: false, error: "Start date must be on or before end date." };
  }

  return { ok: true, window: { startDate: start, endDate: end } };
}
