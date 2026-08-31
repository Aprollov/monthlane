import assert from "node:assert/strict";
import test from "node:test";

import { searchEvents, searchTasks } from "../app/src/search.ts";

const categories = [
  { id: "work", name: "Work" },
  { id: "life", name: "Life" },
];
const event = (id, title, notes, categoryId, startDate) => ({
  id,
  title,
  notes,
  categoryId,
  startDate,
  allDay: true,
  tags: [],
  reminderMinutes: [],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  deviceId: "test",
});
const events = [
  event("1", "Dentist", "Bring insurance card", "life", "2026-08-10"),
  event("2", "Quarterly review", "Revenue planning", "work", "2026-09-02"),
  { ...event("3", "Old meeting", "", "work", "2026-07-01"), deletedAt: "2026-07-02" },
];

test("search matches title, notes, and calendar names", () => {
  assert.deepEqual(searchEvents(events, categories, "dent", "all").map((item) => item.id), ["1"]);
  assert.deepEqual(searchEvents(events, categories, "insurance", "all").map((item) => item.id), ["1"]);
  assert.deepEqual(searchEvents(events, categories, "work", "all").map((item) => item.id), ["2"]);
});

test("search applies calendar filters and excludes deleted events", () => {
  assert.deepEqual(searchEvents(events, categories, "", "work").map((item) => item.id), ["2"]);
});

const task = (id, changes = {}) => ({
  id,
  title: id,
  kind: "task",
  status: "open",
  bucket: "inbox",
  tags: [],
  sortOrder: 0,
  createdAt: "2026-07-30T08:00:00.000Z",
  updatedAt: "2026-07-30T08:00:00.000Z",
  deviceId: "test",
  ...changes,
});

test("task search matches title, notes, tags, category, and Later Read metadata", () => {
  const tasks = [
    task("reply", { title: "Reply to client", notes: "German account", categoryId: "work", tags: ["follow-up"] }),
    task("article", { kind: "readLater", bucket: "laterRead", title: "Reading", pageTitle: "Design systems", siteName: "YouTube", url: "https://youtube.com/watch?v=1" }),
  ];
  assert.deepEqual(searchTasks(tasks, categories, "German").map(({ id }) => id), ["reply"]);
  assert.deepEqual(searchTasks(tasks, categories, "follow-up").map(({ id }) => id), ["reply"]);
  assert.deepEqual(searchTasks(tasks, categories, "YouTube").map(({ id }) => id), ["article"]);
  assert.deepEqual(searchTasks(tasks, categories, "work").map(({ id }) => id), ["reply"]);
});
