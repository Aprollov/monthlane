"use client";

import { useState } from "react";
import { MoreHorizontal } from "../icons";
import type { ReadingItem } from "../types";

type Props = {
  items: ReadingItem[];
  archivedItems: ReadingItem[];
  today: string;
  onOpen: (item: ReadingItem) => void;
  onMarkRead: (item: ReadingItem) => void;
  onDelete: (item: ReadingItem) => void;
  onRestore: (item: ReadingItem) => void;
};

const addedLabel = (item: ReadingItem, today: string) =>
  item.createdAt.slice(0, 10) === today ? "Added today" : `Added ${item.createdAt.slice(0, 10)}`;

function ReadingCard({
  item,
  today,
  onOpen,
  onMarkRead,
  onDelete,
}: Omit<Props, "items" | "archivedItems" | "onRestore"> & { item: ReadingItem }) {
  return (
    <article className="laterReadCard">
      <button
        className="laterReadCardContent"
        type="button"
        onClick={() => onOpen(item)}
        aria-label={`Open ${item.title}`}
      >
        <span className="laterReadPlatform">
          <span aria-hidden="true">{item.platformIcon}</span>
          <strong>{item.platform}</strong>
        </span>
        <span className="laterReadCardTitle">{item.title}</span>
        <span className="laterReadCardMeta">
          <span className="laterReadSource"><small>Source</small>{item.url}</span>
          <span><small>Added</small>{addedLabel(item, today).replace("Added ", "")}</span>
          <span><small>Status</small>{item.readStatus === "reading" ? "Reading" : "Unread"}</span>
        </span>
      </button>
      <details className="laterReadMenu">
        <summary aria-label={`More actions for ${item.title}`}><MoreHorizontal /></summary>
        <div>
          <button type="button" onClick={() => onMarkRead(item)}>Mark as read</button>
          <button className="danger" type="button" onClick={() => onDelete(item)}>Delete</button>
        </div>
      </details>
    </article>
  );
}

export function LaterReadList({
  items,
  archivedItems,
  today,
  onOpen,
  onMarkRead,
  onDelete,
  onRestore,
}: Props) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  return (
    <section className="laterReadSection" aria-labelledby="later-reading-title">
      <header className="laterReadSectionHeader">
        <div>
          <p>Capture → Read → Archive</p>
          <h3 id="later-reading-title">Later Reading</h3>
        </div>
        <span>{items.length}</span>
      </header>
      {items.length ? (
        <div className="laterReadGrid">
          {items.map((item) => (
            <ReadingCard
              key={item.id}
              item={item}
              today={today}
              onOpen={onOpen}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : <p className="laterReadEmpty">粘贴想稍后阅读的链接，它会安静地留在这里。</p>}
      {archivedItems.length > 0 && (
        <section className="laterReadArchive">
          <button type="button" aria-expanded={archiveOpen} onClick={() => setArchiveOpen((current) => !current)}>
            <span>Archive</span><small>{archivedItems.length}</small>
          </button>
          {archiveOpen && (
            <div className="laterReadArchiveList">
              {archivedItems.map((item) => (
                <article key={item.id}>
                  <span aria-hidden="true">{item.platformIcon}</span>
                  <button type="button" onClick={() => onOpen(item)}>
                    <strong>{item.title}</strong><small>{item.platform} · Read</small>
                  </button>
                  <button type="button" onClick={() => onRestore(item)}>Unread</button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
