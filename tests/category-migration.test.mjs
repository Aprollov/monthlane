import assert from "node:assert/strict";
import test from "node:test";

import { LEGACY_CATEGORY_MAP } from "../app/src/database.ts";
import { categoryItemCount } from "../app/src/categoryStats.ts";
import { defaultCategories, FALLBACK_CATEGORY_ID } from "../app/src/types.ts";

test("default calendars are long-term life areas with stable colors", () => {
  const byId = Object.fromEntries(defaultCategories.map((category) => [category.id, category]));
  assert.deepEqual(
    defaultCategories.map(({ id }) => id),
    ["work", "life", "relationships", "finance", FALLBACK_CATEGORY_ID],
  );
  assert.equal(byId.work.color, "#6F8191");
  assert.equal(byId.life.color, "#758B75");
  assert.equal(byId.relationships.color, "#A16F72");
  assert.equal(byId.finance.color, "#A4835F");
});

test("legacy folder calendars migrate into life areas", () => {
  assert.equal(LEGACY_CATEGORY_MAP.anniversaries, "relationships");
  assert.equal(LEGACY_CATEGORY_MAP.renewals, "finance");
  assert.equal(LEGACY_CATEGORY_MAP.personal, "life");
  assert.equal(LEGACY_CATEGORY_MAP.Personal, "life");
});

test("calendar item count includes events and active tasks only", () => {
  const events = [
    { id: "e1", categoryId: "work" },
    { id: "e2", categoryId: "finance" },
  ];
  const tasks = [
    { id: "t1", categoryId: "work", status: "open" },
    { id: "t2", categoryId: "work", status: "archived" },
    { id: "t3", categoryId: "work", status: "open", deletedAt: "2026-08-01" },
    { id: "t4", categoryId: "work", status: "completed" },
  ];
  assert.equal(categoryItemCount("work", events, tasks), 3);
  assert.equal(categoryItemCount("finance", events, tasks), 1);
  assert.equal(categoryItemCount("personal", events, tasks), 0);
});
