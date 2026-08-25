"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarsDialog } from "./CalendarsDialog";
import { ReadLaterCapture } from "./ReadLaterCapture";
import { analyzeClipboard, type ClipboardLink } from "./flow/urlDetection";
import { categoryItemCount, singleVisibleCategoryId } from "./categoryStats";
import { EventDrawer } from "./EventDrawer";
import { canConvertEvent, eventToTask, taskToEvent } from "./convertEntry";
import { SearchDrawer } from "./SearchDrawer";
import { ScopeDialog, type RecurrenceScope } from "./ScopeDialog";
import { SettingsDrawer } from "./SettingsDrawer";
import { calendarDragItem, formatMovedDate, rescheduledEvent, type CalendarDragItem } from "./calendarReschedule";
import { runStartupSync, syncConnectedCloud } from "./cloudAutoSync";
import { addMonths, buildMonthGrid, longDateLabel, monthLabel, toDateKey } from "./dates";
import { cleanupSyncConflictTasks, ensureCategories, listCategories, listEvents, listExceptions, migrateLegacyCategories, saveEvent, saveException, softDeleteEvent } from "./database";
import { FALLBACK_CATEGORY_ID } from "./types";
import { getDeviceId } from "./device";
import { FlowNavigation } from "./flow/FlowNavigation";
import { FlowWorkspace, type FlowView } from "./flow/FlowWorkspace";
import { DayPanel } from "./flow/DayPanel";
import { TaskCheckbox } from "./flow/TaskCheckbox";
import { QuickCapture } from "./flow/QuickCapture";
import { ReadingWorkspace } from "./flow/ReadingWorkspace";
import { TaskEditorDrawer } from "./flow/TaskEditorDrawer";
import { activeGridEntries, groupCalendarEntries, priorityColor, priorityMark } from "./flow/calendarEntries";
import { flowBucketForScheduledDate, isTaskDoneOn } from "./flow/taskFilters";
import { taskRepository } from "./flow/taskRepository";
import { readingRepository } from "./flow/readingRepository";
import { learningRepository } from "./learning/learningRepository";
import type { LearningWorkspaceProps } from "./learning/LearningWorkspace";
import { BookOpen, CalendarIcon, ChevronLeft, ChevronRight, InboxIcon, Menu, Plus, Search, Settings, Sliders, Sun } from "./icons";
import { expandEvents, previousDateKey } from "./recurrence";
import type { CalendarEvent, Category, CreateReadingItemInput, CreateTaskInput, EventDraft, FlowBucket, FlowTask, LearningProgressLog, LearningTrack, ReadingItem, RecurrenceException, TaskBucket, UpdateTaskInput } from "./types";
import { openSmartLink } from "./flow/smartLinks";
import { useCalendarDrag } from "./useCalendarDrag";

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
  const [learningTracks, setLearningTracks] = useState<LearningTrack[]>([]);
  const [learningLogs, setLearningLogs] = useState<LearningProgressLog[]>([]);
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
  const [calendarsOpen, setCalendarsOpen] = useState(false);
  const [readLaterOpen, setReadLaterOpen] = useState(false);
  const [clipboardLink, setClipboardLink] = useState<ClipboardLink>();
  const [captureDefaults, setCaptureDefaults] = useState<Omit<CreateTaskInput, "title">>({ bucket: "inbox" });
  const [editingTask, setEditingTask] = useState<FlowTask>();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent>();
  const [scopeRequest, setScopeRequest] = useState<{ action: "edit" | "delete"; draft?: EventDraft }>();
  const [toast, setToast] = useState<{ message: string; actionLabel?: string; onAction?: () => void }>();
  const toastTimer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    await ensureCategories();
    await migrateLegacyCategories();
    await cleanupSyncConflictTasks();
    await readingRepository.migrateLegacyTasks();
    const [storedEvents, storedCategories, storedExceptions, storedTasks, storedReadingItems, storedTracks, storedLogs] = await Promise.all([
      listEvents(),
      listCategories(),
      listExceptions(),
      taskRepository.getAllTasks(),
      readingRepository.getAll(),
      learningRepository.listTracks(),
      learningRepository.listLogs(),
    ]);
    setEvents(storedEvents);
    setCategories(storedCategories);
    setExceptions(storedExceptions);
    setTasks(storedTasks);
    setReadingItems(storedReadingItems);
    setLearningTracks(storedTracks);
    setLearningLogs(storedLogs);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runStartupSync().then((synced) => {
        if (synced) void refresh();
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  useEffect(() => {
    localStorage.setItem("monthlane-hidden-calendars", JSON.stringify([...hiddenCategories]));
  }, [hiddenCategories]);
  useEffect(() => {
    localStorage.setItem("monthlane-last-month", toDateKey(visibleMonth));
  }, [visibleMonth]);
  const focusCategoryId = useMemo(
    () => singleVisibleCategoryId(categories, hiddenCategories, FALLBACK_CATEGORY_ID, events, tasks),
    [categories, hiddenCategories, events, tasks],
  );

  const notify = useCallback((message: string, action?: { label: string; run: () => void }) => {
    setToast({ message, actionLabel: action?.label, onAction: action?.run });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(undefined), action ? 5200 : 2600);
  }, []);

  const goToToday = useCallback(() => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toDateKey(today));
    setSearchOpen(false);
    setDayPanelOpen(true);
    notify("Showing today.");
  }, [notify, today]);

  const openCreate = useCallback((date = selectedDate) => {
    setSelectedDate(date);
    setEditingEvent(undefined);
    setDrawerOpen(true);
  }, [selectedDate]);

  const openCapture = useCallback((defaults: Omit<CreateTaskInput, "title"> = { bucket: "inbox" }) => {
    setCaptureDefaults(defaults);
    setCaptureOpen(true);
  }, []);

  const openReadLaterCapture = useCallback(async () => {
    let clipText = "";
    try {
      clipText = (await navigator.clipboard?.readText?.()) ?? "";
    } catch {
      clipText = "";
    }
    setClipboardLink(analyzeClipboard(clipText));
    setReadLaterOpen(true);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSettingsOpen(false);
        setDrawerOpen(false);
        setCaptureOpen(false);
        setDayPanelOpen(false);
        setEditingTask(undefined);
        setCalendarsOpen(false);
        setReadLaterOpen(false);
        return;
      }
      if (
        target.matches("input, textarea, select") ||
        target.isContentEditable ||
        Boolean(target.closest("button, a, [role='button'], [role='dialog']"))
      ) return;
      if (event.key.toLowerCase() === "n") openCreate();
      if (event.key.toLowerCase() === "q") openCapture({ bucket: "inbox", categoryId: focusCategoryId });
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
  }, [goToToday, openCapture, openCreate, focusCategoryId]);

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
      (!task.recurrence || task.status === "open") &&
      (!task.categoryId || !hiddenCategories.has(task.categoryId)),
    ),
    [hiddenCategories, tasks],
  );
  const entriesByDate = useMemo(
    () => groupCalendarEntries(visibleEvents, visibleScheduledTasks, toDateKey(days[0]), toDateKey(days[days.length - 1])),
    [days, visibleEvents, visibleScheduledTasks],
  );
  const gridEntriesByDate = useMemo(() => activeGridEntries(entriesByDate), [entriesByDate]);
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

  const selectView = (view: FlowView) => {
    setActiveView(view);
    setSidebarOpen(false);
  };

  const captureDefaultsForView = (view: FlowView): Omit<CreateTaskInput, "title"> =>
    view === "flow" ? { bucket: mobileFlowBucket } : { bucket: "inbox" };

  const createTask = async (input: CreateTaskInput) => {
    const bucket = input.bucket
      ?? (input.scheduledDate ? flowBucketForScheduledDate(input.scheduledDate, todayKey) : undefined);
    await taskRepository.createTask({ ...input, bucket });
    await refresh();
    notify("Task captured.");
  };

  const createReadingItem = async (input: CreateReadingItemInput) => {
    await readingRepository.create(input);
    await refresh();
    notify("Saved to Later Reading.");
  };

  const saveLearningTrack = async (track: LearningTrack) => {
    await learningRepository.saveTrack(track);
    await refresh();
    void syncConnectedCloud().then((synced) => { if (synced) void refresh(); }).catch(() => {});
    notify("Growth item saved.");
  };

  const checkInGrowth = async (track: LearningTrack) => {
    const existing = learningLogs.some((log) =>
      log.learningTrackId === track.id && log.date === todayKey && !log.deletedAt,
    );
    if (existing) {
      notify("Already checked in today.");
      return;
    }
    const timestamp = new Date().toISOString();
    await learningRepository.saveLog({
      id: crypto.randomUUID(),
      learningTrackId: track.id,
      date: todayKey,
      title: "Check-in",
      createdAt: timestamp,
      updatedAt: timestamp,
      deviceId: getDeviceId(),
    });
    await refresh();
    void syncConnectedCloud().then((synced) => { if (synced) void refresh(); }).catch(() => {});
    notify("Checked in.");
  };

  const learningWorkspaceProps: LearningWorkspaceProps = {
    tracks: learningTracks,
    logs: learningLogs,
    today: todayKey,
    onSaveTrack: saveLearningTrack,
    onCheckIn: checkInGrowth,
  };

  const openReadingItem = async (item: ReadingItem) => {
    if (item.readStatus === "unread") {
      await readingRepository.update(item.id, { readStatus: "reading" });
      await refresh();
    }
    openSmartLink(item);
  };

  const markReadingItemRead = async (item: ReadingItem) => {
    await readingRepository.update(item.id, { readStatus: "completed" });
    await refresh();
    notify("Moved to reading archive.");
  };

  const deleteReadingItem = async (item: ReadingItem) => {
    await readingRepository.update(item.id, { deletedAt: new Date().toISOString() });
    await refresh();
    notify("Reading item deleted.");
  };

  const restoreReadingItem = async (item: ReadingItem) => {
    await readingRepository.update(item.id, { readStatus: "unread" });
    await refresh();
    notify("Returned to Read Later.");
  };

  const saveTask = async (id: string, changes: UpdateTaskInput) => {
    const current = tasks.find((task) => task.id === id);
    const { status, scheduledDate, ...fields } = changes;
    if (scheduledDate !== undefined && scheduledDate !== current?.scheduledDate) {
      await taskRepository.moveTaskToDate(id, scheduledDate, todayKey);
    }
    if (Object.keys(fields).length > 0) await taskRepository.updateTask(id, fields);
    if (status && status !== current?.status) {
      if (status === "completed") await taskRepository.completeTask(id);
      if (status === "open") await taskRepository.reopenTask(id);
      if (status === "archived") await taskRepository.archiveTask(id);
    }
    await refresh();
    notify("Task updated.");
  };

  const toggleTaskDone = useCallback(async (task: FlowTask, date: string) => {
    if (task.recurrence) {
      const done = (task.completedDates ?? []).includes(date);
      const completedDates = done
        ? (task.completedDates ?? []).filter((day) => day !== date)
        : [...(task.completedDates ?? []), date].sort();
      await taskRepository.updateTask(task.id, { completedDates });
      await refresh();
      notify(done ? "Marked as not done." : "Marked done for this day.");
      return;
    }
    if (task.status === "completed") {
      await taskRepository.reopenTask(task.id);
      await refresh();
      notify("Task reopened.");
    } else {
      await taskRepository.completeTask(task.id);
      await refresh();
      notify("Task completed.");
    }
  }, [notify, refresh]);

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
    await taskRepository.moveTaskToDate(task.id, scheduledDate, todayKey);
    await refresh();
    notify(`Scheduled for ${scheduledDate}.`);
  };

  const convertTaskToEvent = async (task: FlowTask) => {
    const nextEvent = taskToEvent(task, todayKey);
    await taskRepository.softDeleteTask(task.id);
    await saveEvent(nextEvent);
    setSelectedDate(nextEvent.startDate);
    await refresh();
    notify("Converted to event.");
  };

  const convertEventToTask = async (event: CalendarEvent) => {
    if (!canConvertEvent(event)) {
      notify("Recurring events can’t be converted.");
      return;
    }
    const nextTask = eventToTask(event, todayKey);
    await softDeleteEvent(event);
    await taskRepository.putTask(nextTask);
    await refresh();
    notify("Converted to task.");
  };

  const deleteTask = async (task: FlowTask) => {
    await taskRepository.softDeleteTask(task.id);
    await refresh();
    notify("Task deleted.");
  };

  const persistCalendarDate = useCallback(async (item: CalendarDragItem, date: string) => {
    if (item.type === "task") {
      await taskRepository.moveTaskToDate(item.id, date, todayKey);
    } else {
      const current = events.find((event) => event.id === item.id);
      if (!current || current.recurrence) throw new Error("This event cannot be moved from the calendar.");
      await saveEvent(rescheduledEvent(current, date, new Date().toISOString()));
    }
    await refresh();
    void syncConnectedCloud()
      .then((synced) => { if (synced) void refresh(); })
      .catch(() => { /* The local move remains safely saved while offline. */ });
  }, [events, refresh, todayKey]);

  const moveCalendarEntry = useCallback(async (item: CalendarDragItem, targetDate: string) => {
    if (targetDate === item.sourceDate) return;
    try {
      await persistCalendarDate(item, targetDate);
      notify(`Moved to ${formatMovedDate(targetDate)}`, {
        label: "Undo",
        run: () => {
          window.clearTimeout(toastTimer.current);
          setToast(undefined);
          void persistCalendarDate({ ...item, sourceDate: targetDate }, item.sourceDate)
            .then(() => notify(`Restored to ${formatMovedDate(item.sourceDate)}.`))
            .catch(() => notify("Could not undo the move."));
        },
      });
    } catch {
      notify("Could not move this item.");
    }
  }, [notify, persistCalendarDate]);

  const calendarDrag = useCalendarDrag({
    onDrop: moveCalendarEntry,
    onRecurringBlocked: useCallback(
      () => notify("Open event details to reschedule a recurring event."),
      [notify],
    ),
  });

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
        </div> : <div className="flowTopTitle">{activeView === "reading" ? "Read Later" : activeView === "completed" ? "Completed" : activeView === "learning" ? "Growth" : "Calendar + Flow"}</div>}
        <div className="topActions">
          <button className="iconButton" onClick={() => setSearchOpen(true)} aria-label="Search events and tasks" title="Search"><Search /></button>
          <button className="primaryButton newEventButton readLaterEntry" onClick={() => activeView === "learning"
            ? document.getElementById("growth-add")?.click()
            : void openReadLaterCapture()} aria-label={activeView === "learning" ? "Add Growth item" : "Save to Read Later"} title={activeView === "learning" ? "Add Growth item" : "Save to Read Later"}>
            <Plus />
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
              {categories
                .filter((category) => category.id !== FALLBACK_CATEGORY_ID && categoryItemCount(category.id, events, tasks) > 0)
                .map((category) => {
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
                    <small>{categoryItemCount(category.id, events, tasks)}</small>
                  </label>
                );
              })}
            </div>
            <button className="manageCalendarsButton" onClick={() => setCalendarsOpen(true)}>Manage calendars</button>
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
              const dayEntries = gridEntriesByDate.get(key) ?? [];
              const isToday = key === toDateKey(today);
              const selected = key === selectedDate;
              const outside = date.getMonth() !== visibleMonth.getMonth();
              return (
                <div
                  className={`dayCell ${outside ? "outsideMonth" : ""} ${selected ? "selectedDay" : ""} ${calendarDrag.active?.targetDate === key ? "dragDropTarget" : ""}`}
                  key={key}
                  data-day-cell
                  data-date-key={key}
                  role="button"
                  tabIndex={0}
                  aria-selected={selected}
                  aria-label={`${longDateLabel(date)}, ${dayEntries.length} ${dayEntries.length === 1 ? "item" : "items"}`}
                  onClick={(event) => {
                    if (calendarDrag.suppressClick()) {
                      event.preventDefault();
                      event.stopPropagation();
                      return;
                    }
                    setSelectedDate(key);
                    setDayPanelOpen(true);
                  }}
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
                    {dayEntries.slice(0, 2).map((entry) => {
                      if (entry.type === "event") {
                        const category = categoryById(entry.event.categoryId);
                        const dragItem = calendarDragItem(entry);
                        return (
                          <button
                            className={`eventItem ${calendarDrag.isSource(dragItem) ? "calendarDragSource" : ""}`}
                            key={entry.id}
                            title={entry.event.title}
                            onPointerDown={(event) => calendarDrag.onPointerDown(event, dragItem)}
                            onClick={(clickEvent) => {
                            if (calendarDrag.suppressClick()) {
                              clickEvent.preventDefault();
                              clickEvent.stopPropagation();
                              return;
                            }
                            clickEvent.stopPropagation();
                            selectEvent(entry.event);
                          }}>
                            <span className="eventAccent" style={{ background: category?.color }} />
                            {!entry.event.allDay && <time>{entry.event.startTime}</time>}
                            <span className="eventTitle">{entry.event.title}</span>
                            {(entry.event.recurrence || entry.event.recurrenceParentId) && <span className="repeatMark" aria-label="Recurring event">↻</span>}
                          </button>
                        );
                      }
                      const dragItem = calendarDragItem(entry);
                      return (
                        <button
                          className={`calendarTaskItem ${calendarDrag.isSource(dragItem) ? "calendarDragSource" : ""}`}
                          key={entry.id}
                          title={entry.task.title}
                          onPointerDown={(event) => calendarDrag.onPointerDown(event, dragItem)}
                          onClick={(clickEvent) => {
                          if (calendarDrag.suppressClick()) {
                            clickEvent.preventDefault();
                            clickEvent.stopPropagation();
                            return;
                          }
                          clickEvent.stopPropagation();
                          setEditingTask(entry.task);
                        }}>
                          <span className="priorityBar" style={{ background: priorityColor(entry.task.priority) }} />
                          {entry.task.scheduledTime && <time>{entry.task.scheduledTime}</time>}
                          <span>{entry.task.title}</span>
                          {entry.task.recurrence && <span className="repeatMark" aria-label="Recurring task">↻</span>}
                        </button>
                      );
                    })}
                    {dayEntries.length > 2 && (
                      <button
                        className="moreEvents"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setSelectedDate(key);
                          setDayPanelOpen(true);
                        }}
                      >
                        +{dayEntries.length - 2} more
                      </button>
                    )}
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
              <button
                className={`mobileEventRow ${calendarDrag.isSource(calendarDragItem(entry)) ? "calendarDragSource" : ""}`}
                key={entry.id}
                onPointerDown={(event) => calendarDrag.onPointerDown(event, calendarDragItem(entry))}
                onClick={(event) => {
                  if (calendarDrag.suppressClick()) {
                    event.preventDefault();
                    return;
                  }
                  selectEvent(entry.event);
                }}>
                <span className="categoryDot" style={{ background: categoryById(entry.event.categoryId)?.color }} />
                <span><strong>{entry.event.title}</strong><small>{entry.event.allDay ? "Event · All day" : `Event · ${entry.event.startTime}`}</small></span>
                <ChevronRight />
              </button>
            ) : (
              <button
                className={`mobileEventRow ${isTaskDoneOn(entry.task, entry.date) ? "completed" : ""} ${calendarDrag.isSource(calendarDragItem(entry)) ? "calendarDragSource" : ""}`}
                key={entry.id}
                onPointerDown={(event) => calendarDrag.onPointerDown(event, calendarDragItem(entry))}
                onClick={(event) => {
                  if (calendarDrag.suppressClick()) {
                    event.preventDefault();
                    return;
                  }
                  setEditingTask(entry.task);
                }}>
                <TaskCheckbox
                  checked={isTaskDoneOn(entry.task, entry.date ?? entry.task.scheduledDate ?? todayKey)}
                  label={entry.task.title}
                  onChange={() => void toggleTaskDone(entry.task, entry.date ?? entry.task.scheduledDate ?? todayKey)}
                />
                <span><strong><span className="priorityMark" aria-hidden="true">{priorityMark(entry.task.priority)}</span> {entry.task.title}</strong><small>{entry.task.scheduledTime ? `Task · ${entry.task.scheduledTime}` : "Task · No time"}{entry.task.categoryId && categoryById(entry.task.categoryId) ? ` · ${categoryById(entry.task.categoryId)!.name}` : ""}</small></span>
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
            onAddTask={() => openCapture({ bucket: flowBucketForScheduledDate(selectedDate, todayKey), scheduledDate: selectedDate, categoryId: focusCategoryId })}
            onOpenEvent={selectEvent}
            onOpenTask={setEditingTask}
            onCompleteTask={(task) => void toggleTaskDone(task, selectedDate)}
            onReopenTask={(task) => void toggleTaskDone(task, selectedDate)}
            onReturnToInbox={(task) => void moveTask(task, "inbox")}
            onDragStart={(event, item) => calendarDrag.onPointerDown(event, item)}
            isDragSource={calendarDrag.isSource}
          />
        </section> : activeView === "reading" ? <ReadingWorkspace
          items={readingItems}
          today={todayKey}
          onCreate={createReadingItem}
          onOpen={(item) => void openReadingItem(item)}
          onMarkRead={(item) => void markReadingItemRead(item)}
          onDelete={(item) => void deleteReadingItem(item)}
          onRestore={(item) => void restoreReadingItem(item)}
        /> : <FlowWorkspace
          view={activeView}
          tasks={tasks}
          categories={categories}
          today={todayKey}
          mobileBucket={mobileFlowBucket}
          onMobileBucketChange={setMobileFlowBucket}
          onCreate={(input) => createTask(input.categoryId ? input : { ...input, categoryId: focusCategoryId })}
          onEdit={setEditingTask}
          onComplete={(task) => void toggleTaskDone(task, todayKey)}
          onReopen={(task) => void toggleTaskDone(task, todayKey)}
          onArchive={async (task) => { await taskRepository.archiveTask(task.id); await refresh(); notify("Task archived."); }}
          onMove={(task, bucket) => void moveTask(task, bucket)}
          onPlace={(taskId, bucket, previousOrder, nextOrder) => void placeTask(taskId, bucket, previousOrder, nextOrder)}
          onSchedule={(task, date) => void scheduleTask(task, date)}
          onDelete={(task) => void deleteTask(task)}
          onReorder={async (ids) => { await taskRepository.reorderTasks(ids); await refresh(); }}
          learning={learningWorkspaceProps}
        />}
      </div>

      <nav className="mobileBottomNav" aria-label="Primary navigation">
        <button className={activeView === "month" ? "active" : ""} aria-current={activeView === "month" ? "page" : undefined} onClick={() => selectView("month")}><CalendarIcon /><span>Month</span></button>
        <button className={activeView === "flow" && mobileFlowBucket === "today" ? "active" : ""} aria-current={activeView === "flow" && mobileFlowBucket === "today" ? "page" : undefined} onClick={() => { setMobileFlowBucket("today"); selectView("flow"); }}><Sun /><span>Today</span></button>
        <button className={activeView === "flow" && mobileFlowBucket === "inbox" ? "active" : ""} aria-current={activeView === "flow" && mobileFlowBucket === "inbox" ? "page" : undefined} onClick={() => { setMobileFlowBucket("inbox"); selectView("flow"); }}><InboxIcon /><span>Inbox</span></button>
        <button className={activeView === "reading" ? "active" : ""} aria-current={activeView === "reading" ? "page" : undefined} onClick={() => selectView("reading")}><BookOpen /><span>Reading</span></button>
        <button className="mobileAdd" onClick={() => activeView === "learning"
          ? document.getElementById("growth-add")?.click()
          : void openReadLaterCapture()} aria-label={activeView === "learning" ? "Add Growth item" : "Save to Read Later"} title={activeView === "learning" ? "Add Growth item" : "Save to Read Later"}><Plus /></button>
        <button onClick={() => setSidebarOpen(true)}><Menu /><span>More</span></button>
      </nav>

      <CalendarsDialog
        open={calendarsOpen}
        categories={categories}
        events={events}
        tasks={tasks}
        onClose={() => setCalendarsOpen(false)}
        onChanged={refresh}
      />
      <EventDrawer open={drawerOpen} date={selectedDate} event={editingEvent} categories={categories} onClose={() => setDrawerOpen(false)} onSave={saveDraft} onDelete={editingEvent ? removeEvent : undefined} onConvert={editingEvent ? () => { const target = editingEvent; setDrawerOpen(false); setEditingEvent(undefined); void convertEventToTask(target); } : undefined} />
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
      <QuickCapture open={captureOpen} defaults={captureDefaults} categories={categories} onClose={() => setCaptureOpen(false)} onCreate={createTask} onCreateReading={createReadingItem} />
      <ReadLaterCapture open={readLaterOpen} link={clipboardLink} onClose={() => setReadLaterOpen(false)} onSave={createReadingItem} />
      {editingTask && <TaskEditorDrawer
        key={editingTask.id}
        task={editingTask}
        categories={categories}
        today={todayKey}
        onClose={() => setEditingTask(undefined)}
        onSave={saveTask}
        onConvert={editingTask && editingTask.kind !== "readLater" ? () => { const target = editingTask; setEditingTask(undefined); void convertTaskToEvent(target); } : undefined}
        onToggleDone={async (target, nextDone) => {
          if (target.recurrence) {
            const date = target.scheduledDate ?? todayKey;
            const completedDates = nextDone
              ? [...new Set([...(target.completedDates ?? []), date])].sort()
              : (target.completedDates ?? []).filter((day) => day !== date);
            await taskRepository.updateTask(target.id, { completedDates });
          } else if (nextDone) {
            await taskRepository.setDone(target.id);
          } else {
            await taskRepository.setOpen(target.id);
          }
          await refresh();
          notify(nextDone ? "Task completed." : "Task reopened.");
        }}
        onDelete={async (id) => { await taskRepository.softDeleteTask(id); await refresh(); notify("Task deleted."); }}
      />}
      <ScopeDialog open={Boolean(scopeRequest)} action={scopeRequest?.action ?? "edit"} onChoose={(scope) => void chooseScope(scope)} onClose={() => setScopeRequest(undefined)} />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} onChanged={refresh} notify={notify} />
      {calendarDrag.active && <div
        className="calendarDragPreview"
        style={{ transform: `translate3d(${calendarDrag.active.clientX + 12}px, ${calendarDrag.active.clientY + 12}px, 0)` }}
        aria-hidden="true"
      >{calendarDrag.active.item.title}</div>}
      {toast && <div className="toast" role="status">
        <span>{toast.message}</span>
        {toast.actionLabel && toast.onAction && <button onClick={toast.onAction}>· {toast.actionLabel}</button>}
      </div>}
    </main>
  );
}
