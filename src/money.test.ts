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

// ---------------------------------------------------------------------------
// Edges. These pin what the code does today so a change to it is a deliberate
// one. Where today's behaviour is the wrong thing for money, the pin is
// followed by a skipped test that describes the safer behaviour — a v2
// decision, not something to slip into a patch release.
// ---------------------------------------------------------------------------

test("formatOre: fractional øre are rounded silently (pinned, not endorsed)", () => {
  // Intl rounds to the two decimals it is asked for. Half-øre round up…
  assert.equal(formatOre(472550.5), `4${NB}725,51${NB}kr`);
  assert.equal(formatOre(0.5), `0,01${NB}kr`);
  // …and a fraction under half an øre still forces the two-decimal form,
  // because the amount is not a whole krone even though it rounds to one.
  assert.equal(formatOre(472500.4), `4${NB}725,00${NB}kr`);
  assert.equal(formatOre(99.9, "bare"), "1,00");
  assert.equal(formatOre(1.5, "dash"), "0,02");
});

test(
  "formatOre: a fractional øre amount is not money and renders as empty",
  { skip: "v2 decision — a fraction of an øre is a bug upstream, and rendering it hides the bug" },
  () => {
    assert.equal(formatOre(472550.5), "–");
    assert.equal(formatOre(0.5, { empty: "?" }), "?");
  },
);

test("kronerToOre: amounts beyond the safe-integer range lose precision silently (pinned)", () => {
  // The last exactly representable øre amount.
  assert.equal(kronerToOre(Number.MAX_SAFE_INTEGER / 100), Number.MAX_SAFE_INTEGER);
  assert.ok(Number.isSafeInteger(kronerToOre(Number.MAX_SAFE_INTEGER / 100)));
  // Past it, the result is a float that only looks like an integer.
  const huge = kronerToOre(Number.MAX_SAFE_INTEGER);
  assert.ok(Number.isFinite(huge));
  assert.ok(!Number.isSafeInteger(huge));
  assert.equal(kronerToOre(1e20), 1e22);
  // Infinity, on the other hand, is already refused.
  assert.ok(Number.isNaN(kronerToOre(Number.POSITIVE_INFINITY)));
  assert.ok(Number.isNaN(kronerToOre(Number.NEGATIVE_INFINITY)));
});

test(
  "kronerToOre: an amount that cannot be an exact øre count is NaN",
  { skip: "v2 decision — 90 billion billion kroner is a data error, and a precise-looking wrong number is worse than NaN" },
  () => {
    assert.ok(Number.isNaN(kronerToOre(Number.MAX_SAFE_INTEGER)));
    assert.ok(Number.isNaN(kronerToOre(1e20)));
  },
);

test("parseOre: a lone comma is always the decimal mark, a lone period with three digits is grouping (pinned)", () => {
  // The same digits, a factor of a thousand apart. Norwegian input never
  // writes three decimals, so "4,725" is read as 4.725 kr and rounded.
  assert.equal(parseOre("4,725"), 472);
  assert.equal(parseOre("4.725"), 472500);
  // With grouping resolved by the other mark there is no ambiguity.
  assert.equal(parseOre("12.345.678"), 1234567800);
  assert.equal(parseOre("12.34"), 1234);
});

test("parseOre: more than two decimals are rounded silently (pinned, not endorsed)", () => {
  assert.equal(parseOre("1,999"), 200);
  assert.equal(parseOre("1,9999"), 200);
  assert.equal(parseOre("0,005"), 1);
  // The parse goes through a float krone value before rounding, so the
  // 1.005 caveat on kronerToOre applies here too.
  assert.equal(parseOre("1,005"), 100);
});

test(
  "parseOre: more than two decimals is not a price",
  { skip: "v2 decision — nobody types tenths of an øre on purpose; rejecting it surfaces the typo instead of rounding it away" },
  () => {
    assert.ok(Number.isNaN(parseOre("1,999")));
    assert.ok(Number.isNaN(parseOre("4,725")));
    assert.ok(Number.isNaN(parseOre("0,005")));
  },
);

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
