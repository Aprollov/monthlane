import assert from "node:assert/strict";
import test from "node:test";

import {
  buildShortcutPayload,
  remindersForEvent,
  shortcutRunUrl,
} from "../app/src/iphoneReminders.ts";
import { normalizeBackup } from "../app/src/database.ts";

const event = {
  title: "港澳通行证到期",
  startDate: "2028-02-01",
  allDay: true,
  notes: "Renew the permit",
};

test("a relative reminder uses the event start and supports 30 minutes before", () => {
  const payload = buildShortcutPayload(
    { ...event, allDay: false, startTime: "10:00" },
    [{ id: "r1", kind: "relative", minutesBefore: 30 }],
    { timezoneOffsetMinutes: -480, timeZone: "Asia/Shanghai" },
  );
  assert.equal(payload.reminders[0].triggerAt, "2028-02-01T09:30:00+08:00");
});

test("an expiry event can create two independent Beijing-time reminders", () => {
  const payload = buildShortcutPayload(event, [
    { id: "r1", kind: "absolute", date: "2027-08-02", time: "09:00" },
    { id: "r2", kind: "absolute", date: "2028-01-02", time: "09:00" },
  ], { timezoneOffsetMinutes: -480, timeZone: "Asia/Shanghai" });

  assert.equal(event.startDate, "2028-02-01");
  assert.deepEqual(payload.reminders.map(({ triggerAt }) => triggerAt), [
    "2027-08-02T09:00:00+08:00",
    "2028-01-02T09:00:00+08:00",
  ]);
});

test("legacy reminderMinutes become structured relative reminders without data loss", () => {
  assert.deepEqual(remindersForEvent({ reminderMinutes: [30, 1440] }), [
    { id: "legacy-30-0", kind: "relative", minutesBefore: 30 },
    { id: "legacy-1440-1", kind: "relative", minutesBefore: 1440 },
  ]);
});

test("structured reminders survive backup normalization and cloud-compatible records", () => {
  const reminders = [
    { id: "r1", kind: "absolute", date: "2027-08-02", time: "09:00" },
    { id: "r2", kind: "absolute", date: "2028-01-02", time: "09:00" },
  ];
  const normalized = normalizeBackup({
    version: 1,
    exportedAt: "2026-11-20T00:00:00.000Z",
    events: [{
      id: "permit", ...event, categoryId: "life", tags: [], reminderMinutes: [], reminders,
      createdAt: "2026-11-20T00:00:00.000Z", updatedAt: "2026-11-20T00:00:00.000Z", deviceId: "test",
    }],
    categories: [],
    exceptions: [],
  });
  assert.deepEqual(normalized.events[0].reminders, reminders);
});

test("configured reminders round-trip through the shortcut URL", () => {
  const payload = buildShortcutPayload(event, [{ id: "r", kind: "relative", minutesBefore: 15 }]);
  const url = shortcutRunUrl(payload);
  assert.match(url, /^shortcuts:\/\/run-shortcut\?name=Monthlane%20%E6%B7%BB%E5%8A%A0%E6%8F%90%E9%86%92&input=text&text=/);
  const json = JSON.parse(decodeURIComponent(url.split("&text=")[1]));
  assert.deepEqual(json, payload);
});
