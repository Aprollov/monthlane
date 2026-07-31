"use client";

import { Archive, CalendarIcon, MoreHorizontal, RotateCcw } from "../icons";
import type { Category, FlowTask, TaskBucket } from "../types";
import { isTodayCarryOver } from "./taskFilters";
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
  onSchedule?: (task: FlowTask, date: string) => void;
  onDelete: (task: FlowTask) => void;
  onReorder: (ids: string[]) => void;
  today: string;
  reorderable?: boolean;
  onTaskDrop?: (taskId: string, targetIndex: number) => void;
  onDragTaskChange?: (taskId?: string) => void;
  onDragOverTask?: (index: number) => void;
  dropIndex?: number;
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
  onSchedule,
  onDelete,
  onReorder,
  today,
  reorderable = true,
  onTaskDrop,
  onDragTaskChange,
  onDragOverTask,
  dropIndex,
}: Props) {
  const categoryById = (id?: string) => categories.find((category) => category.id === id);
  if (!tasks.length) return emptyMessage ? <p className="emptyTaskList">{emptyMessage}</p> : null;
  return (
    <div className="taskList">
      {tasks.map((task, index) => {
        const category = categoryById(task.categoryId);
        return (
          <article
            className={`taskRow ${task.status === "completed" ? "completed" : ""} ${dropIndex === index ? "dropBefore" : ""}`}
            key={task.id}
            draggable={reorderable}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/task-id", task.id);
              onDragTaskChange?.(task.id);
            }}
            onDragEnd={() => onDragTaskChange?.()}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              onDragOverTask?.(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const sourceId = event.dataTransfer.getData("text/task-id");
              if (onTaskDrop) {
                onTaskDrop(sourceId, index);
                return;
              }
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
                {isTodayCarryOver(task, today) && <span className="carryOverBadge">昨日遗留</span>}
                {task.scheduledTime && <span>{task.scheduledTime}</span>}
                {task.scheduledDate && <span>{task.scheduledDate}</span>}
                {task.dueDate && <span>Due {task.dueDate}</span>}
                {task.estimatedMinutes && <span>{task.estimatedMinutes} min</span>}
              </span>
            </button>
            <div className="taskRowActions">
              <details className="taskMoreMenu">
                <summary aria-label={`More actions for ${task.title}`} title="More actions"><MoreHorizontal /></summary>
                <div className="taskMenuPanel">
                  {task.status === "completed" ? <>
                    <button type="button" onClick={() => onReopen(task)}><RotateCcw /> Reopen</button>
                    <button type="button" onClick={() => onArchive(task)}><Archive /> Archive</button>
                  </> : <>
                    {task.bucket !== "inbox" && <button type="button" onClick={() => onMove(task, "inbox")}>Move to Inbox</button>}
                    {task.bucket !== "thisWeek" && <button type="button" onClick={() => onMove(task, "thisWeek")}>Move to This Week</button>}
                    {task.bucket !== "today" && <button type="button" onClick={() => onMove(task, "today")}>Move to Today</button>}
                    {onSchedule && <label className="taskScheduleAction"><CalendarIcon /> Schedule<input type="date" aria-label={`Schedule ${task.title}`} value={task.scheduledDate ?? ""} onChange={(event) => event.target.value && onSchedule(task, event.target.value)} /></label>}
                    <button type="button" onClick={() => onEdit(task)}>Edit</button>
                    <button type="button" onClick={() => onComplete(task)}>Complete</button>
                  </>}
                  <button type="button" className="taskMenuDelete" onClick={() => onDelete(task)}>Delete</button>
                </div>
              </details>
            </div>
          </article>
        );
      })}
    </div>
  );
}
