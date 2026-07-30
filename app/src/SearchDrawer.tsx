"use client";

import { useMemo, useRef, useState } from "react";
import { fromDateKey, longDateLabel } from "./dates";
import { X } from "./icons";
import { recurrenceLabel } from "./recurrence";
import { searchEvents, searchTasks } from "./search";
import type { CalendarEvent, Category, FlowTask } from "./types";
import { useDialogFocus } from "./useDialogFocus";

type Props = {
  open: boolean;
  events: CalendarEvent[];
  tasks: FlowTask[];
  categories: Category[];
  onClose: () => void;
  onSelect: (event: CalendarEvent) => void;
  onSelectTask: (task: FlowTask) => void;
};

export function SearchDrawer({ open, events, tasks, categories, onClose, onSelect, onSelectTask }: Props) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const searchInput = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLElement>(open, onClose, searchInput);
  const results = useMemo(() => [
    ...searchEvents(events, categories, query, categoryId).map((event) => ({ type: "event" as const, event, updatedAt: event.updatedAt })),
    ...searchTasks(tasks, categories, query, categoryId).map((task) => ({ type: "task" as const, task, updatedAt: task.updatedAt })),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 100), [categoryId, categories, events, query, tasks]);
  if (!open) return null;

  const categoryById = (id: string) => categories.find((category) => category.id === id);

  return (
    <>
      <button className="drawerScrim" onClick={onClose} aria-label="Close search" />
      <aside ref={dialogRef} className="eventDrawer searchDrawer" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <header className="drawerHeader">
          <div><p className="eyebrow">Find anything</p><h2 id="search-title">Search</h2></div>
          <button className="iconButton" onClick={onClose} aria-label="Close search"><X /></button>
        </header>
        <div className="searchControls">
          <label>
            Search
            <input
              ref={searchInput}
              type="search"
              placeholder="Events, tasks, links, notes…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            Calendar
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="all">All calendars</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
        </div>
        <div className="searchSummary" aria-live="polite">
          <span>{results.length}{results.length === 100 ? "+" : ""} {results.length === 1 ? "result" : "results"}</span>
          {query && <button type="button" onClick={() => setQuery("")}>Clear</button>}
        </div>
        <div className="searchResults">
          {results.map((result) => {
            if (result.type === "event") {
              const event = result.event;
              const category = categoryById(event.categoryId);
              return <button className="searchResult" key={`event:${event.id}`} onClick={() => onSelect(event)}>
                <span className="searchResultDot" style={{ background: category?.color }} />
                <span className="searchResultMain">
                  <span className="searchType">Event</span>
                  <strong>{event.title}</strong>
                  <small>{longDateLabel(fromDateKey(event.startDate))}{event.allDay ? " · All day" : ` · ${event.startTime}`}</small>
                  {event.notes && <span>{event.notes}</span>}
                </span>
                <span className="searchResultMeta">
                  <small>{category?.name}</small>
                  {event.recurrence && <small>{recurrenceLabel(event.recurrence)}</small>}
                </span>
              </button>;
            }
            const task = result.task;
            const category = task.categoryId ? categoryById(task.categoryId) : undefined;
            return <button className="searchResult" key={`task:${task.id}`} onClick={() => onSelectTask(task)}>
              <span className="searchResultDot" style={{ background: category?.color ?? "var(--accent)" }} />
              <span className="searchResultMain">
                <span className="searchType">{task.kind === "readLater" ? "Read later" : "Task"}</span>
                <strong>{task.title}</strong>
                <small>{task.scheduledDate ?? (task.bucket === "laterRead" ? task.siteName ?? "Later Read" : task.bucket)}</small>
                {(task.notes || task.url) && <span>{task.notes || task.url}</span>}
              </span>
              <span className="searchResultMeta"><small>{category?.name}</small><small>{task.status}</small></span>
            </button>;
          })}
          {!results.length && (
            <div className="emptySearch">
              <strong>No results found</strong>
              <span>Try a different word or calendar.</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
