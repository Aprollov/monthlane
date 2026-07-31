import assert from "node:assert/strict";
import test from "node:test";

import {
  CALENDAR_DRAG_LONG_PRESS_MS,
  calendarDragItem,
  formatMovedDate,
  pointerDistance,
  rescheduledEvent,
} from "../app/src/calendarReschedule.ts";

const event = (overrides = {}) => ({
  id: "event-1",
  title: "Planning",
  startDate: "2026-08-01",
  allDay: true,
  notes: "Keep this note",
  categoryId: "work",
  tags: ["focus"],
  reminderMinutes: [30],
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z",
  deviceId: "device-1",
  ...overrides,
});

test("rescheduling an event updates only its local date and edit timestamp", () => {
  const original = event();
  const moved = rescheduledEvent(original, "2026-08-06", "2026-08-01T09:00:00.000Z");

  assert.equal(moved.id, original.id);
  assert.equal(moved.startDate, "2026-08-06");
  assert.equal(moved.updatedAt, "2026-08-01T09:00:00.000Z");
  assert.equal(moved.notes, original.notes);
  assert.equal(moved.categoryId, original.categoryId);
  assert.deepEqual(moved.tags, original.tags);
  assert.deepEqual(moved.reminderMinutes, original.reminderMinutes);
  assert.equal(original.startDate, "2026-08-01");
});

test("calendar drag data uses stable IDs and blocks recurring occurrences", () => {
  const occurrence = event({
    id: "series-1::2026-08-01",
    recurrenceParentId: "series-1",
    recurrenceInstanceDate: "2026-08-01",
  });
  const item = calendarDragItem({
    type: "event",
    id: `event:${occurrence.id}`,
    date: occurrence.startDate,
    event: occurrence,
  });

  assert.equal(item.id, "series-1");
  assert.equal(item.recurring, true);
});

test("task drag data preserves the task stable ID", () => {
  const task = {
    id: "task-42",
    title: "Write proposal",
    kind: "task",
    status: "open",
    bucket: "today",
    scheduledDate: "2026-08-01",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    deviceId: "device-1",
  };
  const item = calendarDragItem({
    type: "task",
    id: `task:${task.id}`,
    date: task.scheduledDate,
    task,
  });

  assert.deepEqual(item, {
    type: "task",
    id: "task-42",
    sourceDate: "2026-08-01",
    title: "Write proposal",
    recurring: false,
  });
});

test("drag timing and date copy match the interaction contract", () => {
  assert.equal(CALENDAR_DRAG_LONG_PRESS_MS, 450);
  assert.equal(pointerDistance(0, 0, 3, 4), 5);
  assert.equal(formatMovedDate("2026-08-06"), "Aug 6");
});
