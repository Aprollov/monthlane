"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { CalendarDragItem } from "./calendarReschedule";
import type { CalendarEntry } from "./flow/calendarEntries";
import { fromDateKey, longDateLabel } from "./dates";
import { X } from "./icons";
import type { CalendarEvent, Category, FlowTask } from "./types";

type Props = {
  date: string;
  entries: CalendarEntry[];
  categories: Category[];
  anchor: { x: number; y: number };
  onClose: () => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onOpenTask: (task: FlowTask) => void;
  onToggleTask: (task: FlowTask) => void;
  onDragStart: (event: ReactPointerEvent<HTMLElement>, item: CalendarDragItem) => void;
  isDragSource: (item: CalendarDragItem) => boolean;
  dragItemFor: (entry: CalendarEntry) => CalendarDragItem;
};

const POPOVER_WIDTH = 250;
const POPOVER_MAX_HEIGHT = 330;

export function DayOverflowPopover({
  date,
  entries,
  categories,
  anchor,
  onClose,
  onOpenEvent,
  onOpenTask,
  onToggleTask,
  onDragStart,
  isDragSource,
  dragItemFor,
}: Props) {
  const categoryById = (id?: string) => categories.find((category) => category.id === id);
  const left = Math.max(8, Math.min(anchor.x, window.innerWidth - POPOVER_WIDTH - 8));
  const top = Math.max(8, Math.min(anchor.y, window.innerHeight - POPOVER_MAX_HEIGHT - 8));
  return (
    <div
      className="dayOverflowPopover"
      style={{ left, top }}
      role="dialog"
      aria-label={`All items on ${longDateLabel(fromDateKey(date))}`}
    >
      <header className="dayOverflowHeader">
        <span>{longDateLabel(fromDateKey(date))}</span>
        <button className="iconButton" onClick={onClose} aria-label="Close overflow list"><X /></button>
      </header>
      <div className="dayOverflowList">
        {entries.map((entry) => {
          const dragItem = dragItemFor(entry);
          if (entry.type === "event") {
            const category = categoryById(entry.event.categoryId);
            return (
              <button
                className={`overflowItem ${isDragSource(dragItem) ? "calendarDragSource" : ""}`}
                key={entry.id}
                onPointerDown={(event) => onDragStart(event, dragItem)}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  onOpenEvent(entry.event);
                  onClose();
                }}
              >
                <span className="eventAccent" style={{ background: category?.color }} />
                {!entry.event.allDay && <time>{entry.event.startTime}</time>}
                <span className="overflowTitle">{entry.event.title}</span>
              </button>
            );
          }
          return (
            <button
              className={`overflowItem ${entry.task.status === "completed" ? "completed" : ""} ${isDragSource(dragItem) ? "calendarDragSource" : ""}`}
              key={entry.id}
              onPointerDown={(event) => onDragStart(event, dragItem)}
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onOpenTask(entry.task);
                onClose();
              }}
            >
              <span
                className="calendarTaskCheck"
                role="checkbox"
                aria-checked={entry.task.status === "completed"}
                aria-label={entry.task.status === "completed" ? `Reopen ${entry.task.title}` : `Complete ${entry.task.title}`}
                onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  onToggleTask(entry.task);
                }}
              >{entry.task.status === "completed" ? "✓" : ""}</span>
              {entry.task.scheduledTime && <time>{entry.task.scheduledTime}</time>}
              <span className="overflowTitle">{entry.task.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
