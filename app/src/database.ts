import {
  defaultCategories,
  type CalendarEvent,
  type Category,
  type FlowTask,
  type GrowthMoment,
  type LearningProgressLog,
  type LearningTrack,
  type MonthlaneBackup,
  type MonthlaneBackupV2,
  type ReadingItem,
  type RecurrenceException,
} from "./types.ts";
import { getDeviceId } from "./device.ts";

const DB_NAME = "monthlane";
export const DB_VERSION = 5;

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
  if (!db.objectStoreNames.contains("readingItems")) {
    const readingItems = db.createObjectStore("readingItems", { keyPath: "id" });
    readingItems.createIndex("readStatus", "readStatus");
    readingItems.createIndex("updatedAt", "updatedAt");
    readingItems.createIndex("deletedAt", "deletedAt");
  }
  if (!db.objectStoreNames.contains("learningTracks")) {
    const tracks = db.createObjectStore("learningTracks", { keyPath: "id" });
    tracks.createIndex("updatedAt", "updatedAt");
    tracks.createIndex("deletedAt", "deletedAt");
  }
  if (!db.objectStoreNames.contains("learningProgressLogs")) {
    const logs = db.createObjectStore("learningProgressLogs", { keyPath: "id" });
    logs.createIndex("learningTrackId", "learningTrackId");
    logs.createIndex("date", "date");
    logs.createIndex("updatedAt", "updatedAt");
    logs.createIndex("deletedAt", "deletedAt");
  }
  if (!db.objectStoreNames.contains("growthMoments")) {
    const moments = db.createObjectStore("growthMoments", { keyPath: "id" });
    moments.createIndex("updatedAt", "updatedAt");
    moments.createIndex("deletedAt", "deletedAt");
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

export const saveCategory = async (category: Category) => {
  const db = await openMonthlaneDb();
  const tx = db.transaction("categories", "readwrite");
  tx.objectStore("categories").put(category);
  await transactionDone(tx);
  db.close();
};

/** Folder-like legacy calendars are folded into long-term life areas. */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  anniversaries: "relationships",
  renewals: "finance",
};

export const migrateLegacyCategories = async () => {
  const db = await openMonthlaneDb();
  try {
    const [storedEvents, storedTasks, storedCategories] = await Promise.all([
      requestValue<CalendarEvent[]>(db.transaction("events").objectStore("events").getAll()),
      requestValue<FlowTask[]>(db.transaction("tasks").objectStore("tasks").getAll()),
      requestValue<Category[]>(db.transaction("categories").objectStore("categories").getAll()),
    ]);
    const timestamp = new Date().toISOString();
    const movedEvents = storedEvents.filter((event) => LEGACY_CATEGORY_MAP[event.categoryId]);
    const movedTasks = storedTasks.filter((task) => task.categoryId && LEGACY_CATEGORY_MAP[task.categoryId]);
    const retired = storedCategories.filter((category) => LEGACY_CATEGORY_MAP[category.id] && !category.deletedAt);
    if (!movedEvents.length && !movedTasks.length && !retired.length) return;
    const tx = db.transaction(["events", "tasks", "categories"], "readwrite");
    const eventStore = tx.objectStore("events");
    for (const event of movedEvents) {
      eventStore.put({ ...event, categoryId: LEGACY_CATEGORY_MAP[event.categoryId], updatedAt: timestamp });
    }
    const taskStore = tx.objectStore("tasks");
    for (const task of movedTasks) {
      taskStore.put({ ...task, categoryId: LEGACY_CATEGORY_MAP[task.categoryId!], updatedAt: timestamp });
    }
    const categoryStore = tx.objectStore("categories");
    for (const category of retired) categoryStore.put({ ...category, deletedAt: timestamp, updatedAt: timestamp });
    await transactionDone(tx);
  } finally {
    db.close();
  }
};

/** Soft-deletes "(Sync conflict)" duplicate copies left behind by older builds. */
export const cleanupSyncConflictTasks = async () => {
  const db = await openMonthlaneDb();
  try {
    const tasks = await requestValue<FlowTask[]>(db.transaction("tasks").objectStore("tasks").getAll());
    const stale = tasks.filter((task) => task.id.includes("-conflict-") && !task.deletedAt);
    if (!stale.length) return;
    const timestamp = new Date().toISOString();
    const tx = db.transaction("tasks", "readwrite");
    const store = tx.objectStore("tasks");
    for (const task of stale) store.put({ ...task, deletedAt: timestamp, updatedAt: timestamp });
    await transactionDone(tx);
  } finally {
    db.close();
  }
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

export const exportBackup = async (): Promise<MonthlaneBackupV2> => {
  const db = await openMonthlaneDb();
  const tx = db.transaction(["events", "tasks", "readingItems", "categories", "recurrenceExceptions", "settings", "learningTracks", "learningProgressLogs", "growthMoments"]);
  const [events, tasks, readingItems, categories, exceptions, settings, learningTracks, learningProgressLogs, growthMoments] = await Promise.all([
    requestValue<CalendarEvent[]>(tx.objectStore("events").getAll()),
    requestValue<FlowTask[]>(tx.objectStore("tasks").getAll()),
    requestValue<ReadingItem[]>(tx.objectStore("readingItems").getAll()),
    requestValue<Category[]>(tx.objectStore("categories").getAll()),
    requestValue<RecurrenceException[]>(tx.objectStore("recurrenceExceptions").getAll()),
    requestValue<Array<{ id: string; [key: string]: unknown }>>(tx.objectStore("settings").getAll()),
    requestValue<LearningTrack[]>(tx.objectStore("learningTracks").getAll()),
    requestValue<LearningProgressLog[]>(tx.objectStore("learningProgressLogs").getAll()),
    requestValue<GrowthMoment[]>(tx.objectStore("growthMoments").getAll()),
  ]);
  db.close();
  const timestamp = new Date().toISOString();
  return {
    version: 2,
    schemaVersion: 2,
    exportedAt: timestamp,
    updatedAt: timestamp,
    events,
    tasks,
    readingItems,
    categories,
    exceptions,
    settings,
    learningTracks,
    learningProgressLogs,
    growthMoments,
    syncMetadata: { lastUpdatedByDeviceId: getDeviceId(), revision: 1 },
  };
};

const newerRecords = <T extends { id: string; updatedAt: string }>(local: T[], incoming: T[]) => {
  const merged = new Map(local.map((record) => [record.id, record]));
  for (const record of incoming) {
    const existing = merged.get(record.id);
    if (!existing || record.updatedAt > existing.updatedAt) merged.set(record.id, record);
  }
  return [...merged.values()];
};

const comparable = <T extends { id: string }>(record: T) =>
  JSON.stringify(Object.fromEntries(Object.entries(record).filter(
    ([key]) => !["id", "createdAt", "updatedAt", "deviceId"].includes(key),
  )));

const mergeTasks = (local: FlowTask[], incoming: FlowTask[]) => {
  const merged = new Map(local.map((task) => [task.id, task]));
  for (const task of incoming) {
    const existing = merged.get(task.id);
    if (!existing) {
      merged.set(task.id, task);
      continue;
    }
    // Last-write-wins: concurrent edits resolve to the newest record and never
    // spawn visible "(Sync conflict)" duplicates on single-user multi-device sync.
    if (task.updatedAt >= existing.updatedAt) merged.set(task.id, task);
  }
  return [...merged.values()];
};

const validTaskBuckets = new Set(["inbox", "thisWeek", "today", "laterRead", "someday"]);

export const normalizeFlowTask = (
  input: Partial<FlowTask> & { id: string; title: string },
  fallbackTimestamp: string,
  fallbackOrder = 0,
): FlowTask => {
  const legacy = input as Partial<FlowTask> & { completed?: boolean; readLater?: boolean };
  const createdAt = input.createdAt ?? fallbackTimestamp;
  const updatedAt = input.updatedAt ?? createdAt;
  const parsedCreatedAt = Date.parse(createdAt);
  return {
    ...input,
    id: input.id,
    title: input.title,
    kind: input.kind ?? (legacy.readLater ? "readLater" : "task"),
    status: input.status ?? (legacy.completed ? "completed" : "open"),
    bucket: input.bucket && validTaskBuckets.has(input.bucket) ? input.bucket : "inbox",
    tags: Array.isArray(input.tags) ? input.tags : [],
    sortOrder: Number.isFinite(input.sortOrder)
      ? input.sortOrder!
      : Number.isFinite(parsedCreatedAt) ? parsedCreatedAt : fallbackOrder,
    createdAt,
    updatedAt,
    deviceId: input.deviceId ?? "legacy-device",
  };
};

export const normalizeBackup = (backup: MonthlaneBackup): MonthlaneBackupV2 => {
  const candidate = backup as unknown as {
    version?: number;
    schemaVersion?: number;
    exportedAt?: string;
    exportTime?: string;
    updatedAt?: string;
    events?: CalendarEvent[];
    tasks?: FlowTask[];
    readingItems?: ReadingItem[];
    categories?: Category[];
    exceptions?: RecurrenceException[];
    settings?: Array<{ id: string; [key: string]: unknown }>;
    learningTracks?: LearningTrack[];
    learningProgressLogs?: LearningProgressLog[];
    growthMoments?: GrowthMoment[];
    syncMetadata?: MonthlaneBackupV2["syncMetadata"];
  };
  const version = candidate?.version ?? candidate?.schemaVersion;
  if (
    !candidate ||
    !Array.isArray(candidate.events) ||
    !Array.isArray(candidate.categories) ||
    !Array.isArray(candidate.exceptions) ||
    (version !== 1 && version !== 2)
  ) throw new Error("This is not a valid Monthlane backup.");
  const now = new Date().toISOString();
  const exportedAt = candidate.exportedAt ?? candidate.exportTime ?? now;
  return {
    version: 2,
    schemaVersion: 2,
    exportedAt,
    updatedAt: version === 2 ? candidate.updatedAt ?? exportedAt : exportedAt,
    events: candidate.events,
    tasks: version === 2 && Array.isArray(candidate.tasks)
      ? candidate.tasks.map((task, index) => normalizeFlowTask(task, exportedAt, index))
      : [],
    readingItems: version === 2 && Array.isArray(candidate.readingItems) ? candidate.readingItems : [],
    categories: candidate.categories,
    exceptions: candidate.exceptions,
    settings: version === 2 && Array.isArray(candidate.settings) ? candidate.settings : [],
    learningTracks: Array.isArray(candidate.learningTracks) ? candidate.learningTracks : [],
    learningProgressLogs: Array.isArray(candidate.learningProgressLogs) ? candidate.learningProgressLogs : [],
    growthMoments: Array.isArray(candidate.growthMoments) ? candidate.growthMoments : [],
    syncMetadata: version === 2 ? candidate.syncMetadata : undefined,
  };
};

export const mergeBackups = (localInput: MonthlaneBackup, incomingInput: MonthlaneBackup): MonthlaneBackupV2 => {
  const local = normalizeBackup(localInput);
  const incoming = normalizeBackup(incomingInput);
  const timestamp = new Date().toISOString();
  return {
    version: 2,
    schemaVersion: 2,
    exportedAt: timestamp,
    updatedAt: timestamp,
    events: newerRecords(local.events, incoming.events),
    tasks: mergeTasks(local.tasks, incoming.tasks),
    readingItems: newerRecords(local.readingItems ?? [], incoming.readingItems ?? []),
    learningTracks: newerRecords(local.learningTracks ?? [], incoming.learningTracks ?? []),
    learningProgressLogs: newerRecords(local.learningProgressLogs ?? [], incoming.learningProgressLogs ?? []),
    growthMoments: newerRecords(local.growthMoments ?? [], incoming.growthMoments ?? []),
    categories: newerRecords(local.categories, incoming.categories),
    exceptions: newerRecords(local.exceptions, incoming.exceptions),
    settings: incoming.updatedAt > local.updatedAt ? incoming.settings : local.settings,
    syncMetadata: {
      lastUpdatedByDeviceId: incoming.syncMetadata?.lastUpdatedByDeviceId ?? local.syncMetadata?.lastUpdatedByDeviceId ?? "unknown-device",
      revision: Math.max(local.syncMetadata?.revision ?? 0, incoming.syncMetadata?.revision ?? 0) + 1,
    },
  };
};

export const prepareBackupImport = (
  local: MonthlaneBackup,
  incoming: MonthlaneBackup,
  mode: "merge" | "replace",
) => mode === "replace" ? normalizeBackup(incoming) : mergeBackups(local, incoming);

export const importBackup = async (backup: MonthlaneBackup, mode: "merge" | "replace" = "merge") => {
  const normalized = normalizeBackup(backup);
  const merged = prepareBackupImport(await exportBackup(), normalized, mode);
  const db = await openMonthlaneDb();
  const stores = ["events", "tasks", "readingItems", "categories", "recurrenceExceptions", "settings", "learningTracks", "learningProgressLogs", "growthMoments"];
  const tx = db.transaction(stores, "readwrite");
  if (mode === "replace") for (const store of stores) tx.objectStore(store).clear();
  for (const event of merged.events) tx.objectStore("events").put(event);
  for (const task of merged.tasks) tx.objectStore("tasks").put(task);
  for (const readingItem of merged.readingItems ?? []) tx.objectStore("readingItems").put(readingItem);
  for (const category of merged.categories) tx.objectStore("categories").put(category);
  for (const exception of merged.exceptions) tx.objectStore("recurrenceExceptions").put(exception);
  for (const setting of merged.settings ?? []) tx.objectStore("settings").put(setting);
  for (const track of merged.learningTracks ?? []) tx.objectStore("learningTracks").put(track);
  for (const log of merged.learningProgressLogs ?? []) tx.objectStore("learningProgressLogs").put(log);
  for (const moment of merged.growthMoments ?? []) tx.objectStore("growthMoments").put(moment);
  await transactionDone(tx);
  db.close();
  return merged;
};
