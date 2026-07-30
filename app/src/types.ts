export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[];
  endType: "never" | "date" | "count";
  endDate?: string;
  count?: number;
};

export type CalendarEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  notes: string;
  categoryId: string;
  tags: string[];
  reminderMinutes: number[];
  recurrence?: RecurrenceRule;
  recurrenceParentId?: string;
  recurrenceInstanceDate?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deviceId: string;
};

export type RecurrenceException = {
  id: string;
  seriesId: string;
  instanceDate: string;
  type: "modified" | "deleted";
  replacement?: CalendarEvent;
  createdAt: string;
  updatedAt: string;
  deviceId: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deviceId: string;
};

export type EventDraft = Pick<
  CalendarEvent,
  "title" | "startDate" | "allDay" | "startTime" | "endTime" | "notes" | "categoryId" | "recurrence"
>;

export type MonthlaneBackupV1 = {
  version: 1;
  exportedAt: string;
  events: CalendarEvent[];
  categories: Category[];
  exceptions: RecurrenceException[];
};

export type MonthlaneBackupV2 = {
  version: 2;
  schemaVersion: 2;
  exportedAt: string;
  updatedAt: string;
  events: CalendarEvent[];
  tasks: FlowTask[];
  categories: Category[];
  exceptions: RecurrenceException[];
  settings?: Array<{ id: string; [key: string]: unknown }>;
  syncMetadata?: {
    lastUpdatedByDeviceId: string;
    revision: number;
  };
};

export type MonthlaneBackup = MonthlaneBackupV1 | MonthlaneBackupV2;

export type TaskKind = "task" | "readLater";
export type TaskStatus = "open" | "completed" | "archived";
export type FlowBucket = "inbox" | "thisWeek" | "today";
export type LegacyTaskBucket = "laterRead" | "someday";
export type TaskBucket = FlowBucket | LegacyTaskBucket;

export type FlowTask = {
  id: string;
  title: string;
  notes?: string;
  kind: TaskKind;
  status: TaskStatus;
  bucket: TaskBucket;
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedMinutes?: number;
  dueDate?: string;
  categoryId?: string;
  tags: string[];
  url?: string;
  sourceType?: string;
  siteName?: string;
  pageTitle?: string;
  thumbnailUrl?: string;
  linkedEventId?: string;
  sortOrder: number;
  completedAt?: string;
  archivedAt?: string;
  focusedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deviceId: string;
};

export type CreateTaskInput = Pick<FlowTask, "title"> & Partial<Omit<
  FlowTask,
  "id" | "title" | "status" | "sortOrder" | "createdAt" | "updatedAt" | "deviceId"
>> & {
  status?: TaskStatus;
  sortOrder?: number;
};

export type UpdateTaskInput = Partial<Omit<
  FlowTask,
  "id" | "createdAt" | "updatedAt" | "deviceId"
>>;

export const defaultCategories: Category[] = [
  ["work", "Work", "#6F8191"],
  ["personal", "Personal", "#8A7894"],
  ["life", "Life", "#758B75"],
  ["renewals", "Renewals", "#A4835F"],
  ["anniversaries", "Anniversaries", "#A16F72"],
  ["other", "Other", "#858585"],
].map(([id, name, color]) => ({
  id,
  name,
  color,
  isDefault: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deviceId: "monthlane",
}));
