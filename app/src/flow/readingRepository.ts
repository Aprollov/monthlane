import { openMonthlaneDb } from "../database.ts";
import { getDeviceId } from "../device.ts";
import type { CreateReadingItemInput, FlowTask, ReadingItem } from "../types.ts";
import { generateDeepLink } from "./urlDetection.ts";

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

export const readingRepository = {
  async getAll() {
    const db = await openMonthlaneDb();
    try {
      const items = await requestValue<ReadingItem[]>(
        db.transaction("readingItems").objectStore("readingItems").getAll(),
      );
      return items.filter((item) => !item.deletedAt);
    } finally {
      db.close();
    }
  },

  async create(input: CreateReadingItemInput) {
    const db = await openMonthlaneDb();
    const timestamp = new Date().toISOString();
    const item: ReadingItem = {
      id: crypto.randomUUID(),
      url: input.url,
      title: input.title.trim(),
      platform: input.platform,
      platformIcon: input.platformIcon,
      deepLink: input.deepLink,
      readStatus: input.readStatus ?? "unread",
      createdAt: input.createdAt ?? timestamp,
      updatedAt: timestamp,
      deviceId: getDeviceId(),
    };
    try {
      const tx = db.transaction("readingItems", "readwrite");
      tx.objectStore("readingItems").put(item);
      await transactionDone(tx);
      return item;
    } finally {
      db.close();
    }
  },

  async update(id: string, changes: Partial<Pick<ReadingItem, "readStatus" | "deletedAt">>) {
    const db = await openMonthlaneDb();
    try {
      const tx = db.transaction("readingItems", "readwrite");
      const store = tx.objectStore("readingItems");
      const current = await requestValue<ReadingItem | undefined>(store.get(id));
      if (!current) throw new Error(`Reading item "${id}" was not found.`);
      const updated = { ...current, ...changes, updatedAt: new Date().toISOString() };
      store.put(updated);
      await transactionDone(tx);
      return updated;
    } finally {
      db.close();
    }
  },

  async migrateLegacyTasks() {
    const db = await openMonthlaneDb();
    try {
      const tx = db.transaction(["tasks", "readingItems"], "readwrite");
      const taskStore = tx.objectStore("tasks");
      const readingStore = tx.objectStore("readingItems");
      const tasks = await requestValue<FlowTask[]>(taskStore.getAll());
      const existing = new Set(
        (await requestValue<ReadingItem[]>(readingStore.getAll())).map((item) => item.id),
      );
      const timestamp = new Date().toISOString();

      for (const task of tasks) {
        if (task.kind !== "readLater" || task.deletedAt || !task.url) continue;
        const legacy = task as FlowTask & {
          platformIcon?: string;
          deepLink?: string;
          readingStatus?: ReadingItem["readStatus"];
        };
        const detected = generateDeepLink(task.url);
        if (!existing.has(task.id)) {
          readingStore.put({
            id: task.id,
            url: task.url,
            title: task.title,
            platform: task.siteName ?? detected.platform,
            platformIcon: legacy.platformIcon ?? detected.icon,
            deepLink: legacy.deepLink ?? detected.deepLink,
            readStatus: legacy.readingStatus ?? (task.status === "completed" ? "completed" : "unread"),
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            deviceId: task.deviceId,
          } satisfies ReadingItem);
        }
        taskStore.put({ ...task, deletedAt: timestamp, updatedAt: timestamp });
      }
      await transactionDone(tx);
    } finally {
      db.close();
    }
  },
};
