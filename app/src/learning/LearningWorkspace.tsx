"use client";

import { useState } from "react";
import { Plus } from "../icons";
import type { Category, GrowthMoment, LearningProgressLog, LearningTrack } from "../types";
import { CheckinDatesDialog, MomentFormDialog } from "./GrowthDialogs";
import { GrowthItemFormDialog } from "./LearningTrackFormDialog";
import { growthCheckinDates, growthCounts } from "./growthStats";
import { momentProgress, momentValueLabel, type MomentUnit } from "./momentHelpers";

export type LearningWorkspaceProps = {
  tracks: LearningTrack[];
  logs: LearningProgressLog[];
  moments: GrowthMoment[];
  categories: Category[];
  today: string;
  onSaveTrack: (track: LearningTrack) => Promise<void>;
  onCheckIn: (track: LearningTrack) => Promise<void>;
  onAddCheckins: (track: LearningTrack, dates: string[]) => Promise<void>;
  onRemoveCheckin: (track: LearningTrack, date: string) => Promise<void>;
  onSaveMoment: (moment: GrowthMoment) => Promise<void>;
  onDeleteMoment: (moment: GrowthMoment) => Promise<void>;
};

const startedLabel = (track: LearningTrack) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(`${track.startedDate ?? track.createdAt.slice(0, 10)}T12:00:00`));

export function LearningWorkspace({
  tracks,
  logs,
  moments,
  categories,
  today,
  onSaveTrack,
  onCheckIn,
  onAddCheckins,
  onRemoveCheckin,
  onSaveMoment,
  onDeleteMoment,
}: LearningWorkspaceProps) {
  const [editingTrack, setEditingTrack] = useState<LearningTrack>();
  const [formOpen, setFormOpen] = useState(false);
  const [busyTrackId, setBusyTrackId] = useState<string>();
  const [datesTrack, setDatesTrack] = useState<LearningTrack>();
  const [momentFormOpen, setMomentFormOpen] = useState(false);
  const [editingMoment, setEditingMoment] = useState<GrowthMoment>();
  const active = tracks
    .filter((track) => !track.archived)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <section className="flowWorkspace learningWorkspace">
      <header className="flowHeader">
        <div>
          <p className="eyebrow">Small steps, over time</p>
          <h1>Growth <span className="growthTitleIcon" aria-hidden="true">🌱</span></h1>
          <p>A quiet place to notice the things you keep returning to.</p>
        </div>
        <button id="growth-add" className="primaryButton" onClick={() => { setEditingTrack(undefined); setFormOpen(true); }}>
          <Plus />New Growth Item
        </button>
      </header>

      <section className="growthSection momentsSection" aria-labelledby="moments-title">
        <div className="growthSectionHeading"><h2 id="moments-title">Moments</h2><button onClick={() => { setEditingMoment(undefined); setMomentFormOpen(true); }}><Plus />Add moment</button></div>
        {moments.length ? <div className="momentList">{[...moments].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((moment) => {
          const progress = momentProgress(moment, today);
          const dateLabel = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${moment.date}T12:00:00`));
          const calendarName = categories.find((category) => category.id === moment.calendarReminder?.calendarId)?.name;
          return <article className="momentCard" key={moment.id}>
            <span className="momentIcon" aria-hidden="true">{moment.icon}</span>
            <div className="momentBody">
              <div className="momentTitleRow"><strong>{moment.name}</strong><button className="momentEditButton" onClick={() => { setEditingMoment(moment); setMomentFormOpen(true); }}>Edit</button></div>
              <label className="momentUnitSelect"><span>{momentValueLabel(moment, today)}</span><select aria-label={`Time unit for ${moment.name}`} value={moment.displayUnit ?? "days"} onChange={(event) => void onSaveMoment({ ...moment, displayUnit: event.target.value as MomentUnit, updatedAt: new Date().toISOString() })}><option value="days">Days</option><option value="months">Months</option><option value="years">Years</option></select></label>
              <small>{moment.type} {dateLabel}</small>
              {progress && <div className="momentProgressBlock">{progress.nextDate && <small>Next anniversary · {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${progress.nextDate}T12:00:00`))}</small>}<div className="momentProgressTrack" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.ratio * 100)}><span style={{ width: `${progress.ratio * 100}%` }} /></div></div>}
              {calendarName && moment.calendarReminder?.enabled && <small className="momentCalendarName">{calendarName}</small>}
            </div>
          </article>;
        })}</div> : <p className="growthEmpty">Keep a meaningful beginning or something worth looking forward to.</p>}
      </section>

      {active.length ? (
        <section className="growthSection" aria-labelledby="growing-title">
          <h2 id="growing-title">Growing</h2>
          <div className="growthGrid">{active.map((track) => {
            const dates = growthCheckinDates(track, logs);
            const counts = growthCounts(dates, today);
            const checkedInToday = dates.includes(today);
            return (
              <article className="growthCard" key={track.id}>
                <div className="growthCardHead">
                  <span className="growthCardIcon" aria-hidden="true">{track.icon}</span>
                  <div>
                    <strong>{track.title}</strong>
                    <small>Started {startedLabel(track)}</small>
                  </div>
                  <button className="growthEditButton" onClick={() => { setEditingTrack(track); setFormOpen(true); }}>Edit</button>
                </div>
                <div className="growthCounts" aria-label={`${counts.total} total check-ins, ${counts.month} this month`}>
                  <span><strong>{counts.total}</strong><small>{counts.total === 1 ? "practice" : "practices"}</small></span>
                  <span><strong>{counts.month}</strong><small>this month</small></span>
                </div>
                <div className="growthCardActions"><button
                    className={checkedInToday ? "growthCheckinButton checked" : "growthCheckinButton"}
                    disabled={busyTrackId === track.id}
                    onClick={async () => { setBusyTrackId(track.id); try { await onCheckIn(track); } finally { setBusyTrackId(undefined); } }}
                  >{busyTrackId === track.id ? "Saving…" : checkedInToday ? "✓ Checked in today" : "Check in"}</button>
                  <button className="growthPastButton" aria-label={`Add or edit past check-ins for ${track.title}`} title="Add past check-in" onClick={() => setDatesTrack(track)}><Plus /></button></div>
              </article>
            );
          })}</div>
        </section>
      ) : (
        <section className="learningSection">
          <p className="emptyTaskList">No Growth items yet. Add something you want to keep showing up for.</p>
        </section>
      )}

      <GrowthItemFormDialog
        open={formOpen}
        track={editingTrack}
        onClose={() => setFormOpen(false)}
        onSave={onSaveTrack}
      />
      <CheckinDatesDialog open={Boolean(datesTrack)} track={datesTrack} dates={datesTrack ? growthCheckinDates(datesTrack, logs) : []} today={today} onClose={() => setDatesTrack(undefined)} onAdd={(dates) => onAddCheckins(datesTrack!, dates)} onRemove={(date) => onRemoveCheckin(datesTrack!, date)} />
      <MomentFormDialog open={momentFormOpen} moment={editingMoment} categories={categories} onClose={() => setMomentFormOpen(false)} onSave={onSaveMoment} onDelete={onDeleteMoment} />
    </section>
  );
}
