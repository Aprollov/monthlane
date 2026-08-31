import { fromDateKey, toDateKey } from "../dates.ts";
import type { CalendarEvent, GrowthMoment } from "../types.ts";

export type MomentUnit = "days" | "months" | "years";

const momentUnits: MomentUnit[] = ["days", "months", "years"];

export const nextMomentUnit = (unit: MomentUnit = "days"): MomentUnit =>
  momentUnits[(momentUnits.indexOf(unit) + 1) % momentUnits.length];

const orderedDates = (moment: GrowthMoment, today: string) =>
  moment.type === "since" ? [moment.date, today] : [today, moment.date];

export const wholeCalendarMonths = (startKey: string, endKey: string) => {
  if (startKey > endKey) return 0;
  const start = fromDateKey(startKey);
  const end = fromDateKey(endKey);
  const raw = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  return Math.max(0, raw - (end.getDate() < start.getDate() ? 1 : 0));
};

export const momentValueLabel = (moment: GrowthMoment, today: string) => {
  const [start, end] = orderedDates(moment, today);
  const unit = moment.displayUnit ?? "days";
  if (unit === "days") {
    const days = Math.max(0, Math.floor((fromDateKey(end).getTime() - fromDateKey(start).getTime()) / 86_400_000));
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  const months = wholeCalendarMonths(start, end);
  if (unit === "months") return `${months} ${months === 1 ? "month" : "months"}`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  const yearPart = `${years} ${years === 1 ? "year" : "years"}`;
  return remainder ? `${yearPart} ${remainder} ${remainder === 1 ? "month" : "months"}` : yearPart;
};

const anniversaryDate = (source: Date, year: number) => {
  const result = new Date(year, source.getMonth(), source.getDate(), 12);
  if (result.getMonth() !== source.getMonth()) result.setDate(0);
  return result;
};

export const momentProgress = (moment: GrowthMoment, todayKey: string) => {
  const today = fromDateKey(todayKey);
  if (moment.type === "since") {
    const origin = fromDateKey(moment.date);
    if (origin > today) return undefined;
    let previous = anniversaryDate(origin, today.getFullYear());
    if (previous > today) previous = anniversaryDate(origin, today.getFullYear() - 1);
    const next = anniversaryDate(origin, previous.getFullYear() + 1);
    return {
      ratio: Math.max(0, Math.min(1, (today.getTime() - previous.getTime()) / (next.getTime() - previous.getTime()))),
      nextDate: toDateKey(next),
    };
  }
  const startKey = moment.createdAt.slice(0, 10);
  if (!startKey || startKey >= moment.date) return undefined;
  const start = fromDateKey(startKey);
  const target = fromDateKey(moment.date);
  return { ratio: Math.max(0, Math.min(1, (today.getTime() - start.getTime()) / (target.getTime() - start.getTime()))) };
};

export const MOMENT_EVENT_PREFIX = "growth-moment:";

export const momentReminderEvents = (moments: GrowthMoment[]): CalendarEvent[] => moments
  .filter((moment) => moment.calendarReminder?.enabled && moment.calendarReminder.calendarId && !moment.deletedAt)
  .map((moment) => ({
    id: `${MOMENT_EVENT_PREFIX}${moment.id}`,
    title: `${moment.icon} ${moment.name}`,
    startDate: moment.date,
    allDay: true,
    notes: "Growth Moment",
    categoryId: moment.calendarReminder!.calendarId!,
    tags: [],
    reminderMinutes: [],
    recurrence: moment.type === "since" ? { frequency: "yearly", interval: 1, endType: "never" } : undefined,
    createdAt: moment.createdAt,
    updatedAt: moment.updatedAt,
    deviceId: moment.deviceId,
  }));

export const momentIdForEvent = (event: CalendarEvent) => {
  const id = event.recurrenceParentId ?? event.id;
  return id.startsWith(MOMENT_EVENT_PREFIX) ? id.slice(MOMENT_EVENT_PREFIX.length) : undefined;
};
