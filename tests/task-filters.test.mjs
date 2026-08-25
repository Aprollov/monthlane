import assert from "node:assert/strict";
import test from "node:test";

import {
  completedTasksForBucket,
  completedTasks,
  flowBucketForScheduledDate,
  inboxTasks,
  isTodayCarryOver,
  sortCompleted,
  sortInbox,
  sortThisWeek,
  sortToday,
  thisWeekTasks,
  todayTasks,
  unfinishedTasks,
} from "../app/src/flow/taskFilters.ts";

const task = (id, changes = {}) => ({
  id,
  title: id,
  kind: "task",
  status: "open",
  bucket: "inbox",
  tags: [],
  sortOrder: 0,
  createdAt: `2026-07-29T10:00:0${id}.000Z`,
  updatedAt: "2026-07-29T10:00:00.000Z",
  deviceId: "test",
  ...changes,
});

test("Calendar dates map to Flow stages: today maps to today, other dates to planned", () => {
  assert.equal(flowBucketForScheduledDate("2026-08-03", "2026-08-03"), "today");
  assert.equal(flowBucketForScheduledDate("2026-08-10", "2026-08-03"), "thisWeek");
  assert.equal(flowBucketForScheduledDate("2026-07-30", "2026-08-03"), "thisWeek");
});

test("Inbox is determined by bucket independently from scheduledDate", () => {
  const tasks = [
    task("1"),
    task("2", { scheduledDate: "2026-07-29" }),
    task("3", { bucket: "thisWeek" }),
    task("4", { status: "completed" }),
    task("5", { deletedAt: "2026-07-29" }),
  ];
  assert.deepEqual(inboxTasks(tasks).map(({ id }) => id), ["1", "2"]);
});

test("This Week is manual bucket membership, independent of due date", () => {
  const tasks = [
    task("1", { bucket: "thisWeek" }),
    task("2", { dueDate: "2026-07-30" }),
    task("3", { bucket: "thisWeek", scheduledDate: "2026-08-10" }),
  ];
  assert.deepEqual(thisWeekTasks(tasks).map(({ id }) => id), ["1", "3"]);
});

test("Today uses its unique bucket while unfinished still uses scheduledDate", () => {
  const tasks = [
    task("1", { bucket: "today", scheduledDate: "2026-07-29" }),
    task("2", { scheduledDate: "2026-07-28" }),
    task("3", { scheduledDate: "2026-07-30" }),
    task("4", { bucket: "thisWeek", scheduledDate: "2026-07-29" }),
  ];
  assert.deepEqual(todayTasks(tasks, "2026-07-29").map(({ id }) => id), ["1"]);
  assert.deepEqual(unfinishedTasks(tasks, "2026-07-29").map(({ id }) => id), ["2"]);
});

test("Completed excludes deleted tasks", () => {
  const tasks = [
    task("1", { status: "completed", completedAt: "2026-07-29" }),
    task("2", { status: "completed", deletedAt: "2026-07-29" }),
  ];
  assert.deepEqual(completedTasks(tasks).map(({ id }) => id), ["1"]);
});

test("Completed tasks stay associated with their original Flow bucket", () => {
  const tasks = [
    task("1", { bucket: "inbox", status: "completed" }),
    task("2", { bucket: "today", status: "completed" }),
    task("3", { bucket: "laterRead", status: "completed" }),
  ];
  assert.deepEqual(completedTasksForBucket(tasks, "inbox").map(({ id }) => id), ["1", "3"]);
  assert.deepEqual(completedTasksForBucket(tasks, "today").map(({ id }) => id), ["2"]);
});

test("Today carry-over requires an unfinished task focused before today", () => {
  assert.equal(isTodayCarryOver(task("1", { bucket: "today", focusedAt: "2026-07-29T10:00:00Z" }), "2026-07-30"), true);
  assert.equal(isTodayCarryOver(task("2", { bucket: "today", focusedAt: "2026-07-30T01:00:00Z" }), "2026-07-30"), false);
  assert.equal(isTodayCarryOver(task("3", { bucket: "thisWeek", focusedAt: "2026-07-29T23:00:00Z" }), "2026-07-30"), false);
  assert.equal(isTodayCarryOver(task("4", { bucket: "today", status: "completed", focusedAt: "2026-07-29T23:00:00Z" }), "2026-07-30"), false);
});

test("sorters follow view-specific ordering", () => {
  assert.deepEqual(sortInbox([
    task("1", { sortOrder: 2 }),
    task("2", { sortOrder: 1 }),
  ]).map(({ id }) => id), ["2", "1"]);

  assert.deepEqual(sortThisWeek([
    task("1", { sortOrder: 0, scheduledDate: "2026-07-30" }),
    task("2", { sortOrder: 0, scheduledDate: "2026-07-29" }),
  ]).map(({ id }) => id), ["2", "1"]);

  assert.deepEqual(sortToday([
    task("1", { scheduledTime: undefined, sortOrder: 0 }),
    task("2", { scheduledTime: "14:00", sortOrder: 2 }),
    task("3", { scheduledTime: "09:00", sortOrder: 1 }),
  ]).map(({ id }) => id), ["3", "2", "1"]);

  assert.deepEqual(sortCompleted([
    task("1", { completedAt: "2026-07-28T10:00:00Z" }),
    task("2", { completedAt: "2026-07-29T10:00:00Z" }),
  ]).map(({ id }) => id), ["2", "1"]);
});
