"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EventDrawer } from "./EventDrawer";
import { SearchDrawer } from "./SearchDrawer";
import { ScopeDialog, type RecurrenceScope } from "./ScopeDialog";
import { SettingsDrawer } from "./SettingsDrawer";
import { addMonths, buildMonthGrid, longDateLabel, monthLabel, toDateKey } from "./dates";
import { ensureCategories, listCategories, listEvents, listExceptions, saveEvent, saveException, softDeleteEvent } from "./database";
import { getDeviceId } from "./device";
import { FlowNavigation } from "./flow/FlowNavigation";
import { FlowWorkspace, type FlowView } from "./flow/FlowWorkspace";
import { DayPanel } from "./flow/DayPanel";
import { QuickCapture } from "./flow/QuickCapture";
import { TaskEditorDrawer } from "./flow/TaskEditorDrawer";
import { WrapUpDialog } from "./flow/WrapUpDialog";
import { groupCalendarEntries } from "./flow/calendarEntries";
import { taskRepository } from "./flow/taskRepository";
import { readingRepository } from "./flow/readingRepository";
import { changesForWrapUpAction, summarizeWrapUp, wrapUpSummaryText, wrapUpTasks, type WrapUpPlanItem } from "./flow/wrapUp";
import { CalendarIcon, ChevronLeft, ChevronRight, InboxIcon, Menu, Plus, Search, Settings, Sliders, Sun } from "./icons";
import { expandEvents, previousDateKey } from "./recurrence";
import type { CalendarEvent, Category, CreateReadingItemInput, CreateTaskInput, EventDraft, FlowBucket, FlowTask, ReadingItem, RecurrenceException, TaskBucket, UpdateTaskInput } from "./types";
import { openSmartLink } from "./flow/smartLinks";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthlaneApp() {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(today));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [exceptions, setExceptions] = useState<RecurrenceException[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<FlowTask[]>([]);
  const [readingItems, setReadingItems] = useState<ReadingItem[]>([]);
  const [activeView, setActiveView] = useState<FlowView>("month");
  const [mobileFlowBucket, setMobileFlowBucket] = useState<FlowBucket>("today");
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("monthlane-hidden-calendars") ?? "[]")); }
    catch { return new Set(); }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [dayPanelOpen, setDayPanelOpen] = useState(false);
  const [wrapUpOpen, setWrapUpOpen] = useState(false);
  const [captureDefaults, setCaptureDefaults] = useState<Omit<CreateTaskInput, "title">>({ bucket: "inbox" });
  const [editingTask, setEditingTask] = useState<FlowTask>();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent>();
  const [scopeRequest, setScopeRequest] = useState<{ action: "edit" | "delete"; draft?: EventDraft }>();
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    await ensureCategories();
    await readingRepository.migrateLegacyTasks();
    const [storedEvents, storedCategories, storedExceptions, storedTasks, storedReadingItems] = await Promise.all([
      listEvents(),
      listCategories(),
      listExceptions(),
      taskRepository.getAllTasks(),
      readingRepository.getAll(),
    ]);
    setEvents(storedEvents);
    setCategories(storedCategories);
    setExceptions(storedExceptions);
    setTasks(storedTasks);
    setReadingItems(storedReadingItems);
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
    setDayPanelOpen(true);
    notify("Showing today.");
  }, [today]);

  const openCreate = useCallback((date = selectedDate) => {
    setSelectedDate(date);
    setEditingEvent(undefined);
    setDrawerOpen(true);
  }, [selectedDate]);

  const openCapture = useCallback((defaults: Omit<CreateTaskInput, "title"> = { bucket: "inbox" }) => {
    setCaptureDefaults(defaults);
    setCaptureOpen(true);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSettingsOpen(false);
        setDrawerOpen(false);
        setCaptureOpen(false);
        setWrapUpOpen(false);
        setDayPanelOpen(false);
        setEditingTask(undefined);
        return;
      }
      if (
        target.matches("input, textarea, select") ||
        target.isContentEditable ||
        Boolean(target.closest("button, a, [role='button'], [role='dialog']"))
      ) return;
      if (event.key.toLowerCase() === "n") openCreate();
      if (event.key.toLowerCase() === "q") openCapture({ bucket: "inbox" });
      if (event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key.toLowerCase() === "t") goToToday();
      if (event.key === "ArrowLeft") setVisibleMonth((month) => addMonths(month, -1));
      if (event.key === "ArrowRight") setVisibleMonth((month) => addMonths(month, 1));
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [goToToday, openCapture, openCreate]);

  const days = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const expandedEvents = useMemo(
    () => expandEvents(events, exceptions, toDateKey(days[0]), toDateKey(days[days.length - 1])),
    [days, events, exceptions],
  );
  const visibleEvents = useMemo(
    () => expandedEvents.filter((event) => !hiddenCategories.has(event.categoryId)),
    [expandedEvents, hiddenCategories],
  );
  const visibleScheduledTasks = useMemo(
    () => tasks.filter((task) =>
      task.scheduledDate &&
      task.status !== "archived" &&
      !task.deletedAt &&
      (!task.categoryId || !hiddenCategories.has(task.categoryId)),
    ),
    [hiddenCategories, tasks],
  );
  const entriesByDate = useMemo(
    () => groupCalendarEntries(visibleEvents, visibleScheduledTasks),
    [visibleEvents, visibleScheduledTasks],
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
  const selectedEntries = entriesByDate.get(selectedDate) ?? [];
  const selectedTasks = selectedEntries.filter((entry) => entry.type === "task").map((entry) => entry.task);

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
  const todayKey = toDateKey(today);
  const todayExpandedEvents = useMemo(
    () => expandEvents(events, exceptions, todayKey, todayKey)
      .filter((event) => !hiddenCategories.has(event.categoryId)),
    [events, exceptions, hiddenCategories, todayKey],
  );
  const wrapUpGroups = useMemo(() => wrapUpTasks(tasks, todayKey), [tasks, todayKey]);

  const selectView = (view: FlowView) => {
    setActiveView(view);
    setSidebarOpen(false);
  };

  const captureDefaultsForView = (view: FlowView): Omit<CreateTaskInput, "title"> =>
    view === "flow" ? { bucket: mobileFlowBucket } : { bucket: "inbox" };

  const createTask = async (input: CreateTaskInput) => {
    await taskRepository.createTask(input);
    await refresh();
    notify("Task captured.");
  };

  const createReadingItem = async (input: CreateReadingItemInput) => {
    await readingRepository.create(input);
    await refresh();
    notify("Saved to Later Reading.");
  };

  const saveTask = async (id: string, changes: UpdateTaskInput) => {
    const current = tasks.find((task) => task.id === id);
    const { status, ...fields } = changes;
    await taskRepository.updateTask(id, fields);
    if (status && status !== current?.status) {
      if (status === "completed") await taskRepository.completeTask(id);
      if (status === "open") await taskRepository.reopenTask(id);
      if (status === "archived") await taskRepository.archiveTask(id);
    }
    await refresh();
    notify("Task updated.");
  };

  const moveTask = async (task: FlowTask, bucket: TaskBucket) => {
    await taskRepository.updateTask(task.id, {
      bucket,
      focusedAt: bucket === "today" && task.bucket !== "today" ? new Date().toISOString() : task.focusedAt,
    });
    await refresh();
    notify(bucket === "inbox" ? "Moved to Inbox." : bucket === "today" ? "Moved to Today." : "Moved to This Week.");
  };

  const placeTask = async (
    taskId: string,
    bucket: FlowBucket,
    previousOrder?: number,
    nextOrder?: number,
  ) => {
    await taskRepository.placeTask(taskId, bucket, previousOrder, nextOrder);
    await refresh();
  };

  const scheduleTask = async (task: FlowTask, scheduledDate: string) => {
    await taskRepository.updateTask(task.id, { scheduledDate });
    await refresh();
    notify(`Scheduled for ${scheduledDate}.`);
  };

  const deleteTask = async (task: FlowTask) => {
    await taskRepository.softDeleteTask(task.id);
    await refresh();
    notify("Task deleted.");
  };

  const finishWrapUp = async (plan: WrapUpPlanItem[]) => {
    const tomorrowDate = new Date(`${todayKey}T12:00:00`);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = toDateKey(tomorrowDate);
    for (const item of plan) {
      if (item.action === "keep") continue;
      if (item.action === "archive") await taskRepository.archiveTask(item.task.id);
      else await taskRepository.updateTask(item.task.id, changesForWrapUpAction(item.action, tomorrow));
    }
    const summary = summarizeWrapUp(wrapUpGroups.completed.length, plan);
    await refresh();
    setWrapUpOpen(false);
    notify(wrapUpSummaryText(summary));
  };

  return (
    <main className="appShell">
      <header className="topBar">
        <div className="brandArea">
          <button className="iconButton mobileOnly" onClick={() => setSidebarOpen(true)} aria-label="Open calendars" title="Open calendars"><Menu /></button>
          <div className="brandMark" aria-hidden="true"><img src="./monthlane-icon.png" alt="" /></div>
          <div className="brandCopy"><strong>Monthlane</strong><span>Plan life, one month at a time.</span></div>
        </div>
        {activeView === "month" ? <div className="monthNavigation">
          <button className="iconButton" onClick={() => setVisibleMonth((month) => addMonths(month, -1))} aria-label="Previous month" title="Previous month"><ChevronLeft /></button>
          <h1>{monthLabel(visibleMonth)}</h1>
          <button className="iconButton" onClick={() => setVisibleMonth((month) => addMonths(month, 1))} aria-label="Next month" title="Next month"><ChevronRight /></button>
          <button className="secondaryButton todayButton" onClick={goToToday}>Today</button>
        </div> : <div className="flowTopTitle">Calendar + Flow</div>}
        <div className="topActions">
          <button className="iconButton" onClick={() => setSearchOpen(true)} aria-label="Search events and tasks" title="Search"><Search /></button>
          <button className="primaryButton newEventButton" onClick={() => activeView === "month"
            ? openCreate()
            : openCapture(captureDefaultsForView(activeView))}>
            <Plus /><span>{activeView === "month" ? "New event" : "Add task"}</span>
          </button>
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
          <section className="sidebarSection calendarNavigation">
            <div className="sectionTitle"><span>Calendar</span></div>
            <button className={`sidebarNavButton ${activeView === "month" ? "active" : ""}`} onClick={() => selectView("month")}><CalendarIcon /><span>Month</span></button>
          </section>
          <FlowNavigation activeView={activeView} onSelect={selectView} />
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
                    <small>{events.filter((event) => event.categoryId === category.id).length + tasks.filter((task) => task.categoryId === category.id && !task.deletedAt && task.status !== "archived").length}</small>
                  </label>
                );
              })}
            </div>
          </section>
          <div className="sidebarUtilities">
            <button onClick={() => { setSearchOpen(true); setSidebarOpen(false); }}><Search /><span>Search</span></button>
            <button onClick={() => { setSettingsOpen(true); setSidebarOpen(false); }}><Settings /><span>Settings</span></button>
          </div>
          <div className="sidebarFooter"><span className="statusDot" />Saved on this device</div>
        </aside>

        {activeView === "month" ? <section className="calendarArea">
          <div className="weekdayRow" aria-hidden="true">
            {weekdays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendarGrid">
            {days.map((date) => {
              const key = toDateKey(date);
              const dayEntries = entriesByDate.get(key) ?? [];
              const isToday = key === toDateKey(today);
              const selected = key === selectedDate;
              const outside = date.getMonth() !== visibleMonth.getMonth();
              return (
                <div
                  className={`dayCell ${outside ? "outsideMonth" : ""} ${selected ? "selectedDay" : ""}`}
                  key={key}
                  data-day-cell
                  role="button"
                  tabIndex={0}
                  aria-selected={selected}
                  aria-label={`${longDateLabel(date)}, ${dayEntries.length} ${dayEntries.length === 1 ? "item" : "items"}`}
                  onClick={() => { setSelectedDate(key); setDayPanelOpen(true); }}
                  onDoubleClick={() => openCreate(key)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") { setSelectedDate(key); setDayPanelOpen(true); }
                    if (event.key === "n") openCreate(key);
                    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
                    const offset = offsets[event.key];
                    if (offset) {
                      event.preventDefault();
                      const cells = [...event.currentTarget.parentElement!.querySelectorAll<HTMLElement>("[data-day-cell]")];
                      const target = cells[cells.indexOf(event.currentTarget) + offset];
                      target?.focus();
                    }
                  }}
                >
                  <div className="dayNumberRow">
                    <span className={isToday ? "todayNumber" : ""}>{date.getDate()}</span>
                    {dayEntries.length > 0 && <span className="mobileEventCount">{dayEntries.length}</span>}
                  </div>
                  <div className="dayEvents">
                    {dayEntries.slice(0, 3).map((entry) => {
                      if (entry.type === "event") {
                        const category = categoryById(entry.event.categoryId);
                        return (
                          <button className="eventItem" key={entry.id} title={entry.event.title} onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            selectEvent(entry.event);
                          }}>
                            <span className="eventAccent" style={{ background: category?.color }} />
                            {!entry.event.allDay && <time>{entry.event.startTime}</time>}
                            <span className="eventTitle">{entry.event.title}</span>
                            {entry.event.recurrenceParentId && <span className="repeatMark" title="Repeating event">↻</span>}
                          </button>
                        );
                      }
                      return (
                        <button className={`calendarTaskItem ${entry.task.status === "completed" ? "completed" : ""}`} key={entry.id} title={entry.task.title} onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setEditingTask(entry.task);
                        }}>
                          <span className="calendarTaskCheck">{entry.task.status === "completed" ? "✓" : ""}</span>
                          {entry.task.scheduledTime && <time>{entry.task.scheduledTime}</time>}
                          <span>{entry.task.title}</span>
                        </button>
                      );
                    })}
                    {dayEntries.length > 3 && <button className="moreEvents" onClick={() => { setSelectedDate(key); setDayPanelOpen(true); }}>+{dayEntries.length - 3} more</button>}
                  </div>
                  <div className="mobileDots" aria-hidden="true">
                    {dayEntries.slice(0, 3).map((entry) => <span key={entry.id} style={{ background: categoryById(entry.type === "event" ? entry.event.categoryId : entry.task.categoryId ?? "")?.color ?? "var(--accent)" }} />)}
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
            {selectedEntries.length ? selectedEntries.map((entry) => entry.type === "event" ? (
              <button className="mobileEventRow" key={entry.id} onClick={() => selectEvent(entry.event)}>
                <span className="categoryDot" style={{ background: categoryById(entry.event.categoryId)?.color }} />
                <span><strong>{entry.event.title}</strong><small>{entry.event.allDay ? "Event · All day" : `Event · ${entry.event.startTime}`}</small></span>
                <ChevronRight />
              </button>
            ) : (
              <button className={`mobileEventRow ${entry.task.status === "completed" ? "completed" : ""}`} key={entry.id} onClick={() => setEditingTask(entry.task)}>
                <span className="mobileTaskCheck">{entry.task.status === "completed" ? "✓" : ""}</span>
                <span><strong>{entry.task.title}</strong><small>{entry.task.scheduledTime ? `Task · ${entry.task.scheduledTime}` : "Task · No time"}</small></span>
                <ChevronRight />
              </button>
            )) : <p className="clearDay">Nothing planned. Leave it open, or add a moment.</p>}
          </section>
          <DayPanel
            open={dayPanelOpen}
            date={selectedDate}
            events={selectedEvents}
            tasks={selectedTasks}
            categories={categories}
            onClose={() => setDayPanelOpen(false)}
            onAddEvent={() => openCreate(selectedDate)}
            onAddTask={() => openCapture({ bucket: "thisWeek", scheduledDate: selectedDate })}
            onOpenEvent={selectEvent}
            onOpenTask={setEditingTask}
            onCompleteTask={async (task) => { await taskRepository.completeTask(task.id); await refresh(); notify("Task completed."); }}
            onReopenTask={async (task) => { await taskRepository.reopenTask(task.id); await refresh(); notify("Task reopened."); }}
            onReturnToInbox={(task) => void moveTask(task, "inbox")}
          />
        </section> : <FlowWorkspace
          view={activeView}
          tasks={tasks}
          readingItems={readingItems}
          categories={categories}
          today={todayKey}
          mobileBucket={mobileFlowBucket}
          onMobileBucketChange={setMobileFlowBucket}
          onCreate={createTask}
          onCreateReading={createReadingItem}
          onWrapUp={() => setWrapUpOpen(true)}
          onEdit={setEditingTask}
          onComplete={async (task) => { await taskRepository.completeTask(task.id); await refresh(); notify("Task completed."); }}
          onReopen={async (task) => { await taskRepository.reopenTask(task.id); await refresh(); notify("Task reopened."); }}
          onArchive={async (task) => { await taskRepository.archiveTask(task.id); await refresh(); notify("Task archived."); }}
          onMove={(task, bucket) => void moveTask(task, bucket)}
          onPlace={(taskId, bucket, previousOrder, nextOrder) => void placeTask(taskId, bucket, previousOrder, nextOrder)}
          onSchedule={(task, date) => void scheduleTask(task, date)}
          onDelete={(task) => void deleteTask(task)}
          onOpenReading={async (item) => {
            if (item.readStatus === "unread") {
              await readingRepository.update(item.id, { readStatus: "reading" });
              await refresh();
            }
            openSmartLink(item);
          }}
          onMarkRead={async (item) => {
            await readingRepository.update(item.id, { readStatus: "completed" });
            await refresh();
            notify("Moved to reading archive.");
          }}
          onDeleteReading={async (item) => {
            await readingRepository.update(item.id, { deletedAt: new Date().toISOString() });
            await refresh();
            notify("Reading item deleted.");
          }}
          onConvertReading={async (item) => {
            await taskRepository.createTask({
              title: item.title,
              notes: item.url,
              kind: "task",
              bucket: "inbox",
              url: item.url,
              siteName: item.platform,
            });
            await readingRepository.update(item.id, { deletedAt: new Date().toISOString() });
            await refresh();
            notify("Converted to Inbox task.");
          }}
          onRestoreReading={async (item) => {
            await readingRepository.update(item.id, { readStatus: "unread" });
            await refresh();
            notify("Returned to Later Reading.");
          }}
          onReorder={async (ids) => { await taskRepository.reorderTasks(ids); await refresh(); }}
        />}
      </div>

      <nav className="mobileBottomNav" aria-label="Primary navigation">
        <button className={activeView === "month" ? "active" : ""} aria-current={activeView === "month" ? "page" : undefined} onClick={() => selectView("month")}><CalendarIcon /><span>Month</span></button>
        <button className={activeView === "flow" && mobileFlowBucket === "today" ? "active" : ""} aria-current={activeView === "flow" && mobileFlowBucket === "today" ? "page" : undefined} onClick={() => { setMobileFlowBucket("today"); selectView("flow"); }}><Sun /><span>Today</span></button>
        <button className={activeView === "flow" && mobileFlowBucket === "inbox" ? "active" : ""} aria-current={activeView === "flow" && mobileFlowBucket === "inbox" ? "page" : undefined} onClick={() => { setMobileFlowBucket("inbox"); selectView("flow"); }}><InboxIcon /><span>Inbox</span></button>
        <button className="mobileAdd" onClick={() => activeView === "month" ? openCreate() : openCapture(captureDefaultsForView(activeView))}><Plus /><span>Add</span></button>
        <button onClick={() => setSidebarOpen(true)}><Menu /><span>More</span></button>
      </nav>

      <EventDrawer open={drawerOpen} date={selectedDate} event={editingEvent} categories={categories} onClose={() => setDrawerOpen(false)} onSave={saveDraft} onDelete={editingEvent ? removeEvent : undefined} />
      <SearchDrawer open={searchOpen} events={searchableEvents} tasks={tasks} categories={categories} onClose={() => setSearchOpen(false)} onSelect={(event) => {
        setSelectedDate(event.startDate);
        setVisibleMonth(new Date(Number(event.startDate.slice(0, 4)), Number(event.startDate.slice(5, 7)) - 1, 1));
        setActiveView("month");
        setSearchOpen(false);
        selectEvent(event);
      }} onSelectTask={(task) => {
        if (task.scheduledDate) {
          setSelectedDate(task.scheduledDate);
          setVisibleMonth(new Date(Number(task.scheduledDate.slice(0, 4)), Number(task.scheduledDate.slice(5, 7)) - 1, 1));
          setActiveView("month");
        } else {
          setMobileFlowBucket(task.bucket === "today" || task.bucket === "thisWeek" ? task.bucket : "inbox");
          setActiveView("flow");
        }
        setSearchOpen(false);
        setEditingTask(task);
      }} />
      <QuickCapture open={captureOpen} defaults={captureDefaults} onClose={() => setCaptureOpen(false)} onCreate={createTask} onCreateReading={createReadingItem} />
      <TaskEditorDrawer
        open={Boolean(editingTask)}
        task={editingTask}
        categories={categories}
        onClose={() => setEditingTask(undefined)}
        onSave={saveTask}
        onDelete={async (id) => { await taskRepository.softDeleteTask(id); await refresh(); notify("Task deleted."); }}
      />
      <WrapUpDialog
        open={wrapUpOpen}
        date={todayKey}
        completed={wrapUpGroups.completed}
        unfinished={wrapUpGroups.unfinished}
        onClose={() => setWrapUpOpen(false)}
        onApply={finishWrapUp}
      />
      <ScopeDialog open={Boolean(scopeRequest)} action={scopeRequest?.action ?? "edit"} onChoose={(scope) => void chooseScope(scope)} onClose={() => setScopeRequest(undefined)} />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} onChanged={refresh} notify={notify} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
