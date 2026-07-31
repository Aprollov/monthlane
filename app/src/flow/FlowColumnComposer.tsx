"use client";

import { useState } from "react";
import { Plus } from "../icons";
import type { CreateTaskInput, FlowBucket } from "../types";
import { captureInputFromText } from "./urlDetection";

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
  const [busy, setBusy] = useState(false);

  return (
    <form className="flowComposer" onSubmit={async (event) => {
      event.preventDefault();
      if (!value.trim()) return;
      setBusy(true);
      try {
        const parsed = captureInputFromText(value, { bucket });
        await onCreate({ ...parsed, bucket, kind: "task" });
        setValue("");
      } finally {
        setBusy(false);
      }
    }}>
      <div className="flowComposerInput">
        <input
          aria-label={`Add task to ${bucket}`}
          value={value}
          placeholder={placeholders[bucket]}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="submit" disabled={busy || !value.trim()} aria-label={`Add to ${bucket}`} title="Add"><Plus /></button>
      </div>
    </form>
  );
}
