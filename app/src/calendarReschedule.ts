import { fromDateKey } from "./dates.ts";
import type { CalendarEntry } from "./flow/calendarEntries.ts";
import type { CalendarEvent } from "./types.ts";

export const CALENDAR_DRAG_LONG_PRESS_MS = 450;
export const CALENDAR_DRAG_MOUSE_THRESHOLD = 5;
export const CALENDAR_DRAG_TOUCH_CANCEL_THRESHOLD = 10;

export type CalendarDragItem = {
  type: "event" | "task";
  id: string;
  sourceDate: string;
  title: string;
  recurring: boolean;
};

export const calendarDragItem = (entry: CalendarEntry): CalendarDragItem =>
  entry.type === "event"
    ? {
        type: "event",
        id: entry.event.recurrenceParentId ?? entry.event.id,
        sourceDate: entry.date,
        title: entry.event.title,
        recurring: Boolean(entry.event.recurrence || entry.event.recurrenceParentId),
      }
    : {
        type: "task",
        id: entry.task.id,
        sourceDate: entry.date,
        title: entry.task.title,
        recurring: false,
      };

export const pointerDistance = (
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
) => Math.hypot(clientX - startX, clientY - startY);

export const formatMovedDate = (dateKey: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
    .format(fromDateKey(dateKey));

export const rescheduledEvent = (
  event: CalendarEvent,
  targetDate: string,
  updatedAt: string,
): CalendarEvent => ({
  ...event,
  startDate: targetDate,
  updatedAt,
});
