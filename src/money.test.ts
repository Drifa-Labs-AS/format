import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatKroner,
  formatOre,
  kronerToOre,
  oreToKroner,
  parseOre,
} from "./money.ts";

// nb-NO groups with a non-breaking space and negates with a real minus sign.
// Spelling them out keeps the tests honest about what actually ships.
const NB = "\u00A0";
const MINUS = "\u2212";

test("kronerToOre rounds to whole øre, half away from zero", () => {
  assert.equal(kronerToOre(389.5), 38950);
  assert.equal(kronerToOre(0.1 + 0.2), 30); // 0.30000000000000004
  assert.equal(kronerToOre(-2.5), -250);
  assert.equal(kronerToOre(1.234), 123);
  assert.equal(kronerToOre(1.235), 124);
  // Ties go away from zero in both directions — Math.round would give -0 here.
  assert.equal(kronerToOre(0.005), 1);
  assert.equal(kronerToOre(-0.005), -1);
  assert.equal(kronerToOre(-0.025), -3);
  assert.ok(Object.is(kronerToOre(-0.001), 0), "negative zero must normalise to 0");
  assert.ok(Number.isNaN(kronerToOre(Number.NaN)));
});

test("oreToKroner is the inverse for whole øre", () => {
  assert.equal(oreToKroner(38950), 389.5);
  assert.equal(kronerToOre(oreToKroner(472500)), 472500);
});

test("parseOre accepts what a Norwegian types", () => {
  assert.equal(parseOre("389"), 38900);
  assert.equal(parseOre("389,50"), 38950);
  assert.equal(parseOre("389.50"), 38950);
  assert.equal(parseOre("  389  "), 38900);
  assert.equal(parseOre("kr 389"), 38900);
  assert.equal(parseOre("389 kr"), 38900);
  assert.equal(parseOre(`389${NB}kr`), 38900);
  assert.equal(parseOre("-250"), -25000);
  assert.equal(parseOre(`${MINUS}250`), -25000);
});

test("parseOre reads grouped input, including its own output", () => {
  assert.equal(parseOre("4 725"), 472500);
  assert.equal(parseOre(`4${NB}725`), 472500);
  assert.equal(parseOre("4.725"), 472500);
  assert.equal(parseOre("4.725,50"), 472550);
  assert.equal(parseOre("4,725.50"), 472550);
  assert.equal(parseOre("4 725,–"), 472500);
  assert.equal(parseOre("4.725,-"), 472500);
  assert.equal(parseOre(formatOre(472550)), 472550);
  assert.equal(parseOre(formatOre(472500, { style: "dash", grouping: "period" })), 472500);
});

test("parseOre tells empty apart from garbage", () => {
  assert.equal(parseOre(""), null);
  assert.equal(parseOre("   "), null);
  assert.ok(Number.isNaN(parseOre("abc")));
  assert.ok(Number.isNaN(parseOre("kr")));
  assert.ok(Number.isNaN(parseOre("3,,5")));
  assert.ok(Number.isNaN(parseOre("1e5")));
});

test("formatOre: kr style shows decimals only when there are øre", () => {
  assert.equal(formatOre(472500), `4${NB}725${NB}kr`);
  assert.equal(formatOre(472550), `4${NB}725,50${NB}kr`);
  assert.equal(formatOre(0), `0${NB}kr`);
  assert.equal(formatOre(5), `0,05${NB}kr`);
  assert.equal(formatOre(-472500), `${MINUS}4${NB}725${NB}kr`);
});

test("formatOre: kr-exact always shows two decimals", () => {
  assert.equal(formatOre(472500, "kr-exact"), `4${NB}725,00${NB}kr`);
  assert.equal(formatOre(472550, "kr-exact"), `4${NB}725,50${NB}kr`);
});

test("formatOre: dash and bare drop the unit", () => {
  assert.equal(formatOre(472500, "dash"), `4${NB}725,–`);
  assert.equal(formatOre(472550, "dash"), `4${NB}725,50`);
  assert.equal(formatOre(472500, "bare"), `4${NB}725`);
  assert.equal(formatOre(472550, "bare"), `4${NB}725,50`);
});

test("formatOre: the dash mark is an option, because both are in use", () => {
  assert.equal(formatOre(472500, { style: "dash" }), `4${NB}725,–`);
  assert.equal(formatOre(472500, { style: "dash", dash: "-" }), `4${NB}725,-`);
  // The older retail look: whole kroner, period grouping, plain hyphen.
  assert.equal(formatOre(12600000, { style: "dash", grouping: "period", dash: "-" }), "126.000,-");
  // The mark only applies where there are no øre to show.
  assert.equal(formatOre(472550, { style: "dash", dash: "-" }), `4${NB}725,50`);
});

test("formatOre: period grouping for the older retail style", () => {
  assert.equal(formatOre(12600000, { style: "dash", grouping: "period" }), "126.000,–");
  assert.equal(formatOre(80000, { style: "dash", grouping: "period" }), "800,–");
});

test("formatOre: signed prefixes positives only", () => {
  assert.equal(formatOre(5000, { signed: true }), `+50${NB}kr`);
  assert.equal(formatOre(5000, { style: "bare", signed: true }), "+50");
  assert.equal(formatOre(-5000, { style: "bare", signed: true }), `${MINUS}50`);
  assert.equal(formatOre(0, { style: "bare", signed: true }), "0");
});

test("formatOre: nothing renders as a dash, or whatever you ask for", () => {
  assert.equal(formatOre(null), "–");
  assert.equal(formatOre(undefined), "–");
  assert.equal(formatOre(Number.NaN), "–");
  assert.equal(formatOre(null, { empty: "Ikke satt" }), "Ikke satt");
});

test("formatKroner renders a decimal column identically to an øre one", () => {
  assert.equal(formatKroner(4725), formatOre(472500));
  assert.equal(formatKroner(4725.5), formatOre(472550));
  assert.equal(formatKroner(null), "–");
  assert.equal(formatKroner(180, "kr-exact"), `180,00${NB}kr`);
});
