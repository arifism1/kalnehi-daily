/** Unified backlog list + scheduling route (see BacklogsTabsClient). */
export const BACKLOGS_PATH = "/backlogs";

export function backlogsListHref(): string {
  return BACKLOGS_PATH;
}

export function backlogsScheduleHref(): string {
  return `${BACKLOGS_PATH}?tab=schedule`;
}
