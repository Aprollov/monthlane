"use client";

import { useMemo, useState } from "react";
import { fromDateKey, longDateLabel } from "./dates";
import { X } from "./icons";
import { recurrenceLabel } from "./recurrence";
import { searchEvents } from "./search";
import type { CalendarEvent, Category } from "./types";

type Props = {
  open: boolean;
  events: CalendarEvent[];
  categories: Category[];
  onClose: () => void;
  onSelect: (event: CalendarEvent) => void;
};

export function SearchDrawer({ open, events, categories, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const results = useMemo(
    () => searchEvents(events, categories, query, categoryId).slice(0, 100),
    [categoryId, categories, events, query],
  );
  if (!open) return null;

  const categoryById = (id: string) => categories.find((category) => category.id === id);

  return (
    <>
      <button className="drawerScrim" onClick={onClose} aria-label="Close search" />
      <aside className="eventDrawer searchDrawer" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <header className="drawerHeader">
          <div><p className="eyebrow">Find a moment</p><h2 id="search-title">Search events</h2></div>
          <button className="iconButton" onClick={onClose} aria-label="Close search"><X /></button>
        </header>
        <div className="searchControls">
          <label>
            Search
            <input
              autoFocus
              type="search"
              placeholder="Title, notes, calendar…"
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
        <div className="searchSummary">
          <span>{results.length}{results.length === 100 ? "+" : ""} {results.length === 1 ? "event" : "events"}</span>
          {query && <button type="button" onClick={() => setQuery("")}>Clear</button>}
        </div>
        <div className="searchResults">
          {results.map((event) => {
            const category = categoryById(event.categoryId);
            return (
              <button className="searchResult" key={event.id} onClick={() => onSelect(event)}>
                <span className="searchResultDot" style={{ background: category?.color }} />
                <span className="searchResultMain">
                  <strong>{event.title}</strong>
                  <small>{longDateLabel(fromDateKey(event.startDate))}{event.allDay ? " · All day" : ` · ${event.startTime}`}</small>
                  {event.notes && <span>{event.notes}</span>}
                </span>
                <span className="searchResultMeta">
                  <small>{category?.name}</small>
                  {event.recurrence && <small>{recurrenceLabel(event.recurrence)}</small>}
                </span>
              </button>
            );
          })}
          {!results.length && (
            <div className="emptySearch">
              <strong>No events found</strong>
              <span>Try a different word or calendar.</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
