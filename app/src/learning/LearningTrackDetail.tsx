"use client";

import { useMemo, useState } from "react";
import { getDeviceId } from "../device";
import { Archive, Check, ChevronDown, ChevronLeft, ChevronUp, MoreHorizontal, Plus, X } from "../icons";
import type { LearningMilestone, LearningProgressLog, LearningTrack } from "../types";
import { LearningTrackFormDialog } from "./LearningTrackFormDialog";
import { currentStreak, progressLabel, progressRatio, weeklyProgress } from "./learningStats";

type Props = {
  track: LearningTrack;
  logs: LearningProgressLog[];
  today: string;
  onBack: () => void;
  onUpdateTrack: (track: LearningTrack) => Promise<void>;
  onDeleteTrack: (track: LearningTrack) => Promise<void>;
  onSaveLog: (log: LearningProgressLog) => Promise<void>;
  onDeleteLog: (log: LearningProgressLog) => Promise<void>;
  onAddTask: (track: LearningTrack, bucket: "today" | "thisWeek") => Promise<void>;
  onScheduleEvent: (title: string) => void;
};

const shortDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const targetChoices = [1, 2, 3, 4, 5, 6, 7, 10, 12, 15, 20, 30, 60, 90, 120, 180, 240];

export function LearningTrackDetail({
  track, logs, today, onBack, onUpdateTrack, onDeleteTrack, onSaveLog, onDeleteLog, onAddTask, onScheduleEvent,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [trackFormOpen, setTrackFormOpen] = useState(false);
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string>();
  const [logTitle, setLogTitle] = useState("");
  const [logDuration, setLogDuration] = useState("");
  const [logDate, setLogDate] = useState(today);
  const [logStage, setLogStage] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [milestoneAddOpen, setMilestoneAddOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [editingMilestoneId, setEditingMilestoneId] = useState<string>();
  const [milestoneDraft, setMilestoneDraft] = useState("");

  const trackLogs = useMemo(
    () => logs
      .filter((log) => log.learningTrackId === track.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [logs, track.id],
  );
  const progress = weeklyProgress(track, logs, today);
  const streak = currentStreak(trackLogs, today);
  const lastPractice = trackLogs[0]?.date;
  const unit = progress.metric === "duration" ? "minutes" : progress.unit;
  const completedMilestones = track.milestones.filter((milestone) => milestone.completed).length;

  const patchTrack = (patch: Partial<LearningTrack>) =>
    onUpdateTrack({ ...track, ...patch, updatedAt: new Date().toISOString() });

  const practicedToday = async () => {
    const timestamp = new Date().toISOString();
    await onSaveLog({
      id: crypto.randomUUID(),
      learningTrackId: track.id,
      date: today,
      title: `Practiced ${track.title}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      deviceId: getDeviceId(),
    });
  };

  const resetLogForm = () => {
    setEditingLogId(undefined);
    setLogTitle("");
    setLogDuration("");
    setLogDate(today);
    setLogStage("");
    setLogNotes("");
  };

  const submitLog = async () => {
    const title = logTitle.trim();
    if (!title && !editingLogId) return;
    const timestamp = new Date().toISOString();
    const existing = editingLogId ? trackLogs.find((log) => log.id === editingLogId) : undefined;
    await onSaveLog({
      id: existing?.id ?? crypto.randomUUID(),
      learningTrackId: track.id,
      date: logDate || today,
      title: title || existing?.title || `Practiced ${track.title}`,
      duration: logDuration ? Math.max(0, Number(logDuration)) || undefined : undefined,
      stage: logStage.trim() || undefined,
      notes: logNotes.trim() || undefined,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      deviceId: existing?.deviceId ?? getDeviceId(),
    });
    const stage = logStage.trim();
    if (stage && stage !== track.currentStage) await patchTrack({ currentStage: stage });
    resetLogForm();
    setLogFormOpen(false);
  };

  const startEditLog = (log: LearningProgressLog) => {
    setEditingLogId(log.id);
    setLogTitle(log.title);
    setLogDuration(log.duration ? String(log.duration) : "");
    setLogDate(log.date);
    setLogStage(log.stage ?? "");
    setLogNotes(log.notes ?? "");
    setLogFormOpen(true);
  };

  const addMilestone = async () => {
    const title = milestoneTitle.trim();
    if (!title) return;
    await patchTrack({ milestones: [...track.milestones, { id: crypto.randomUUID(), title, completed: false }] });
    setMilestoneTitle("");
    setMilestoneAddOpen(false);
  };

  const patchMilestone = (id: string, patch: Partial<LearningMilestone>) =>
    patchTrack({ milestones: track.milestones.map((milestone) => (milestone.id === id ? { ...milestone, ...patch } : milestone)) });

  const toggleMilestone = (milestone: LearningMilestone) =>
    patchMilestone(milestone.id, milestone.completed
      ? { completed: false, completedAt: undefined }
      : { completed: true, completedAt: new Date().toISOString() });

  const moveMilestone = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= track.milestones.length) return;
    const milestones = [...track.milestones];
    const [moved] = milestones.splice(index, 1);
    milestones.splice(target, 0, moved);
    void patchTrack({ milestones });
  };

  const nextStepTitle = track.nextStep.trim() || `Practice ${track.title}`;
  const subtitle = track.goal.trim();

  return (
    <section className="flowWorkspace learningWorkspace learningDetail">
      <header className="learningHero">
        <div className="learningHeroTop">
          <button className="iconButton learningBack" onClick={onBack} aria-label="Back to Learning overview"><ChevronLeft /></button>
          <div className="learningHeroBody">
            <span className="learningHeroIcon" aria-hidden="true">{track.icon}</span>
            <h1>{track.title}</h1>
            {subtitle && <p className="learningHeroSubtitle">{subtitle}</p>}
            <div className="learningChips">
              {track.currentStage && <span className="learningChip">{track.currentStage}</span>}
              <span className="learningChip">
                {progress.target > 0 ? `${progress.value} / ${progress.target} ${unit} this week` : progressLabel(progress)}
              </span>
              {streak > 1 && <span className="learningChip accent">{streak}-day streak</span>}
            </div>
            {progress.target > 0 && (
              <div className="learningBar learningHeroBar" aria-hidden="true">
                <span style={{ width: `${Math.round(progressRatio(progress) * 100)}%` }} />
              </div>
            )}
          </div>
          <div className="learningHeroActions">
            <button className="secondaryButton" onClick={() => setEditMode((current) => !current)}>
              {editMode ? "Done" : "Edit"}
            </button>
            <div className="learningMoreMenu">
              <button
                className="learningMoreButton"
                aria-label="More track actions"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((current) => !current)}
              ><MoreHorizontal /></button>
              {menuOpen && <>
                <div className="menuScrim" onClick={() => setMenuOpen(false)} role="presentation" />
                <div className="learningMenuPanel" role="menu">
                  <button role="menuitem" onClick={() => { setMenuOpen(false); setTrackFormOpen(true); }}>Edit track details</button>
                  <button role="menuitem" onClick={() => { setMenuOpen(false); void patchTrack({ archived: !track.archived }); }}>
                    <Archive />{track.archived ? "Unarchive" : "Archive"}
                  </button>
                  <button role="menuitem" className="learningMenuDanger" onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm(`Delete "${track.title}" and its progress logs?`)) void onDeleteTrack(track);
                  }}><X />Delete</button>
                </div>
              </>}
            </div>
          </div>
        </div>
      </header>

      <section className="learningNextStep">
        <p className="learningNextStepLabel">Next step</p>
        {editMode ? (
          <label className="learningField">Next action
            <input key={`next-${track.updatedAt}`} defaultValue={track.nextStep} placeholder="e.g. Complete Unit 7"
              onBlur={(event) => { const value = event.target.value.trim(); if (value !== track.nextStep) void patchTrack({ nextStep: value }); }} />
          </label>
        ) : (
          <p className="learningNextStepAction">{nextStepTitle}</p>
        )}
        <div className="learningStepActions">
          <button className="primaryButton" onClick={() => void onAddTask(track, "today")}>Add to Today</button>
          <button className="ghostButton" onClick={() => void onAddTask(track, "thisWeek")}>Add to This Week</button>
          <button className="ghostButton" onClick={() => onScheduleEvent(nextStepTitle)}>Schedule</button>
        </div>
      </section>

      <div className="learningColumns">
        <section className="learningBlock">
          <div className="learningBlockHeader"><h2>Overview</h2></div>
          {editMode ? <>
            <label className="learningField">Current stage
              <input key={`stage-${track.updatedAt}`} defaultValue={track.currentStage} placeholder="e.g. Duolingo Section 2 · Unit 6"
                onBlur={(event) => { const value = event.target.value.trim(); if (value !== track.currentStage) void patchTrack({ currentStage: value }); }} />
            </label>
            <label className="learningField">Goal
              <input key={`goal-${track.updatedAt}`} defaultValue={track.goal} placeholder="e.g. Complete Section 2 by the end of August"
                onBlur={(event) => { const value = event.target.value.trim(); if (value !== track.goal) void patchTrack({ goal: value }); }} />
            </label>
            <label className="learningField">Weekly goal
              <select
                value={targetChoices.includes(track.weeklyTarget) ? track.weeklyTarget : "custom"}
                onChange={(event) => { const value = Number(event.target.value); if (!Number.isNaN(value)) void patchTrack({ weeklyTarget: value }); }}
              >
                {targetChoices.map((choice) => (
                  <option key={choice} value={choice}>{choice} {unit} per week</option>
                ))}
                {!targetChoices.includes(track.weeklyTarget) && (
                  <option value="custom">{track.weeklyTarget} {unit} per week</option>
                )}
              </select>
            </label>
          </> : <>
            <div className="learningAboutRow">
              <span className="learningAboutLabel">Current stage</span>
              <span className={`learningAboutValue ${track.currentStage ? "" : "unset"}`}>{track.currentStage || "Not set yet"}</span>
            </div>
            <div className="learningAboutRow">
              <span className="learningAboutLabel">Goal</span>
              <span className={`learningAboutValue ${track.goal ? "" : "unset"}`}>{track.goal || "Not set yet"}</span>
            </div>
            <div className="learningAboutRow">
              <span className="learningAboutLabel">Weekly goal</span>
              <span className="learningAboutValue">{track.weeklyTarget > 0 ? `${track.weeklyTarget} ${unit} per week` : "No target set"}</span>
            </div>
          </>}
        </section>

        <section className="learningBlock">
          <div className="learningBlockHeader"><h2>Progress</h2></div>
          <div className="learningStats">
            <div className="learningStat">
              <span className="learningStatLabel">This week</span>
              <span className="learningStatValue">{progressLabel(progress)}</span>
            </div>
            <div className="learningStat">
              <span className="learningStatLabel">Streak</span>
              <span className="learningStatValue">{streak > 0 ? `${streak} ${streak === 1 ? "day" : "days"}` : "—"}</span>
              <span className="learningStatHint">{streak > 0 ? "Keep it going" : "Log a session to start"}</span>
            </div>
            <div className="learningStat">
              <span className="learningStatLabel">Last practice</span>
              <span className="learningStatValue">{lastPractice ? shortDate(lastPractice) : "—"}</span>
            </div>
          </div>
          <div className="learningLogActions">
            <button className="primaryButton" onClick={() => void practicedToday()}><Check />Practiced Today</button>
            <button className="ghostButton" onClick={() => {
              if (logFormOpen && !editingLogId) setLogFormOpen(false);
              else { resetLogForm(); setLogFormOpen(true); }
            }}>{logFormOpen && !editingLogId ? "Close form" : "Log Progress"}</button>
          </div>
          {logFormOpen && (
            <form className="learningLogForm" onSubmit={(event) => { event.preventDefault(); void submitLog(); }}>
              {editingLogId && <p className="learningLogEditingNote">Editing log from {shortDate(trackLogs.find((log) => log.id === editingLogId)?.date ?? today)}</p>}
              <label>What did you practice?
                <input value={logTitle} onChange={(event) => setLogTitle(event.target.value)} placeholder={editingLogId ? undefined : `e.g. ${nextStepTitle}`} autoFocus={!editingLogId} />
              </label>
              <div className="learningFormRow">
                <label>Duration (min)<input type="number" min={0} value={logDuration} onChange={(event) => setLogDuration(event.target.value)} placeholder="Optional" /></label>
                <label>Date<input type="date" value={logDate} max={today} onChange={(event) => setLogDate(event.target.value)} /></label>
              </div>
              <label>Updated current stage<input value={logStage} onChange={(event) => setLogStage(event.target.value)} placeholder="Optional" /></label>
              <label>Notes<textarea value={logNotes} onChange={(event) => setLogNotes(event.target.value)} placeholder="Optional" rows={2} /></label>
              <div className="learningLogFormButtons">
                <button className="primaryButton" type="submit">{editingLogId ? "Save log" : "Add log"}</button>
                {editingLogId && <button className="ghostButton" type="button" onClick={() => { resetLogForm(); setLogFormOpen(false); }}>Cancel</button>}
              </div>
            </form>
          )}
          <ul className="learningLogList">
            {trackLogs.slice(0, 8).map((log) => (
              <li className="learningLogRow" key={log.id}>
                <div className="learningLogMain">
                  <span className="learningLogLine">
                    <span className="learningLogMeta">{shortDate(log.date)}{log.duration ? ` · ${log.duration} min` : ""} · </span>
                    <span className="learningLogTitle">{log.title}</span>
                  </span>
                  {log.notes && <small className="learningLogNotes">{log.notes}</small>}
                </div>
                <span className="learningLogRowActions">
                  <button className="iconButton" onClick={() => startEditLog(log)} aria-label={`Edit log from ${shortDate(log.date)}`}>✎</button>
                  <button className="iconButton" onClick={() => void onDeleteLog(log)} aria-label={`Delete log from ${shortDate(log.date)}`}>✕</button>
                </span>
              </li>
            ))}
            {!trackLogs.length && <li className="learningEmpty">No progress logged yet. Small sessions count.</li>}
          </ul>
        </section>
      </div>

      <section className="learningBlock learningMilestones">
        <div className="learningBlockHeader">
          <h2>Milestones</h2>
          {track.milestones.length > 0 && <span className="learningMilestoneCount">{completedMilestones} of {track.milestones.length}</span>}
        </div>
        <ul className="learningMilestoneList">
          {track.milestones.map((milestone, index) => (
            <li className={`learningMilestoneRow ${milestone.completed ? "completed" : ""}`} key={milestone.id}>
              <button
                className="milestoneToggle"
                role="checkbox"
                aria-checked={milestone.completed}
                aria-label={milestone.completed ? `Mark "${milestone.title}" as not completed` : `Mark "${milestone.title}" as completed`}
                onClick={() => void toggleMilestone(milestone)}
              >{milestone.completed ? "✓" : ""}</button>
              <div className="milestoneText">
                {editingMilestoneId === milestone.id ? (
                  <input
                    className="milestoneEditInput"
                    value={milestoneDraft}
                    autoFocus
                    onChange={(event) => setMilestoneDraft(event.target.value)}
                    onBlur={() => {
                      const value = milestoneDraft.trim();
                      if (value && value !== milestone.title) void patchMilestone(milestone.id, { title: value });
                      setEditingMilestoneId(undefined);
                    }}
                    onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }}
                  />
                ) : (
                  <span className="milestoneTitle" onClick={() => { setEditingMilestoneId(milestone.id); setMilestoneDraft(milestone.title); }}>{milestone.title}</span>
                )}
                {milestone.completed && milestone.completedAt && (
                  <span className="milestoneDate">Completed {shortDate(milestone.completedAt.slice(0, 10))}</span>
                )}
              </div>
              <span className="milestoneControls">
                <button className="iconButton" onClick={() => void moveMilestone(index, -1)} disabled={index === 0} aria-label={`Move "${milestone.title}" up`}><ChevronUp /></button>
                <button className="iconButton" onClick={() => void moveMilestone(index, 1)} disabled={index === track.milestones.length - 1} aria-label={`Move "${milestone.title}" down`}><ChevronDown /></button>
                <button className="iconButton" onClick={() => void patchTrack({ milestones: track.milestones.filter((candidate) => candidate.id !== milestone.id) })} aria-label={`Delete milestone "${milestone.title}"`}><X /></button>
              </span>
            </li>
          ))}
          {!track.milestones.length && <li className="learningEmpty">Markers for the bigger wins along the way.</li>}
        </ul>
        {milestoneAddOpen ? (
          <form className="learningMilestoneAdd" onSubmit={(event) => { event.preventDefault(); void addMilestone(); }}>
            <input value={milestoneTitle} autoFocus onChange={(event) => setMilestoneTitle(event.target.value)} placeholder="e.g. Learn Hiragana" aria-label="New milestone title"
              onKeyDown={(event) => { if (event.key === "Escape") { setMilestoneAddOpen(false); setMilestoneTitle(""); } }} />
            <button className="secondaryButton" type="submit" disabled={!milestoneTitle.trim()}>Add</button>
            <button className="ghostButton" type="button" onClick={() => { setMilestoneAddOpen(false); setMilestoneTitle(""); }}>Cancel</button>
          </form>
        ) : (
          <button className="learningAddMilestoneToggle" onClick={() => setMilestoneAddOpen(true)}><Plus />Add milestone</button>
        )}
      </section>

      <LearningTrackFormDialog open={trackFormOpen} track={track} onClose={() => setTrackFormOpen(false)} onSave={onUpdateTrack} />
    </section>
  );
}
