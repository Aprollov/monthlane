"use client";

import { useEffect, useRef, useState } from "react";
import { getDeviceId } from "../device";
import { X } from "../icons";
import type { LearningTrack } from "../types";
import { useDialogFocus } from "../useDialogFocus";

type Props = {
  open: boolean;
  track?: LearningTrack;
  onClose: () => void;
  onSave: (track: LearningTrack) => Promise<void>;
};

export function GrowthItemFormDialog({ open, track, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🌱");
  const [busy, setBusy] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLFormElement>(open, onClose, nameInput);

  useEffect(() => {
    if (!open) return;
    setName(track?.title ?? "");
    setIcon(track?.icon || "🌱");
  }, [open, track]);

  if (!open) return null;

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const timestamp = new Date().toISOString();
      await onSave({
        id: track?.id ?? crypto.randomUUID(),
        title: trimmed,
        icon: icon.trim() || "🌱",
        currentStage: track?.currentStage ?? "",
        goal: track?.goal ?? "",
        nextStep: track?.nextStep ?? "",
        weeklyTarget: track?.weeklyTarget ?? 0,
        progressMetric: track?.progressMetric ?? "sessions",
        milestones: track?.milestones ?? [],
        archived: track?.archived ?? false,
        createdAt: track?.createdAt ?? timestamp,
        updatedAt: timestamp,
        deviceId: track?.deviceId ?? getDeviceId(),
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scopeScrim" role="presentation" onClick={onClose}>
      <form
        ref={dialogRef}
        className="scopeDialog learningTrackForm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="growth-item-form-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => { event.preventDefault(); void submit(); }}
      >
        <header className="scopeHeader">
          <div>
            <p className="eyebrow">{track ? "Edit item" : "Something to grow"}</p>
            <h2 id="growth-item-form-title">{track ? "Edit Growth Item" : "New Growth Item"}</h2>
          </div>
          <button type="button" className="iconButton" onClick={onClose} aria-label="Close Growth item form"><X /></button>
        </header>
        <label>Name<input ref={nameInput} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Piano" required /></label>
        <label>Icon or emoji<input value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="🎹" maxLength={8} /></label>
        <button className="primaryButton" type="submit" disabled={busy || !name.trim()}>{track ? "Save changes" : "Add item"}</button>
      </form>
    </div>
  );
}

// Kept as an internal compatibility alias while older Learning detail code remains on disk.
export const LearningTrackFormDialog = GrowthItemFormDialog;
