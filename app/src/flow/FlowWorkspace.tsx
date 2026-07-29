"use client";

import { Plus } from "../icons";
import { fromDateKey, toDateKey } from "../dates";
import type { CalendarEvent, Category, FlowTask, TaskBucket } from "../types";
import {
  completedTasks,
  inboxTasks,
  sortCompleted,
  sortInbox,
  sortThisWeek,
  sortToday,
  thisWeekTasks,
  todayTasks,
  unfinishedTasks,
} from "./taskFilters";
import { TaskList } from "./TaskList";
import { sortCalendarEntries } from "./calendarEntries";

export type FlowView = "month" | "inbox" | "thisWeek" | "today" | "completed";

type Props = {
  view: Exclude<FlowView, "month">;
  tasks: FlowTask[];
  categories: Category[];
  today: string;
  todayEvents: CalendarEvent[];
  onCapture: () => void;
  onEdit: (task: FlowTask) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onComplete: (task: FlowTask) => void;
  onReopen: (task: FlowTask) => void;
  onArchive: (task: FlowTask) => void;
  onMove: (task: FlowTask, bucket: TaskBucket, scheduledDate?: string) => void;
  onReorder: (ids: string[]) => void;
};

const viewCopy = {
  inbox: {
    eyebrow: "Capture freely",
    title: "Inbox",
    description: "Unsorted thoughts and tasks, ready when you are.",
    empty: "Your inbox is clear.",
  },
  thisWeek: {
    eyebrow: "Shape the week",
    title: "This Week",
    description: "A considered list of what matters this week.",
    empty: "Nothing planned for this week yet.",
  },
  today: {
    eyebrow: "One day at a time",
    title: "Today",
    description: "A focused view of what you chose for today.",
    empty: "No tasks scheduled for today.",
  },
  completed: {
    eyebrow: "Quiet progress",
    title: "Completed",
    description: "A history of tasks you have finished.",
    empty: "Completed tasks will appear here.",
  },
} as const;

export function FlowWorkspace({
  view,
  tasks,
  categories,
  today,
  todayEvents,
  onCapture,
  onEdit,
  onOpenEvent,
  onComplete,
  onReopen,
  onArchive,
  onMove,
  onReorder,
}: Props) {
  const copy = viewCopy[view];
  const visible = view === "inbox"
    ? sortInbox(inboxTasks(tasks))
    : view === "thisWeek"
      ? sortThisWeek(thisWeekTasks(tasks))
      : view === "today"
        ? sortToday(todayTasks(tasks, today))
        : sortCompleted(completedTasks(tasks));
  const unfinished = view === "today" ? sortToday(unfinishedTasks(tasks, today)) : [];
  const weekAll = tasks.filter((task) => !task.deletedAt && task.bucket === "thisWeek" && task.status !== "archived");
  const weekCompleted = weekAll.filter((task) => task.status === "completed").length;
  const yesterdayDate = fromDateKey(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toDateKey(yesterdayDate);
  const weekStart = fromDateKey(today);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekStartKey = toDateKey(weekStart);
  const completedGroups = view === "completed" ? [
    { label: "Today", tasks: visible.filter((task) => task.completedAt?.slice(0, 10) === today) },
    { label: "Yesterday", tasks: visible.filter((task) => task.completedAt?.slice(0, 10) === yesterday) },
    { label: "This Week", tasks: visible.filter((task) => {
      const date = task.completedAt?.slice(0, 10);
      return Boolean(date && date >= weekStartKey && date < yesterday);
    }) },
    { label: "Earlier", tasks: visible.filter((task) => {
      const date = task.completedAt?.slice(0, 10);
      return !date || date < weekStartKey;
    }) },
  ].filter((group) => group.tasks.length) : [];
  const orderedTodayEvents = sortCalendarEntries(todayEvents.map((event) => ({
    type: "event" as const,
    id: `event:${event.id}`,
    date: event.startDate,
    event,
  }))).map((entry) => entry.type === "event" ? entry.event : null).filter((event): event is CalendarEvent => Boolean(event));

  const taskListProps = {
    categories,
    onEdit,
    onComplete,
    onReopen,
    onArchive,
    onMove,
    onReorder,
    today,
  };

  return (
    <section className="flowWorkspace">
      <header className="flowHeader">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        {view !== "completed" && <button className="primaryButton" onClick={onCapture}><Plus /> Add task</button>}
      </header>

      {view === "thisWeek" && weekAll.length > 0 && (
        <div className="weekProgress" aria-label={`${weekCompleted} of ${weekAll.length} completed`}>
          <div><span style={{ width: `${(weekCompleted / weekAll.length) * 100}%` }} /></div>
          <small>{weekCompleted} of {weekAll.length} completed</small>
        </div>
      )}

      {view === "today" && (
        <section className="flowSection todaySchedule">
          <h2>Schedule</h2>
          {orderedTodayEvents.length ? (
            <div className="todayEventList">
              {orderedTodayEvents.map((event) => (
                <button className="todayEventRow" key={event.id} onClick={() => onOpenEvent(event)}>
                  <time>{event.allDay ? "All day" : event.startTime}</time>
                  <strong>{event.title}</strong>
                </button>
              ))}
            </div>
          ) : <p className="dayPanelEmpty">No events today.</p>}
        </section>
      )}

      <section className="flowSection">
        {view === "today" && <h2>Today tasks</h2>}
        {view === "completed" && completedGroups.length ? completedGroups.map((group) => (
          <div className="completedGroup" key={group.label}>
            <h2>{group.label}</h2>
            <TaskList {...taskListProps} reorderable={false} tasks={group.tasks} emptyMessage="" />
          </div>
        )) : <TaskList {...taskListProps} tasks={visible} emptyMessage={copy.empty} />}
      </section>

      {view === "today" && unfinished.length > 0 && (
        <section className="flowSection unfinishedSection">
          <div className="flowSectionHeading">
            <div><p className="eyebrow">Needs a decision</p><h2>Unfinished</h2></div>
            <small>Kept on their original dates</small>
          </div>
          <TaskList {...taskListProps} tasks={unfinished} emptyMessage="" />
        </section>
      )}
    </section>
  );
}
