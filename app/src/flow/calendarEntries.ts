import type { CalendarEvent, FlowTask } from "../types.ts";

export type CalendarEntry =
  | { type: "event"; id: string; date: string; event: CalendarEvent }
  | { type: "task"; id: string; date: string; task: FlowTask };

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
    entryRank(a) - entryRank(b) ||
    entryTime(a).localeCompare(entryTime(b)) ||
    (a.type === "event" ? a.event.title : a.task.title)
      .localeCompare(b.type === "event" ? b.event.title : b.task.title),
  );

export const groupCalendarEntries = (events: CalendarEvent[], tasks: FlowTask[]) => {
  const result = new Map<string, CalendarEntry[]>();
  const add = (entry: CalendarEntry) => {
    const group = result.get(entry.date) ?? [];
    group.push(entry);
    result.set(entry.date, group);
  };
  for (const event of events) add({ type: "event", id: `event:${event.id}`, date: event.startDate, event });
  for (const task of tasks) {
    if (!task.scheduledDate || task.deletedAt || task.status === "archived") continue;
    add({ type: "task", id: `task:${task.id}`, date: task.scheduledDate, task });
  }
  for (const [date, entries] of result) result.set(date, sortCalendarEntries(entries));
  return result;
};
