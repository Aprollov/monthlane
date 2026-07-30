"use client";

import { useEffect, useRef, useState } from "react";
import { InboxIcon, X } from "../icons";
import type { CreateTaskInput } from "../types";
import { captureInputFromText, findUrl } from "./urlDetection";
import { useDialogFocus } from "../useDialogFocus";

type Props = {
  open: boolean;
  defaults: Omit<CreateTaskInput, "title">;
  onClose: () => void;
  onCreate: (input: CreateTaskInput) => Promise<void>;
};

export function QuickCapture({ open, defaults, onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLFormElement>(open, onClose, inputRef);
  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);
  if (!open) return null;

  return (
    <div className="captureScrim" role="presentation">
      <form ref={dialogRef} className="quickCapture" role="dialog" aria-modal="true" aria-labelledby="capture-title" onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        try {
          await onCreate(captureInputFromText(title, defaults));
          setTitle("");
          onClose();
        } finally {
          setBusy(false);
        }
      }}>
        <div className={`captureIcon ${findUrl(title) ? "linkDetected" : ""}`}><InboxIcon /></div>
        <div className="captureInput">
          <label id="capture-title" htmlFor="quick-capture">Quick capture</label>
          <input ref={inputRef} id="quick-capture" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What’s on your mind?" />
          {findUrl(title) && <small>Link detected · save to Later Read</small>}
        </div>
        <button className="primaryButton" disabled={busy || !title.trim()} type="submit">Add</button>
        <button className="iconButton" type="button" onClick={onClose} aria-label="Close quick capture"><X /></button>
      </form>
    </div>
  );
}
