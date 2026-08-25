import { nextDateKey } from "../dates.ts";
import { taskOccursOn } from "../recurrence.ts";
import { isTaskDoneOn } from "./taskFilters.ts";
import type { CalendarEvent, FlowTask, TaskPriority } from "../types.ts";

export type CalendarEntry =
  | { type: "event"; id: string; date: string; event: CalendarEvent }
  | { type: "task"; id: string; date: string; task: FlowTask };

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export const priorityRank = (priority?: TaskPriority) => PRIORITY_RANK[priority ?? "medium"];

/** Small indicator shown before titles; missing priority reads as medium. */
export const priorityMark = (priority?: TaskPriority) =>
  priority === "high" ? "🔴" : priority === "low" ? "⚪" : "🟡";

/** Muted left-bar color for month-view rows; missing priority reads as medium. */
export const priorityColor = (priority?: TaskPriority) =>
  priority === "high" ? "#d96c5f" : priority === "low" ? "#c8c9c2" : "#d9b25e";

const typeRank = (entry: CalendarEntry) => (entry.type === "event" ? 0 : 1);

const entryRank = (entry: CalendarEntry) => {
  if (entry.type === "event") return entry.event.allDay ? 0 : 1;
  return entry.task.scheduledTime ? 2 : 3;
};

const entryTime = (entry: CalendarEntry) => {
  if (entry.type === "event") return entry.event.startTime ?? "";
  return entry.task.scheduledTime ?? "";
};

export const sortCalendarEntries = (entries: CalendarEntry[]) =>
  [...entries].sort((a, b) =>
    typeRank(a) - typeRank(b) ||
    (a.type === "event" && b.type === "event"
      ? entryRank(a) - entryRank(b) || entryTime(a).localeCompare(entryTime(b))
      : priorityRank(a.type === "task" ? a.task.priority : undefined) -
          priorityRank(b.type === "task" ? b.task.priority : undefined) ||
        entryRank(a) - entryRank(b) ||
        entryTime(a).localeCompare(entryTime(b))) ||
    (a.type === "event" ? a.event.title : a.task.title)
      .localeCompare(b.type === "event" ? b.event.title : b.task.title),
  );

export const groupCalendarEntries = (
  events: CalendarEvent[],
  tasks: FlowTask[],
  rangeStart?: string,
  rangeEnd?: string,
) => {
  const result = new Map<string, CalendarEntry[]>();
  const add = (entry: CalendarEntry) => {
    const group = result.get(entry.date) ?? [];
    group.push(entry);
    result.set(entry.date, group);
  };
  for (const event of events) add({ type: "event", id: `event:${event.id}`, date: event.startDate, event });
  for (const task of tasks) {
    if (!task.scheduledDate || task.deletedAt || task.status === "archived") continue;
    if (task.recurrence) {
      if (task.status !== "open" || !rangeStart || !rangeEnd) continue;
      for (let key = rangeStart; key <= rangeEnd; key = nextDateKey(key)) {
        if (taskOccursOn(task, key)) add({ type: "task", id: `task:${task.id}::${key}`, date: key, task });
      }
      continue;
    }
    add({ type: "task", id: `task:${task.id}`, date: task.scheduledDate, task });
  }
  for (const [date, entries] of result) result.set(date, sortCalendarEntries(entries));
  return result;
};


/** Month-grid view of the entries: done task occurrences stay out of the grid but remain in day details. */
export const activeGridEntries = (entriesByDate: Map<string, CalendarEntry[]>) => {
  const result = new Map<string, CalendarEntry[]>();
  for (const [date, entries] of entriesByDate) {
    const visible = entries.filter((entry) => entry.type === "event" || !isTaskDoneOn(entry.task, date));
    if (visible.length) result.set(date, visible);
  }
  return result;
};
