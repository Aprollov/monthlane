import assert from "node:assert/strict";
import test from "node:test";

function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

test("month grid contains six Monday-first weeks", () => {
  const grid = buildMonthGrid(2026, 6);
  assert.equal(grid.length, 42);
  assert.equal(grid[0].getDay(), 1);
  assert.equal(grid[41].getDay(), 0);
  assert.deepEqual(
    [grid[0].getFullYear(), grid[0].getMonth() + 1, grid[0].getDate()],
    [2026, 6, 29],
  );
  assert.deepEqual(
    [grid[41].getFullYear(), grid[41].getMonth() + 1, grid[41].getDate()],
    [2026, 8, 9],
  );
});

test("month grid supports years far from the present", () => {
  const grid = buildMonthGrid(2048, 2);
  assert.equal(grid.some((date) => date.getFullYear() === 2048 && date.getMonth() === 2), true);
});
