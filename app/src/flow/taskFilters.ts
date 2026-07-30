import type { FlowTask } from "../types.ts";

const active = (task: FlowTask) => !task.deletedAt && task.status !== "archived";

export const inboxTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => active(task) && task.status === "open" && task.bucket === "inbox" && !task.scheduledDate);

export const thisWeekTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => active(task) && task.status === "open" && task.bucket === "thisWeek");

export const todayTasks = (tasks: FlowTask[], today: string) =>
  tasks.filter((task) => active(task) && task.status === "open" && task.scheduledDate === today);

export const unfinishedTasks = (tasks: FlowTask[], today: string) =>
  tasks.filter((task) => active(task) && task.status === "open" && Boolean(task.scheduledDate) && task.scheduledDate! < today);

export const completedTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => !task.deletedAt && task.status === "completed");

export const laterReadTasks = (tasks: FlowTask[]) =>
  tasks.filter((task) => active(task) && task.status === "open" && task.kind === "readLater" && task.bucket === "laterRead");

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
