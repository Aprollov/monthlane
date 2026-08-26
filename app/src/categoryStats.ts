import type { CalendarEvent, Category, FlowTask } from "./types";

export const categoryItemCount = (
  categoryId: string,
  events: CalendarEvent[],
  tasks: FlowTask[],
) =>
  events.filter((event) => event.categoryId === categoryId).length +
  tasks.filter((task) => task.categoryId === categoryId && !task.deletedAt && task.status !== "archived").length;


/** When exactly one calendar shown in the sidebar is visible, new items auto-file into it. */
export const singleVisibleCategoryId = (
  categories: Category[],
  hidden: Set<string>,
  fallbackId: string,
  events: CalendarEvent[],
  tasks: FlowTask[],
) => {
  const visible = categories.filter((category) =>
    category.id !== fallbackId &&
    !hidden.has(category.id) &&
    categoryItemCount(category.id, events, tasks) > 0,
  );
  return visible.length === 1 ? visible[0].id : undefined;
};
