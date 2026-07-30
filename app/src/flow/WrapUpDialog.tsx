"use client";

import { useEffect, useState } from "react";
import { Archive, Check, X } from "../icons";
import { fromDateKey, longDateLabel } from "../dates";
import type { FlowTask } from "../types";
import type { WrapUpAction, WrapUpPlanItem } from "./wrapUp";
import { useDialogFocus } from "../useDialogFocus";

type Props = {
  open: boolean;
  date: string;
  completed: FlowTask[];
  unfinished: FlowTask[];
  onClose: () => void;
  onApply: (plan: WrapUpPlanItem[]) => Promise<void>;
};

export function WrapUpDialog({ open, date, completed, unfinished, onClose, onApply }: Props) {
  const [actions, setActions] = useState<Record<string, WrapUpAction>>({});
  const [busy, setBusy] = useState(false);
  const dialogRef = useDialogFocus<HTMLElement>(open, onClose);

  useEffect(() => {
    if (open) setActions(Object.fromEntries(unfinished.map((task) => [task.id, "keep"])));
  }, [open, unfinished]);

  if (!open) return null;
  const apply = async () => {
    setBusy(true);
    try {
      await onApply(unfinished.map((task) => ({ task, action: actions[task.id] ?? "keep" })));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrapUpScrim" role="presentation">
      <section ref={dialogRef} className="wrapUpDialog" role="dialog" aria-modal="true" aria-labelledby="wrap-up-title">
        <header className="wrapUpHeader">
          <div><p className="eyebrow">Close the day gently</p><h2 id="wrap-up-title">Wrap up {longDateLabel(fromDateKey(date))}</h2></div>
          <button className="iconButton" onClick={onClose} aria-label="Close Wrap Up"><X /></button>
        </header>

        <section className="wrapUpSection">
          <div className="wrapUpSectionTitle"><h3>Completed</h3><small>{completed.length}</small></div>
          {completed.length ? completed.map((task) => (
            <div className="wrapUpCompleted" key={task.id}><span><Check /></span><strong>{task.title}</strong></div>
          )) : <p className="wrapUpEmpty">No completed tasks yet.</p>}
        </section>

        <section className="wrapUpSection">
          <div className="wrapUpSectionTitle"><h3>Unfinished</h3><small>{unfinished.length}</small></div>
          {unfinished.length ? unfinished.map((task) => (
            <label className="wrapUpTask" key={task.id}>
              <span className="wrapUpOpenBox" />
              <strong>{task.title}</strong>
              <select
                aria-label={`Plan ${task.title}`}
                value={actions[task.id] ?? "keep"}
                onChange={(event) => setActions((current) => ({ ...current, [task.id]: event.target.value as WrapUpAction }))}
              >
                <option value="tomorrow">Move to tomorrow</option>
                <option value="thisWeek">Move to This Week</option>
                <option value="inbox">Return to Inbox</option>
                <option value="keep">Keep original date</option>
                <option value="archive">Archive</option>
              </select>
            </label>
          )) : <p className="wrapUpEmpty">Everything planned for today is complete.</p>}
        </section>

        <footer className="wrapUpActions">
          <span><Archive /> Changes preserve task history.</span>
          <div>
            <button className="secondaryButton" onClick={onClose}>Cancel</button>
            <button className="primaryButton" disabled={busy} onClick={() => void apply()}>{busy ? "Finishing…" : "Finish Wrap Up"}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
