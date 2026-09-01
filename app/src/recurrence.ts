import { fromDateKey, toDateKey } from "./dates.ts";
import type { CalendarEvent, FlowTask, RecurrenceException, RecurrenceRule } from "./types.ts";

export type RecurrencePreset = "none" | "daily" | "workdays" | "weekly" | "monthly" | "yearly" | "custom";

const DAY_MS = 86_400_000;

const utcDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
const dayDiff = (from: Date, to: Date) => Math.round((utcDay(to) - utcDay(from)) / DAY_MS);
const monthDiff = (from: Date, to: Date) =>
  (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
const weekday = (date: Date) => ((date.getDay() + 6) % 7) + 1;
const mondayOf = (date: Date) => {
  const result = new Date(date);
  result.setDate(result.getDate() - (weekday(result) - 1));
  return result;
};
const lastDay = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export const recurrencePreset = (rule?: RecurrenceRule): RecurrencePreset => {
  if (!rule) return "none";
  if (rule.interval !== 1) return "custom";
  if (rule.frequency === "daily") return "daily";
  if (rule.frequency === "weekly" && rule.daysOfWeek?.join(",") === "1,2,3,4,5") return "workdays";
  if (rule.frequency === "weekly" && (rule.daysOfWeek?.length ?? 0) <= 1) return "weekly";
  if (rule.frequency === "monthly") return "monthly";
  if (rule.frequency === "yearly") return "yearly";
  return "custom";
};

export const recurrenceRuleForPreset = (
  preset: RecurrencePreset,
  startDate: string,
  current?: RecurrenceRule,
): RecurrenceRule | undefined => {
  if (preset === "none") return undefined;
  if (preset === "custom") return current ?? { frequency: "daily", interval: 1, endType: "never" };
  const startWeekday = weekday(fromDateKey(startDate));
  if (preset === "daily") return { frequency: "daily", interval: 1, endType: "never" };
  if (preset === "workdays") return { frequency: "weekly", interval: 1, daysOfWeek: [1, 2, 3, 4, 5], endType: "never" };
  if (preset === "weekly") return { frequency: "weekly", interval: 1, daysOfWeek: [startWeekday], endType: "never" };
  if (preset === "monthly") return { frequency: "monthly", interval: 1, endType: "never" };
  return { frequency: "yearly", interval: 1, endType: "never" };
};

export const previousDateKey = (value: string) => {
  const date = fromDateKey(value);
  date.setDate(date.getDate() - 1);
  return toDateKey(date);
};

export const recurrenceLabel = (rule?: RecurrenceRule) => {
  if (!rule) return "Does not repeat";
  const every = rule.interval === 1 ? "" : `Every ${rule.interval} `;
  if (rule.frequency === "daily") return rule.interval === 1 ? "Daily" : `${every}days`;
  if (rule.frequency === "weekly") {
    if (rule.interval === 1 && rule.daysOfWeek?.join(",") === "1,2,3,4,5") return "Every weekday";
    return rule.interval === 1 ? "Weekly" : `${every}weeks`;
  }
  if (rule.frequency === "monthly") return rule.interval === 1 ? "Monthly" : `${every}months`;
  return rule.interval === 1 ? "Yearly" : `${every}years`;
};

const occurrenceIndex = (start: Date, candidate: Date, rule: RecurrenceRule) => {
  if (candidate < start) return 0;
  if (rule.frequency === "daily") {
    const diff = dayDiff(start, candidate);
    return diff % rule.interval === 0 ? diff / rule.interval + 1 : 0;
  }
  if (rule.frequency === "weekly") {
    const days = [...(rule.daysOfWeek?.length ? rule.daysOfWeek : [weekday(start)])].sort((a, b) => a - b);
    if (!days.includes(weekday(candidate))) return 0;
    const weeks = Math.floor(dayDiff(mondayOf(start), mondayOf(candidate)) / 7);
    if (weeks < 0 || weeks % rule.interval !== 0) return 0;
    const skippedAtStart = days.filter((day) => day < weekday(start)).length;
    const activeWeeksBefore = weeks / rule.interval;
    const rank = days.filter((day) => day <= weekday(candidate)).length;
    return activeWeeksBefore * days.length - skippedAtStart + rank;
  }
  if (rule.frequency === "monthly") {
    const months = monthDiff(start, candidate);
    if (months < 0 || months % rule.interval !== 0) return 0;
    const expectedDay = Math.min(start.getDate(), lastDay(candidate.getFullYear(), candidate.getMonth()));
    return candidate.getDate() === expectedDay ? months / rule.interval + 1 : 0;
  }
  const years = candidate.getFullYear() - start.getFullYear();
  if (years < 0 || years % rule.interval !== 0 || candidate.getMonth() !== start.getMonth()) return 0;
  const expectedDay = Math.min(start.getDate(), lastDay(candidate.getFullYear(), candidate.getMonth()));
  return candidate.getDate() === expectedDay ? years / rule.interval + 1 : 0;
};

export const occursOnDate = (startDate: string, rule: RecurrenceRule, dateKey: string) => {
  const candidate = fromDateKey(dateKey);
  const start = fromDateKey(startDate);
  const index = occurrenceIndex(start, candidate, rule);
  if (!index) return false;
  if (rule.endType === "date" && rule.endDate && dateKey > rule.endDate) return false;
  if (rule.endType === "count" && index > (rule.count ?? 1)) return false;
  return true;
};

export const occursOn = (event: CalendarEvent, dateKey: string) => {
  if (!event.recurrence) return event.startDate === dateKey;
  return occursOnDate(event.startDate, event.recurrence, dateKey);
};

/** Whether a task series (or one-off scheduled task) lands on the given date. */
export const taskOccursOn = (task: FlowTask, dateKey: string) => {
  if (!task.scheduledDate) return false;
  if (!task.recurrence) return task.scheduledDate === dateKey;
  return occursOnDate(task.scheduledDate, task.recurrence, dateKey);
};

export const expandEvents = (
  events: CalendarEvent[],
  exceptions: RecurrenceException[],
  rangeStart: string,
  rangeEnd: string,
) => {
  const bySeriesDate = new Map(exceptions.map((exception) => [`${exception.seriesId}:${exception.instanceDate}`, exception]));
  const result: CalendarEvent[] = [];
  const cursor = fromDateKey(rangeStart);
  const end = fromDateKey(rangeEnd);
  const rangeDates: string[] = [];
  while (cursor <= end) {
    rangeDates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const event of events) {
    if (!event.recurrence) {
      if (event.startDate >= rangeStart && event.startDate <= rangeEnd) result.push(event);
      continue;
    }
    for (const dateKey of rangeDates) {
      if (!occursOn(event, dateKey)) continue;
      const exception = bySeriesDate.get(`${event.id}:${dateKey}`);
      if (exception?.type === "deleted") continue;
      if (exception?.type === "modified" && exception.replacement) {
        result.push({
          ...exception.replacement,
          recurrenceParentId: event.id,
          recurrenceInstanceDate: dateKey,
        });
        continue;
      }
      result.push({
        ...event,
        id: `${event.id}::${dateKey}`,
        startDate: dateKey,
        recurrenceParentId: event.id,
        recurrenceInstanceDate: dateKey,
      });
    }
  }
  return result;
};
