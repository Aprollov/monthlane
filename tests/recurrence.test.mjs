import assert from "node:assert/strict";
import test from "node:test";

import { expandEvents, occursOn, previousDateKey, recurrencePreset, recurrenceRuleForPreset } from "../app/src/recurrence.ts";

const event = (recurrence, startDate = "2026-01-31") => ({
  id: "series-1",
  title: "Plan",
  startDate,
  startTime: "09:00",
  endTime: "10:00",
  allDay: false,
  notes: "",
  color: "#5f6f52",
  categoryId: "life",
  status: "active",
  createdAt: 1,
  updatedAt: 1,
  recurrence,
});

test("daily recurrence respects interval and count", () => {
  const series = event({ frequency: "daily", interval: 2, endType: "count", count: 3 }, "2026-01-01");
  assert.equal(occursOn(series, "2026-01-01"), true);
  assert.equal(occursOn(series, "2026-01-03"), true);
  assert.equal(occursOn(series, "2026-01-05"), true);
  assert.equal(occursOn(series, "2026-01-07"), false);
});

test("weekday recurrence skips weekends and stops on its end date", () => {
  const series = event({
    frequency: "weekly",
    interval: 1,
    daysOfWeek: [1, 2, 3, 4, 5],
    endType: "date",
    endDate: "2026-01-09",
  }, "2026-01-05");
  assert.equal(occursOn(series, "2026-01-06"), true);
  assert.equal(occursOn(series, "2026-01-10"), false);
  assert.equal(occursOn(series, "2026-01-12"), false);
});

test("monthly and yearly recurrence clamp to the final day of short months", () => {
  const monthly = event({ frequency: "monthly", interval: 1, endType: "never" });
  assert.equal(occursOn(monthly, "2026-02-28"), true);
  assert.equal(occursOn(monthly, "2026-03-31"), true);

  const yearly = event({ frequency: "yearly", interval: 1, endType: "never" }, "2024-02-29");
  assert.equal(occursOn(yearly, "2025-02-28"), true);
  assert.equal(occursOn(yearly, "2026-02-28"), true);
});

test("expanded series applies deleted and modified occurrence exceptions", () => {
  const series = event({ frequency: "daily", interval: 1, endType: "count", count: 3 }, "2026-01-01");
  const exceptions = [
    { id: "deleted", seriesId: "series-1", instanceDate: "2026-01-02", type: "deleted", updatedAt: 2 },
    {
      id: "modified",
      seriesId: "series-1",
      instanceDate: "2026-01-03",
      type: "modified",
      updatedAt: 3,
      replacement: { ...series, id: "replacement", title: "Moved", startDate: "2026-01-04", recurrence: undefined },
    },
  ];
  const expanded = expandEvents([series], exceptions, "2026-01-01", "2026-01-05");
  assert.deepEqual(expanded.map((item) => [item.title, item.startDate]), [
    ["Plan", "2026-01-01"],
    ["Moved", "2026-01-04"],
  ]);
  assert.equal(expanded[1].recurrenceParentId, "series-1");
  assert.equal(expanded[1].recurrenceInstanceDate, "2026-01-03");
});

test("previousDateKey crosses month and year boundaries", () => {
  assert.equal(previousDateKey("2026-01-01"), "2025-12-31");
});

test("repeat presets and custom intervals share the recurrence data model", () => {
  assert.deepEqual(recurrenceRuleForPreset("yearly", "2026-09-01"), {
    frequency: "yearly", interval: 1, endType: "never",
  });
  const custom = { frequency: "monthly", interval: 6, endType: "never" };
  assert.equal(recurrencePreset(custom), "custom");
  assert.equal(recurrenceRuleForPreset("custom", "2026-09-01", custom), custom);
});
