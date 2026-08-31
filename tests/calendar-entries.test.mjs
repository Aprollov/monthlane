import assert from "node:assert/strict";
import test from "node:test";
import { groupCalendarEntries, sortCalendarEntries } from "../app/src/flow/calendarEntries.ts";

const event = (overrides = {}) => ({
  id: "event",
  title: "Event",
  startDate: "2026-07-29",
  allDay: false,
  startTime: "10:00",
  endTime: "11:00",
  categoryId: "life",
  recurrence: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  ...overrides,
});

const task = (overrides = {}) => ({
  id: "task",
  kind: "task",
  title: "Task",
  status: "open",
  bucket: "thisWeek",
  scheduledDate: "2026-07-29",
  order: 0,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  ...overrides,
});

test("calendar entries order all-day events, timed events, timed tasks, then untimed tasks", () => {
  const entries = [
    { type: "task", id: "task:untimed", date: "2026-07-29", task: task({ id: "untimed", title: "Untimed", scheduledTime: undefined }) },
    { type: "event", id: "event:timed", date: "2026-07-29", event: event({ id: "timed", title: "Timed", startTime: "09:00" }) },
    { type: "task", id: "task:timed", date: "2026-07-29", task: task({ id: "timed", title: "Timed task", scheduledTime: "08:00" }) },
    { type: "event", id: "event:all-day", date: "2026-07-29", event: event({ id: "all-day", title: "All day", allDay: true, startTime: undefined }) },
  ];

  assert.deepEqual(sortCalendarEntries(entries).map((entry) => entry.id), [
    "event:all-day",
    "event:timed",
    "task:timed",
    "task:untimed",
  ]);
});

test("calendar grouping excludes unscheduled, deleted, and archived tasks", () => {
  const grouped = groupCalendarEntries(
    [event()],
    [
      task({ id: "visible" }),
      task({ id: "unscheduled", scheduledDate: undefined }),
      task({ id: "deleted", deletedAt: "2026-07-29T00:00:00.000Z" }),
      task({ id: "archived", status: "archived" }),
    ],
  );

  assert.deepEqual(grouped.get("2026-07-29")?.map((entry) => entry.id), ["event:event", "task:visible"]);
});

test("calendar grouping keeps entries separated by scheduled date", () => {
  const grouped = groupCalendarEntries(
    [event({ id: "tomorrow-event", startDate: "2026-07-30" })],
    [task({ id: "today-task" })],
  );

  assert.equal(grouped.get("2026-07-29")?.[0].id, "task:today-task");
  assert.equal(grouped.get("2026-07-30")?.[0].id, "event:tomorrow-event");
});
