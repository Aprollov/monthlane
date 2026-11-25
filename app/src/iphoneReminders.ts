import type { CalendarEvent, EventDraft, EventReminder } from "./types.ts";

export const IPHONE_SHORTCUT_NAME = "Monthlane 添加提醒";
export const IPHONE_REMINDERS_LIST = "Monthlane";

type ReminderEvent = Pick<EventDraft, "title" | "startDate" | "allDay" | "startTime" | "notes">;

export type ShortcutReminder = {
  title: string;
  triggerAt: string;
  notes: string;
};

export type ShortcutReminderPayload = {
  version: 1;
  list: typeof IPHONE_REMINDERS_LIST;
  timeZone: string;
  reminders: ShortcutReminder[];
};

type PayloadOptions = {
  /** Date#getTimezoneOffset semantics; useful for deterministic tests. */
  timezoneOffsetMinutes?: number;
  timeZone?: string;
};

const parts = (date: string, time: string) => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)),
  day: Number(date.slice(8, 10)),
  hour: Number(time.slice(0, 2)),
  minute: Number(time.slice(3, 5)),
});

const pad = (value: number) => String(value).padStart(2, "0");

const offsetText = (timezoneOffsetMinutes: number) => {
  const minutesEast = -timezoneOffsetMinutes;
  const sign = minutesEast >= 0 ? "+" : "-";
  const absolute = Math.abs(minutesEast);
  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
};

const localOffsetFor = (date: string, time: string) => {
  const value = parts(date, time);
  return new Date(value.year, value.month - 1, value.day, value.hour, value.minute).getTimezoneOffset();
};

const shiftedWallClock = (date: string, time: string, amountMinutes: number) => {
  const value = parts(date, time);
  const shifted = new Date(Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute));
  shifted.setUTCMinutes(shifted.getUTCMinutes() + amountMinutes);
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  };
};

export const localDateTimeWithOffset = (
  date: string,
  time: string,
  timezoneOffsetMinutes = localOffsetFor(date, time),
) => `${date}T${time}:00${offsetText(timezoneOffsetMinutes)}`;

export const remindersForEvent = (event?: CalendarEvent): EventReminder[] => {
  if (!event) return [];
  if (Array.isArray(event.reminders)) return event.reminders;
  return (event.reminderMinutes ?? []).map((minutesBefore, index) => ({
    id: `legacy-${minutesBefore}-${index}`,
    kind: "relative" as const,
    minutesBefore,
  }));
};

export const reminderTriggerAt = (
  event: ReminderEvent,
  reminder: EventReminder,
  timezoneOffsetMinutes?: number,
) => {
  if (reminder.kind === "absolute") {
    return localDateTimeWithOffset(reminder.date, reminder.time, timezoneOffsetMinutes);
  }
  const eventTime = event.allDay ? "09:00" : (event.startTime || "09:00");
  const trigger = shiftedWallClock(event.startDate, eventTime, -Math.max(0, reminder.minutesBefore));
  return localDateTimeWithOffset(trigger.date, trigger.time, timezoneOffsetMinutes);
};

export const buildShortcutPayload = (
  event: ReminderEvent,
  reminders: EventReminder[],
  options: PayloadOptions = {},
): ShortcutReminderPayload => ({
  version: 1,
  list: IPHONE_REMINDERS_LIST,
  timeZone: options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local",
  reminders: reminders.map((reminder) => ({
    title: event.title.trim(),
    triggerAt: reminderTriggerAt(event, reminder, options.timezoneOffsetMinutes),
    notes: event.notes.trim(),
  })),
});

export const shortcutRunUrl = (payload: ShortcutReminderPayload) =>
  `shortcuts://run-shortcut?name=${encodeURIComponent(IPHONE_SHORTCUT_NAME)}&input=text&text=${encodeURIComponent(JSON.stringify(payload))}`;
