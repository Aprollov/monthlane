import type { FlowBucket, FlowTask } from "../types.ts";
import { toDateKey } from "../dates.ts";

const active = (task: FlowTask) => !task.deletedAt && task.status !== "archived";

export const flowBucket = (task: FlowTask): FlowBucket => {
  if (task.bucket === "thisWeek" || task.bucket === "today") return task.bucket;
  return "inbox";
};

export const inboxTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => active(task) && task.status === "open" && flowBucket(task) === "inbox");

export const inboxActionTasks = (tasks: FlowTask[]) =>
  inboxTasks(tasks).filter((task) => task.kind !== "readLater");

export const thisWeekTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => active(task) && task.status === "open" && flowBucket(task) === "thisWeek");

export const todayTasks = (tasks: FlowTask[], _today?: string) =>
  tasks.filter((task) => active(task) && task.status === "open" && flowBucket(task) === "today");

export const unfinishedTasks = (tasks: FlowTask[], today: string) =>
  tasks.filter((task) => active(task) && task.status === "open" && Boolean(task.scheduledDate) && task.scheduledDate! < today);

export const completedTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => !task.deletedAt && task.status === "completed");

export const completedTasksForBucket = (tasks: FlowTask[], bucket: FlowBucket) =>
  completedTasks(tasks).filter((task) => flowBucket(task) === bucket);

export const isTodayCarryOver = (task: FlowTask, today: string) =>
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
