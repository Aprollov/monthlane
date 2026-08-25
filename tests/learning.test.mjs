import assert from "node:assert/strict";
import test from "node:test";

import { mergeBackups, normalizeBackup } from "../app/src/database.ts";
import {
  currentStreak,
  logsThisWeek,
  progressLabel,
  progressRatio,
  weekStartKey,
  weeklyProgress,
} from "../app/src/learning/learningStats.ts";

const track = (overrides = {}) => ({
  id: "track-japanese",
  title: "Japanese",
  icon: "🇯🇵",
  currentStage: "Section 2 · Unit 6",
  goal: "",
  nextStep: "Complete Unit 7",
  weeklyTarget: 5,
  progressMetric: "sessions",
  milestones: [],
  archived: false,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  deviceId: "test",
  ...overrides,
});

const log = (id, date, overrides = {}) => ({
  id,
  learningTrackId: "track-japanese",
  date,
  title: `Session ${id}`,
  createdAt: `${date}T09:00:00.000Z`,
  updatedAt: `${date}T09:00:00.000Z`,
  deviceId: "test",
  ...overrides,
});

// Wednesday 2026-08-05; week starts Monday 2026-08-03.
const today = "2026-08-05";

test("week starts on Monday", () => {
  assert.equal(weekStartKey("2026-08-05"), "2026-08-03"); // Wed -> Mon
  assert.equal(weekStartKey("2026-08-03"), "2026-08-03"); // Mon -> Mon
  assert.equal(weekStartKey("2026-08-09"), "2026-08-03"); // Sun -> Mon
  assert.equal(weekStartKey("2026-08-02"), "2026-07-27"); // prev month
});

test("logsThisWeek only keeps current week up to today", () => {
  const logs = [
    log("a", "2026-08-03"),
    log("b", "2026-08-05"),
    log("c", "2026-08-02"), // previous week
    log("d", "2026-08-06"), // future within week, not counted
  ];
  assert.deepEqual(logsThisWeek(logs, today).map((entry) => entry.id), ["a", "b"]);
});

test("sessions metric counts unique days this week", () => {
  const logs = [
    log("a", "2026-08-03"),
    log("b", "2026-08-03"), // same day, still one session day
    log("c", "2026-08-04"),
    log("x", "2026-07-28"),
    log("other", "2026-08-04", { learningTrackId: "track-piano" }),
  ];
  const progress = weeklyProgress(track(), logs, today);
  assert.equal(progress.value, 2);
  assert.equal(progress.target, 5);
  assert.equal(progressLabel(progress), "2 / 5 sessions");
  assert.equal(progressRatio(progress), 0.4);
});

test("duration metric sums minutes", () => {
  const logs = [
    log("a", "2026-08-03", { duration: 30 }),
    log("b", "2026-08-04", { duration: 45 }),
    log("c", "2026-08-04", { duration: 15 }),
  ];
  const progress = weeklyProgress(track({ progressMetric: "duration", weeklyTarget: 120 }), logs, today);
  assert.equal(progress.value, 90);
  assert.equal(progressLabel(progress), "90 / 120 min");
});

test("manual metric has no target", () => {
  const progress = weeklyProgress(track({ progressMetric: "manual" }), [log("a", "2026-08-03")], today);
  assert.equal(progress.target, 0);
  assert.equal(progressLabel(progress), "1 logs this week");
  assert.equal(progressRatio(progress), 0);
});

test("milestones metric counts completions this week", () => {
  const withMilestones = track({
    progressMetric: "milestones",
    weeklyTarget: 2,
    milestones: [
      { id: "m1", title: "Hiragana", completed: true, completedAt: "2026-08-04T10:00:00.000Z" },
      { id: "m2", title: "Old one", completed: true, completedAt: "2026-07-01T10:00:00.000Z" },
      { id: "m3", title: "Pending", completed: false },
    ],
  });
  const progress = weeklyProgress(withMilestones, [], today);
  assert.equal(progress.value, 1);
  assert.equal(progressLabel(progress), "1 / 2 milestones");
});

test("streak counts consecutive days ending today or yesterday", () => {
  assert.equal(currentStreak([log("a", "2026-08-05"), log("b", "2026-08-04"), log("c", "2026-08-03")], today), 3);
  assert.equal(currentStreak([log("a", "2026-08-04"), log("b", "2026-08-03")], today), 2);
  assert.equal(currentStreak([log("a", "2026-08-05"), log("b", "2026-08-02")], today), 1);
  assert.equal(currentStreak([log("a", "2026-08-01")], today), 0);
  assert.equal(currentStreak([], today), 0);
});

const backupShell = (overrides = {}) => ({
  version: 2,
  schemaVersion: 2,
  exportedAt: "2026-08-05T00:00:00.000Z",
  updatedAt: "2026-08-05T00:00:00.000Z",
  events: [],
  tasks: [],
  readingItems: [],
  categories: [],
  exceptions: [],
  settings: [],
  ...overrides,
});

test("legacy backups without learning data normalize to empty arrays", () => {
  const normalized = normalizeBackup(backupShell());
  assert.deepEqual(normalized.learningTracks, []);
  assert.deepEqual(normalized.learningProgressLogs, []);
});

test("learning tracks and logs merge with last-write-wins", () => {
  const local = backupShell({
    learningTracks: [track({ updatedAt: "2026-08-04T08:00:00.000Z", currentStage: "Unit 5" })],
    learningProgressLogs: [log("a", "2026-08-03")],
  });
  const incoming = backupShell({
    learningTracks: [track({ updatedAt: "2026-08-05T08:00:00.000Z", currentStage: "Unit 6" })],
    learningProgressLogs: [log("b", "2026-08-04")],
  });
  const merged = mergeBackups(local, incoming);
  assert.equal(merged.learningTracks.length, 1);
  assert.equal(merged.learningTracks[0].currentStage, "Unit 6");
  assert.equal(merged.learningProgressLogs.length, 2);
});
