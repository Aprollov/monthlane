import assert from "node:assert/strict";
import test from "node:test";
import { priorityColor, priorityMark, priorityRank, sortCalendarEntries } from "../app/src/flow/calendarEntries.ts";

const task = (id, priority, extra = {}) => ({
  type: "task", id: `task:${id}`, date: "2026-08-18",
  task: { id, title: `Task ${id}`, status: "open", scheduledDate: "2026-08-18", priority, ...extra },
});
const event = (id, extra = {}) => ({
  type: "event", id: `event:${id}`, date: "2026-08-18",
  event: { id, title: `Event ${id}`, startDate: "2026-08-18", allDay: true, ...extra },
});

test("missing priority is treated as medium", () => {
  assert.equal(priorityRank(undefined), priorityRank("medium"));
  assert.equal(priorityMark(undefined), "🟡");
  assert.equal(priorityMark("high"), "🔴");
  assert.equal(priorityMark("low"), "⚪");
});

test("events come first sorted by start time, then tasks by priority high > medium > low", () => {
  const sorted = sortCalendarEntries([
    task("a", "low"),
    event("b", { allDay: false, startTime: "10:00" }),
    task("c", "high", { scheduledTime: "18:00" }),
    event("d", { allDay: false, startTime: "09:00" }),
    task("e", "medium"),
  ]);
  assert.deepEqual(sorted.map((entry) => entry.id), ["event:d", "event:b", "task:c", "task:e", "task:a"]);
});

test("within tasks of equal priority the previous order (timed before untimed) holds", () => {
  const sorted = sortCalendarEntries([
    task("t1", "medium"),
    task("t2", "medium", { scheduledTime: "09:00" }),
  ]);
  assert.deepEqual(sorted.map((entry) => entry.id), ["task:t2", "task:t1"]);
});

test("priorityColor maps to muted left-bar colors with medium as default", () => {
  assert.equal(priorityColor("high"), "#d96c5f");
  assert.equal(priorityColor("low"), "#c8c9c2");
  assert.equal(priorityColor(undefined), priorityColor("medium"));
});
