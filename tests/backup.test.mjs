import assert from "node:assert/strict";
import test from "node:test";

import { mergeBackups } from "../app/src/database.ts";

const event = (id, title, updatedAt) => ({
  id,
  title,
  startDate: "2026-07-29",
  allDay: true,
  notes: "",
  categoryId: "personal",
  tags: [],
  reminderMinutes: [],
  createdAt: updatedAt,
  updatedAt,
  deviceId: "test",
});

const backup = (events) => ({
  version: 1,
  exportedAt: "2026-07-29T00:00:00.000Z",
  events,
  categories: [],
  exceptions: [],
});

test("cloud merge keeps the newest edit and records from both devices", () => {
  const local = backup([
    event("shared", "Local new title", "2026-07-29T12:00:00.000Z"),
    event("local-only", "Local", "2026-07-29T10:00:00.000Z"),
  ]);
  const remote = backup([
    event("shared", "Remote old title", "2026-07-29T11:00:00.000Z"),
    event("remote-only", "Remote", "2026-07-29T09:00:00.000Z"),
  ]);

  const merged = mergeBackups(local, remote);
  assert.deepEqual(
    merged.events.map(({ id, title }) => [id, title]),
    [
      ["shared", "Local new title"],
      ["local-only", "Local"],
      ["remote-only", "Remote"],
    ],
  );
});

test("cloud merge preserves the newest deletion marker", () => {
  const local = backup([event("shared", "Active", "2026-07-29T11:00:00.000Z")]);
  const deleted = {
    ...event("shared", "Active", "2026-07-29T12:00:00.000Z"),
    deletedAt: "2026-07-29T12:00:00.000Z",
  };
  assert.equal(mergeBackups(local, backup([deleted])).events[0].deletedAt, deleted.deletedAt);
});
