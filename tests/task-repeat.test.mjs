import assert from "node:assert/strict";
import test from "node:test";
import { groupCalendarEntries } from "../app/src/flow/calendarEntries.ts";
import { isTaskDoneOn, thisWeekTasks, todayTasks, unfinishedTasks } from "../app/src/flow/taskFilters.ts";
import { taskOccursOn } from "../app/src/recurrence.ts";

const task = (overrides = {}) => ({
  id: "t1",
  kind: "task",
  title: "Water plants",
  status: "open",
  bucket: "thisWeek",
  tags: [],
  scheduledDate: "2026-08-03",
  sortOrder: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  deviceId: "test",
  ...overrides,
});

const daily = { frequency: "daily", interval: 1, endType: "never" };
const weeklyMon = { frequency: "weekly", interval: 1, daysOfWeek: [1], endType: "never" };
const monthly = { frequency: "monthly", interval: 1, endType: "never" };

test("taskOccursOn expands daily, weekly, and monthly rules", () => {
  assert.equal(taskOccursOn(task({ recurrence: daily }), "2026-08-02"), false);
  assert.equal(taskOccursOn(task({ recurrence: daily }), "2026-08-03"), true);
  assert.equal(taskOccursOn(task({ recurrence: daily }), "2026-08-11"), true);
  // 2026-08-03 is a Monday
  assert.equal(taskOccursOn(task({ recurrence: weeklyMon }), "2026-08-04"), false);
  assert.equal(taskOccursOn(task({ recurrence: weeklyMon }), "2026-08-10"), true);
  assert.equal(taskOccursOn(task({ recurrence: monthly }), "2026-09-03"), true);
  assert.equal(taskOccursOn(task({ recurrence: monthly }), "2026-09-04"), false);
  assert.equal(taskOccursOn(task(), "2026-08-03"), true);
  assert.equal(taskOccursOn(task(), "2026-08-04"), false);
});

test("isTaskDoneOn uses completedDates for repeating tasks and status otherwise", () => {
  assert.equal(isTaskDoneOn(task({ recurrence: daily, completedDates: ["2026-08-05"] }), "2026-08-05"), true);
  assert.equal(isTaskDoneOn(task({ recurrence: daily, completedDates: ["2026-08-05"] }), "2026-08-06"), false);
  assert.equal(isTaskDoneOn(task({ status: "completed" }), "2026-08-05"), true);
  assert.equal(isTaskDoneOn(task(), "2026-08-05"), false);
});

test("todayTasks shows repeating tasks only on occurrence days until done", () => {
  const repeating = task({ id: "rep", bucket: "thisWeek", recurrence: daily });
  const doneToday = task({ id: "done", bucket: "thisWeek", recurrence: daily, completedDates: ["2026-08-11"] });
  const oneOffToday = task({ id: "one", bucket: "today" });
  const result = todayTasks([repeating, doneToday, oneOffToday], "2026-08-11");
  assert.deepEqual(result.map((item) => item.id).sort(), ["one", "rep"]);
  assert.deepEqual(todayTasks([repeating], "2026-08-02").map((item) => item.id), []);
});

test("thisWeek and unfinished lists ignore repeating tasks", () => {
  const repeating = task({ id: "rep", bucket: "thisWeek", recurrence: daily, scheduledDate: "2026-08-01" });
  const oneOff = task({ id: "one", bucket: "thisWeek" });
  assert.deepEqual(thisWeekTasks([repeating, oneOff]).map((item) => item.id), ["one"]);
  assert.deepEqual(unfinishedTasks([repeating, oneOff], "2026-08-11").map((item) => item.id), ["one"]);
});

test("groupCalendarEntries expands a repeating task across the range", () => {
  const repeating = task({ id: "rep", recurrence: weeklyMon });
  const oneOff = task({ id: "one", scheduledDate: "2026-08-05" });
  const entries = groupCalendarEntries([], [repeating, oneOff], "2026-08-03", "2026-08-16");
  const dates = (entries.get("2026-08-10") ?? []).map((entry) => entry.id);
  assert.deepEqual(dates, ["task:rep::2026-08-10"]);
  assert.deepEqual((entries.get("2026-08-05") ?? []).map((entry) => entry.id), ["task:one"]);
  assert.equal(entries.get("2026-08-06"), undefined);
});

test("groupCalendarEntries hides completed repeating series", () => {
  const repeating = task({ id: "rep", recurrence: daily, status: "completed" });
  const entries = groupCalendarEntries([], [repeating], "2026-08-03", "2026-08-09");
  assert.equal(entries.get("2026-08-04"), undefined);
});
