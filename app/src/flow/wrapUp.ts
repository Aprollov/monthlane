import type { FlowTask, TaskBucket, UpdateTaskInput } from "../types.ts";

export type WrapUpAction = "tomorrow" | "thisWeek" | "inbox" | "keep" | "archive";

export type WrapUpPlanItem = {
  task: FlowTask;
  action: WrapUpAction;
};

export type WrapUpSummary = {
  completed: number;
  tomorrow: number;
  thisWeek: number;
  inbox: number;
  kept: number;
  archived: number;
};

export const wrapUpTasks = (tasks: FlowTask[], date: string) => ({
  completed: tasks.filter((task) => !task.deletedAt && task.status === "completed" && task.scheduledDate === date),
  unfinished: tasks.filter((task) => !task.deletedAt && task.status === "open" && task.scheduledDate === date),
});

export const changesForWrapUpAction = (
  action: Exclude<WrapUpAction, "keep" | "archive">,
  tomorrow: string,
): UpdateTaskInput => {
  if (action === "tomorrow") return { bucket: "thisWeek", scheduledDate: tomorrow };
  if (action === "thisWeek") return { bucket: "thisWeek", scheduledDate: undefined, scheduledTime: undefined };
  return { bucket: "inbox", scheduledDate: undefined, scheduledTime: undefined };
};

export const summarizeWrapUp = (completed: number, plan: WrapUpPlanItem[]): WrapUpSummary => ({
  completed,
  tomorrow: plan.filter((item) => item.action === "tomorrow").length,
  thisWeek: plan.filter((item) => item.action === "thisWeek").length,
  inbox: plan.filter((item) => item.action === "inbox").length,
  kept: plan.filter((item) => item.action === "keep").length,
  archived: plan.filter((item) => item.action === "archive").length,
});

export const wrapUpSummaryText = (summary: WrapUpSummary) => {
  const parts = [
    summary.completed && `${summary.completed} completed`,
    summary.tomorrow && `${summary.tomorrow} moved to tomorrow`,
    summary.thisWeek && `${summary.thisWeek} moved to This Week`,
    summary.inbox && `${summary.inbox} returned to Inbox`,
    summary.kept && `${summary.kept} kept`,
    summary.archived && `${summary.archived} archived`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Nothing changed.";
};
