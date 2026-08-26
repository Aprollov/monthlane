"use client";

import { useEffect, useRef, useState } from "react";
import { getDeviceId } from "../device";
import { X } from "../icons";
import type { GrowthMoment, LearningTrack } from "../types";
import { useDialogFocus } from "../useDialogFocus";
import { dateRange } from "./growthStats";

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
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const startRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLFormElement>(open, onClose, startRef);
  useEffect(() => { if (open) { setStart(today); setEnd(""); } }, [open, today]);
  if (!open || !track) return null;
  const recentDates = [...dates].sort().reverse();
  return <div className="scopeScrim" role="presentation" onClick={onClose}>
    <form ref={dialogRef} className="scopeDialog growthDatesDialog" role="dialog" aria-modal="true" aria-labelledby="growth-dates-title" onClick={(event) => event.stopPropagation()} onSubmit={async (event) => {
      event.preventDefault();
      const next = dateRange(start, end || start).filter((date) => date <= today && !dates.includes(date));
      if (!next.length || busy) return;
      setBusy(true);
      try { await onAdd(next); setStart(today); setEnd(""); } finally { setBusy(false); }
    }}>
      <header className="scopeHeader"><div><p className="eyebrow">Check-in dates</p><h2 id="growth-dates-title">{track.icon} {track.title}</h2></div><button type="button" className="iconButton" onClick={onClose} aria-label="Close check-in dates"><X /></button></header>
      <div className="growthDateFields">
        <label>Start date<input ref={startRef} type="date" value={start} max={today} onChange={(event) => setStart(event.target.value)} required /></label>
        <label>End date <small>optional</small><input type="date" value={end} min={start} max={today} onChange={(event) => setEnd(event.target.value)} /></label>
      </div>
      <button className="secondaryButton growthAddDatesButton" disabled={busy || !start || Boolean(end && end < start)}>{busy ? "Adding…" : end ? "Add date range" : "Add date"}</button>
      {recentDates.length > 0 && <section className="growthDateHistory"><h3>Recorded dates</h3><ul>{recentDates.map((date) => <li key={date}><time>{date}</time><button type="button" onClick={() => void onRemove(date)}>Remove</button></li>)}</ul></section>}
    </form>
  </div>;
}

export function MomentFormDialog({ open, moment, onClose, onSave, onDelete }: {
  open: boolean;
  moment?: GrowthMoment;
  onClose: () => void;
  onSave: (moment: GrowthMoment) => Promise<void>;
  onDelete: (moment: GrowthMoment) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("❤️");
  const [date, setDate] = useState("");
  const [type, setType] = useState<"since" | "until">("since");
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLFormElement>(open, onClose, nameRef);
  useEffect(() => { if (open) { setName(moment?.name ?? ""); setIcon(moment?.icon ?? "❤️"); setDate(moment?.date ?? ""); setType(moment?.type ?? "since"); } }, [open, moment]);
  if (!open) return null;
  return <div className="scopeScrim" role="presentation" onClick={onClose}>
    <form ref={dialogRef} className="scopeDialog growthMomentForm" role="dialog" aria-modal="true" aria-labelledby="moment-form-title" onClick={(event) => event.stopPropagation()} onSubmit={async (event) => {
      event.preventDefault();
      if (!name.trim() || !date || busy) return;
      setBusy(true);
      const timestamp = new Date().toISOString();
      try { await onSave({ id: moment?.id ?? crypto.randomUUID(), name: name.trim(), icon: icon.trim() || "❤️", date, type, createdAt: moment?.createdAt ?? timestamp, updatedAt: timestamp, deviceId: moment?.deviceId ?? getDeviceId() }); onClose(); } finally { setBusy(false); }
    }}>
      <header className="scopeHeader"><div><p className="eyebrow">A date that matters</p><h2 id="moment-form-title">{moment ? "Edit Moment" : "Add Moment"}</h2></div><button type="button" className="iconButton" onClick={onClose} aria-label="Close Moment form"><X /></button></header>
      <label>Name<input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Japan Trip" required /></label>
      <label>Emoji or icon<input value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={8} /></label>
      <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
      <label>Type<select value={type} onChange={(event) => setType(event.target.value as "since" | "until")}><option value="since">Since</option><option value="until">Until</option></select></label>
      <div className="growthMomentFormActions">{moment && <button type="button" className="dangerOutlineButton" onClick={() => { if (window.confirm("Delete this Moment?")) void onDelete(moment).then(onClose); }}>Delete</button>}<button className="primaryButton" disabled={busy || !name.trim() || !date}>{busy ? "Saving…" : "Save Moment"}</button></div>
    </form>
  </div>;
}
