import type { LearningProgressLog, LearningTrack } from "../types.ts";

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
