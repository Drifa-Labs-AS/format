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
  assert.equal(parseOre("12.345.678"), 1234567800);
  assert.equal(parseOre("1,234,567"), 123456700);
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
  assert.ok(Number.isNaN(parseOre("-")));
  assert.ok(Number.isNaN(parseOre(",")));
  assert.ok(Number.isNaN(parseOre("1.23.4")));
  assert.ok(Number.isNaN(parseOre("1234.567,50")));
  assert.ok(Number.isNaN(parseOre("1.2,3,4")));
  assert.ok(Number.isNaN(parseOre("1,2.3,4")));
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

// ---------------------------------------------------------------------------
// Edges. v1 pinned these as "what the code does today, not endorsed"; v2 is
// the deliberate change. Each test here guards a refusal — loosen the rule
// it names and the test fails.
// ---------------------------------------------------------------------------

test("formatOre: a fractional øre amount is not money and renders as empty", () => {
  assert.equal(formatOre(472550.5), "–");
  assert.equal(formatOre(0.5, { empty: "?" }), "?");
  assert.equal(formatOre(472500.4), "–");
  assert.equal(formatOre(99.9, "bare"), "–");
  assert.equal(formatOre(1.5, "dash"), "–");
  assert.equal(formatOre(Number.POSITIVE_INFINITY), "–");
});

test("formatOre: keeps every øre at the top of the safe range", () => {
  // The last exactly representable øre amount renders exactly …
  assert.equal(formatOre(Number.MAX_SAFE_INTEGER, "bare"), `90${NB}071${NB}992${NB}547${NB}409,91`);
  assert.equal(formatOre(-Number.MAX_SAFE_INTEGER, "bare"), `${MINUS}90${NB}071${NB}992${NB}547${NB}409,91`);
  // … and past it there is no exact amount to render.
  assert.equal(formatOre(Number.MAX_SAFE_INTEGER + 2), "–");
  assert.equal(formatOre(1e22, { empty: "?" }), "?");
});

test("kronerToOre: an amount that cannot be an exact øre count is NaN", () => {
  // The last exactly representable øre amount.
  assert.equal(kronerToOre(Number.MAX_SAFE_INTEGER / 100), Number.MAX_SAFE_INTEGER);
  assert.ok(Number.isSafeInteger(kronerToOre(Number.MAX_SAFE_INTEGER / 100)));
  // Past it, a float only looks like an integer, so it is refused.
  assert.ok(Number.isNaN(kronerToOre(Number.MAX_SAFE_INTEGER)));
  assert.ok(Number.isNaN(kronerToOre(1e20)));
  assert.ok(Number.isNaN(kronerToOre(Number.POSITIVE_INFINITY)));
  assert.ok(Number.isNaN(kronerToOre(Number.NEGATIVE_INFINITY)));
  // And formatKroner inherits the refusal.
  assert.equal(formatKroner(1e20), "–");
});

test("parseOre: a lone period with three digits is ambiguous and refused", () => {
  // The same digits, a factor of a thousand apart: 4 725 kr or 4,725 kr?
  assert.ok(Number.isNaN(parseOre("4.725")));
  assert.ok(Number.isNaN(parseOre("-4.725")));
  assert.ok(Number.isNaN(parseOre("kr 4.725")));
  // Anything that settles the reading makes the same digits fine.
  assert.equal(parseOre("4.725,–"), 472500);
  assert.equal(parseOre("4.725,-"), 472500);
  assert.equal(parseOre("4.725,50"), 472550);
  assert.equal(parseOre("4 725"), 472500);
  assert.equal(parseOre("4725"), 472500);
  assert.equal(parseOre("12.345.678"), 1234567800);
  // One or two digits after a lone period is a decimal mark, as before.
  assert.equal(parseOre("12.34"), 1234);
  assert.equal(parseOre("12.3"), 1230);
  // The price of the rule: period-grouped output in the kr and bare styles
  // does not round-trip for whole amounts of 1 000–999 999 kr. The default
  // space grouping always does, and so does the dash style — pre-fill inputs
  // with one of those.
  assert.ok(Number.isNaN(parseOre(formatOre(12600000, { style: "bare", grouping: "period" }))));
  assert.ok(Number.isNaN(parseOre(formatOre(12600000, { grouping: "period" }))));
  assert.equal(parseOre(formatOre(12600000, "bare")), 12600000);
  assert.equal(parseOre(formatOre(12600000, { style: "dash", grouping: "period" })), 12600000);
  assert.equal(parseOre(formatOre(1234567800, { style: "bare", grouping: "period" })), 1234567800);
});

test("parseOre: several of the same mark can only be grouping", () => {
  // v1 refused comma grouping ("1,234,567" became "1.234.567" and failed);
  // v2 reads it, because two commas cannot both be the decimal mark.
  assert.equal(parseOre("1,234,567"), 123456700);
  assert.equal(parseOre("1.234.567"), 123456700);
  assert.ok(Number.isNaN(parseOre("1,23,4")));
});

test("parseOre: more than two decimals is not a price", () => {
  assert.ok(Number.isNaN(parseOre("1,999")));
  assert.ok(Number.isNaN(parseOre("1,9999")));
  assert.ok(Number.isNaN(parseOre("4,725")));
  assert.ok(Number.isNaN(parseOre("0,005")));
  assert.ok(Number.isNaN(parseOre("1,005")));
  assert.ok(Number.isNaN(parseOre("1.2345")));
  assert.ok(Number.isNaN(parseOre("4.725,500")));
  // Two decimals is the limit, and it is exact — never through a float.
  assert.equal(parseOre("1,00"), 100);
  assert.equal(parseOre("1,05"), 105);
  assert.equal(parseOre("0,29"), 29);
});

test("parseOre: an amount past the safe-integer range is refused, not approximated", () => {
  assert.equal(parseOre("90 071 992 547 409,91"), Number.MAX_SAFE_INTEGER);
  assert.equal(parseOre(formatOre(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
  assert.ok(Number.isNaN(parseOre("90 071 992 547 409,92")));
  assert.ok(Number.isNaN(parseOre("100000000000000000")));
  assert.ok(Number.isNaN(parseOre("999999999999999999999,99")));
});

test("parseOre: minus zero normalises to 0", () => {
  assert.ok(Object.is(parseOre("-0"), 0));
  assert.ok(Object.is(parseOre("-0,00"), 0));
  assert.ok(Object.is(parseOre("0,–"), 0));
});

test("parseOre: a leading plus is not accepted", () => {
  assert.ok(Number.isNaN(parseOre("+250")));
  assert.ok(Number.isNaN(parseOre("+ 250")));
});

test("parseOre: a negative amount with the dash suffix", () => {
  assert.equal(parseOre("\u22124 725,\u2013"), -472500); // −4 725,–  (real minus, en dash)
  assert.equal(parseOre("-4 725,-"), -472500);
  assert.equal(parseOre(`${MINUS}4${NB}725,\u2014`), -472500); // em dash
  assert.equal(parseOre(formatOre(-472500, "dash")), -472500);
});

test("parseOre: a bare leading or trailing decimal mark still parses", () => {
  assert.equal(parseOre(".5"), 50);
  assert.equal(parseOre(",5"), 50);
  assert.equal(parseOre("5."), 500);
  assert.equal(parseOre("5,"), 500);
});

test("oreToKroner: odd øre amounts come back as the expected decimal", () => {
  assert.equal(oreToKroner(1), 0.01);
  assert.equal(oreToKroner(3), 0.03);
  assert.equal(oreToKroner(-1), -0.01);
  assert.equal(oreToKroner(38951), 389.51);
  assert.equal(oreToKroner(0), 0);
  // Round-trips through kronerToOre for every odd amount, which is what an
  // export-then-import must rely on.
  for (const ore of [1, 3, 7, 99, 101, 12345, 38951, -38951]) {
    assert.equal(kronerToOre(oreToKroner(ore)), ore);
  }
  // Garbage in, garbage out — it does not validate.
  assert.ok(Number.isNaN(oreToKroner(Number.NaN)));
  assert.equal(oreToKroner(0.5), 0.005);
});

test("formatKroner: NaN and the empty option", () => {
  assert.equal(formatKroner(Number.NaN), "–");
  assert.equal(formatKroner(Number.POSITIVE_INFINITY), "–");
  assert.equal(formatKroner(Number.NaN, { empty: "Ikke satt" }), "Ikke satt");
  assert.equal(formatKroner(null, { empty: "Ikke satt" }), "Ikke satt");
  assert.equal(formatKroner(undefined, { empty: "" }), "");
  // A style given as a string has no `empty`, so the default dash applies.
  assert.equal(formatKroner(null, "dash"), "–");
  assert.equal(formatKroner(Number.NaN, "kr-exact"), "–");
});
