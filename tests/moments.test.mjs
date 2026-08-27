import assert from "node:assert/strict";
import test from "node:test";

import { momentIdForEvent, momentProgress, momentReminderEvents, momentValueLabel, wholeCalendarMonths } from "../app/src/learning/momentHelpers.ts";

const moment = (overrides = {}) => ({
  id: "cat-lin",
  name: "Cat & Lin",
  icon: "❤️",
  date: "2024-06-18",
  type: "since",
  createdAt: "2024-06-18T08:00:00.000Z",
  updatedAt: "2026-08-27T08:00:00.000Z",
  deviceId: "test",
  ...overrides,
});

test("Moment units use exact days, whole months, and years plus remaining months", () => {
  assert.equal(wholeCalendarMonths("2024-06-18", "2026-08-17"), 25);
  assert.equal(wholeCalendarMonths("2024-06-18", "2026-08-18"), 26);
  assert.match(momentValueLabel(moment({ displayUnit: "days" }), "2026-08-27"), /^800 days$/);
  assert.equal(momentValueLabel(moment({ displayUnit: "months" }), "2026-08-27"), "26 months");
  assert.equal(momentValueLabel(moment({ displayUnit: "years" }), "2026-08-27"), "2 years 2 months");
});

test("Since progress measures only the current anniversary year", () => {
  const progress = momentProgress(moment(), "2026-08-27");
  assert.equal(progress.nextDate, "2027-06-18");
  assert.ok(progress.ratio > 0 && progress.ratio < 1);
});

test("Moment reminders derive yearly Since and one-time Until calendar events", () => {
  const [since, until] = momentReminderEvents([
    moment({ calendarReminder: { enabled: true, calendarId: "relationships" } }),
    moment({ id: "trip", name: "Japan Trip", date: "2026-10-02", type: "until", calendarReminder: { enabled: true, calendarId: "life" } }),
  ]);
  assert.equal(since.recurrence.frequency, "yearly");
  assert.equal(until.recurrence, undefined);
  assert.equal(momentIdForEvent({ ...since, recurrenceParentId: since.id }), "cat-lin");
});
