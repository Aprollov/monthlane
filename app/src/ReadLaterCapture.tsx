"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, X } from "./icons";
import type { CreateReadingItemInput } from "./types";
import type { ClipboardLink } from "./flow/urlDetection";
import { captureReadingFromText, fetchOgTitle, findUrl } from "./flow/urlDetection";
import { useDialogFocus } from "./useDialogFocus";

type Props = {
  open: boolean;
  link?: ClipboardLink;
  onClose: () => void;
  onSave: (input: CreateReadingItemInput) => Promise<void>;
};

export function ReadLaterCapture({ open, link, onClose, onSave }: Props) {
  const [title, setTitle] = useState(link?.title ?? "");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLFormElement>(open, onClose, inputRef);

  useEffect(() => {
    if (!open) return;
    setTitle(link?.title ?? "");
    setManual("");
  }, [open, link]);

  useEffect(() => {
    if (!open || !link || link.title) return;
    let cancelled = false;
    void fetchOgTitle(link.url).then((ogTitle) => {
      if (!cancelled && ogTitle) setTitle(ogTitle);
    });
    return () => { cancelled = true; };
  }, [open, link]);

  useEffect(() => {
    if (open && !link) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, link]);

  if (!open) return null;

  const save = async (input: CreateReadingItemInput) => {
    setBusy(true);
    try {
      await onSave(input);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  if (link) {
    return (
      <div className="captureScrim" role="presentation">
        <form ref={dialogRef} className="quickCapture readLaterCapture" role="dialog" aria-modal="true" aria-labelledby="read-later-title" onSubmit={(event) => {
          event.preventDefault();
          void save({ url: link.url, title: title.trim() || link.platform, platform: link.platform, platformIcon: link.platformIcon, deepLink: link.deepLink, readStatus: "unread" });
        }}>
          <div className="captureIcon linkDetected"><BookOpen /></div>
          <div className="captureInput">
            <label id="read-later-title" htmlFor="read-later-input">Link detected from clipboard · {link.platform}</label>
            <input id="read-later-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a title…" />
            <small className="readLaterUrl">{link.url}</small>
          </div>
          <button className="primaryButton" disabled={busy} type="submit">Save to Read Later</button>
          <button className="iconButton" type="button" onClick={onClose} aria-label="Close read later capture"><X /></button>
        </form>
      </div>
    );
  }

  const detected = manual ? captureReadingFromText(manual) : undefined;

  return (
    <div className="captureScrim" role="presentation">
      <form ref={dialogRef} className="quickCapture readLaterCapture" role="dialog" aria-modal="true" aria-labelledby="read-later-title" onSubmit={(event) => {
        event.preventDefault();
        if (detected) void save(detected);
      }}>
        <div className={`captureIcon ${findUrl(manual) ? "linkDetected" : ""}`}><BookOpen /></div>
        <div className="captureInput">
          <label id="read-later-title" htmlFor="read-later-input">Save to Read Later</label>
          <input ref={inputRef} id="read-later-input" value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Paste a link or shared text…" />
          {manual.trim() && !detected && <small>No link detected yet</small>}
          {detected && <small>Link detected · {detected.platform}</small>}
        </div>
        <button className="primaryButton" disabled={busy || !detected} type="submit">Save to Read Later</button>
        <button className="iconButton" type="button" onClick={onClose} aria-label="Close read later capture"><X /></button>
      </form>
    </div>
  );
}
