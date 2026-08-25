"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { CalendarIcon, ChevronRight, Grip, Plus, X } from "../icons";
import type { CalendarDragItem } from "../calendarReschedule";
import { fromDateKey, longDateLabel } from "../dates";
import type { CalendarEvent, Category, FlowTask } from "../types";
import { priorityMark } from "./calendarEntries";
import { isTaskDoneOn } from "./taskFilters";
import { TaskCheckbox } from "./TaskCheckbox";

type Props = {
  open: boolean;
  date: string;
  events: CalendarEvent[];
  tasks: FlowTask[];
  categories: Category[];
  onClose: () => void;
  onAddEvent: () => void;
  onAddTask: () => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onOpenTask: (task: FlowTask) => void;
  onCompleteTask: (task: FlowTask) => void;
  onReopenTask: (task: FlowTask) => void;
  onReturnToInbox: (task: FlowTask) => void;
  onDragStart: (event: ReactPointerEvent<HTMLElement>, item: CalendarDragItem) => void;
  isDragSource: (item: CalendarDragItem) => boolean;
};

export function DayPanel({
  open,
  date,
  events,
  tasks,
  categories,
  onClose,
  onAddEvent,
  onAddTask,
  onOpenEvent,
  onOpenTask,
  onCompleteTask,
  onReopenTask,
  onReturnToInbox,
  onDragStart,
  isDragSource,
}: Props) {
  if (!open) return null;
  const categoryById = (id?: string) => categories.find((category) => category.id === id);
  const openTasks = tasks.filter((task) => !isTaskDoneOn(task, date));
  const completedTasks = tasks.filter((task) => isTaskDoneOn(task, date));
  const dragItem = (task: FlowTask): CalendarDragItem => ({ type: "task", id: task.id, sourceDate: date, title: task.title, recurring: false });
  const dragHandle = (task: FlowTask) => (
    <span
      className="dragHandle"
      aria-hidden="true"
      title="Drag to another day"
      onPointerDown={(event) => onDragStart(event, dragItem(task))}
    ><Grip /></span>
  );
  return (
    <aside className="dayPanel" role="dialog" aria-modal="false" aria-label={`Details for ${longDateLabel(fromDateKey(date))}`}>
      <header className="dayPanelHeader">
        <div><p className="eyebrow">Selected day</p><h2>{longDateLabel(fromDateKey(date))}</h2></div>
        <button className="iconButton" onClick={onClose} aria-label="Close day panel"><X /></button>
      </header>
      <section className="dayPanelSection">
        <div className="dayPanelTitle"><h3>Schedule</h3><button onClick={onAddEvent} aria-label="Add event"><Plus /></button></div>
        {events.length ? events.map((event) => (
          <button className="dayPanelEvent" key={event.id} onClick={() => onOpenEvent(event)}>
            <span className="categoryDot" style={{ background: categoryById(event.categoryId)?.color }} />
            <span><strong>{event.title}</strong><small>{event.allDay ? "All day" : event.startTime}{(event.recurrence || event.recurrenceParentId) ? " · ↻" : ""}</small></span>
            <ChevronRight />
          </button>
        )) : <p className="dayPanelEmpty">No events.</p>}
      </section>
      <section className="dayPanelSection">
        <div className="dayPanelTitle"><h3>Tasks</h3><button onClick={onAddTask} aria-label="Add task"><Plus /></button></div>
        {openTasks.length ? openTasks.map((task) => (
          <article className={`dayPanelTask ${isDragSource(dragItem(task)) ? "calendarDragSource" : ""}`} key={task.id}>
            <TaskCheckbox
              checked={false}
              label={task.title}
              onChange={() => onCompleteTask(task)}
            />
            <button onClick={() => onOpenTask(task)}><strong><span className="priorityMark" aria-hidden="true">{priorityMark(task.priority)}</span> {task.title}</strong><small>{task.scheduledTime ?? "No time"}{task.recurrence ? " · ↻" : ""}{categoryById(task.categoryId) ? ` · ${categoryById(task.categoryId)!.name}` : ""}</small></button>
            <button className="returnInboxButton" onClick={() => onReturnToInbox(task)}>Inbox</button>
            {dragHandle(task)}
            <ChevronRight className="mobileChevron" />
          </article>
        )) : <p className="dayPanelEmpty">No tasks.</p>}
      </section>
      {completedTasks.length > 0 && (
        <section className="dayPanelSection">
          <div className="dayPanelTitle"><h3>Completed</h3></div>
          {completedTasks.map((task) => (
            <article className={`dayPanelTask completed ${isDragSource(dragItem(task)) ? "calendarDragSource" : ""}`} key={task.id}>
              <TaskCheckbox
                checked
                label={task.title}
                onChange={() => onReopenTask(task)}
              />
              <button onClick={() => onOpenTask(task)}><strong><span className="priorityMark" aria-hidden="true">{priorityMark(task.priority)}</span> {task.title}</strong><small>{task.scheduledTime ?? "No time"}{task.recurrence ? " · ↻" : ""}{categoryById(task.categoryId) ? ` · ${categoryById(task.categoryId)!.name}` : ""}</small></button>
              {dragHandle(task)}
              <ChevronRight className="mobileChevron" />
            </article>
          ))}
        </section>
      )}
      <footer className="dayPanelActions">
        <button className="secondaryButton" onClick={onAddTask}><Plus /> Task</button>
        <button className="secondaryButton" onClick={onAddEvent}><CalendarIcon /> Event</button>
      </footer>
    </aside>
  );
}
