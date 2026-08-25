import { taskOccursOn } from "../recurrence.ts";
import type { FlowBucket, FlowTask } from "../types.ts";
import { toDateKey } from "../dates.ts";

const active = (task: FlowTask) => !task.deletedAt && task.status !== "archived";

export const flowBucket = (task: FlowTask): FlowBucket => {
  if (task.bucket === "thisWeek" || task.bucket === "today") return task.bucket;
  return "inbox";
};

/**
 * Derives the Flow stage from a calendar scheduling date.
 * Today maps to the "today" bucket; any other date maps to "thisWeek"
 * (the planned stage); no date leaves the task in its current stage.
 */
export const flowBucketForScheduledDate = (scheduledDate: string, today: string): FlowBucket =>
  scheduledDate === today ? "today" : "thisWeek";

export const inboxTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => active(task) && task.status === "open" && flowBucket(task) === "inbox");

export const inboxActionTasks = (tasks: FlowTask[]) =>
  inboxTasks(tasks).filter((task) => task.kind !== "readLater");

/** Repeating tasks are done per occurrence date; one-off tasks use their status. */
export const isTaskDoneOn = (task: FlowTask, date: string) =>
  task.recurrence ? (task.completedDates ?? []).includes(date) : task.status === "completed";

export const thisWeekTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => active(task) && task.status === "open" && !task.recurrence && flowBucket(task) === "thisWeek");

export const todayTasks = (tasks: FlowTask[], today?: string) =>
  tasks.filter((task) => active(task) && task.status === "open" && (
    task.recurrence
      ? Boolean(today && taskOccursOn(task, today) && !(task.completedDates ?? []).includes(today))
      : flowBucket(task) === "today"
  ));

export const unfinishedTasks = (tasks: FlowTask[], today: string) =>
  tasks.filter((task) => active(task) && task.status === "open" && !task.recurrence && Boolean(task.scheduledDate) && task.scheduledDate! < today);

export const completedTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => !task.deletedAt && task.status === "completed");

export const completedTasksForBucket = (tasks: FlowTask[], bucket: FlowBucket) =>
  completedTasks(tasks).filter((task) => flowBucket(task) === bucket);

export const isTodayCarryOver = (task: FlowTask, today: string) =>
  !task.recurrence &&
  flowBucket(task) === "today" &&
  task.status === "open" &&
  Boolean(task.focusedAt && toDateKey(new Date(task.focusedAt)) < today);

export const sortInbox = (tasks: FlowTask[]) =>
  [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));

export const sortThisWeek = (tasks: FlowTask[]) =>
  [...tasks].sort((a, b) =>
    a.sortOrder - b.sortOrder ||
    (a.scheduledDate ?? "9999").localeCompare(b.scheduledDate ?? "9999") ||
    a.createdAt.localeCompare(b.createdAt),
  );

export const sortToday = (tasks: FlowTask[]) =>
  [...tasks].sort((a, b) =>
    (a.scheduledTime ?? "99:99").localeCompare(b.scheduledTime ?? "99:99") ||
    a.sortOrder - b.sortOrder ||
    a.createdAt.localeCompare(b.createdAt),
  );

export const sortCompleted = (tasks: FlowTask[]) =>
  [...tasks].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
