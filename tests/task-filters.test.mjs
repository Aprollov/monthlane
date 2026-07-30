import assert from "node:assert/strict";
import test from "node:test";

import {
  completedTasks,
  inboxTasks,
  laterReadTasks,
  sortCompleted,
  sortInbox,
  sortLaterRead,
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

test("Inbox contains only open, unscheduled inbox tasks", () => {
  const tasks = [
    task("1"),
    task("2", { scheduledDate: "2026-07-29" }),
    task("3", { bucket: "thisWeek" }),
    task("4", { status: "completed" }),
    task("5", { deletedAt: "2026-07-29" }),
  ];
  assert.deepEqual(inboxTasks(tasks).map(({ id }) => id), ["1"]);
});

test("This Week is manual bucket membership, independent of due date", () => {
  const tasks = [
    task("1", { bucket: "thisWeek" }),
    task("2", { dueDate: "2026-07-30" }),
    task("3", { bucket: "thisWeek", scheduledDate: "2026-08-10" }),
  ];
  assert.deepEqual(thisWeekTasks(tasks).map(({ id }) => id), ["1", "3"]);
});

test("Today uses scheduledDate and unfinished keeps original past dates", () => {
  const tasks = [
    task("1", { bucket: "thisWeek", scheduledDate: "2026-07-29" }),
    task("2", { scheduledDate: "2026-07-28" }),
    task("3", { scheduledDate: "2026-07-30" }),
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

test("Later Read contains only open read-later links in its bucket", () => {
  const tasks = [
    task("1", { kind: "readLater", bucket: "laterRead", url: "https://example.com" }),
    task("2", { kind: "task", bucket: "laterRead" }),
    task("3", { kind: "readLater", bucket: "laterRead", status: "completed" }),
  ];
  assert.deepEqual(laterReadTasks(tasks).map(({ id }) => id), ["1"]);
  assert.deepEqual(sortLaterRead([
    task("1", { sortOrder: 2 }),
    task("2", { sortOrder: 1 }),
  ]).map(({ id }) => id), ["2", "1"]);
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
