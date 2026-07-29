import {
  defaultCategories,
  type CalendarEvent,
  type Category,
  type MonthlaneBackup,
  type RecurrenceException,
} from "./types.ts";

const DB_NAME = "monthlane";
export const DB_VERSION = 2;

const requestValue = <T,>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

type SchemaDatabase = Pick<IDBDatabase, "objectStoreNames" | "createObjectStore">;

export const upgradeMonthlaneDb = (db: SchemaDatabase) => {
  if (!db.objectStoreNames.contains("events")) {
    const events = db.createObjectStore("events", { keyPath: "id" });
    events.createIndex("startDate", "startDate");
    events.createIndex("categoryId", "categoryId");
    events.createIndex("updatedAt", "updatedAt");
  }
  if (!db.objectStoreNames.contains("categories")) {
    db.createObjectStore("categories", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("recurrenceExceptions")) {
    const exceptions = db.createObjectStore("recurrenceExceptions", { keyPath: "id" });
    exceptions.createIndex("seriesId", "seriesId");
  }
  if (!db.objectStoreNames.contains("tasks")) {
    const tasks = db.createObjectStore("tasks", { keyPath: "id" });
    tasks.createIndex("status", "status");
    tasks.createIndex("bucket", "bucket");
    tasks.createIndex("scheduledDate", "scheduledDate");
    tasks.createIndex("dueDate", "dueDate");
    tasks.createIndex("updatedAt", "updatedAt");
    tasks.createIndex("deletedAt", "deletedAt");
    tasks.createIndex("categoryId", "categoryId");
  }
  if (!db.objectStoreNames.contains("settings")) {
    db.createObjectStore("settings", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("syncMetadata")) {
    db.createObjectStore("syncMetadata", { keyPath: "id" });
  }
};

export const openMonthlaneDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => upgradeMonthlaneDb(request.result);
    request.onblocked = () => reject(new Error("Monthlane database upgrade is blocked. Close other Monthlane tabs and reload."));
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });

export const ensureCategories = async () => {
  const db = await openMonthlaneDb();
  const tx = db.transaction("categories", "readwrite");
  const store = tx.objectStore("categories");
  const existing = await requestValue<Category[]>(store.getAll());
  const existingIds = new Set(existing.map((category) => category.id));
  for (const category of defaultCategories) if (!existingIds.has(category.id)) store.put(category);
  await transactionDone(tx);
  db.close();
};

export const listEvents = async () => {
  const db = await openMonthlaneDb();
  const events = await requestValue<CalendarEvent[]>(
    db.transaction("events").objectStore("events").getAll(),
  );
  db.close();
  return events.filter((event) => !event.deletedAt);
};

export const listCategories = async () => {
  const db = await openMonthlaneDb();
  const categories = await requestValue<Category[]>(
    db.transaction("categories").objectStore("categories").getAll(),
  );
  db.close();
  return categories.filter((category) => !category.deletedAt);
};

export const listExceptions = async () => {
  const db = await openMonthlaneDb();
  const exceptions = await requestValue<RecurrenceException[]>(
    db.transaction("recurrenceExceptions").objectStore("recurrenceExceptions").getAll(),
  );
  db.close();
  return exceptions;
};

export const saveEvent = async (event: CalendarEvent) => {
  const db = await openMonthlaneDb();
  const tx = db.transaction("events", "readwrite");
  tx.objectStore("events").put(event);
  await transactionDone(tx);
  db.close();
};

export const saveException = async (exception: RecurrenceException) => {
  const db = await openMonthlaneDb();
  const tx = db.transaction("recurrenceExceptions", "readwrite");
  tx.objectStore("recurrenceExceptions").put(exception);
  await transactionDone(tx);
  db.close();
};

export const softDeleteEvent = async (event: CalendarEvent) => {
  await saveEvent({ ...event, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
};

export const exportBackup = async (): Promise<MonthlaneBackup> => {
  const db = await openMonthlaneDb();
  const tx = db.transaction(["events", "categories", "recurrenceExceptions"]);
  const [events, categories, exceptions] = await Promise.all([
    requestValue<CalendarEvent[]>(tx.objectStore("events").getAll()),
    requestValue<Category[]>(tx.objectStore("categories").getAll()),
    requestValue<RecurrenceException[]>(tx.objectStore("recurrenceExceptions").getAll()),
  ]);
  db.close();
  return { version: 1, exportedAt: new Date().toISOString(), events, categories, exceptions };
};

const newerRecords = <T extends { id: string; updatedAt: string }>(local: T[], incoming: T[]) => {
  const merged = new Map(local.map((record) => [record.id, record]));
  for (const record of incoming) {
    const existing = merged.get(record.id);
    if (!existing || record.updatedAt > existing.updatedAt) merged.set(record.id, record);
  }
  return [...merged.values()];
};

export const mergeBackups = (local: MonthlaneBackup, incoming: MonthlaneBackup): MonthlaneBackup => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  events: newerRecords(local.events, incoming.events),
  categories: newerRecords(local.categories, incoming.categories),
  exceptions: newerRecords(local.exceptions, incoming.exceptions),
});

export const importBackup = async (backup: MonthlaneBackup) => {
  if (
    backup?.version !== 1 ||
    !Array.isArray(backup.events) ||
    !Array.isArray(backup.categories) ||
    !Array.isArray(backup.exceptions)
  ) throw new Error("This is not a valid Monthlane backup.");

  const local = await exportBackup();
  const merged = mergeBackups(local, backup);
  const db = await openMonthlaneDb();
  const tx = db.transaction(["events", "categories", "recurrenceExceptions"], "readwrite");
  for (const event of merged.events) tx.objectStore("events").put(event);
  for (const category of merged.categories) tx.objectStore("categories").put(category);
  for (const exception of merged.exceptions) tx.objectStore("recurrenceExceptions").put(exception);
  await transactionDone(tx);
  db.close();
  return merged;
};
