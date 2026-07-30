import type { FlowBucket, FlowTask } from "../types.ts";

const active = (task: FlowTask) => !task.deletedAt && task.status !== "archived";

export const flowBucket = (task: FlowTask): FlowBucket => {
  if (task.bucket === "thisWeek" || task.bucket === "today") return task.bucket;
  return "inbox";
};

export const inboxTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => active(task) && task.status === "open" && flowBucket(task) === "inbox");

export const thisWeekTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => active(task) && task.status === "open" && flowBucket(task) === "thisWeek");

export const todayTasks = (tasks: FlowTask[], _today?: string) =>
  tasks.filter((task) => active(task) && task.status === "open" && flowBucket(task) === "today");

export const unfinishedTasks = (tasks: FlowTask[], today: string) =>
  tasks.filter((task) => active(task) && task.status === "open" && Boolean(task.scheduledDate) && task.scheduledDate! < today);

export const completedTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => !task.deletedAt && task.status === "completed");

export const laterReadTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => active(task) && task.status === "open" && task.kind === "readLater" && flowBucket(task) === "inbox");

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

export const sortLaterRead = sortInbox;
