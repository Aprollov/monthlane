"use client";

import { CheckCircle } from "../icons";
import { fromDateKey, toDateKey } from "../dates";
import type { Category, CreateTaskInput, FlowBucket, FlowTask, TaskBucket } from "../types";
import { completedTasks, sortCompleted } from "./taskFilters";
import { FlowBoard } from "./FlowBoard";
import { TaskList } from "./TaskList";

export type FlowView = "month" | "flow" | "completed";

type Props = {
  view: Exclude<FlowView, "month">;
  tasks: FlowTask[];
  categories: Category[];
  today: string;
  mobileBucket: FlowBucket;
  onMobileBucketChange: (bucket: FlowBucket) => void;
  onCreate: (input: CreateTaskInput) => Promise<void>;
  onWrapUp: () => void;
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

export function FlowWorkspace({
  view,
  tasks,
  categories,
  today,
  mobileBucket,
  onMobileBucketChange,
  onCreate,
  onWrapUp,
  onEdit,
  onComplete,
  onReopen,
  onArchive,
  onMove,
  onPlace,
  onSchedule,
  onDelete,
  onReorder,
}: Props) {
  if (view === "flow") return (
    <section className="flowWorkspace flowBoardWorkspace">
      <header className="flowHeader flowBoardHeader">
        <div>
          <p className="eyebrow">Three quiet places</p>
          <h1>Flow</h1>
          <p>收集、推进、专注。三个状态平行存在，可以随时调整。</p>
        </div>
        <button className="secondaryButton" onClick={onWrapUp}><CheckCircle /> Wrap up</button>
      </header>
      <FlowBoard
        tasks={tasks}
        categories={categories}
        today={today}
        mobileBucket={mobileBucket}
        onMobileBucketChange={onMobileBucketChange}
        onCreate={onCreate}
        onEdit={onEdit}
        onComplete={onComplete}
        onReopen={onReopen}
        onArchive={onArchive}
        onMove={onMove}
        onPlace={onPlace}
        onSchedule={onSchedule}
        onDelete={onDelete}
        onReorder={onReorder}
      />
    </section>
  );

  const visible = sortCompleted(completedTasks(tasks));
  const yesterdayDate = fromDateKey(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toDateKey(yesterdayDate);
  const weekStart = fromDateKey(today);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekStartKey = toDateKey(weekStart);
  const groups = [
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
  ].filter((group) => group.tasks.length);
  const taskListProps = { categories, onEdit, onComplete, onReopen, onArchive, onMove, onSchedule, onDelete, onReorder, today };
  return (
    <section className="flowWorkspace">
      <header className="flowHeader">
        <div><p className="eyebrow">Quiet progress</p><h1>Completed</h1><p>A history of tasks you have finished.</p></div>
      </header>
      <section className="flowSection">
        {groups.length ? groups.map((group) => (
          <div className="completedGroup" key={group.label}>
            <h2>{group.label}</h2>
            <TaskList {...taskListProps} reorderable={false} tasks={group.tasks} emptyMessage="" />
          </div>
        )) : <p className="emptyTaskList">Completed tasks will appear here.</p>}
      </section>
    </section>
  );
}
