import assert from "node:assert/strict";
import test from "node:test";
import { activeGridEntries, groupCalendarEntries } from "../app/src/flow/calendarEntries.ts";

const oneOffDone = { id: "t1", title: "Done once", status: "completed", scheduledDate: "2026-08-10" };
const oneOffOpen = { id: "t2", title: "Open once", status: "open", scheduledDate: "2026-08-10" };
const repeatDoneToday = {
  id: "rep", title: "Daily", status: "open", scheduledDate: "2026-08-10",
  recurrence: { frequency: "daily", interval: 1, endType: "never" },
  completedDates: ["2026-08-11"],
};
const event = { id: "e1", title: "Meeting", startDate: "2026-08-10" };

test("month grid hides completed one-off tasks but keeps open tasks and events", () => {
  const entries = groupCalendarEntries([event], [oneOffDone, oneOffOpen], "2026-08-09", "2026-08-12");
  const grid = activeGridEntries(entries);
  const day = grid.get("2026-08-10");
  assert.deepEqual(day.map((entry) => entry.id), ["event:e1", "task:t2"]);
});

test("recurring task keeps future occurrences in the grid after a day is completed", () => {
  const entries = groupCalendarEntries([], [repeatDoneToday], "2026-08-10", "2026-08-13");
  const grid = activeGridEntries(entries);
  assert.equal(grid.get("2026-08-10")?.[0]?.id, "task:rep::2026-08-10");
  assert.equal(grid.get("2026-08-11"), undefined);
  assert.equal(grid.get("2026-08-12")?.[0]?.id, "task:rep::2026-08-12");
});

test("day details still list completed tasks for history", () => {
  const entries = groupCalendarEntries([event], [oneOffDone, oneOffOpen], "2026-08-09", "2026-08-12");
  const day = entries.get("2026-08-10");
  assert.equal(day.length, 3);
  assert.ok(day.some((entry) => entry.type === "task" && entry.task.id === "t1"));
});
