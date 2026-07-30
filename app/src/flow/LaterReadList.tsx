"use client";

import { CalendarCheck, ChevronRight } from "../icons";
import type { Category, FlowTask } from "../types";
import { TaskCheckbox } from "./TaskCheckbox";

type Props = {
  tasks: FlowTask[];
  categories: Category[];
  today: string;
  onEdit: (task: FlowTask) => void;
  onComplete: (task: FlowTask) => void;
  onMoveToday: (task: FlowTask) => void;
  onMoveThisWeek: (task: FlowTask) => void;
  onSchedule: (task: FlowTask, date: string) => void;
};

export function LaterReadList({
  tasks,
  categories,
  today,
  onEdit,
  onComplete,
  onMoveToday,
  onMoveThisWeek,
  onSchedule,
}: Props) {
  const categoryById = (id?: string) => categories.find((category) => category.id === id);
  if (!tasks.length) return <p className="emptyTaskList">Links saved for later will appear here.</p>;
  return (
    <div className="laterReadList">
      {tasks.map((task) => {
        const category = categoryById(task.categoryId);
        return (
          <article className="laterReadRow" key={task.id}>
            <TaskCheckbox checked={false} label={task.title} onChange={() => onComplete(task)} />
            <button className="laterReadContent" onClick={() => onEdit(task)}>
              <span className="laterReadTitle">
                {category && <span className="categoryDot" style={{ background: category.color }} />}
                <strong>{task.title}</strong>
                <small>{task.siteName ?? "Web"}</small>
              </span>
              <span>{task.notes || task.url}</span>
            </button>
            <div className="laterReadActions">
              {task.url && <a href={task.url} target="_blank" rel="noreferrer" aria-label={`Open ${task.title}`}><ChevronRight /></a>}
              <button onClick={() => onMoveToday(task)} title="Move to Today">Today</button>
              <button onClick={() => onMoveThisWeek(task)} title="Move to This Week"><CalendarCheck /></button>
              <label>
                <span className="visuallyHidden">Schedule {task.title}</span>
                <input aria-label={`Schedule ${task.title}`} type="date" min={today} value={task.scheduledDate ?? ""} onChange={(event) => event.target.value && onSchedule(task, event.target.value)} />
              </label>
            </div>
          </article>
        );
      })}
    </div>
  );
}
