import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDelta, formatMinutes, formatNumber, formatPercent } from "./number.ts";

const NB = "\u00A0";
const MINUS = "\u2212";

test("formatNumber groups thousands with a non-breaking space", () => {
  assert.equal(formatNumber(1234567.5), `1${NB}234${NB}567,5`);
  assert.equal(formatNumber(1234.5, { decimals: 2 }), `1${NB}234,50`);
  assert.equal(formatNumber(1234, { grouping: false }), "1234");
  assert.equal(formatNumber(0), "0");
});

test("formatNumber renders nothing for nothing", () => {
  assert.equal(formatNumber(null), "–");
  assert.equal(formatNumber(undefined), "–");
  assert.equal(formatNumber(Number.NaN), "–");
  assert.equal(formatNumber(null, { empty: "0" }), "0");
});

test("formatPercent takes whole percents by default, fractions on request", () => {
  assert.equal(formatPercent(25), `25${NB}%`);
  assert.equal(formatPercent(0.255, { fraction: true, decimals: 1 }), `25,5${NB}%`);
  // Decimals survive unless you pin them — a 12,5 % rate is not a 13 % rate.
  assert.equal(formatPercent(12.5), `12,5${NB}%`);
  assert.equal(formatPercent(12.5, { decimals: 0 }), `13${NB}%`);
  assert.equal(formatPercent(0.4, { fraction: true }), `40${NB}%`);
  assert.equal(formatPercent(null), "–");
});

test("formatDelta shows direction with a real minus sign", () => {
  assert.equal(formatDelta(12), "+12");
  assert.equal(formatDelta(-3), `${MINUS}3`);
  assert.equal(formatDelta(0), "0");
  assert.equal(formatDelta(1234), `+1${NB}234`);
  assert.equal(formatDelta(null), "–");
});

test("formatMinutes reads as the estimate it is", () => {
  assert.equal(formatMinutes(45), "~45 min");
  assert.equal(formatMinutes(180), "~3 t");
  assert.equal(formatMinutes(150), "~2 t 30 min");
  assert.equal(formatMinutes(0), "0 min");
  assert.equal(formatMinutes(-5), "0 min");
  assert.equal(formatMinutes(null), "–");
});
