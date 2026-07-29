"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EventDrawer } from "./EventDrawer";
import { SearchDrawer } from "./SearchDrawer";
import { ScopeDialog, type RecurrenceScope } from "./ScopeDialog";
import { SettingsDrawer } from "./SettingsDrawer";
import { addMonths, buildMonthGrid, longDateLabel, monthLabel, toDateKey } from "./dates";
import { ensureCategories, listCategories, listEvents, listExceptions, saveEvent, saveException, softDeleteEvent } from "./database";
import { getDeviceId } from "./device";
import { CalendarIcon, ChevronLeft, ChevronRight, Menu, Plus, Search, Settings, Sliders } from "./icons";
import { expandEvents, previousDateKey } from "./recurrence";
import type { CalendarEvent, Category, EventDraft, RecurrenceException } from "./types";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthlaneApp() {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(today));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [exceptions, setExceptions] = useState<RecurrenceException[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("monthlane-hidden-calendars") ?? "[]")); }
    catch { return new Set(); }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent>();
  const [scopeRequest, setScopeRequest] = useState<{ action: "edit" | "delete"; draft?: EventDraft }>();
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    await ensureCategories();
    const [storedEvents, storedCategories, storedExceptions] = await Promise.all([listEvents(), listCategories(), listExceptions()]);
    setEvents(storedEvents);
    setCategories(storedCategories);
    setExceptions(storedExceptions);
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

  const goToToday = useCallback(() => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toDateKey(today));
    setSearchOpen(false);
    notify("Showing today.");
  }, [today]);

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
      if (event.key.toLowerCase() === "t") goToToday();
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSettingsOpen(false);
        setDrawerOpen(false);
      }
      if (event.key === "ArrowLeft") setVisibleMonth((month) => addMonths(month, -1));
      if (event.key === "ArrowRight") setVisibleMonth((month) => addMonths(month, 1));
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [goToToday, openCreate]);

  const days = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const expandedEvents = useMemo(
    () => expandEvents(events, exceptions, toDateKey(days[0]), toDateKey(days[days.length - 1])),
    [days, events, exceptions],
  );
  const visibleEvents = useMemo(
    () => expandedEvents.filter((event) => !hiddenCategories.has(event.categoryId)),
    [expandedEvents, hiddenCategories],
  );
  const searchableEvents = useMemo(
    () => [
      ...events,
      ...exceptions
        .filter((exception) => exception.type === "modified" && exception.replacement)
        .map((exception) => ({
          ...exception.replacement!,
          recurrenceParentId: exception.seriesId,
          recurrenceInstanceDate: exception.instanceDate,
        })),
    ],
    [events, exceptions],
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
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  const eventFromDraft = (draft: EventDraft, existing?: CalendarEvent): CalendarEvent => {
    const now = new Date().toISOString();
    return {
      id: existing?.id ?? crypto.randomUUID(),
      title: draft.title,
      startDate: draft.startDate,
      allDay: draft.allDay,
      startTime: draft.allDay ? undefined : draft.startTime,
      endTime: draft.allDay ? undefined : draft.endTime,
      notes: draft.notes,
      categoryId: draft.categoryId,
      tags: existing?.tags ?? [],
      reminderMinutes: existing?.reminderMinutes ?? [],
      recurrence: draft.recurrence,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deviceId: existing?.deviceId ?? getDeviceId(),
    };
  };

  const finishSave = async (event: CalendarEvent, message: string) => {
    await saveEvent(event);
    await refresh();
    setSelectedDate(event.startDate);
    setVisibleMonth(new Date(Number(event.startDate.slice(0, 4)), Number(event.startDate.slice(5, 7)) - 1, 1));
    setDrawerOpen(false);
    setScopeRequest(undefined);
    notify(message);
  };

  const saveDraft = async (draft: EventDraft) => {
    if (editingEvent?.recurrenceParentId) {
      setScopeRequest({ action: "edit", draft });
      return;
    }
    const event = eventFromDraft(draft, editingEvent);
    await finishSave(event, editingEvent ? "Event updated." : draft.recurrence ? "Repeating event saved." : "Event saved.");
  };

  const removeEvent = async () => {
    if (!editingEvent) return;
    if (editingEvent.recurrenceParentId) {
      setScopeRequest({ action: "delete" });
      return;
    }
    await softDeleteEvent(editingEvent);
    await refresh();
    setDrawerOpen(false);
    notify("Event deleted.");
  };

  const chooseScope = async (scope: RecurrenceScope) => {
    if (!editingEvent?.recurrenceParentId || !editingEvent.recurrenceInstanceDate) return;
    const series = events.find((event) => event.id === editingEvent.recurrenceParentId);
    if (!series) return;
    const instanceDate = editingEvent.recurrenceInstanceDate;
    const now = new Date().toISOString();

    if (scopeRequest?.action === "delete") {
      if (scope === "single") {
        await saveException({
          id: `${series.id}:${instanceDate}`,
          seriesId: series.id,
          instanceDate,
          type: "deleted",
          createdAt: now,
          updatedAt: now,
          deviceId: getDeviceId(),
        });
      } else if (scope === "following") {
        await saveEvent({
          ...series,
          recurrence: { ...series.recurrence!, endType: "date", endDate: previousDateKey(instanceDate) },
          updatedAt: now,
        });
      } else {
        await softDeleteEvent(series);
      }
      await refresh();
      setScopeRequest(undefined);
      setDrawerOpen(false);
      notify(scope === "single" ? "This event was removed." : scope === "following" ? "This and following events were removed." : "Series deleted.");
      return;
    }

    const draft = scopeRequest?.draft;
    if (!draft) return;
    if (scope === "single") {
      const replacement = eventFromDraft({ ...draft, recurrence: undefined });
      await saveException({
        id: `${series.id}:${instanceDate}`,
        seriesId: series.id,
        instanceDate,
        type: "modified",
        replacement,
        createdAt: now,
        updatedAt: now,
        deviceId: getDeviceId(),
      });
      await refresh();
      setScopeRequest(undefined);
      setDrawerOpen(false);
      notify("Only this event was updated.");
    } else if (scope === "following") {
      await saveEvent({
        ...series,
        recurrence: { ...series.recurrence!, endType: "date", endDate: previousDateKey(instanceDate) },
        updatedAt: now,
      });
      const newSeries = eventFromDraft({ ...draft, startDate: instanceDate });
      await finishSave(newSeries, "A new repeating series was created.");
    } else {
      const updatedSeries = eventFromDraft({ ...draft, startDate: series.startDate }, series);
      await finishSave(updatedSeries, "The entire series was updated.");
    }
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
          <button className="secondaryButton todayButton" onClick={goToToday}>Today</button>
        </div>
        <div className="topActions">
          <button className="iconButton" onClick={() => setSearchOpen(true)} aria-label="Search events" title="Search events"><Search /></button>
          <button className="primaryButton newEventButton" onClick={() => openCreate()}><Plus /><span>New event</span></button>
          <button className="iconButton" onClick={() => setSettingsOpen(true)} aria-label="Open settings" title="Settings"><Settings /></button>
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
                          <span className="eventTitle">{event.title}</span>
                          {event.recurrenceParentId && <span className="repeatMark" title="Repeating event">↻</span>}
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
        <button onClick={goToToday}><CalendarIcon /><span>Today</span></button>
        <button onClick={() => setSearchOpen(true)}><Search /><span>Search</span></button>
        <button className="mobileAdd" onClick={() => openCreate()}><Plus /><span>Add</span></button>
        <button onClick={() => setSidebarOpen(true)}><Sliders /><span>Calendars</span></button>
        <button onClick={() => setSettingsOpen(true)}><Settings /><span>Settings</span></button>
      </nav>

      <EventDrawer open={drawerOpen} date={selectedDate} event={editingEvent} categories={categories} onClose={() => setDrawerOpen(false)} onSave={saveDraft} onDelete={editingEvent ? removeEvent : undefined} />
      <SearchDrawer open={searchOpen} events={searchableEvents} categories={categories} onClose={() => setSearchOpen(false)} onSelect={(event) => {
        setSelectedDate(event.startDate);
        setVisibleMonth(new Date(Number(event.startDate.slice(0, 4)), Number(event.startDate.slice(5, 7)) - 1, 1));
        setSearchOpen(false);
        notify(`Showing ${event.title}.`);
      }} />
      <ScopeDialog open={Boolean(scopeRequest)} action={scopeRequest?.action ?? "edit"} onChoose={(scope) => void chooseScope(scope)} onClose={() => setScopeRequest(undefined)} />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} onChanged={refresh} notify={notify} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
