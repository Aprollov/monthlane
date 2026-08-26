import type { LearningProgressLog, LearningTrack } from "../types.ts";
import { fromDateKey, toDateKey } from "../dates.ts";

export const growthCheckinDates = (
  track: LearningTrack,
  logs: LearningProgressLog[],
) => [...new Set(logs
  .filter((log) => log.learningTrackId === track.id && !log.deletedAt)
  .map((log) => log.date))]
  .sort();

export const growthCounts = (dates: string[], today: string) => ({
  total: new Set(dates).size,
  month: new Set(dates.filter((date) => date.slice(0, 7) === today.slice(0, 7))).size,
});

export const dateRange = (start: string, end = start) => {
  if (!start || !end || start > end) return [];
  const cursor = fromDateKey(start);
  const last = fromDateKey(end);
  const dates: string[] = [];
  while (cursor <= last) {
    dates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

export const momentDayCount = (date: string, today: string, type: "since" | "until") => {
  const milliseconds = fromDateKey(type === "since" ? today : date).getTime()
    - fromDateKey(type === "since" ? date : today).getTime();
  return Math.max(0, Math.floor(milliseconds / 86_400_000));
};
