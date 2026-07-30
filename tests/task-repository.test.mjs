import assert from "node:assert/strict";
import test from "node:test";

import { createTaskRepository } from "../app/src/flow/taskRepository.ts";

const createHarness = () => {
  const records = new Map();
  let tick = 0;
  let id = 0;
  const persistence = {
    async getAll() { return [...records.values()].map((task) => ({ ...task })); },
    async get(taskId) {
      const task = records.get(taskId);
      return task ? { ...task } : undefined;
    },
    async put(task) { records.set(task.id, { ...task }); },
    async putMany(tasks) {
      for (const task of tasks) records.set(task.id, { ...task });
    },
  };
  const repository = createTaskRepository({
    persistence,
    now: () => `2026-07-29T12:00:${String(tick++).padStart(2, "0")}.000Z`,
    createId: () => `task-${++id}`,
    deviceId: () => "device-a",
  });
  return { records, persistence, repository };
};

test("creates an inbox task with stable identity metadata", async () => {
  const { repository } = createHarness();
  const task = await repository.createTask({ title: "  Write weekly report  " });
  assert.equal(task.id, "task-1");
  assert.equal(task.title, "Write weekly report");
  assert.equal(task.bucket, "inbox");
  assert.equal(task.kind, "task");
  assert.equal(task.status, "open");
  assert.equal(task.deviceId, "device-a");
  assert.equal(task.createdAt, task.updatedAt);
  assert.deepEqual(task.tags, []);
});

test("records when a task first enters Today", async () => {
  const { repository } = createHarness();
  const task = await repository.createTask({ title: "Focus", bucket: "today" });
  assert.equal(task.focusedAt, task.createdAt);
});

test("updates a task while preserving id, createdAt, and deviceId", async () => {
  const { repository } = createHarness();
  const original = await repository.createTask({ title: "Draft" });
  const updated = await repository.updateTask(original.id, {
    title: "Final draft",
    bucket: "thisWeek",
    dueDate: "2026-08-01",
  });
  assert.equal(updated.title, "Final draft");
  assert.equal(updated.bucket, "thisWeek");
  assert.equal(updated.createdAt, original.createdAt);
  assert.equal(updated.deviceId, original.deviceId);
  assert.notEqual(updated.updatedAt, original.updatedAt);
});

test("scheduling a task does not change its Flow bucket", async () => {
  const { repository } = createHarness();
  const original = await repository.createTask({ title: "Calendar only", bucket: "inbox" });
  const scheduled = await repository.updateTask(original.id, { scheduledDate: "2026-08-08" });
  assert.equal(scheduled.bucket, "inbox");
  assert.equal(scheduled.scheduledDate, "2026-08-08");
});

test("completes and reopens a task without changing its bucket or schedule", async () => {
  const { repository } = createHarness();
  const original = await repository.createTask({
    title: "Reply to client",
    bucket: "thisWeek",
    scheduledDate: "2026-07-29",
  });
  const completed = await repository.completeTask(original.id);
  assert.equal(completed.status, "completed");
  assert.ok(completed.completedAt);
  assert.equal(completed.bucket, "thisWeek");
  assert.equal(completed.scheduledDate, "2026-07-29");

  const reopened = await repository.reopenTask(original.id);
  assert.equal(reopened.status, "open");
  assert.equal(reopened.completedAt, undefined);
  assert.equal(reopened.scheduledDate, "2026-07-29");
});

test("archives and soft deletes tasks while retaining their records", async () => {
  const { records, repository } = createHarness();
  const archivedSource = await repository.createTask({ title: "Archive me" });
  const archived = await repository.archiveTask(archivedSource.id);
  assert.equal(archived.status, "archived");
  assert.ok(archived.archivedAt);

  const deletedSource = await repository.createTask({ title: "Delete me" });
  const deleted = await repository.softDeleteTask(deletedSource.id);
  assert.ok(deleted.deletedAt);
  assert.equal(records.has(deleted.id), true);
  assert.equal((await repository.getAllTasks()).some((task) => task.id === deleted.id), false);
  assert.equal((await repository.getTaskById(deleted.id))?.id, deleted.id);
});

test("queries by bucket, date, and status and reorders atomically", async () => {
  const { repository } = createHarness();
  const first = await repository.createTask({ title: "First", bucket: "thisWeek", scheduledDate: "2026-07-29" });
  const second = await repository.createTask({ title: "Second", bucket: "inbox" });
  const third = await repository.createTask({ title: "Third", bucket: "thisWeek", scheduledDate: "2026-07-29" });
  await repository.completeTask(third.id);

  assert.deepEqual((await repository.getTasksByBucket("thisWeek")).map((task) => task.id), [first.id, third.id]);
  assert.deepEqual((await repository.getTasksByScheduledDate("2026-07-29")).map((task) => task.id), [first.id, third.id]);
  assert.deepEqual((await repository.getOpenTasks()).map((task) => task.id), [first.id, second.id]);
  assert.deepEqual((await repository.getCompletedTasks()).map((task) => task.id), [third.id]);

  const reordered = await repository.reorderTasks([second.id, first.id]);
  assert.deepEqual(reordered.map((task) => [task.id, task.sortOrder]), [[second.id, 0], [first.id, 1]]);
});

test("rejects empty titles and missing task updates", async () => {
  const { repository } = createHarness();
  await assert.rejects(() => repository.createTask({ title: "   " }), /title is required/i);
  await assert.rejects(() => repository.updateTask("missing", { title: "Nope" }), /not found/i);
});

test("places one task between neighbors while preserving its scheduled date", async () => {
  const { repository, persistence } = createHarness();
  const first = await repository.createTask({ title: "First", bucket: "thisWeek", sortOrder: 100 });
  const moved = await repository.createTask({ title: "Moved", bucket: "inbox", scheduledDate: "2026-08-08", sortOrder: 0 });
  const last = await repository.createTask({ title: "Last", bucket: "thisWeek", sortOrder: 300 });
  const placed = await repository.placeTask(moved.id, "thisWeek", first.sortOrder, last.sortOrder);
  assert.equal(placed.bucket, "thisWeek");
  assert.equal(placed.sortOrder, 200);
  assert.equal(placed.scheduledDate, "2026-08-08");
  assert.equal((await persistence.get(first.id))?.sortOrder, 100);
  assert.equal((await persistence.get(last.id))?.sortOrder, 300);
});
