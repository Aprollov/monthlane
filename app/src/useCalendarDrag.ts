"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  CALENDAR_DRAG_LONG_PRESS_MS,
  CALENDAR_DRAG_MOUSE_THRESHOLD,
  CALENDAR_DRAG_TOUCH_CANCEL_THRESHOLD,
  pointerDistance,
  type CalendarDragItem,
} from "./calendarReschedule";

type ActiveDrag = {
  item: CalendarDragItem;
  clientX: number;
  clientY: number;
  targetDate?: string;
};

type PendingDrag = {
  item: CalendarDragItem;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  source: HTMLElement;
  longPressTimer?: number;
};

type Options = {
  onDrop: (item: CalendarDragItem, targetDate: string) => Promise<void>;
  onRecurringBlocked: () => void;
};

const dateAtPoint = (clientX: number, clientY: number) =>
  document.elementFromPoint(clientX, clientY)
    ?.closest<HTMLElement>("[data-date-key]")
    ?.dataset.dateKey;

export function useCalendarDrag({ onDrop, onRecurringBlocked }: Options) {
  const [active, setActive] = useState<ActiveDrag>();
  const activeRef = useRef<ActiveDrag | undefined>(undefined);
  const pendingRef = useRef<PendingDrag | undefined>(undefined);
  const suppressClicksUntil = useRef(0);

  const updateActive = useCallback((next?: ActiveDrag) => {
    activeRef.current = next;
    setActive(next);
    document.body.classList.toggle("calendarDragging", Boolean(next));
  }, []);

  const clearPending = useCallback(() => {
    const pending = pendingRef.current;
    if (pending?.longPressTimer) window.clearTimeout(pending.longPressTimer);
    pendingRef.current = undefined;
  }, []);

  const activate = useCallback((pending: PendingDrag, clientX: number, clientY: number) => {
    if (pending.item.recurring) {
      suppressClicksUntil.current = Date.now() + 600;
      clearPending();
      onRecurringBlocked();
      return;
    }
    try { pending.source.setPointerCapture(pending.pointerId); } catch {}
    if (navigator.vibrate && pending.pointerType === "touch") navigator.vibrate(12);
    const next = {
      item: pending.item,
      clientX,
      clientY,
      targetDate: dateAtPoint(clientX, clientY),
    };
    updateActive(next);
  }, [clearPending, onRecurringBlocked, updateActive]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = activeRef.current;
      if (drag) {
        if (event.pointerId !== pendingRef.current?.pointerId) return;
        event.preventDefault();
        updateActive({
          ...drag,
          clientX: event.clientX,
          clientY: event.clientY,
          targetDate: dateAtPoint(event.clientX, event.clientY),
        });
        return;
      }
      const pending = pendingRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;
      const distance = pointerDistance(pending.startX, pending.startY, event.clientX, event.clientY);
      if (pending.pointerType === "touch") {
        if (distance > CALENDAR_DRAG_TOUCH_CANCEL_THRESHOLD) clearPending();
      } else if (distance >= CALENDAR_DRAG_MOUSE_THRESHOLD) {
        activate(pending, event.clientX, event.clientY);
      }
    };

    const finish = (event: PointerEvent) => {
      const pending = pendingRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;
      const drag = activeRef.current;
      clearPending();
      if (!drag) return;
      event.preventDefault();
      suppressClicksUntil.current = Date.now() + 600;
      updateActive(undefined);
      if (drag.targetDate && drag.targetDate !== drag.item.sourceDate) {
        void onDrop(drag.item, drag.targetDate);
      }
    };

    const cancel = (event: PointerEvent) => {
      if (event.pointerId !== pendingRef.current?.pointerId) return;
      clearPending();
      updateActive(undefined);
    };

    // Browsers may start a native HTML5 drag from the dragged row or its SVG
    // icon; once that happens pointermove events stop firing and the pointer
    // based drag never activates, so suppress native dragging on drag sources.
    const onNativeDragStart = (event: DragEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".dragHandle, .calendarTaskItem, .eventItem, .mobileEventRow")) {
        event.preventDefault();
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", finish, { passive: false });
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("dragstart", onNativeDragStart);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("dragstart", onNativeDragStart);
      clearPending();
      document.body.classList.remove("calendarDragging");
    };
  }, [activate, clearPending, onDrop, updateActive]);

  const onPointerDown = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    item: CalendarDragItem,
  ) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    clearPending();
    const pending: PendingDrag = {
      item,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      source: event.currentTarget,
    };
    pendingRef.current = pending;
    if (event.pointerType === "touch") {
      pending.longPressTimer = window.setTimeout(() => {
        if (pendingRef.current === pending) activate(pending, pending.startX, pending.startY);
      }, CALENDAR_DRAG_LONG_PRESS_MS);
    }
  }, [activate, clearPending]);

  const suppressClick = useCallback(() => Date.now() < suppressClicksUntil.current, []);
  const isSource = useCallback((item: CalendarDragItem) =>
    active?.item.type === item.type && active.item.id === item.id, [active]);

  return {
    active,
    onPointerDown,
    suppressClick,
    isSource,
  };
}
