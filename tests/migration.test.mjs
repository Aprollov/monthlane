import assert from "node:assert/strict";
import test from "node:test";

import { DB_VERSION, upgradeMonthlaneDb } from "../app/src/database.ts";

const createDatabaseMock = (initialStores = []) => {
  const stores = new Map(initialStores.map(([name, value]) => [name, value]));
  const created = [];
  const database = {
    objectStoreNames: {
      contains(name) { return stores.has(name); },
    },
    createObjectStore(name, options) {
      const indexes = [];
      const store = {
        options,
        indexes,
        createIndex(indexName, keyPath) { indexes.push([indexName, keyPath]); },
      };
      stores.set(name, store);
      created.push(name);
      return store;
    },
  };
  return { created, database, stores };
};

test("database version advances for learning tracks and logs", () => {
  assert.equal(DB_VERSION, 4);
});

test("legacy migration adds task and reading stores while preserving existing stores", () => {
  const eventStore = { records: [{ id: "existing-event" }] };
  const categoryStore = { records: [{ id: "personal" }] };
  const settingsStore = { records: [{ id: "preferences" }] };
  const syncStore = { records: [{ id: "sync" }] };
  const exceptionStore = { records: [] };
  const mock = createDatabaseMock([
    ["events", eventStore],
    ["categories", categoryStore],
    ["recurrenceExceptions", exceptionStore],
    ["settings", settingsStore],
    ["syncMetadata", syncStore],
  ]);

  upgradeMonthlaneDb(mock.database);

  assert.deepEqual(mock.created, ["tasks", "readingItems", "learningTracks", "learningProgressLogs"]);
  assert.equal(mock.stores.get("events"), eventStore);
  assert.equal(mock.stores.get("categories"), categoryStore);
  assert.equal(mock.stores.get("settings"), settingsStore);
  assert.equal(mock.stores.get("syncMetadata"), syncStore);
  assert.deepEqual(mock.stores.get("events").records, [{ id: "existing-event" }]);
});

test("tasks store contains every required query index", () => {
  const mock = createDatabaseMock();
  upgradeMonthlaneDb(mock.database);
  const indexes = mock.stores.get("tasks").indexes.map(([name]) => name);
  assert.deepEqual(indexes, [
    "status",
    "bucket",
    "scheduledDate",
    "dueDate",
    "updatedAt",
    "deletedAt",
    "categoryId",
  ]);
});

test("reading items store contains status and sync indexes", () => {
  const mock = createDatabaseMock();
  upgradeMonthlaneDb(mock.database);
  const indexes = mock.stores.get("readingItems").indexes.map(([name]) => name);
  assert.deepEqual(indexes, ["readStatus", "updatedAt", "deletedAt"]);
});

test("fresh database creates old stores and tasks without destructive operations", () => {
  const mock = createDatabaseMock();
  upgradeMonthlaneDb(mock.database);
  assert.deepEqual(mock.created, [
    "events",
    "categories",
    "recurrenceExceptions",
    "tasks",
    "readingItems",
    "learningTracks",
    "learningProgressLogs",
    "settings",
    "syncMetadata",
  ]);
});

test("learning stores contain sync indexes", () => {
  const mock = createDatabaseMock();
  upgradeMonthlaneDb(mock.database);
  assert.deepEqual(mock.stores.get("learningTracks").indexes.map(([name]) => name), ["updatedAt", "deletedAt"]);
  assert.deepEqual(mock.stores.get("learningProgressLogs").indexes.map(([name]) => name), ["learningTrackId", "date", "updatedAt", "deletedAt"]);
});
