import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatTime,
  toDateInputValue,
} from "./date.ts";

// These functions render in the runtime's zone by design, so the suite pins
// one. Without this the assertions below pass on a Norwegian laptop and fail
// in CI — which is the same bug, discovered a day later.
process.env.TZ = "Europe/Oslo";

test("the suite pins its own time zone", () => {
  assert.equal(Intl.DateTimeFormat().resolvedOptions().timeZone, "Europe/Oslo");
});

test("the zone is genuinely applied, not inherited from the machine", () => {
  process.env.TZ = "UTC";
  assert.equal(formatTime("2026-01-15T10:30:00Z"), "10:30");
  process.env.TZ = "Europe/Oslo";
  assert.equal(formatTime("2026-01-15T10:30:00Z"), "11:30");
});

const WINTER = "2026-01-15T10:30:00Z"; // 11:30 in Oslo

test("formatDate has three named styles and no house default surprise", () => {
  assert.equal(formatDate(WINTER), "15.01.2026");
  assert.equal(formatDate(WINTER, "short"), "15.01.2026");
  assert.equal(formatDate(WINTER, "medium"), "15. jan. 2026");
  assert.equal(formatDate(WINTER, "long"), "15. januar 2026");
  assert.equal(formatDate(WINTER, "day-month"), "15. jan.");
  assert.equal(formatDate("2026-01-05T10:30:00Z", "day-month"), "5. jan.");
});

test("formatDate accepts a string, a Date or a timestamp", () => {
  const date = new Date(WINTER);
  assert.equal(formatDate(date), "15.01.2026");
  assert.equal(formatDate(date.getTime()), "15.01.2026");
});

test("formatDateTime appends the clock, in local time", () => {
  assert.equal(formatDateTime(WINTER), "15.01.2026, 11:30");
  assert.equal(formatDateTime(WINTER, "long"), "15. januar 2026 kl. 11:30");
  assert.equal(formatTime(WINTER), "11:30");
});

test("an unparseable date renders as nothing, never as 'Invalid Date'", () => {
  assert.equal(formatDate("nope"), "–");
  assert.equal(formatDateTime("nope"), "–");
  assert.equal(formatTime("nope"), "–");
  assert.equal(formatRelativeTime("nope"), "–");
  assert.equal(formatDate("nope", "long", "Ukjent"), "Ukjent");
});

test("formatRelativeTime picks the largest unit that fits", () => {
  assert.equal(formatRelativeTime("2026-01-13T10:30:00Z", WINTER), "i forgårs");
  assert.equal(formatRelativeTime("2026-01-14T10:30:00Z", WINTER), "i går");
  assert.equal(formatRelativeTime("2026-01-15T13:30:00Z", WINTER), "om 3 timer");
  assert.equal(formatRelativeTime("2026-01-15T10:25:00Z", WINTER), "for 5 minutter siden");
  assert.equal(formatRelativeTime(WINTER, WINTER), "nå");
});

test("toDateInputValue stays in the local day, unlike toISOString", () => {
  // 23:30 in Oslo on the 15th is 22:30 UTC — still the 15th either way.
  assert.equal(toDateInputValue("2026-01-15T22:30:00Z"), "2026-01-15");
  // 00:30 Oslo on the 16th is 23:30 UTC on the 15th. toISOString would say
  // the 15th; the date picker must say the 16th.
  assert.equal(toDateInputValue("2026-01-15T23:30:00Z"), "2026-01-16");
  assert.equal(toDateInputValue("nope"), "");
});
