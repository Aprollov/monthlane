"use client";

import { useState } from "react";
import { Plus } from "../icons";
import type { CreateReadingItemInput, CreateTaskInput, FlowBucket } from "../types";
import { captureInputFromText, captureReadingFromText, findUrl } from "./urlDetection";

type Props = {
  bucket: FlowBucket;
  onCreate: (input: CreateTaskInput) => Promise<void>;
  onCreateReading: (input: CreateReadingItemInput) => Promise<void>;
};

const placeholders: Record<FlowBucket, string> = {
  inbox: "写下任务，或粘贴一个链接……",
  thisWeek: "添加本周准备推进的任务……",
  today: "添加今天准备完成的任务……",
};

export function FlowColumnComposer({ bucket, onCreate, onCreateReading }: Props) {
  const [value, setValue] = useState("");
  const [readLater, setReadLater] = useState(false);
  const [readLaterTouched, setReadLaterTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasUrl = Boolean(findUrl(value));

  return (
    <form className="flowComposer" onSubmit={async (event) => {
      event.preventDefault();
      if (!value.trim()) return;
      setBusy(true);
      try {
        if (bucket === "inbox" && readLater) {
          const reading = captureReadingFromText(value);
          if (!reading) return;
          await onCreateReading(reading);
        } else {
          const parsed = captureInputFromText(value, { bucket });
          await onCreate({ ...parsed, bucket, kind: "task" });
        }
        setValue("");
        setReadLater(false);
        setReadLaterTouched(false);
      } finally {
        setBusy(false);
      }
    }}>
      <div className="flowComposerInput">
        <input
          aria-label={`Add task to ${bucket}`}
          value={value}
          placeholder={placeholders[bucket]}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            if (bucket === "inbox" && !readLaterTouched) setReadLater(Boolean(findUrl(next)));
          }}
        />
        <button type="submit" disabled={busy || !value.trim() || (readLater && !hasUrl)} aria-label={`Add to ${bucket}`} title="Add"><Plus /></button>
      </div>
      {bucket === "inbox" && (
        <label className="readLaterToggle">
          <input type="checkbox" checked={readLater} onChange={(event) => { setReadLater(event.target.checked); setReadLaterTouched(true); }} />
          <span>稍后读</span>
          {hasUrl && <small>检测到链接</small>}
        </label>
      )}
    </form>
  );
}
