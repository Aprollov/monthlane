import { useState } from "react";
import { X } from "./icons";
import { buildShortcutPayload, shortcutRunUrl } from "./iphoneReminders";
import { toDateKey } from "./dates";
import type { EventDraft, EventReminder } from "./types";
import "./reminderPicker.css";

type Draft = Pick<EventDraft, "title" | "notes" | "startDate" | "allDay" | "startTime" | "reminders">;
const presets = new Map([[0, "At start time"], [5, "5 minutes before"], [15, "15 minutes before"], [30, "30 minutes before"], [60, "1 hour before"], [1440, "1 day before"]]);
const describe = (r: EventReminder) => r.kind === "absolute"
  ? [r.date, r.time].filter(Boolean).join(" ") || "Specific date & time"
  : presets.get(r.minutesBefore) ?? `${r.minutesBefore} minutes before`;

export function ReminderPanel({ draft, kind, onChange }: { draft: Draft; kind: "event" | "task"; onChange: (rules: EventReminder[]) => void }) {
  const rules = draft.reminders ?? [];
  const [status, setStatus] = useState("");
  const [custom, setCustom] = useState(false);
  const [minutes, setMinutes] = useState("");
  const change = (next: EventReminder[]) => { setStatus(""); onChange(next); };
  const relative = (n: number) => rules.some(r => r.kind === "relative" && r.minutesBefore === n);
  const addRelative = (n: number) => change([...rules, { id: crypto.randomUUID(), kind: "relative", minutesBefore: n }]);
  const addAbsolute = () => change([...rules, { id: crypto.randomUUID(), kind: "absolute", date: draft.startDate || toDateKey(new Date()), time: (!draft.allDay && draft.startTime) || "09:00" }]);
  const validMinutes = /^\d+$/.test(minutes) && Number(minutes) <= 525600 && !relative(Number(minutes));
  const ready = !!draft.title.trim() && rules.length > 0 && rules.every(r => r.kind === "absolute" ? r.date && r.time : draft.startDate && Number.isSafeInteger(r.minutesBefore) && r.minutesBefore >= 0 && r.minutesBefore <= 525600);
  return <details className="eventReminderSection reminderPicker" onToggle={e => { if (!e.currentTarget.open) setCustom(false); }}>
    <summary><strong>Reminders</strong><span>{rules.map(describe).join(" · ") || "None"}</span></summary>
    <div className="reminderChoices">
      {draft.startDate ? <>
        <p className="shortcutWarning">Relative to {draft.startDate} at {(!draft.allDay && draft.startTime) || "09:00"}.{kind === "task" && " Sends this occurrence only."}</p>
        {Array.from(presets, ([n, label]) => <label className="reminderChoice" key={n}>
          <span>{label}</span><input type="checkbox" checked={relative(n)} onChange={() => relative(n)
            ? change(rules.filter(r => r.kind !== "relative" || r.minutesBefore !== n)) : addRelative(n)} />
        </label>)}
      </> : <p className="shortcutWarning">Choose a specific date and time, or schedule this {kind} to use relative reminders.</p>}
      {rules.filter(r => r.kind === "absolute" || !draft.startDate || !presets.has(r.minutesBefore)).map(r => <div className="eventReminderRow" key={r.id}>
        <div className="eventReminderRowHead"><span>{r.kind === "absolute" ? "Specific date & time" : describe(r)}</span>
          <button type="button" className="reminderRemoveButton" aria-label={`Remove ${describe(r)}`} onClick={() => change(rules.filter(item => item.id !== r.id))}><X /></button>
        </div>
        {r.kind === "absolute" && <div className="formSplit">
          <label>Date<input required type="date" value={r.date} onChange={e => change(rules.map(item => item.id === r.id ? { ...r, date: e.target.value } : item))} /></label>
          <label>Time<input required type="time" value={r.time} onChange={e => change(rules.map(item => item.id === r.id ? { ...r, time: e.target.value } : item))} /></label>
        </div>}
      </div>)}
      {draft.startDate && <button type="button" className="reminderLink" aria-expanded={custom} onClick={() => setCustom(!custom)}>Custom…</button>}
      {draft.startDate && custom && <div className="eventReminderRow"><label>Minutes before<input type="number" min="0" max="525600" inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} /></label>
        <button type="button" className="secondaryButton" disabled={!validMinutes} onClick={() => { addRelative(Number(minutes)); setMinutes(""); setCustom(false); }}>Add interval</button></div>}
      {(!draft.startDate || custom) && <button type="button" className="reminderLink" onClick={addAbsolute}>+ Specific date &amp; time</button>}
      {rules.length > 0 && <><div className="shortcutActions"><button className="secondaryButton" type="button" disabled={!ready} onClick={() => {
        setStatus("已打开快捷指令"); window.location.href = shortcutRunUrl(buildShortcutPayload(draft, rules));
      }}>Add to iPhone Reminders{rules.length > 1 && ` (${rules.length})`}</button></div>
      <p className="shortcutWarning">Saving does not send reminders. Adding again may create duplicates; update previously sent reminders in Apple Reminders.</p></>}
      {status && <p className="shortcutStatus" role="status">{status}</p>}
      <a className="shortcutSetupLink" href="iphone-reminders-shortcut.html" target="_blank" rel="noreferrer">Set up “Monthlane 添加提醒” Shortcut</a>
    </div>
  </details>;
}
