"use client";

import { useState } from "react";
import type { Category, CreateTaskInput, FlowBucket, FlowTask, TaskBucket } from "../types";
import { inboxTasks, sortInbox, thisWeekTasks, todayTasks } from "./taskFilters";
import { FlowColumnComposer } from "./FlowColumnComposer";
import { TaskList } from "./TaskList";

type Props = {
  tasks: FlowTask[];
  categories: Category[];
  today: string;
  mobileBucket: FlowBucket;
  onMobileBucketChange: (bucket: FlowBucket) => void;
  onCreate: (input: CreateTaskInput) => Promise<void>;
  onEdit: (task: FlowTask) => void;
  onComplete: (task: FlowTask) => void;
  onReopen: (task: FlowTask) => void;
  onArchive: (task: FlowTask) => void;
  onMove: (task: FlowTask, bucket: TaskBucket) => void;
  onPlace: (taskId: string, bucket: FlowBucket, previousOrder?: number, nextOrder?: number) => void;
  onSchedule: (task: FlowTask, date: string) => void;
  onDelete: (task: FlowTask) => void;
  onReorder: (ids: string[]) => void;
};

const columns: Array<{ bucket: FlowBucket; title: string }> = [
  { bucket: "inbox", title: "收集箱" },
  { bucket: "thisWeek", title: "本周任务" },
  { bucket: "today", title: "今日任务" },
];

export function FlowBoard(props: Props) {
  const [draggingId, setDraggingId] = useState<string>();
  const [dropTarget, setDropTarget] = useState<{ bucket: FlowBucket; index: number }>();
  const tasksByBucket: Record<FlowBucket, FlowTask[]> = {
    inbox: sortInbox(inboxTasks(props.tasks)),
    thisWeek: sortInbox(thisWeekTasks(props.tasks)),
    today: sortInbox(todayTasks(props.tasks, props.today)),
  };
  const place = (taskId: string, bucket: FlowBucket, requestedIndex: number) => {
    const targetTasks = tasksByBucket[bucket].filter((task) => task.id !== taskId);
    const index = Math.max(0, Math.min(requestedIndex, targetTasks.length));
    props.onPlace(taskId, bucket, targetTasks[index - 1]?.sortOrder, targetTasks[index]?.sortOrder);
    setDraggingId(undefined);
    setDropTarget(undefined);
  };
  return (
    <>
      <div className="flowMobileTabs" role="tablist" aria-label="Flow status">
        {columns.map((column) => <button role="tab" aria-selected={props.mobileBucket === column.bucket} className={props.mobileBucket === column.bucket ? "active" : ""} key={column.bucket} onClick={() => props.onMobileBucketChange(column.bucket)}>{column.title}</button>)}
      </div>
      <div className="flowBoard">
        {columns.map((column) => {
          const columnTasks = tasksByBucket[column.bucket];
          return (
            <section
              className={`flowColumn ${props.mobileBucket === column.bucket ? "mobileActive" : ""} ${draggingId && dropTarget?.bucket === column.bucket ? "dropActive" : ""}`}
              key={column.bucket}
              aria-labelledby={`flow-${column.bucket}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (draggingId && dropTarget?.bucket !== column.bucket) setDropTarget({ bucket: column.bucket, index: columnTasks.length });
              }}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData("text/task-id");
                if (taskId) place(taskId, column.bucket, dropTarget?.bucket === column.bucket ? dropTarget.index : columnTasks.length);
              }}
            >
              <header className="flowColumnHeader">
                <h2 id={`flow-${column.bucket}`}>{column.title}</h2>
                <span>{columnTasks.length}</span>
              </header>
              <FlowColumnComposer bucket={column.bucket} onCreate={props.onCreate} />
              <TaskList
                tasks={columnTasks}
                categories={props.categories}
                emptyMessage="暂无任务"
                onEdit={props.onEdit}
                onComplete={props.onComplete}
                onReopen={props.onReopen}
                onArchive={props.onArchive}
                onMove={props.onMove}
                onSchedule={props.onSchedule}
                onDelete={props.onDelete}
                onReorder={props.onReorder}
                onTaskDrop={(taskId, index) => place(taskId, column.bucket, index)}
                onDragTaskChange={(taskId) => {
                  setDraggingId(taskId);
                  if (!taskId) setDropTarget(undefined);
                }}
                onDragOverTask={(index) => setDropTarget({ bucket: column.bucket, index })}
                dropIndex={dropTarget?.bucket === column.bucket ? dropTarget.index : undefined}
                today={props.today}
              />
            </section>
          );
        })}
      </div>
    </>
  );
}
