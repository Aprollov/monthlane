import { defaultCategories, type CalendarEvent, type Category, type RecurrenceException } from "./types";

const DB_NAME = "monthlane";
const DB_VERSION = 1;

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

export const openMonthlaneDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
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
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("syncMetadata")) {
        db.createObjectStore("syncMetadata", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
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
