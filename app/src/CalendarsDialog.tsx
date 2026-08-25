"use client";

import { useState } from "react";
import { saveCategory } from "./database";
import { getDeviceId } from "./device";
import { X } from "./icons";
import { categoryItemCount } from "./categoryStats";
import { FALLBACK_CATEGORY_ID, type CalendarEvent, type Category, type FlowTask } from "./types";

type Props = {
  open: boolean;
  categories: Category[];
  events: CalendarEvent[];
  tasks: FlowTask[];
  onClose: () => void;
  onChanged: () => Promise<void>;
};

const palette = ["#6F8191", "#758B75", "#8A7894", "#A4835F", "#A16F72", "#5F8575", "#858585", "#7A6A54"];

export { categoryItemCount } from "./categoryStats";

export function CalendarsDialog({ open, categories, events, tasks, onClose, onChanged }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(palette[0]);
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const visible = categories.filter((category) => category.id !== FALLBACK_CATEGORY_ID);

  const addCalendar = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const timestamp = new Date().toISOString();
      await saveCategory({
        id: crypto.randomUUID(),
        name: trimmed,
        color,
        isDefault: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        deviceId: getDeviceId(),
      });
      setName("");
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scopeScrim" role="presentation" onClick={onClose}>
      <section className="scopeDialog calendarsDialog" role="dialog" aria-modal="true" aria-labelledby="calendars-title" onClick={(event) => event.stopPropagation()}>
        <header className="scopeHeader">
          <div><p className="eyebrow">Life areas</p><h2 id="calendars-title">Manage calendars</h2></div>
          <button className="iconButton" onClick={onClose} aria-label="Close calendar manager"><X /></button>
        </header>
        <div className="calendarsManageList">
          {visible.map((category) => (
            <div className="calendarsManageRow" key={category.id}>
              <span className="categoryDot" style={{ background: category.color }} />
              <span className="calendarsManageName">{category.name}</span>
              <small>{categoryItemCount(category.id, events, tasks)}</small>
            </div>
          ))}
        </div>
        <form className="calendarsAddForm" onSubmit={(event) => { event.preventDefault(); void addCalendar(); }}>
          <label>New calendar<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Health" /></label>
          <div className="calendarsColorRow" role="radiogroup" aria-label="Calendar color">
            {palette.map((swatch) => (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={color === swatch}
                aria-label={`Color ${swatch}`}
                className={`calendarsSwatch ${color === swatch ? "selected" : ""}`}
                style={{ background: swatch }}
                onClick={() => setColor(swatch)}
              />
            ))}
          </div>
          <button className="primaryButton" disabled={busy || !name.trim()} type="submit">Add calendar</button>
        </form>
      </section>
    </div>
  );
}
