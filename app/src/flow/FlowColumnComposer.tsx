"use client";

import { useState } from "react";
import { Plus } from "../icons";
import type { CreateTaskInput, FlowBucket } from "../types";
import { captureInputFromText, findUrl } from "./urlDetection";

type Props = {
  bucket: FlowBucket;
  onCreate: (input: CreateTaskInput) => Promise<void>;
};

const placeholders: Record<FlowBucket, string> = {
  inbox: "写下任务，或粘贴一个链接……",
  thisWeek: "添加本周准备推进的任务……",
  today: "添加今天准备完成的任务……",
};

export function FlowColumnComposer({ bucket, onCreate }: Props) {
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
        const parsed = captureInputFromText(value, { bucket });
        await onCreate(bucket === "inbox" && readLater
          ? { ...parsed, bucket: "inbox", kind: "readLater" }
          : { ...parsed, bucket, kind: bucket === "inbox" && readLater ? "readLater" : "task" });
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
        <button type="submit" disabled={busy || !value.trim()} aria-label={`Add to ${bucket}`} title="Add task"><Plus /></button>
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
