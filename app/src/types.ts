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
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
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
  "title" | "startDate" | "allDay" | "startTime" | "endTime" | "notes" | "categoryId"
>;

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
