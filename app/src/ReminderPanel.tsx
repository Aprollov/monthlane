import { useId, useState } from "react";
import { X } from "./icons";
import { buildShortcutPayload, buildTwoMinuteTestPayload, shortcutRunUrl } from "./iphoneReminders";
import { toDateKey } from "./dates";
import type { EventDraft, EventReminder } from "./types";
type Draft = Pick<EventDraft, "title" | "notes" | "startDate" | "allDay" | "startTime" | "reminders">;
export function ReminderPanel({ draft, kind, onChange }: { draft: Draft; kind: "event" | "task"; onChange: (rules: EventReminder[]) => void }) {
  const heading = useId();
  const [shortcutStatus, setShortcutStatus] = useState("");
  const rules = draft.reminders ?? [];
  const ready = !!draft.title.trim() && rules.length > 0 && rules.every(r => r.kind === "absolute" ? !!r.date && !!r.time : !!draft.startDate && Number.isSafeInteger(r.minutesBefore) && r.minutesBefore >= 0 && r.minutesBefore <= 525600);
  const updateReminder = (id: string, next: EventReminder) => onChange(rules.map(r => r.id === id ? next : r));
  const addReminder = () => onChange([...rules, draft.startDate
    ? { id: crypto.randomUUID(), kind: "relative", minutesBefore: 30 }
    : { id: crypto.randomUUID(), kind: "absolute", date: toDateKey(new Date()), time: "09:00" }]);
  const removeReminder = (id: string) => onChange(rules.filter(r => r.id !== id));
  const launchShortcut = (test = false) => {
    if (!test && !ready) return;
    const payload = test ? buildTwoMinuteTestPayload() : buildShortcutPayload(draft, rules);
    setShortcutStatus("已打开快捷指令");
    window.location.href = shortcutRunUrl(payload);
  };
  return (
    <section className="eventReminderSection" aria-labelledby={heading}>
      <div className="eventReminderHeading">
        <div>
          <h3 id={heading}>Reminders</h3>
          <p>{kind === "task" ? (draft.startDate ? "Relative to " + draft.startDate + " at " + (draft.startTime || "09:00") + ". Sends this occurrence only." : "Choose a specific time, or schedule the task to use a relative reminder.") : "Saved with this event. All-day relative reminders use 9:00 AM."}</p>
        </div>
        <button className="secondaryButton compactButton" type="button" onClick={addReminder}>+ Add reminder</button>
      </div>
      {(draft.reminders ?? []).map((reminder) => (
        <div className="eventReminderRow" key={reminder.id}>
          <div className="eventReminderRowHead">
            <select
              aria-label="Reminder type"
              value={reminder.kind}
              onChange={(e) => updateReminder(reminder.id, e.target.value === "relative"
                ? { id: reminder.id, kind: "relative", minutesBefore: 30 }
                : { id: reminder.id, kind: "absolute", date: draft.startDate || toDateKey(new Date()), time: draft.allDay ? "09:00" : (draft.startTime || "09:00") })}
            >
              <option value="relative" disabled={!draft.startDate}>Before {kind}</option>
              <option value="absolute">Specific date &amp; time</option>
            </select>
            <button className="reminderRemoveButton" type="button" onClick={() => removeReminder(reminder.id)} aria-label="Remove reminder" title="Remove reminder"><X /></button>
          </div>
          {reminder.kind === "relative" ? (
            <label>
              Minutes before
              <input type="number" min="0" max="525600" inputMode="numeric" value={reminder.minutesBefore} onChange={(e) => updateReminder(reminder.id, {
                ...reminder,
                minutesBefore: Math.max(0, Number(e.target.value) || 0),
              })} />
            </label>
          ) : (
            <div className="formSplit">
              <label>Date<input type="date" required value={reminder.date} onChange={(e) => updateReminder(reminder.id, { ...reminder, date: e.target.value })} /></label>
              <label>Time<input type="time" required value={reminder.time} onChange={(e) => updateReminder(reminder.id, { ...reminder, time: e.target.value })} /></label>
            </div>
          )}
        </div>
      ))}
      {!(draft.reminders?.length) && <p className="eventReminderEmpty">No reminders yet.</p>}
      <div className="shortcutActions">
        <button className="secondaryButton" type="button" onClick={() => launchShortcut(true)}>Test · 2 minutes</button>
        <button className="secondaryButton" type="button" disabled={!ready} onClick={() => launchShortcut(false)}>
          Add to iPhone Reminders{(draft.reminders?.length ?? 0) > 1 ? ` (${draft.reminders!.length})` : ""}
        </button>
      </div>
      {shortcutStatus && <p className="shortcutStatus" role="status" aria-live="polite">{shortcutStatus}</p>}
      <p className="shortcutWarning">One-way add only. Editing this {kind} will not update reminders already created in Apple Reminders. Adding again may create duplicates.</p>
      <a className="shortcutSetupLink" href="iphone-reminders-shortcut.html" target="_blank" rel="noreferrer">Set up “Monthlane 添加提醒” Shortcut</a>
    </section>
  );
}
