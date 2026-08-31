import assert from "node:assert/strict";
import test from "node:test";

import { mergeBackups, normalizeBackup, prepareBackupImport } from "../app/src/database.ts";
import { summarizeTaskSync, taskSyncSummaryText } from "../app/src/cloud.ts";

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
  assert.equal(merged.version, 2);
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

const flowTask = (id, title, updatedAt, changes = {}) => ({
  id,
  title,
  kind: "task",
  status: "open",
  bucket: "inbox",
  tags: [],
  sortOrder: 0,
  createdAt: updatedAt,
  updatedAt,
  deviceId: "test",
  ...changes,
});

const backupV2 = (tasks, changes = {}) => ({
  version: 2,
  schemaVersion: 2,
  exportedAt: "2026-07-30T00:00:00.000Z",
  updatedAt: "2026-07-30T00:00:00.000Z",
  events: [],
  tasks,
  categories: [],
  exceptions: [],
  ...changes,
});

test("V1 backup normalization adds an empty tasks collection", () => {
  const normalized = normalizeBackup(backup([]));
  assert.equal(normalized.version, 2);
  assert.deepEqual(normalized.tasks, []);
});

test("Personal records normalize to Life without copying or losing fields", () => {
  const originalEvent = {
    ...event("personal-event", "Dinner", "2026-07-29T12:00:00.000Z"),
    notes: "Keep this note",
    recurrence: { frequency: "yearly", interval: 1, endType: "never" },
  };
  const originalTask = flowTask("personal-task", "Plan dinner", "2026-07-30T09:00:00.000Z", {
    categoryId: "Personal",
    notes: "Keep task note",
    completedAt: "2026-07-30T10:00:00.000Z",
    showInMonthView: false,
  });
  const normalized = normalizeBackup({
    ...backupV2([originalTask]),
    events: [originalEvent],
    categories: [{ id: "personal", name: "Personal", color: "#8A7894", isDefault: true, createdAt: originalEvent.createdAt, updatedAt: originalEvent.updatedAt, deviceId: "test" }],
  });

  assert.equal(normalized.events.length, 1);
  assert.equal(normalized.events[0].categoryId, "life");
  assert.equal(normalized.events[0].notes, originalEvent.notes);
  assert.deepEqual(normalized.events[0].recurrence, originalEvent.recurrence);
  assert.equal(normalized.tasks.length, 1);
  assert.equal(normalized.tasks[0].categoryId, "life");
  assert.equal(normalized.tasks[0].completedAt, originalTask.completedAt);
  assert.equal(normalized.tasks[0].showInMonthView, false);
  assert.equal(normalized.categories.some(({ id }) => id === "personal"), false);
  assert.equal(normalized.categories.some(({ id }) => id === "life"), true);
});

test("schemaVersion-only legacy cloud payload remains compatible", () => {
  const normalized = normalizeBackup({
    schemaVersion: 1,
    exportTime: "2026-07-29T00:00:00.000Z",
    events: [],
    categories: [],
    exceptions: [],
  });
  assert.deepEqual(normalized.tasks, []);
  assert.equal(normalized.exportedAt, "2026-07-29T00:00:00.000Z");
});

test("V2 import preserves tasks and replace does not keep local-only records", () => {
  const local = backupV2([flowTask("local", "Local", "2026-07-30T09:00:00.000Z")]);
  const incoming = backupV2([flowTask("incoming", "Incoming", "2026-07-30T10:00:00.000Z")]);
  assert.deepEqual(prepareBackupImport(local, incoming, "merge").tasks.map(({ id }) => id), ["local", "incoming"]);
  assert.deepEqual(prepareBackupImport(local, incoming, "replace").tasks.map(({ id }) => id), ["incoming"]);
});

test("legacy V2 tasks receive safe Flow defaults without losing schedule data", () => {
  const normalized = normalizeBackup(backupV2([{
    id: "legacy",
    title: "Legacy scheduled task",
    scheduledDate: "2026-08-08",
    completed: false,
    createdAt: "2026-07-30T08:00:00.000Z",
    updatedAt: "2026-07-30T09:00:00.000Z",
  }]));
  const [task] = normalized.tasks;
  assert.equal(task.bucket, "inbox");
  assert.equal(task.status, "open");
  assert.equal(task.kind, "task");
  assert.equal(task.scheduledDate, "2026-08-08");
  assert.equal(task.sortOrder, Date.parse(task.createdAt));
  assert.deepEqual(task.tags, []);
});

test("legacy read-later and completed flags remain compatible", () => {
  const normalized = normalizeBackup(backupV2([{
    id: "legacy-link",
    title: "Read this",
    readLater: true,
    completed: true,
    createdAt: "2026-07-30T08:00:00.000Z",
    updatedAt: "2026-07-30T09:00:00.000Z",
  }]));
  assert.equal(normalized.tasks[0].kind, "readLater");
  assert.equal(normalized.tasks[0].status, "completed");
  assert.equal(normalized.tasks[0].bucket, "inbox");
});

test("current Flow planning fields survive backup normalization", () => {
  const original = flowTask("planned", "Planned", "2026-07-30T09:00:00.000Z", {
    bucket: "today",
    focusedAt: "2026-07-29T09:00:00.000Z",
    scheduledDate: "2026-08-08",
    sortOrder: 256,
  });
  const [normalized] = normalizeBackup(backupV2([original])).tasks;
  assert.deepEqual(
    {
      bucket: normalized.bucket,
      focusedAt: normalized.focusedAt,
      scheduledDate: normalized.scheduledDate,
      sortOrder: normalized.sortOrder,
    },
    {
      bucket: "today",
      focusedAt: "2026-07-29T09:00:00.000Z",
      scheduledDate: "2026-08-08",
      sortOrder: 256,
    },
  );
});

test("task merge keeps additions, newest updates, and deletion markers", () => {
  const local = backupV2([
    flowTask("shared", "Local old", "2026-07-30T10:00:00.000Z"),
    flowTask("local", "Local", "2026-07-30T09:00:00.000Z"),
  ]);
  const remote = backupV2([
    flowTask("shared", "Remote new", "2026-07-30T10:10:00.000Z"),
    flowTask("remote", "Remote", "2026-07-30T08:00:00.000Z"),
    flowTask("deleted", "Deleted", "2026-07-30T11:00:00.000Z", { deletedAt: "2026-07-30T11:00:00.000Z" }),
  ]);
  const merged = mergeBackups(local, remote);
  assert.equal(merged.tasks.find(({ id }) => id === "shared")?.title, "Remote new");
  assert.ok(merged.tasks.some(({ id }) => id === "local"));
  assert.ok(merged.tasks.some(({ id }) => id === "remote"));
  assert.ok(merged.tasks.find(({ id }) => id === "deleted")?.deletedAt);
});

test("near-simultaneous task edits keep only the newest record", () => {
  const local = backupV2([flowTask("shared", "Local title", "2026-07-30T10:00:00.000Z")]);
  const remote = backupV2([flowTask("shared", "Remote title", "2026-07-30T10:00:01.000Z")]);
  const once = mergeBackups(local, remote);
  assert.equal(once.tasks.filter(({ id }) => id.includes("-conflict-")).length, 0);
  assert.equal(once.tasks.length, 1);
  assert.equal(once.tasks[0].title, "Remote title");
  assert.equal(mergeBackups(once, remote).tasks.length, 1);
});

test("timestamp-only task changes keep the newest record without a conflict", () => {
  const local = backupV2([flowTask("shared", "Same title", "2026-07-30T10:00:00.000Z")]);
  const remote = backupV2([flowTask("shared", "Same title", "2026-07-30T10:00:01.000Z")]);
  const merged = mergeBackups(local, remote);
  assert.equal(merged.tasks.length, 1);
  assert.equal(merged.tasks[0].updatedAt, "2026-07-30T10:00:01.000Z");
});

test("task sync summary reports task-level changes", () => {
  const local = backupV2([
    flowTask("updated", "Old", "2026-07-30T09:00:00.000Z"),
    flowTask("deleted", "Delete me", "2026-07-30T09:00:00.000Z"),
  ]);
  const merged = backupV2([
    flowTask("updated", "New", "2026-07-30T10:00:00.000Z"),
    flowTask("deleted", "Delete me", "2026-07-30T10:00:00.000Z", { deletedAt: "2026-07-30T10:00:00.000Z" }),
    flowTask("added", "Added", "2026-07-30T10:00:00.000Z"),
  ]);
  const summary = summarizeTaskSync(local, merged);
  assert.deepEqual(summary, { added: 1, updated: 1, deleted: 1, conflicts: 0 });
  assert.equal(taskSyncSummaryText(summary), "1 task added · 1 task updated · 1 task deleted");
});
