import { toDateKey } from "../dates.ts";
import type { LearningProgressLog, LearningTrack } from "../types.ts";

/** Weeks start on Monday, matching the existing Monthlane month grid. */
export const weekStartKey = (todayKey: string): string => {
  const [year, month, day] = todayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return toDateKey(date);
};

export const logsThisWeek = (logs: LearningProgressLog[], todayKey: string) => {
  const start = weekStartKey(todayKey);
  return logs.filter((log) => log.date >= start && log.date <= todayKey);
};

export type WeeklyProgress = {
  metric: LearningTrack["progressMetric"];
  value: number;
  target: number;
  unit: string;
};

export const weeklyProgress = (
  track: LearningTrack,
  logs: LearningProgressLog[],
  todayKey: string,
): WeeklyProgress => {
  const weekLogs = logsThisWeek(
    logs.filter((log) => log.learningTrackId === track.id),
    todayKey,
  );
  switch (track.progressMetric) {
    case "duration":
      return {
        metric: track.progressMetric,
        value: weekLogs.reduce((total, log) => total + (log.duration ?? 0), 0),
        target: track.weeklyTarget,
        unit: "min",
      };
    case "units":
      return { metric: track.progressMetric, value: weekLogs.length, target: track.weeklyTarget, unit: "units" };
    case "milestones": {
      const start = weekStartKey(todayKey);
      return {
        metric: track.progressMetric,
        value: track.milestones.filter(
          (milestone) => milestone.completed && milestone.completedAt
            && milestone.completedAt.slice(0, 10) >= start
            && milestone.completedAt.slice(0, 10) <= todayKey,
        ).length,
        target: track.weeklyTarget,
        unit: "milestones",
      };
    }
    case "manual":
      return { metric: track.progressMetric, value: weekLogs.length, target: 0, unit: "logs" };
    default:
      return {
        metric: track.progressMetric,
        value: new Set(weekLogs.map((log) => log.date)).size,
        target: track.weeklyTarget,
        unit: "sessions",
      };
  }
};

export const progressLabel = (progress: WeeklyProgress) =>
  progress.target > 0 ? `${progress.value} / ${progress.target} ${progress.unit}` : `${progress.value} ${progress.unit} this week`;

export const progressRatio = (progress: WeeklyProgress) =>
  progress.target > 0 ? Math.min(1, progress.value / progress.target) : 0;

/** Consecutive days (ending today or yesterday) with at least one log. */
export const currentStreak = (logs: LearningProgressLog[], todayKey: string): number => {
  const days = new Set(logs.map((log) => log.date));
  if (!days.size) return 0;
  let cursor = days.has(todayKey) ? todayKey : addDaysKey(todayKey, -1);
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDaysKey(cursor, -1);
  }
  return streak;
};

const addDaysKey = (key: string, amount: number) => {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
};

export { addDaysKey };
