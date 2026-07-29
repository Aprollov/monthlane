import assert from "node:assert/strict";
import test from "node:test";

import { searchEvents } from "../app/src/search.ts";

const categories = [
  { id: "work", name: "Work" },
  { id: "personal", name: "Personal" },
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
  event("1", "Dentist", "Bring insurance card", "personal", "2026-08-10"),
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
