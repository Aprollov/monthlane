"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "./icons";
import type { CalendarEvent, Category, EventDraft } from "./types";

type Props = {
  open: boolean;
  date: string;
  event?: CalendarEvent;
  categories: Category[];
  onClose: () => void;
  onSave: (draft: EventDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export function EventDrawer({ open, date, event, categories, onClose, onSave, onDelete }: Props) {
  const titleId = useId();
  const titleInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<EventDraft>({
    title: "", startDate: date, allDay: true, startTime: "09:00", endTime: "10:00",
    notes: "", categoryId: "personal",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(event ? {
      title: event.title, startDate: event.startDate, allDay: event.allDay,
      startTime: event.startTime ?? "09:00", endTime: event.endTime ?? "10:00",
      notes: event.notes, categoryId: event.categoryId,
    } : {
      title: "", startDate: date, allDay: true, startTime: "09:00", endTime: "10:00",
      notes: "", categoryId: "personal",
    });
    setError("");
    window.setTimeout(() => titleInput.current?.focus(), 120);
  }, [date, event, open]);

  useEffect(() => {
    if (!open) return;
    const close = (keyboardEvent: KeyboardEvent) => keyboardEvent.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose, open]);

  if (!open) return null;

  const submit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!draft.title.trim()) {
      setError("Give this event a title.");
      titleInput.current?.focus();
      return;
    }
    await onSave({ ...draft, title: draft.title.trim() });
  };

  return (
    <>
      <button className="drawerScrim" aria-label="Close editor" onClick={onClose} />
      <aside className="eventDrawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="drawerHeader">
          <div>
            <p className="eyebrow">{event ? "Event details" : "A new moment"}</p>
            <h2 id={titleId}>{event ? "Edit event" : "Create event"}</h2>
          </div>
          <button className="iconButton" type="button" onClick={onClose} aria-label="Close editor" title="Close">
            <X />
          </button>
        </header>
        <form className="eventForm" onSubmit={submit}>
          <label>
            Title <span aria-hidden="true">*</span>
            <input ref={titleInput} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-invalid={Boolean(error)} aria-describedby={error ? "event-title-error" : undefined} />
          </label>
          {error && <p className="fieldError" id="event-title-error">{error}</p>}
          <label>
            Date
            <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
          </label>
          <label className="checkRow">
            <input type="checkbox" checked={draft.allDay} onChange={(e) => setDraft({ ...draft, allDay: e.target.checked })} />
            <span>All-day event</span>
          </label>
          {!draft.allDay && (
            <div className="formSplit">
              <label>Starts<input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} /></label>
              <label>Ends<input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} /></label>
            </div>
          )}
          <label>
            Calendar
            <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
              {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label>
            Notes
            <textarea rows={5} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </label>
          <div className="drawerActions">
            {event && onDelete && <button className="dangerButton" type="button" onClick={onDelete}>Delete</button>}
            <button className="secondaryButton" type="button" onClick={onClose}>Cancel</button>
            <button className="primaryButton" type="submit">Save event</button>
          </div>
        </form>
      </aside>
    </>
  );
}
