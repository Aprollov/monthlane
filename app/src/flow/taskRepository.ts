import { openMonthlaneDb } from "../database.ts";
import { getDeviceId } from "../device.ts";
import { flowBucketForScheduledDate } from "./taskFilters.ts";
import type {
  CreateTaskInput,
  FlowTask,
  TaskBucket,
  UpdateTaskInput,
} from "../types.ts";

export type TaskPersistence = {
  getAll: () => Promise<FlowTask[]>;
  get: (id: string) => Promise<FlowTask | undefined>;
  put: (task: FlowTask) => Promise<void>;
  putMany: (tasks: FlowTask[]) => Promise<void>;
};

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

export const indexedDbTaskPersistence: TaskPersistence = {
  async getAll() {
    const db = await openMonthlaneDb();
    try {
      return await requestValue<FlowTask[]>(db.transaction("tasks").objectStore("tasks").getAll());
    } finally {
      db.close();
    }
  },
  async get(id) {
    const db = await openMonthlaneDb();
    try {
      return await requestValue<FlowTask | undefined>(db.transaction("tasks").objectStore("tasks").get(id));
    } finally {
      db.close();
    }
  },
  async put(task) {
    const db = await openMonthlaneDb();
    try {
      const tx = db.transaction("tasks", "readwrite");
      tx.objectStore("tasks").put(task);
      await transactionDone(tx);
    } finally {
      db.close();
    }
  },
  async putMany(tasks) {
    const db = await openMonthlaneDb();
    try {
      const tx = db.transaction("tasks", "readwrite");
      for (const task of tasks) tx.objectStore("tasks").put(task);
      await transactionDone(tx);
    } finally {
      db.close();
    }
  },
};

type RepositoryDependencies = {
  persistence: TaskPersistence;
  now: () => string;
  createId: () => string;
  deviceId: () => string;
};

export const createTaskRepository = ({
  persistence,
  now,
  createId,
  deviceId,
}: RepositoryDependencies) => {
  const requireTask = async (id: string) => {
    const task = await persistence.get(id);
    if (!task) throw new Error(`Task "${id}" was not found.`);
    return task;
  };

  const writeUpdate = async (id: string, changes: UpdateTaskInput, timestamp = now()) => {
    const existing = await requireTask(id);
    const updated: FlowTask = {
      ...existing,
      ...changes,
      title: changes.title === undefined ? existing.title : changes.title.trim(),
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: timestamp,
      deviceId: existing.deviceId,
    };
    if (!updated.title) throw new Error("Task title is required.");
    await persistence.put(updated);
    return updated;
  };

  const orderBetween = (previous?: number, next?: number) => {
    if (previous !== undefined && next !== undefined) return previous + (next - previous) / 2;
    if (previous !== undefined) return previous + 1024;
    if (next !== undefined) return next - 1024;
    return 0;
  };

  return {
    async createTask(input: CreateTaskInput) {
      const timestamp = now();
      const task: FlowTask = {
        id: createId(),
        title: input.title.trim(),
        notes: input.notes,
        kind: input.kind ?? "task",
        status: input.status ?? "open",
        bucket: input.bucket ?? "inbox",
        scheduledDate: input.scheduledDate,
        scheduledTime: input.scheduledTime,
        estimatedMinutes: input.estimatedMinutes,
        dueDate: input.dueDate,
        categoryId: input.categoryId,
        tags: input.tags ?? [],
        url: input.url,
        sourceType: input.sourceType,
        siteName: input.siteName,
        pageTitle: input.pageTitle,
        thumbnailUrl: input.thumbnailUrl,
        linkedEventId: input.linkedEventId,
        learningTrackId: input.learningTrackId,
        learningTrackTitle: input.learningTrackTitle,
        recurrence: input.recurrence,
        completedDates: input.completedDates,
        priority: input.priority ?? "medium",
        sortOrder: input.sortOrder ?? Date.parse(timestamp),
        completedAt: input.completedAt,
        archivedAt: input.archivedAt,
        deletedAt: input.deletedAt,
        focusedAt: input.focusedAt ?? (input.bucket === "today" ? timestamp : undefined),
        createdAt: timestamp,
        updatedAt: timestamp,
        deviceId: deviceId(),
      };
      if (!task.title) throw new Error("Task title is required.");
      await persistence.put(task);
      return task;
    },
    updateTask: (id: string, changes: UpdateTaskInput) => writeUpdate(id, changes),
    /** Single entry point for rescheduling: updates the date and derives the flow bucket. */
    moveTaskToDate: (id: string, scheduledDate: string, today: string) =>
      writeUpdate(id, { scheduledDate, bucket: flowBucketForScheduledDate(scheduledDate, today) }),
    /** Persists a fully formed task record, used by type conversion to keep the same id. */
    putTask: (task: FlowTask) => persistence.put(task),
    getTaskById: (id: string) => persistence.get(id),
    async getAllTasks() {
      return (await persistence.getAll()).filter((task) => !task.deletedAt);
    },
    async getTasksByBucket(bucket: TaskBucket) {
      return (await persistence.getAll()).filter((task) => task.bucket === bucket && !task.deletedAt);
    },
    async getTasksByScheduledDate(date: string) {
      return (await persistence.getAll()).filter((task) => task.scheduledDate === date && !task.deletedAt);
    },
    async getOpenTasks() {
      return (await persistence.getAll()).filter((task) => task.status === "open" && !task.deletedAt);
    },
    async getCompletedTasks() {
      return (await persistence.getAll()).filter((task) => task.status === "completed" && !task.deletedAt);
    },
    completeTask: (id: string) => {
      const timestamp = now();
      return writeUpdate(id, { status: "completed", completedAt: timestamp, archivedAt: undefined }, timestamp);
    },
    reopenTask: (id: string) => {
      const timestamp = now();
      return writeUpdate(id, {
        status: "open",
        completedAt: undefined,
        archivedAt: undefined,
      }, timestamp);
    },
    /** Explicit one-way transitions, for callers that hold a stale task snapshot. */
    setDone: (id: string) => writeUpdate(id, { status: "completed", completedAt: now(), archivedAt: undefined }),
    setOpen: (id: string) => writeUpdate(id, { status: "open", completedAt: undefined, archivedAt: undefined }),
    archiveTask: (id: string) => {
      const timestamp = now();
      return writeUpdate(id, { status: "archived", archivedAt: timestamp }, timestamp);
    },
    softDeleteTask: (id: string) => {
      const timestamp = now();
      return writeUpdate(id, { deletedAt: timestamp }, timestamp);
    },
    async placeTask(
      id: string,
      bucket: TaskBucket,
      previousOrder?: number,
      nextOrder?: number,
    ) {
      const existing = await requireTask(id);
      const timestamp = now();
      return writeUpdate(id, {
        bucket,
        sortOrder: orderBetween(previousOrder, nextOrder),
        focusedAt: bucket === "today"
          ? existing.focusedAt ?? timestamp
          : undefined,
      }, timestamp);
    },
    async reorderTasks(orderedIds: string[]) {
      const tasks = await Promise.all(orderedIds.map(requireTask));
      const timestamp = now();
      const reordered = tasks.map((task, index) => ({
        ...task,
        sortOrder: index,
        updatedAt: timestamp,
      }));
      await persistence.putMany(reordered);
      return reordered;
    },
  };
};

export const taskRepository = createTaskRepository({
  persistence: indexedDbTaskPersistence,
  now: () => new Date().toISOString(),
  createId: () => crypto.randomUUID(),
  deviceId: getDeviceId,
});
