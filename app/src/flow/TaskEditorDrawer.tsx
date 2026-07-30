"use client";

import { useEffect, useState } from "react";
import { X } from "../icons";
import type { Category, FlowTask, TaskBucket, TaskStatus, UpdateTaskInput } from "../types";
import { detectLinkSource } from "./urlDetection";
import { useDialogFocus } from "../useDialogFocus";
import { flowBucket } from "./taskFilters";

type Props = {
  open: boolean;
  task?: FlowTask;
  categories: Category[];
  onClose: () => void;
  onSave: (id: string, changes: UpdateTaskInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function TaskEditorDrawer({ open, task, categories, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<UpdateTaskInput>({});
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialogRef = useDialogFocus<HTMLElement>(open, onClose);
  useEffect(() => {
    if (!task) return;
    setDraft({
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
      kind: task.kind,
      url: task.url,
      sourceType: task.sourceType,
      siteName: task.siteName,
      pageTitle: task.pageTitle,
    });
    setMore(Boolean(task.dueDate || task.tags.length || task.estimatedMinutes));
  }, [task]);
  if (!open || !task) return null;

  return (
    <>
      <button className="drawerScrim" onClick={onClose} aria-label="Close task editor" />
      <aside ref={dialogRef} className="eventDrawer taskEditor" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
        <header className="drawerHeader">
          <div><p className="eyebrow">{task.kind === "readLater" ? "Later Read" : "Flow task"}</p><h2 id="task-editor-title">Edit task</h2></div>
          <button className="iconButton" onClick={onClose} aria-label="Close task editor"><X /></button>
        </header>
        <form className="eventForm" onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try { await onSave(task.id, draft); onClose(); }
          finally { setBusy(false); }
        }}>
          <label>Title<input required value={draft.title ?? ""} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>Notes<textarea rows={4} value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
          {task.kind === "readLater" && <>
            <label>Link<input type="url" value={draft.url ?? ""} onChange={(event) => {
              const source = detectLinkSource(event.target.value);
              setDraft({
                ...draft,
                url: event.target.value || undefined,
                sourceType: source?.sourceType,
                siteName: source?.siteName,
              });
            }} /></label>
            <p className="linkSourceHint">{draft.siteName ?? "Web link"} · Titles remain editable when metadata is unavailable.</p>
          </>}
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
            <label>Scheduled date<input type="date" value={draft.scheduledDate ?? ""} onChange={(event) => setDraft({ ...draft, scheduledDate: event.target.value || undefined, bucket: event.target.value && draft.bucket === "inbox" ? "thisWeek" : draft.bucket })} /></label>
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
            <button className="dangerButton" type="button" onClick={async () => { await onDelete(task.id); onClose(); }}>Delete</button>
            <button className="secondaryButton" type="button" onClick={onClose}>Cancel</button>
            <button className="primaryButton" disabled={busy} type="submit">{busy ? "Saving…" : "Save task"}</button>
          </div>
        </form>
      </aside>
    </>
  );
}
