"use client";

import { X } from "./icons";

export type RecurrenceScope = "single" | "following" | "series";

type Props = {
  open: boolean;
  action: "edit" | "delete";
  onChoose: (scope: RecurrenceScope) => void;
  onClose: () => void;
};

export function ScopeDialog({ open, action, onChoose, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="scopeScrim" role="presentation">
      <section className="scopeDialog" role="dialog" aria-modal="true" aria-labelledby="scope-title">
        <header className="scopeHeader">
          <div>
            <p className="eyebrow">Repeating event</p>
            <h2 id="scope-title">{action === "edit" ? "Save changes to…" : "Delete…"}</h2>
          </div>
          <button className="iconButton" onClick={onClose} aria-label="Close"><X /></button>
        </header>
        <div className="scopeChoices">
          <button onClick={() => onChoose("single")}><strong>Only this event</strong><span>Keep the rest of the series unchanged.</span></button>
          <button onClick={() => onChoose("following")}><strong>This and following events</strong><span>Start a new series from this date.</span></button>
          <button onClick={() => onChoose("series")}><strong>The entire series</strong><span>Apply this to every occurrence.</span></button>
        </div>
      </section>
    </div>
  );
}
