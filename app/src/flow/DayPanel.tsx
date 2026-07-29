"use client";

import { CalendarIcon, ChevronRight, Plus, X } from "../icons";
import { fromDateKey, longDateLabel } from "../dates";
import type { CalendarEvent, Category, FlowTask } from "../types";
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
}: Props) {
  if (!open) return null;
  const categoryById = (id?: string) => categories.find((category) => category.id === id);
  return (
    <aside className="dayPanel" aria-label={`Details for ${longDateLabel(fromDateKey(date))}`}>
      <header className="dayPanelHeader">
        <div><p className="eyebrow">Selected day</p><h2>{longDateLabel(fromDateKey(date))}</h2></div>
        <button className="iconButton" onClick={onClose} aria-label="Close day panel"><X /></button>
      </header>
      <section className="dayPanelSection">
        <div className="dayPanelTitle"><h3>Schedule</h3><button onClick={onAddEvent} aria-label="Add event"><Plus /></button></div>
        {events.length ? events.map((event) => (
          <button className="dayPanelEvent" key={event.id} onClick={() => onOpenEvent(event)}>
            <span className="categoryDot" style={{ background: categoryById(event.categoryId)?.color }} />
            <span><strong>{event.title}</strong><small>{event.allDay ? "All day" : event.startTime}</small></span>
            <ChevronRight />
          </button>
        )) : <p className="dayPanelEmpty">No events.</p>}
      </section>
      <section className="dayPanelSection">
        <div className="dayPanelTitle"><h3>Tasks</h3><button onClick={onAddTask} aria-label="Add task"><Plus /></button></div>
        {tasks.length ? tasks.map((task) => (
          <article className={`dayPanelTask ${task.status === "completed" ? "completed" : ""}`} key={task.id}>
            <TaskCheckbox
              checked={task.status === "completed"}
              label={task.title}
              onChange={() => task.status === "completed" ? onReopenTask(task) : onCompleteTask(task)}
            />
            <button onClick={() => onOpenTask(task)}><strong>{task.title}</strong><small>{task.scheduledTime ?? "No time"}</small></button>
            <button className="returnInboxButton" onClick={() => onReturnToInbox(task)}>Inbox</button>
          </article>
        )) : <p className="dayPanelEmpty">No tasks.</p>}
      </section>
      <footer className="dayPanelActions">
        <button className="secondaryButton" onClick={onAddTask}><Plus /> Task</button>
        <button className="secondaryButton" onClick={onAddEvent}><CalendarIcon /> Event</button>
      </footer>
    </aside>
  );
}
