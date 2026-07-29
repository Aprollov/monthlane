import { fromDateKey, toDateKey } from "./dates.ts";
import type { CalendarEvent, RecurrenceException, RecurrenceRule } from "./types.ts";

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

export const occursOn = (event: CalendarEvent, dateKey: string) => {
  if (!event.recurrence) return event.startDate === dateKey;
  const candidate = fromDateKey(dateKey);
  const start = fromDateKey(event.startDate);
  const index = occurrenceIndex(start, candidate, event.recurrence);
  if (!index) return false;
  if (event.recurrence.endType === "date" && event.recurrence.endDate && dateKey > event.recurrence.endDate) return false;
  if (event.recurrence.endType === "count" && index > (event.recurrence.count ?? 1)) return false;
  return true;
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
