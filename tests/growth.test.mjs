import assert from "node:assert/strict";
import test from "node:test";

import { dateRange, growthCheckinDates, growthCounts, momentDayCount, trailingDateRange } from "../app/src/learning/growthStats.ts";

const track = {
  id: "piano",
  title: "Piano",
  icon: "🎹",
  currentStage: "",
  goal: "",
  nextStep: "",
  weeklyTarget: 0,
  progressMetric: "sessions",
  milestones: [],
  archived: false,
  createdAt: "2026-08-01T08:00:00.000Z",
  updatedAt: "2026-08-01T08:00:00.000Z",
  deviceId: "test",
};

const log = (id, date, overrides = {}) => ({
  id,
  learningTrackId: "piano",
  date,
  title: "Check-in",
  createdAt: `${date}T08:00:00.000Z`,
  updatedAt: `${date}T08:00:00.000Z`,
  deviceId: "test",
  ...overrides,
});

test("legacy Learning progress dates become Growth check-ins without migration", () => {
  const dates = growthCheckinDates(track, [
    log("one", "2026-07-31", { title: "Practiced scales", duration: 30, notes: "Legacy detail" }),
    log("two", "2026-08-25"),
    log("duplicate", "2026-08-25"),
    log("deleted", "2026-08-24", { deletedAt: "2026-08-25T09:00:00.000Z" }),
  ]);
  assert.deepEqual(dates, ["2026-07-31", "2026-08-25"]);
});

test("Growth counts total and current-month check-in dates", () => {
  assert.deepEqual(
    growthCounts(["2026-07-31", "2026-08-01", "2026-08-25"], "2026-08-25"),
    { total: 3, month: 2 },
  );
});

test("custom check-ins expand an inclusive local date range", () => {
  assert.deepEqual(dateRange("2026-08-23", "2026-08-25"), ["2026-08-23", "2026-08-24", "2026-08-25"]);
  assert.deepEqual(dateRange("2026-08-25"), ["2026-08-25"]);
  assert.deepEqual(dateRange("2026-08-25", "2026-08-23"), []);
});

test("existing streak import generates consecutive dates ending locally", () => {
  assert.deepEqual(trailingDateRange(3, "2026-08-25"), ["2026-08-23", "2026-08-24", "2026-08-25"]);
  assert.equal(trailingDateRange(86, "2026-08-25").length, 86);
  assert.deepEqual(trailingDateRange(0, "2026-08-25"), []);
});

test("Moments count days since or until without UTC shifts", () => {
  assert.equal(momentDayCount("2026-08-20", "2026-08-26", "since"), 6);
  assert.equal(momentDayCount("2026-10-02", "2026-08-26", "until"), 37);
});
