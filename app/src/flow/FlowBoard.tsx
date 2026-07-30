"use client";

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
  onReorder: (ids: string[]) => void;
};

const columns: Array<{ bucket: FlowBucket; title: string }> = [
  { bucket: "inbox", title: "收集箱" },
  { bucket: "thisWeek", title: "本周任务" },
  { bucket: "today", title: "今日任务" },
];

export function FlowBoard(props: Props) {
  const tasksByBucket: Record<FlowBucket, FlowTask[]> = {
    inbox: sortInbox(inboxTasks(props.tasks)),
    thisWeek: sortInbox(thisWeekTasks(props.tasks)),
    today: sortInbox(todayTasks(props.tasks, props.today)),
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
            <section className={`flowColumn ${props.mobileBucket === column.bucket ? "mobileActive" : ""}`} key={column.bucket} aria-labelledby={`flow-${column.bucket}`}>
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
                onReorder={props.onReorder}
                today={props.today}
              />
            </section>
          );
        })}
      </div>
    </>
  );
}
