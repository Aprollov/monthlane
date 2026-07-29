"use client";

import { useEffect, useRef, useState } from "react";
import { InboxIcon, X } from "../icons";
import type { CreateTaskInput } from "../types";

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
  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);
  if (!open) return null;

  return (
    <div className="captureScrim" role="presentation">
      <form className="quickCapture" role="dialog" aria-modal="true" aria-labelledby="capture-title" onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        try {
          await onCreate({ ...defaults, title });
          setTitle("");
          onClose();
        } finally {
          setBusy(false);
        }
      }}>
        <div className="captureIcon"><InboxIcon /></div>
        <div className="captureInput">
          <label id="capture-title" htmlFor="quick-capture">Quick capture</label>
          <input ref={inputRef} id="quick-capture" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What’s on your mind?" />
        </div>
        <button className="primaryButton" disabled={busy || !title.trim()} type="submit">Add</button>
        <button className="iconButton" type="button" onClick={onClose} aria-label="Close quick capture"><X /></button>
      </form>
    </div>
  );
}
