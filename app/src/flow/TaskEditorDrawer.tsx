"use client";

import { useCallback, useState } from "react";
import { MoreHorizontal, X } from "../icons";
import { recurrenceLabel } from "../recurrence";
import type { Category, FlowTask, RecurrenceRule, TaskBucket, TaskPriority, TaskStatus, UpdateTaskInput } from "../types";
import { useDialogFocus } from "../useDialogFocus";
import { flowBucket, isTaskDoneOn } from "./taskFilters";

type Props = {
  task: FlowTask;
  categories: Category[];
  today: string;
  onClose: () => void;
  onSave: (id: string, changes: UpdateTaskInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onConvert?: () => void;
  onToggleDone?: (task: FlowTask, nextDone: boolean) => Promise<void>;
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
  recurrence: task.recurrence,
  priority: task.priority,
  showInMonthView: task.showInMonthView ?? true,
  status: task.status,
});

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const repeatValue = (rule?: RecurrenceRule) => {
  if (!rule) return "none";
  if (rule.interval !== 1) return "custom";
  if (rule.frequency === "daily") return "daily";
  if (rule.frequency === "weekly" && rule.daysOfWeek?.join(",") === "1,2,3,4,5") return "weekdays";
  if (rule.frequency === "weekly" && (rule.daysOfWeek?.length ?? 0) <= 1) return "weekly";
  if (rule.frequency === "monthly") return "monthly";
  return "custom";
};

export function TaskEditorDrawer({ task, categories, today, onClose, onSave, onDelete, onConvert, onToggleDone }: Props) {
  const [draft, setDraft] = useState<UpdateTaskInput>(() => draftFromTask(task));
  const [menuOpen, setMenuOpen] = useState(false);
  const [more, setMore] = useState(() => Boolean(task.dueDate || task.tags.length || task.estimatedMinutes || task.showInMonthView === false));
  const [busy, setBusy] = useState(false);
  // The editor keeps its own snapshot of the task, so reflect the latest
  // completion toggle locally instead of waiting for the prop to refresh.
  const doneDate = task.scheduledDate ?? today;
  const [doneOverride, setDoneOverride] = useState<boolean>();
  const isDone = doneOverride ?? isTaskDoneOn(task, doneDate);
  const toggleDone = async () => {
    if (!onToggleDone || busy) return;
    setBusy(true);
    try {
      await onToggleDone(task, !isDone);
      setDoneOverride(!isDone);
      // Keep the Status dropdown in sync so a later save does not restore the old status.
      if (!task.recurrence) setDraft((current) => ({ ...current, status: isDone ? "open" : "completed" }));
    } finally {
      setBusy(false);
    }
  };
  const closeEditor = useCallback(() => {
    setBusy(false);
    setMore(false);
    setDraft({});
    onClose();
  }, [onClose]);
  const dialogRef = useDialogFocus<HTMLElement>(true, closeEditor);

  const setRepeat = (value: string) => {
    if (value === "none") { setDraft({ ...draft, recurrence: undefined }); return; }
    const startDate = draft.scheduledDate ?? today;
    const weekday = ((new Date(`${startDate}T12:00:00`).getDay() + 6) % 7) + 1;
    const rule: RecurrenceRule =
      value === "daily" ? { frequency: "daily", interval: 1, endType: "never" }
      : value === "weekdays" ? { frequency: "weekly", interval: 1, daysOfWeek: [1, 2, 3, 4, 5], endType: "never" }
      : value === "monthly" ? { frequency: "monthly", interval: 1, endType: "never" }
      : { frequency: "weekly", interval: 1, daysOfWeek: [weekday], endType: "never" };
    setDraft({ ...draft, scheduledDate: startDate, recurrence: rule });
  };

  return (
    <>
      <button type="button" className="drawerScrim" onClick={closeEditor} aria-label="Close task editor" />
      <aside ref={dialogRef} className="eventDrawer taskEditor" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
        <header className="drawerHeader">
          <div><p className="eyebrow">Flow task</p><h2 id="task-editor-title">Edit task</h2></div>
          <div className="drawerHeaderActions">
            {onToggleDone && (
              <button type="button" className={`taskCompleteToggle ${isDone ? "done" : ""}`} disabled={busy} onClick={() => { void toggleDone(); }}>
                {isDone ? "✓ Completed" : "○ Complete"}
              </button>
            )}
            {onConvert && (
              <div className="detailMenu">
                <button type="button" className="iconButton" aria-label="More options" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><MoreHorizontal /></button>
                {menuOpen && (
                  <div className="detailMenuPanel">
                    <button type="button" onClick={() => { setMenuOpen(false); onConvert(); }}>Convert to Event</button>
                  </div>
                )}
              </div>
            )}
            <button type="button" className="iconButton" onClick={closeEditor} aria-label="Close task editor"><X /></button>
          </div>
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
              {(draft.status ?? "open") === "archived" && <option value="archived">Archived</option>}
            </select></label>
          </div>
          <div className="formSplit">
            <label>Scheduled date<input type="date" value={draft.scheduledDate ?? ""} onChange={(event) => setDraft({ ...draft, scheduledDate: event.target.value || undefined })} /></label>
            <label>Time<input type="time" value={draft.scheduledTime ?? ""} onChange={(event) => setDraft({ ...draft, scheduledTime: event.target.value || undefined })} /></label>
          </div>
          <label>Repeat<select value={repeatValue(draft.recurrence)} onChange={(event) => setRepeat(event.target.value)}>
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekdays">Every weekday</option>
            <option value="weekly">Weekly on {WEEKDAY_LABELS[((new Date(`${draft.scheduledDate ?? today}T12:00:00`).getDay() + 6) % 7)]}</option>
            <option value="monthly">Monthly</option>
            {repeatValue(draft.recurrence) === "custom" && <option value="custom">{recurrenceLabel(draft.recurrence)}</option>}
          </select></label>
          <div className="formSplit">
            <label>Calendar<select value={draft.categoryId ?? ""} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value || undefined })}>
              <option value="">No calendar</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select></label>
            <label>Priority<select value={draft.priority ?? "medium"} onChange={(event) => setDraft({ ...draft, priority: event.target.value as TaskPriority })}>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">⚪ Low</option>
            </select></label>
          </div>
          <button className="textButton" type="button" onClick={() => setMore((current) => !current)}>{more ? "Fewer options" : "More options"}</button>
          {more && <>
            <div className="formSplit">
              <label>Due date<input type="date" value={draft.dueDate ?? ""} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value || undefined })} /></label>
              <label>Estimated minutes<input type="number" min="1" value={draft.estimatedMinutes ?? ""} onChange={(event) => setDraft({ ...draft, estimatedMinutes: event.target.value ? Number(event.target.value) : undefined })} /></label>
            </div>
            <label>Tags<input value={(draft.tags ?? []).join(", ")} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="work, follow-up" /></label>
            <label className="checkRow taskMonthVisibility"><input type="checkbox" checked={draft.showInMonthView !== false} onChange={(event) => setDraft({ ...draft, showInMonthView: event.target.checked })} /><span>Show in Month View</span></label>
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
