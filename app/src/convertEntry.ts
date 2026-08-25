import type { CalendarEvent, FlowTask } from "./types.ts";
import { flowBucketForScheduledDate } from "./flow/taskFilters.ts";

/**
 * Task/Event conversion keeps the same id, title, date, notes, and metadata.
 * The caller soft-deletes the original record and stores the converted record
 * in the other collection, so no duplicate items are ever created.
 */

export const canConvertEvent = (event: CalendarEvent) =>
  !event.recurrence && !event.recurrenceParentId;

export const taskToEvent = (task: FlowTask, fallbackDate: string): CalendarEvent => ({
  id: task.id,
  title: task.title,
  startDate: task.scheduledDate ?? fallbackDate,
  allDay: !task.scheduledTime,
  startTime: task.scheduledTime,
  endTime: undefined,
  notes: task.notes ?? "",
  categoryId: task.categoryId ?? "other",
  tags: task.tags,
  reminderMinutes: [],
  createdAt: task.createdAt,
  updatedAt: new Date().toISOString(),
  deviceId: task.deviceId,
});

export const eventToTask = (event: CalendarEvent, today: string): FlowTask => ({
  id: event.id,
  title: event.title,
  notes: event.notes || undefined,
  kind: "task",
  status: "open",
  bucket: flowBucketForScheduledDate(event.startDate, today),
  scheduledDate: event.startDate,
  scheduledTime: event.allDay ? undefined : event.startTime,
  categoryId: event.categoryId || undefined,
  tags: event.tags,
  sortOrder: Number.isFinite(Date.parse(event.updatedAt)) ? Date.parse(event.updatedAt) : 0,
  createdAt: event.createdAt,
  updatedAt: new Date().toISOString(),
  deviceId: event.deviceId,
});
