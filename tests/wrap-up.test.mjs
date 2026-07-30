import assert from "node:assert/strict";
import test from "node:test";
import {
  changesForWrapUpAction,
  summarizeWrapUp,
  wrapUpSummaryText,
  wrapUpTasks,
} from "../app/src/flow/wrapUp.ts";

const task = (overrides = {}) => ({
  id: "task",
  title: "Task",
  kind: "task",
  status: "open",
  bucket: "thisWeek",
  scheduledDate: "2026-07-30",
  tags: [],
  sortOrder: 0,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  deviceId: "device",
  ...overrides,
});

test("Wrap Up separates completed and unfinished tasks for the selected day", () => {
  const result = wrapUpTasks([
    task({ id: "open" }),
    task({ id: "done", status: "completed", completedAt: "2026-07-30T08:00:00.000Z" }),
    task({ id: "other", scheduledDate: "2026-07-29" }),
    task({ id: "deleted", deletedAt: "2026-07-30T09:00:00.000Z" }),
  ], "2026-07-30");
  assert.deepEqual(result.unfinished.map(({ id }) => id), ["open"]);
  assert.deepEqual(result.completed.map(({ id }) => id), ["done"]);
});

test("Wrap Up actions preserve due date while changing planning fields", () => {
  assert.deepEqual(changesForWrapUpAction("tomorrow", "2026-07-31"), {
    bucket: "thisWeek",
    scheduledDate: "2026-07-31",
  });
  assert.deepEqual(changesForWrapUpAction("thisWeek", "2026-07-31"), {
    bucket: "thisWeek",
    scheduledDate: undefined,
    scheduledTime: undefined,
  });
  assert.deepEqual(changesForWrapUpAction("inbox", "2026-07-31"), {
    bucket: "inbox",
    scheduledDate: undefined,
    scheduledTime: undefined,
  });
});

test("Wrap Up creates a concise operation summary", () => {
  const summary = summarizeWrapUp(2, [
    { task: task({ id: "a" }), action: "tomorrow" },
    { task: task({ id: "b" }), action: "inbox" },
    { task: task({ id: "c" }), action: "keep" },
  ]);
  assert.equal(wrapUpSummaryText(summary), "2 completed · 1 moved to tomorrow · 1 returned to Inbox · 1 kept");
});
