"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal, X } from "./icons";
import { recurrenceLabel, recurrencePreset, recurrenceRuleForPreset, type RecurrencePreset } from "./recurrence";
import type { CalendarEvent, Category, EventDraft, RecurrenceFrequency, RecurrenceRule } from "./types";

type Props = {
  open: boolean;
  date: string;
  event?: CalendarEvent;
  categories: Category[];
  defaultCategoryId?: string;
  onClose: () => void;
  onSave: (draft: EventDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
  onConvert?: () => void;
};

export function EventDrawer({ open, date, event, categories, defaultCategoryId, onClose, onSave, onDelete, onConvert }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const titleId = useId();
  const titleInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<EventDraft>({
    title: "", startDate: date, allDay: true, startTime: "09:00", endTime: "10:00",
    notes: "", categoryId: "life", recurrence: undefined,
  });
  const [error, setError] = useState("");
  const [customRepeat, setCustomRepeat] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(event ? {
      title: event.title, startDate: event.startDate, allDay: event.allDay,
      startTime: event.startTime ?? "09:00", endTime: event.endTime ?? "10:00",
      notes: event.notes, categoryId: event.categoryId, recurrence: event.recurrence,
    } : {
      title: "", startDate: date, allDay: true, startTime: "09:00", endTime: "10:00",
      notes: "", categoryId: defaultCategoryId ?? "life", recurrence: undefined,
    });
    setError("");
    setCustomRepeat(Boolean(event?.recurrence && recurrencePreset(event.recurrence) === "custom"));
    window.setTimeout(() => titleInput.current?.focus(), 120);
  }, [date, defaultCategoryId, event, open]);

  useEffect(() => {
    if (!open) return;
    const close = (keyboardEvent: KeyboardEvent) => keyboardEvent.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose, open]);

  if (!open) return null;

  const repeatPreset = customRepeat ? "custom" : recurrencePreset(draft.recurrence);

  const setPreset = (preset: RecurrencePreset) => {
    setCustomRepeat(preset === "custom");
    setDraft({ ...draft, recurrence: recurrenceRuleForPreset(preset, draft.startDate, draft.recurrence) });
  };

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
          <div className="drawerHeaderActions">
            {event && onConvert && (
              <div className="detailMenu">
                <button className="iconButton" type="button" aria-label="More options" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
                  <MoreHorizontal />
                </button>
                {menuOpen && (
                  <div className="detailMenuPanel">
                    <button type="button" onClick={() => { setMenuOpen(false); onConvert(); }}>Convert to Task</button>
                  </div>
                )}
              </div>
            )}
            <button className="iconButton" type="button" onClick={onClose} aria-label="Close editor" title="Close">
              <X />
            </button>
          </div>
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
            Repeat
            <select value={repeatPreset} onChange={(e) => setPreset(e.target.value as RecurrencePreset)}>
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="workdays">Every weekday</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom…</option>
            </select>
          </label>
          {draft.recurrence && (
            <div className="recurrencePanel">
              <p>{recurrenceLabel(draft.recurrence)}</p>
              {repeatPreset === "custom" && (
                <>
                  <div className="formSplit">
                    <label>
                      Repeat every
                      <input type="number" min="1" max="99" value={draft.recurrence.interval} onChange={(e) => setDraft({
                        ...draft,
                        recurrence: { ...draft.recurrence!, interval: Math.max(1, Number(e.target.value)) },
                      })} />
                    </label>
                    <label>
                      Unit
                      <select value={draft.recurrence.frequency} onChange={(e) => setDraft({
                        ...draft,
                        recurrence: {
                          ...draft.recurrence!,
                          frequency: e.target.value as RecurrenceFrequency,
                          daysOfWeek: e.target.value === "weekly"
                            ? (draft.recurrence?.daysOfWeek?.length ? draft.recurrence.daysOfWeek : [((new Date(`${draft.startDate}T12:00:00`).getDay() + 6) % 7) + 1])
                            : undefined,
                        },
                      })}>
                        <option value="daily">Day</option>
                        <option value="weekly">Week</option>
                        <option value="monthly">Month</option>
                        <option value="yearly">Year</option>
                      </select>
                    </label>
                  </div>
                  {draft.recurrence.frequency === "weekly" && (
                    <fieldset className="weekdayPicker">
                      <legend>On these days</legend>
                      {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => {
                        const value = index + 1;
                        const checked = draft.recurrence?.daysOfWeek?.includes(value) ?? false;
                        return (
                          <label key={value}>
                            <input type="checkbox" checked={checked} onChange={() => {
                              const current = draft.recurrence?.daysOfWeek ?? [];
                              const next = checked ? current.filter((day) => day !== value) : [...current, value].sort();
                              if (next.length) setDraft({ ...draft, recurrence: { ...draft.recurrence!, daysOfWeek: next } });
                            }} />
                            <span>{label}</span>
                          </label>
                        );
                      })}
                    </fieldset>
                  )}
                </>
              )}
              <label>
                Ends
                <select value={draft.recurrence.endType} onChange={(e) => {
                  const endType = e.target.value as RecurrenceRule["endType"];
                  setDraft({
                    ...draft,
                    recurrence: {
                      ...draft.recurrence!,
                      endType,
                      endDate: endType === "date" ? (draft.recurrence?.endDate ?? draft.startDate) : undefined,
                      count: endType === "count" ? (draft.recurrence?.count ?? 10) : undefined,
                    },
                  });
                }}>
                  <option value="never">Never</option>
                  <option value="date">On a date</option>
                  <option value="count">After a number of events</option>
                </select>
              </label>
              {draft.recurrence.endType === "date" && (
                <label>
                  End date
                  <input type="date" min={draft.startDate} value={draft.recurrence.endDate ?? draft.startDate} onChange={(e) => setDraft({
                    ...draft, recurrence: { ...draft.recurrence!, endDate: e.target.value },
                  })} />
                </label>
              )}
              {draft.recurrence.endType === "count" && (
                <label>
                  Number of events
                  <input type="number" min="1" max="999" value={draft.recurrence.count ?? 10} onChange={(e) => setDraft({
                    ...draft, recurrence: { ...draft.recurrence!, count: Math.max(1, Number(e.target.value)) },
                  })} />
                </label>
              )}
            </div>
          )}
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
