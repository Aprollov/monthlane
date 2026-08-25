import assert from "node:assert/strict";
import test from "node:test";

import { canConvertEvent, eventToTask, taskToEvent } from "../app/src/convertEntry.ts";

const task = (changes = {}) => ({
  id: "task-1",
  title: "Write the report",
  notes: "Focus on metrics",
  kind: "task",
  status: "open",
  bucket: "today",
  scheduledDate: "2026-08-03",
  scheduledTime: "10:30",
  categoryId: "work",
  tags: ["deep"],
  sortOrder: 1,
  createdAt: "2026-08-01T09:00:00.000Z",
  updatedAt: "2026-08-02T09:00:00.000Z",
  deviceId: "device-a",
  ...changes,
});

const event = (changes = {}) => ({
  id: "event-1",
  title: "Team lunch",
  startDate: "2026-08-03",
  allDay: false,
  startTime: "12:00",
  notes: "Bring notes",
  categoryId: "life",
  tags: ["social"],
  reminderMinutes: [],
  createdAt: "2026-08-01T09:00:00.000Z",
  updatedAt: "2026-08-02T09:00:00.000Z",
  deviceId: "device-a",
  ...changes,
});

test("task converts to event keeping id, title, date, notes, and metadata", () => {
  const converted = taskToEvent(task(), "2026-08-03");
  assert.equal(converted.id, "task-1");
  assert.equal(converted.title, "Write the report");
  assert.equal(converted.startDate, "2026-08-03");
  assert.equal(converted.startTime, "10:30");
  assert.equal(converted.allDay, false);
  assert.equal(converted.notes, "Focus on metrics");
  assert.equal(converted.categoryId, "work");
  assert.deepEqual(converted.tags, ["deep"]);
  assert.equal(converted.createdAt, "2026-08-01T09:00:00.000Z");
  assert.equal(converted.deviceId, "device-a");
});

test("unscheduled task falls back to the provided date and becomes all day", () => {
  const converted = taskToEvent(task({ scheduledDate: undefined, scheduledTime: undefined }), "2026-08-05");
  assert.equal(converted.startDate, "2026-08-05");
  assert.equal(converted.allDay, true);
});

test("event converts to task keeping identity and deriving the flow stage from the date", () => {
  const today = eventToTask(event(), "2026-08-03");
  assert.equal(today.id, "event-1");
  assert.equal(today.bucket, "today");
  assert.equal(today.scheduledDate, "2026-08-03");
  assert.equal(today.scheduledTime, "12:00");
  assert.equal(today.notes, "Bring notes");

  const planned = eventToTask(event({ startDate: "2026-08-10" }), "2026-08-03");
  assert.equal(planned.bucket, "thisWeek");
});

test("all-day event converts without a time", () => {
  const converted = eventToTask(event({ allDay: true }), "2026-08-03");
  assert.equal(converted.scheduledTime, undefined);
});

test("recurring events cannot be converted", () => {
  assert.equal(canConvertEvent(event()), true);
  assert.equal(canConvertEvent(event({ recurrence: { frequency: "weekly", interval: 1, endType: "never" } })), false);
  assert.equal(canConvertEvent(event({ recurrenceParentId: "parent-1" })), false);
});
