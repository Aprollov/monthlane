"use client";

import { Archive, ChevronDown, ChevronUp, MoreHorizontal, RotateCcw } from "../icons";
import { fromDateKey, toDateKey } from "../dates";
import type { Category, FlowTask, TaskBucket } from "../types";
import { TaskCheckbox } from "./TaskCheckbox";

type Props = {
  tasks: FlowTask[];
  categories: Category[];
  emptyMessage: string;
  onEdit: (task: FlowTask) => void;
  onComplete: (task: FlowTask) => void;
  onReopen: (task: FlowTask) => void;
  onArchive: (task: FlowTask) => void;
  onMove: (task: FlowTask, bucket: TaskBucket) => void;
  onReorder: (ids: string[]) => void;
  today: string;
  reorderable?: boolean;
};

export function TaskList({
  tasks,
  categories,
  emptyMessage,
  onEdit,
  onComplete,
  onReopen,
  onArchive,
  onMove,
  onReorder,
  today,
  reorderable = true,
}: Props) {
  const categoryById = (id?: string) => categories.find((category) => category.id === id);
  const moveAt = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= tasks.length) return;
    const ids = tasks.map((task) => task.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onReorder(ids);
  };
  if (!tasks.length) return <p className="emptyTaskList">{emptyMessage}</p>;
  return (
    <div className="taskList">
      {tasks.map((task, index) => {
        const category = categoryById(task.categoryId);
        return (
          <article
            className={`taskRow ${task.status === "completed" ? "completed" : ""}`}
            key={task.id}
            draggable={reorderable}
            onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const sourceId = event.dataTransfer.getData("text/task-id");
              const sourceIndex = tasks.findIndex((candidate) => candidate.id === sourceId);
              if (sourceIndex < 0 || sourceIndex === index) return;
              const ids = tasks.map((candidate) => candidate.id);
              const [moved] = ids.splice(sourceIndex, 1);
              ids.splice(index, 0, moved);
              onReorder(ids);
            }}
          >
            <TaskCheckbox
              checked={task.status === "completed"}
              label={task.title}
              onChange={() => task.status === "completed" ? onReopen(task) : onComplete(task)}
            />
            <button className="taskContent" type="button" onClick={() => onEdit(task)}>
              <span className="taskTitleLine">
                {category && <span className="categoryDot" style={{ background: category.color }} />}
                <strong>{task.title}</strong>
              </span>
              <span className="taskMeta">
                {task.scheduledTime && <span>{task.scheduledTime}</span>}
                {task.scheduledDate && <span>{task.scheduledDate}</span>}
                {task.dueDate && <span>Due {task.dueDate}</span>}
                {task.estimatedMinutes && <span>{task.estimatedMinutes} min</span>}
              </span>
            </button>
            <div className="taskRowActions">
              {reorderable && <>
                <button aria-label={`Move ${task.title} up`} disabled={index === 0} onClick={() => moveAt(index, -1)}><ChevronUp /></button>
                <button aria-label={`Move ${task.title} down`} disabled={index === tasks.length - 1} onClick={() => moveAt(index, 1)}><ChevronDown /></button>
              </>}
              {task.status === "completed" ? (
                <>
                  <button aria-label={`Reopen ${task.title}`} onClick={() => onReopen(task)}><RotateCcw /></button>
                  <button aria-label={`Archive ${task.title}`} onClick={() => onArchive(task)}><Archive /></button>
                </>
              ) : (
                <label className="taskMoveMenu">
                  <MoreHorizontal />
                  <span className="visuallyHidden">Move {task.title}</span>
                  <select aria-label={`Move ${task.title}`} defaultValue="" onChange={(event) => {
                    const action = event.target.value;
                    if (action === "today") onMove(task, "today");
                    if (action === "week") onMove(task, "thisWeek");
                    if (action === "inbox") onMove(task, "inbox");
                    event.target.value = "";
                  }}>
                    <option value="" disabled>Move…</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="inbox">Inbox</option>
                  </select>
                </label>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
