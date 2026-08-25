import assert from "node:assert/strict";
import test from "node:test";
import { singleVisibleCategoryId } from "../app/src/categoryStats.ts";

const categories = [
  { id: "work", name: "Work" },
  { id: "life", name: "Life" },
  { id: "finance", name: "Finance" },
  { id: "other", name: "Other" },
];

// work has tasks, life has an event, finance is empty (hidden from the sidebar)
const events = [{ categoryId: "life" }];
const tasks = [{ categoryId: "work", status: "open" }];

test("singleVisibleCategoryId returns the id only when exactly one shown calendar is visible", () => {
  // user state: only Work checked; empty Finance is not checkable and must not block the rule
  assert.equal(
    singleVisibleCategoryId(categories, new Set(["life"]), "other", events, tasks),
    "work",
  );
  assert.equal(
    singleVisibleCategoryId(categories, new Set(["life", "finance"]), "other", events, tasks),
    "work",
  );
  // two populated calendars visible -> no auto-file
  assert.equal(
    singleVisibleCategoryId(categories, new Set(["finance"]), "other", events, tasks),
    undefined,
  );
  // everything hidden -> no auto-file
  assert.equal(
    singleVisibleCategoryId(categories, new Set(["work", "life", "finance"]), "other", events, tasks),
    undefined,
  );
});
