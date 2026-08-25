"use client";

import { useState } from "react";
import { Plus } from "../icons";
import type { LearningProgressLog, LearningTrack } from "../types";
import { GrowthItemFormDialog } from "./LearningTrackFormDialog";
import { growthCheckinDates, growthCounts } from "./growthStats";

export type LearningWorkspaceProps = {
  tracks: LearningTrack[];
  logs: LearningProgressLog[];
  today: string;
  onSaveTrack: (track: LearningTrack) => Promise<void>;
  onCheckIn: (track: LearningTrack) => Promise<void>;
};

const createdLabel = (createdAt: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(createdAt));

export function LearningWorkspace({
  tracks,
  logs,
  today,
  onSaveTrack,
  onCheckIn,
}: LearningWorkspaceProps) {
  const [editingTrack, setEditingTrack] = useState<LearningTrack>();
  const [formOpen, setFormOpen] = useState(false);
  const [busyTrackId, setBusyTrackId] = useState<string>();
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
                    <small>Created {createdLabel(track.createdAt)}</small>
                  </div>
                  <button className="growthEditButton" onClick={() => { setEditingTrack(track); setFormOpen(true); }}>Edit</button>
                </div>
                <div className="growthCounts" aria-label={`${counts.total} total check-ins, ${counts.month} this month`}>
                  <span><strong>{counts.total}</strong><small>{counts.total === 1 ? "practice" : "practices"}</small></span>
                  <span><strong>{counts.month}</strong><small>this month</small></span>
                </div>
                <button
                  className={checkedInToday ? "secondaryButton growthCheckinButton checked" : "primaryButton growthCheckinButton"}
                  disabled={checkedInToday || busyTrackId === track.id}
                  onClick={async () => {
                    setBusyTrackId(track.id);
                    try { await onCheckIn(track); } finally { setBusyTrackId(undefined); }
                  }}
                >
                  {checkedInToday ? "Checked in today" : busyTrackId === track.id ? "Checking in…" : "Check in"}
                </button>
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
    </section>
  );
}
