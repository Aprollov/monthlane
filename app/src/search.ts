import type { CalendarEvent, Category, FlowTask } from "./types.ts";

export const searchEvents = (
  events: CalendarEvent[],
  categories: Category[],
  query: string,
  categoryId = "all",
) => {
  const normalized = query.trim().toLocaleLowerCase();
  const categoryNames = new Map(categories.map((category) => [category.id, category.name.toLocaleLowerCase()]));
  return events
    .filter((event) => !event.deletedAt)
    .filter((event) => categoryId === "all" || event.categoryId === categoryId)
    .filter((event) => {
      if (!normalized) return true;
      return [
        event.title,
        event.notes,
        categoryNames.get(event.categoryId) ?? "",
        ...(event.tags ?? []),
      ].some((value) => value.toLocaleLowerCase().includes(normalized));
    })
    .sort((a, b) => b.startDate.localeCompare(a.startDate) || a.title.localeCompare(b.title));
};

export const searchTasks = (
  tasks: FlowTask[],
  categories: Category[],
  query: string,
  categoryId = "all",
) => {
  const normalized = query.trim().toLocaleLowerCase();
  const categoryNames = new Map(categories.map((category) => [category.id, category.name.toLocaleLowerCase()]));
  return tasks
    .filter((task) => !task.deletedAt && task.status !== "archived")
    .filter((task) => categoryId === "all" || task.categoryId === categoryId)
    .filter((task) => {
      if (!normalized) return true;
      return [
        task.title,
        task.notes ?? "",
        task.pageTitle ?? "",
        task.siteName ?? "",
        task.url ?? "",
        task.categoryId ? categoryNames.get(task.categoryId) ?? "" : "",
        ...task.tags,
      ].some((value) => value.toLocaleLowerCase().includes(normalized));
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
};
