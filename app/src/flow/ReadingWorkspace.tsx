"use client";

import { useState } from "react";
import { BookOpen, Plus } from "../icons";
import type { CreateReadingItemInput, ReadingItem } from "../types";
import { captureReadingFromText } from "./urlDetection";
import { LaterReadList } from "./LaterReadList";

type Props = {
  items: ReadingItem[];
  today: string;
  onCreate: (input: CreateReadingItemInput) => Promise<void>;
  onOpen: (item: ReadingItem) => void;
  onMarkRead: (item: ReadingItem) => void;
  onDelete: (item: ReadingItem) => void;
  onRestore: (item: ReadingItem) => void;
};

export function ReadingWorkspace({
  items,
  today,
  onCreate,
  onOpen,
  onMarkRead,
  onDelete,
  onRestore,
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const unread = [...items]
    .filter((item) => item.readStatus !== "completed")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const archived = [...items]
    .filter((item) => item.readStatus === "completed")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <section className="flowWorkspace readingWorkspace">
      <header className="flowHeader readingHeader">
        <div>
          <p className="eyebrow">A quiet reading queue</p>
          <h1>Read Later</h1>
          <p>保存值得稍后阅读的内容。阅读完成后，将它安静地归档。</p>
        </div>
        <BookOpen aria-hidden="true" />
      </header>
      <form className="readingCapture" onSubmit={async (event) => {
        event.preventDefault();
        const input = captureReadingFromText(value);
        if (!input) {
          setError("Please paste a valid http or https link.");
          return;
        }
        setBusy(true);
        setError("");
        try {
          await onCreate(input);
          setValue("");
        } finally {
          setBusy(false);
        }
      }}>
        <label htmlFor="reading-capture">Save a link</label>
        <div>
          <input
            id="reading-capture"
            type="url"
            inputMode="url"
            value={value}
            onChange={(event) => { setValue(event.target.value); setError(""); }}
            placeholder="Paste an article or social link…"
          />
          <button className="primaryButton" type="submit" disabled={busy || !value.trim()}>
            <Plus /> Save
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
      </form>
      <LaterReadList
        items={unread}
        archivedItems={archived}
        today={today}
        onOpen={onOpen}
        onMarkRead={onMarkRead}
        onDelete={onDelete}
        onRestore={onRestore}
      />
    </section>
  );
}
