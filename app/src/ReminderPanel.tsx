import { useId, useState } from "react";
import { X } from "./icons";
import { buildShortcutPayload, shortcutRunUrl } from "./iphoneReminders";
import { toDateKey } from "./dates";
import type { EventDraft, EventReminder } from "./types";
type Draft = Pick<EventDraft, "title" | "notes" | "startDate" | "allDay" | "startTime" | "reminders">;
const offsets = [[0, "At start time"], [15, "15 minutes before"], [30, "30 minutes before"], [60, "1 hour before"], [1440, "1 day before"]] as const;
export function ReminderPanel({ draft, kind, onChange }: { draft: Draft; kind: "event" | "task"; onChange: (rules: EventReminder[]) => void }) {
  const heading = useId();
  const [shortcutStatus, setShortcutStatus] = useState("");
  const [customIds, setCustomIds] = useState<string[]>([]);
  const rules = draft.reminders ?? [];
  const ready = !!draft.title.trim() && rules.length > 0 && rules.every(r => r.kind === "absolute" ? !!r.date && !!r.time : !!draft.startDate && Number.isSafeInteger(r.minutesBefore) && r.minutesBefore >= 0 && r.minutesBefore <= 525600);
  const updateReminder = (id: string, next: EventReminder) => onChange(rules.map(r => r.id === id ? next : r));
  const choose = (value: string, id: string = crypto.randomUUID()) => {
    const existing = rules.find(r => r.id === id);
    const next: EventReminder = value === "absolute"
      ? { id, kind: "absolute", date: draft.startDate || toDateKey(new Date()), time: (!draft.allDay && draft.startTime) || "09:00" }
      : { id, kind: "relative", minutesBefore: value === "custom" ? (existing?.kind === "relative" ? existing.minutesBefore : 30) : Number(value) };
    setCustomIds(ids => [...ids.filter(x => x !== id), ...(value === "custom" ? [id] : [])]);
    onChange(existing ? rules.map(r => r.id === id ? next : r) : [...rules, next]);
    setShortcutStatus("");
  };
  const options = (id?: string) => <>
    {draft.startDate && offsets.map(([n,label]) => <option key={n} value={n} disabled={rules.some(r => r.id !== id && r.kind === "relative" && r.minutesBefore === n)}>{label}</option>)}
    {draft.startDate && <option value="custom">Custom minutes before…</option>}
    <option value="absolute">Specific date &amp; time…</option>
  </>;
  const isCustom = (r: EventReminder) => r.kind === "relative" && (customIds.includes(r.id) || !offsets.some(([n]) => n === r.minutesBefore) || !draft.startDate);
  const removeReminder = (id: string) => onChange(rules.filter(r => r.id !== id));
  const launchShortcut = () => {
    if (!ready) return;
    const payload = buildShortcutPayload(draft, rules);
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
        <select aria-label="Add reminder" value="" onChange={e => choose(e.target.value)}>
          <option value="" disabled>+ Add reminder</option>{options()}
        </select>
      </div>
      {(draft.reminders ?? []).map((reminder) => (
        <div className="eventReminderRow" key={reminder.id}>
          <div className="eventReminderRowHead">
            <select
              aria-label="Reminder type"
              value={reminder.kind === "absolute" ? "absolute" : isCustom(reminder) ? "custom" : String(reminder.minutesBefore)}
              onChange={e => choose(e.target.value, reminder.id)}
            >
              {!draft.startDate && reminder.kind === "relative" && <option value="custom">Schedule required</option>}
              {options(reminder.id)}
            </select>
            <button className="reminderRemoveButton" type="button" onClick={() => removeReminder(reminder.id)} aria-label="Remove reminder" title="Remove reminder"><X /></button>
          </div>
          {reminder.kind === "relative" ? isCustom(reminder) && (
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
      {rules.length > 0 && <>
      <div className="shortcutActions">
        <button className="secondaryButton" type="button" disabled={!ready} onClick={launchShortcut}>
          Add to iPhone Reminders{(draft.reminders?.length ?? 0) > 1 ? ` (${draft.reminders!.length})` : ""}
        </button>
      </div>
      {shortcutStatus && <p className="shortcutStatus" role="status" aria-live="polite">{shortcutStatus}</p>}
      <p className="shortcutWarning">One-way add only. Editing this {kind} will not update reminders already created in Apple Reminders. Adding again may create duplicates.</p>
      </>}
      <a className="shortcutSetupLink" href="iphone-reminders-shortcut.html" target="_blank" rel="noreferrer">Set up “Monthlane 添加提醒” Shortcut</a>
    </section>
  );
}
