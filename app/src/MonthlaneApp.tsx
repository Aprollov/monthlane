"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EventDrawer } from "./EventDrawer";
import { addMonths, buildMonthGrid, longDateLabel, monthLabel, toDateKey } from "./dates";
import { ensureCategories, listCategories, listEvents, saveEvent, softDeleteEvent } from "./database";
import { CalendarIcon, ChevronLeft, ChevronRight, Menu, Plus, Search, Settings, Sliders } from "./icons";
import type { CalendarEvent, Category, EventDraft } from "./types";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const deviceId = () => {
  const key = "monthlane-device-id";
  const current = localStorage.getItem(key);
  if (current) return current;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
};

export function MonthlaneApp() {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(today));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("monthlane-hidden-calendars") ?? "[]")); }
    catch { return new Set(); }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent>();
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    await ensureCategories();
    const [storedEvents, storedCategories] = await Promise.all([listEvents(), listCategories()]);
    setEvents(storedEvents);
    setCategories(storedCategories);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    localStorage.setItem("monthlane-hidden-calendars", JSON.stringify([...hiddenCategories]));
  }, [hiddenCategories]);
  useEffect(() => {
    localStorage.setItem("monthlane-last-month", toDateKey(visibleMonth));
  }, [visibleMonth]);

  const notify = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  };

  const openCreate = useCallback((date = selectedDate) => {
    setSelectedDate(date);
    setEditingEvent(undefined);
    setDrawerOpen(true);
  }, [selectedDate]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea, select") || target.isContentEditable) return;
      if (event.key.toLowerCase() === "n") openCreate();
      if (event.key.toLowerCase() === "t") {
        setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDate(toDateKey(today));
      }
      if (event.key === "ArrowLeft") setVisibleMonth((month) => addMonths(month, -1));
      if (event.key === "ArrowRight") setVisibleMonth((month) => addMonths(month, 1));
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [openCreate, today]);

  const visibleEvents = useMemo(
    () => events.filter((event) => !hiddenCategories.has(event.categoryId)),
    [events, hiddenCategories],
  );
  const eventsByDate = useMemo(() => {
    const result = new Map<string, CalendarEvent[]>();
    for (const event of visibleEvents) {
      const group = result.get(event.startDate) ?? [];
      group.push(event);
      result.set(event.startDate, group);
    }
    for (const group of result.values()) group.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    return result;
  }, [visibleEvents]);
  const days = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  const saveDraft = async (draft: EventDraft) => {
    const now = new Date().toISOString();
    const event: CalendarEvent = {
      id: editingEvent?.id ?? crypto.randomUUID(),
      title: draft.title,
      startDate: draft.startDate,
      allDay: draft.allDay,
      startTime: draft.allDay ? undefined : draft.startTime,
      endTime: draft.allDay ? undefined : draft.endTime,
      notes: draft.notes,
      categoryId: draft.categoryId,
      tags: editingEvent?.tags ?? [],
      reminderMinutes: editingEvent?.reminderMinutes ?? [],
      createdAt: editingEvent?.createdAt ?? now,
      updatedAt: now,
      deviceId: editingEvent?.deviceId ?? deviceId(),
    };
    await saveEvent(event);
    await refresh();
    setSelectedDate(event.startDate);
    setVisibleMonth(new Date(Number(event.startDate.slice(0, 4)), Number(event.startDate.slice(5, 7)) - 1, 1));
    setDrawerOpen(false);
    notify(editingEvent ? "Event updated." : "Event saved.");
  };

  const removeEvent = async () => {
    if (!editingEvent) return;
    await softDeleteEvent(editingEvent);
    await refresh();
    setDrawerOpen(false);
    notify("Event deleted.");
  };

  const selectEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setSelectedDate(event.startDate);
    setDrawerOpen(true);
  };

  const categoryById = (id: string) => categories.find((category) => category.id === id);

  return (
    <main className="appShell">
      <header className="topBar">
        <div className="brandArea">
          <button className="iconButton mobileOnly" onClick={() => setSidebarOpen(true)} aria-label="Open calendars" title="Open calendars"><Menu /></button>
          <div className="brandMark" aria-hidden="true"><span>M</span></div>
          <div className="brandCopy"><strong>Monthlane</strong><span>Plan life, one month at a time.</span></div>
        </div>
        <div className="monthNavigation">
          <button className="iconButton" onClick={() => setVisibleMonth((month) => addMonths(month, -1))} aria-label="Previous month" title="Previous month"><ChevronLeft /></button>
          <h1>{monthLabel(visibleMonth)}</h1>
          <button className="iconButton" onClick={() => setVisibleMonth((month) => addMonths(month, 1))} aria-label="Next month" title="Next month"><ChevronRight /></button>
          <button className="secondaryButton todayButton" onClick={() => {
            setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
            setSelectedDate(toDateKey(today));
          }}>Today</button>
        </div>
        <div className="topActions">
          <button className="iconButton" aria-label="Search events" title="Search (coming in Phase 3)"><Search /></button>
          <button className="primaryButton newEventButton" onClick={() => openCreate()}><Plus /><span>New event</span></button>
          <button className="iconButton" aria-label="Open settings" title="Settings"><Settings /></button>
        </div>
      </header>

      <div className="workspace">
        {sidebarOpen && <button className="sidebarScrim mobileOnly" onClick={() => setSidebarOpen(false)} aria-label="Close calendars" />}
        <aside className={`sidebar ${sidebarOpen ? "sidebarOpen" : ""}`}>
          <section className="sidebarSection introBlock">
            <p className="eyebrow">This month</p>
            <p className="sidebarStatement">Make room for what matters.</p>
            <label className="jumpLabel">
              Jump to month
              <input
                type="month"
                value={`${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`}
                onChange={(event) => {
                  const [year, month] = event.target.value.split("-").map(Number);
                  if (year && month) setVisibleMonth(new Date(year, month - 1, 1));
                }}
              />
            </label>
          </section>
          <section className="sidebarSection">
            <div className="sectionTitle"><span>Calendars</span><Sliders /></div>
            <div className="categoryList">
              {categories.map((category) => {
                const visible = !hiddenCategories.has(category.id);
                return (
                  <label className="categoryRow" key={category.id}>
                    <input type="checkbox" checked={visible} onChange={() => {
                      setHiddenCategories((current) => {
                        const next = new Set(current);
                        if (next.has(category.id)) next.delete(category.id); else next.add(category.id);
                        return next;
                      });
                    }} />
                    <span className="categoryDot" style={{ background: category.color }} />
                    <span>{category.name}</span>
                    <small>{events.filter((event) => event.categoryId === category.id).length}</small>
                  </label>
                );
              })}
            </div>
          </section>
          <div className="sidebarFooter"><span className="statusDot" />Saved on this device</div>
        </aside>

        <section className="calendarArea">
          <div className="weekdayRow" aria-hidden="true">
            {weekdays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendarGrid">
            {days.map((date) => {
              const key = toDateKey(date);
              const dayEvents = eventsByDate.get(key) ?? [];
              const isToday = key === toDateKey(today);
              const selected = key === selectedDate;
              const outside = date.getMonth() !== visibleMonth.getMonth();
              return (
                <div
                  className={`dayCell ${outside ? "outsideMonth" : ""} ${selected ? "selectedDay" : ""}`}
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-label={`${longDateLabel(date)}, ${dayEvents.length} ${dayEvents.length === 1 ? "event" : "events"}`}
                  onClick={() => setSelectedDate(key)}
                  onDoubleClick={() => openCreate(key)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setSelectedDate(key);
                    if (event.key === "n") openCreate(key);
                  }}
                >
                  <div className="dayNumberRow">
                    <span className={isToday ? "todayNumber" : ""}>{date.getDate()}</span>
                    {dayEvents.length > 0 && <span className="mobileEventCount">{dayEvents.length}</span>}
                  </div>
                  <div className="dayEvents">
                    {dayEvents.slice(0, 3).map((event) => {
                      const category = categoryById(event.categoryId);
                      return (
                        <button className="eventItem" key={event.id} title={event.title} onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          selectEvent(event);
                        }}>
                          <span className="eventAccent" style={{ background: category?.color }} />
                          {!event.allDay && <time>{event.startTime}</time>}
                          <span>{event.title}</span>
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && <button className="moreEvents" onClick={() => setSelectedDate(key)}>+{dayEvents.length - 3} more</button>}
                  </div>
                  <div className="mobileDots" aria-hidden="true">
                    {dayEvents.slice(0, 3).map((event) => <span key={event.id} style={{ background: categoryById(event.categoryId)?.color }} />)}
                  </div>
                </div>
              );
            })}
          </div>

          <section className="mobileDayList">
            <div className="mobileDayHeader">
              <div><p className="eyebrow">Selected day</p><h2>{longDateLabel(new Date(`${selectedDate}T12:00:00`))}</h2></div>
              <button className="iconButton" onClick={() => openCreate(selectedDate)} aria-label="Add event on selected day"><Plus /></button>
            </div>
            {selectedEvents.length ? selectedEvents.map((event) => (
              <button className="mobileEventRow" key={event.id} onClick={() => selectEvent(event)}>
                <span className="categoryDot" style={{ background: categoryById(event.categoryId)?.color }} />
                <span><strong>{event.title}</strong><small>{event.allDay ? "All day" : event.startTime}</small></span>
                <ChevronRight />
              </button>
            )) : <p className="clearDay">Nothing planned. Leave it open, or add a moment.</p>}
          </section>
        </section>
      </div>

      <nav className="mobileBottomNav" aria-label="Primary navigation">
        <button onClick={() => { setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(toDateKey(today)); }}><CalendarIcon /><span>Today</span></button>
        <button><Search /><span>Search</span></button>
        <button className="mobileAdd" onClick={() => openCreate()}><Plus /><span>Add</span></button>
        <button onClick={() => setSidebarOpen(true)}><Sliders /><span>Calendars</span></button>
        <button><Settings /><span>Settings</span></button>
      </nav>

      <EventDrawer open={drawerOpen} date={selectedDate} event={editingEvent} categories={categories} onClose={() => setDrawerOpen(false)} onSave={saveDraft} onDelete={editingEvent ? removeEvent : undefined} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
