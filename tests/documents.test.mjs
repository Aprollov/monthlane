import test from "node:test";
import assert from "node:assert/strict";
import { mergeBackups, normalizeBackup } from "../app/src/database.ts";
import { buildShortcutPayload, shortcutRunUrl } from "../app/src/iphoneReminders.ts";

const legacy = {version:1, events:[], exceptions:[], categories:[]};
const record = {id:"doc",name:"港澳通行证",notes:"预约窗口",expiry:"2028-02-01",renewalEventId:"event",appointment:{date:"2027-08-02",time:"09:00"},updatedAt:"2026-11-26",createdAt:"2026-11-25",deviceId:"test"};
test("old backups have no documents; sync preserves links and respects a finished cycle", () => {
  assert.deepEqual(normalizeBackup(legacy).documents, []);
  const local = {...normalizeBackup(legacy), documents:[record]};
  assert.deepEqual(mergeBackups(local,legacy).documents,[record]);
  const renewed = {...record,expiry:"2038-02-01",renewalEventId:undefined,appointment:undefined,updatedAt:"2026-11-27"};
  assert.deepEqual(mergeBackups({...local,documents:[renewed]}, local).documents,[renewed]);
});
test("booking reminder uses the chosen appointment time, not the expiry or calendar date", () => {
  const payload = buildShortcutPayload({title:"预约换领"+record.name,notes:record.notes,startDate:record.expiry,allDay:true},
    [{id:record.id,kind:"absolute",...record.appointment}], {timeZone:"Asia/Shanghai",timezoneOffsetMinutes:-480});
  const url=new URL(shortcutRunUrl(payload));
  assert.equal(url.searchParams.get("name"),"Monthlane 添加提醒");
  assert.deepEqual(JSON.parse(url.searchParams.get("text")).reminders,[{title:"预约换领港澳通行证",triggerAt:"2027-08-02T09:00:00+08:00",notes:"预约窗口"}]);
});
