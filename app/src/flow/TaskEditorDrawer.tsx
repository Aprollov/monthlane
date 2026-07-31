"use client";

import { useCallback, useState } from "react";
import { X } from "../icons";
import type { Category, FlowTask, TaskBucket, TaskStatus, UpdateTaskInput } from "../types";
import { useDialogFocus } from "../useDialogFocus";
import { flowBucket } from "./taskFilters";

type Props = {
  task: FlowTask;
  categories: Category[];
  onClose: () => void;
  onSave: (id: string, changes: UpdateTaskInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const draftFromTask = (task: FlowTask): UpdateTaskInput => ({
  title: task.title,
  notes: task.notes,
  bucket: flowBucket(task),
  scheduledDate: task.scheduledDate,
  scheduledTime: task.scheduledTime,
  dueDate: task.dueDate,
  categoryId: task.categoryId,
  tags: task.tags,
  estimatedMinutes: task.estimatedMinutes,
  status: task.status,
});

export function TaskEditorDrawer({ task, categories, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<UpdateTaskInput>(() => draftFromTask(task));
  const [more, setMore] = useState(() => Boolean(task.dueDate || task.tags.length || task.estimatedMinutes));
  const [busy, setBusy] = useState(false);
  const closeEditor = useCallback(() => {
    setBusy(false);
    setMore(false);
    setDraft({});
    onClose();
  }, [onClose]);
  const dialogRef = useDialogFocus<HTMLElement>(true, closeEditor);

  return (
    <>
      <button type="button" className="drawerScrim" onClick={closeEditor} aria-label="Close task editor" />
      <aside ref={dialogRef} className="eventDrawer taskEditor" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
        <header className="drawerHeader">
          <div><p className="eyebrow">Flow task</p><h2 id="task-editor-title">Edit task</h2></div>
          <button type="button" className="iconButton" onClick={closeEditor} aria-label="Close task editor"><X /></button>
        </header>
        <form className="eventForm" onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try { await onSave(task.id, draft); closeEditor(); }
          finally { setBusy(false); }
        }}>
          <label>Title<input required value={draft.title ?? ""} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>Notes<textarea rows={4} value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
          <div className="formSplit">
            <label>Bucket<select value={draft.bucket ?? "inbox"} onChange={(event) => setDraft({ ...draft, bucket: event.target.value as TaskBucket })}>
              <option value="inbox">Inbox</option>
              <option value="thisWeek">This Week</option>
              <option value="today">Today</option>
            </select></label>
            <label>Status<select value={draft.status ?? "open"} onChange={(event) => setDraft({ ...draft, status: event.target.value as TaskStatus })}>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select></label>
          </div>
          <div className="formSplit">
            <label>Scheduled date<input type="date" value={draft.scheduledDate ?? ""} onChange={(event) => setDraft({ ...draft, scheduledDate: event.target.value || undefined })} /></label>
            <label>Time<input type="time" value={draft.scheduledTime ?? ""} onChange={(event) => setDraft({ ...draft, scheduledTime: event.target.value || undefined })} /></label>
          </div>
          <label>Calendar<select value={draft.categoryId ?? ""} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value || undefined })}>
            <option value="">No calendar</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select></label>
          <button className="textButton" type="button" onClick={() => setMore((current) => !current)}>{more ? "Fewer options" : "More options"}</button>
          {more && <>
            <div className="formSplit">
              <label>Due date<input type="date" value={draft.dueDate ?? ""} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value || undefined })} /></label>
              <label>Estimated minutes<input type="number" min="1" value={draft.estimatedMinutes ?? ""} onChange={(event) => setDraft({ ...draft, estimatedMinutes: event.target.value ? Number(event.target.value) : undefined })} /></label>
            </div>
            <label>Tags<input value={(draft.tags ?? []).join(", ")} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="work, follow-up" /></label>
          </>}
          <div className="drawerActions">
            <button className="dangerButton" type="button" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await onDelete(task.id); closeEditor(); }
              finally { setBusy(false); }
            }}>Delete</button>
            <button className="secondaryButton" type="button" onClick={closeEditor}>Cancel</button>
            <button className="primaryButton" disabled={busy} type="submit">{busy ? "Saving…" : "Save task"}</button>
          </div>
        </form>
      </aside>
    </>
  );
}
