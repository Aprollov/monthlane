"use client";

import { useEffect, useRef, useState } from "react";
import { getDeviceId } from "../device";
import { X } from "../icons";
import { FALLBACK_CATEGORY_ID, type Category, type GrowthMoment, type LearningTrack } from "../types";
import { useDialogFocus } from "../useDialogFocus";
import { trailingDateRange } from "./growthStats";

export function CheckinDatesDialog({
  open, track, dates, today, onClose, onAdd, onRemove,
}: {
  open: boolean;
  track?: LearningTrack;
  dates: string[];
  today: string;
  onClose: () => void;
  onAdd: (dates: string[]) => Promise<void>;
  onRemove: (date: string) => Promise<void>;
}) {
  const [date, setDate] = useState(today);
  const [importOpen, setImportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [streakDays, setStreakDays] = useState("86");
  const [streakEnd, setStreakEnd] = useState(today);
  const [busy, setBusy] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLFormElement>(open, onClose, dateRef);
  useEffect(() => { if (open) { setDate(today); setImportOpen(false); setHistoryOpen(false); setStreakDays("86"); setStreakEnd(today); } }, [open, today]);
  if (!open || !track) return null;
  const recentDates = [...dates].sort().reverse();
  return <div className="scopeScrim" role="presentation" onClick={onClose}>
    <form ref={dialogRef} className="scopeDialog growthDatesDialog" role="dialog" aria-modal="true" aria-labelledby="growth-dates-title" onClick={(event) => event.stopPropagation()} onSubmit={async (event) => {
      event.preventDefault();
      const next = date && date <= today && !dates.includes(date) ? [date] : [];
      if (!next.length || busy) return;
      setBusy(true);
      try { await onAdd(next); setDate(today); } finally { setBusy(false); }
    }}>
      <header className="scopeHeader"><div><p className="eyebrow">Check-in dates</p><h2 id="growth-dates-title">{track.icon} {track.title}</h2></div><button type="button" className="iconButton" onClick={onClose} aria-label="Close check-in dates"><X /></button></header>
      <div className="growthDateFields growthSingleDate">
        <label>Date<input ref={dateRef} type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} required /></label>
      </div>
      <button className="secondaryButton growthAddDatesButton" disabled={busy || !date || dates.includes(date)}>{busy ? "Adding…" : "Add date"}</button>
      <button type="button" className="growthDisclosure" aria-expanded={importOpen} onClick={() => setImportOpen((value) => !value)}>Import existing streak <span aria-hidden="true">{importOpen ? "−" : "+"}</span></button>
      {importOpen && <section className="growthStreakImport" aria-label="Import existing streak">
        <div className="growthDateFields">
          <label>Days<input type="number" inputMode="numeric" min="1" max="10000" value={streakDays} onChange={(event) => setStreakDays(event.target.value)} /></label>
          <label>Ending date <small>Today by default</small><input type="date" value={streakEnd} max={today} onChange={(event) => setStreakEnd(event.target.value)} /></label>
        </div>
        <button type="button" className="secondaryButton" disabled={busy || Number(streakDays) < 1 || !streakEnd} onClick={async () => {
          const next = trailingDateRange(Number(streakDays), streakEnd).filter((date) => date <= today && !dates.includes(date));
          if (!next.length || busy) return;
          setBusy(true);
          try { await onAdd(next); setImportOpen(false); } finally { setBusy(false); }
        }}>Import</button>
      </section>}
      {recentDates.length > 0 && <section className="growthDateHistory">
        <button type="button" className="growthHistoryToggle" aria-expanded={historyOpen} onClick={() => setHistoryOpen((value) => !value)}><span>{recentDates.length} {recentDates.length === 1 ? "check-in" : "check-ins"} recorded</span><span>{historyOpen ? "Hide history" : "View history ›"}</span></button>
        {historyOpen && <ul>{recentDates.map((date) => <li key={date}><time>{date}</time><button type="button" onClick={() => void onRemove(date)}>Remove</button></li>)}</ul>}
      </section>}
    </form>
  </div>;
}

export function MomentFormDialog({ open, moment, categories, onClose, onSave, onDelete }: {
  open: boolean;
  moment?: GrowthMoment;
  categories: Category[];
  onClose: () => void;
  onSave: (moment: GrowthMoment) => Promise<void>;
  onDelete: (moment: GrowthMoment) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("❤️");
  const [date, setDate] = useState("");
  const [type, setType] = useState<"since" | "until">("since");
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLFormElement>(open, onClose, nameRef);
  const availableCalendars = categories.filter((category) => category.id !== FALLBACK_CATEGORY_ID);
  useEffect(() => { if (open) { setName(moment?.name ?? ""); setIcon(moment?.icon ?? "❤️"); setDate(moment?.date ?? ""); setType(moment?.type ?? "since"); setCalendarEnabled(moment?.calendarReminder?.enabled ?? false); setCalendarId(moment?.calendarReminder?.calendarId ?? availableCalendars.find((category) => category.id === "life")?.id ?? availableCalendars[0]?.id ?? ""); } }, [categories, open, moment]);
  if (!open) return null;
  return <div className="scopeScrim" role="presentation" onClick={onClose}>
    <form ref={dialogRef} className="scopeDialog growthMomentForm" role="dialog" aria-modal="true" aria-labelledby="moment-form-title" onClick={(event) => event.stopPropagation()} onSubmit={async (event) => {
      event.preventDefault();
      if (!name.trim() || !date || busy) return;
      setBusy(true);
      const timestamp = new Date().toISOString();
      try { await onSave({ id: moment?.id ?? crypto.randomUUID(), name: name.trim(), icon: icon.trim() || "❤️", date, type, displayUnit: moment?.displayUnit ?? "days", calendarReminder: calendarEnabled ? { enabled: true, calendarId } : { enabled: false }, createdAt: moment?.createdAt ?? timestamp, updatedAt: timestamp, deviceId: moment?.deviceId ?? getDeviceId() }); onClose(); } finally { setBusy(false); }
    }}>
      <header className="scopeHeader"><div><p className="eyebrow">A date that matters</p><h2 id="moment-form-title">{moment ? "Edit Moment" : "Add Moment"}</h2></div><button type="button" className="iconButton" onClick={onClose} aria-label="Close Moment form"><X /></button></header>
      <label>Name<input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Japan Trip" required /></label>
      <label>Emoji or icon<input value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={8} /></label>
      <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
      <label>Type<select value={type} onChange={(event) => setType(event.target.value as "since" | "until")}><option value="since">Since</option><option value="until">Until</option></select></label>
      <label className="momentCalendarToggle"><span>Add to Calendar</span><input type="checkbox" role="switch" checked={calendarEnabled} onChange={(event) => setCalendarEnabled(event.target.checked)} /></label>
      {calendarEnabled && <label>Calendar<select value={calendarId} onChange={(event) => setCalendarId(event.target.value)}>{availableCalendars.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
      <div className="growthMomentFormActions">{moment && <button type="button" className="dangerOutlineButton" onClick={() => { if (window.confirm("Delete this Moment?")) void onDelete(moment).then(onClose); }}>Delete</button>}<button className="primaryButton" disabled={busy || !name.trim() || !date}>{busy ? "Saving…" : "Save Moment"}</button></div>
    </form>
  </div>;
}
