/**
 * Money.
 *
 * A money amount is a whole number of øre. 1 kr = 100 øre. Nothing in this
 * module ever hands you a fractional amount, because a fraction of an øre is
 * not a thing you can pay, invoice or reconcile — it is a rounding error that
 * has not surfaced yet.
 *
 * The names say the unit. `parseOre` returns øre; `formatOre` takes øre.
 * There is deliberately no second formatter that takes kroner. Two formatters
 * side by side, one taking kroner and one taking øre, are one factor of 100
 * apart — and picking the wrong one renders a 47-kroner price as 4 725.
 *
 * Since v2 the module refuses rather than guesses: an amount it cannot read
 * as an exact øre count comes back as `NaN` from the parsers and as the
 * `empty` text from the formatter, instead of a rounded or imprecise number
 * that looks right. See CHANGELOG.md.
 */
/** Øre in one krone. */
export const ORE_PER_KRONE = 100;
const MAX_SAFE_ORE = BigInt(Number.MAX_SAFE_INTEGER);
/**
 * Kroner (possibly fractional) → whole øre.
 *
 * For reading legacy decimal columns and for arithmetic that arrives in
 * kroner. Rounds to the nearest øre, half away from zero.
 *
 * Returns `NaN` when the result cannot be an exact øre count: a non-finite
 * input, or an amount past `Number.MAX_SAFE_INTEGER` øre (about 90 billion
 * billion kroner), where a float only looks like an integer. That is a data
 * error upstream, and a precise-looking wrong number is worse than `NaN`.
 *
 * Note the usual binary-float caveat: 1.005 is not exactly representable, so
 * `kronerToOre(1.005)` is 100, not 101. Parse from the original string with
 * `parseOre` where you can — it reads the digits directly and never holds the
 * amount as a float krone value.
 */
export function kronerToOre(kroner) {
    if (!Number.isFinite(kroner))
        return Number.NaN;
    // Half away from zero, not `Math.round`'s half-up: a refund of −0.005 kr
    // must round to the same magnitude as a charge of 0.005 kr, or repeated
    // credits drift against repeated debits.
    const scaled = kroner * ORE_PER_KRONE;
    const ore = (Math.sign(scaled) * Math.round(Math.abs(scaled))) || 0;
    return Number.isSafeInteger(ore) ? ore : Number.NaN;
}
/**
 * Whole øre → kroner as a decimal number.
 *
 * Only for handing money to something that insists on kroner — a legacy API,
 * an export format. Do not compute with the result.
 */
export function oreToKroner(ore) {
    return ore / ORE_PER_KRONE;
}
/**
 * Parse user input in kroner into whole øre.
 *
 * Accepts what a Norwegian actually types or pastes: `389`, `389,50`,
 * `389.50`, `4 725` (space or non-breaking space), `4.725,50` (period as the
 * thousands separator, comma as the decimal mark), `kr 389`, `389 kr`,
 * `4 725,–`, `4.725,-`.
 *
 * It refuses rather than guesses. Three inputs an earlier version read as a
 * number are `NaN` now:
 *
 * - **More than two decimals.** `1,999` is not a price; it is a typo, and
 *   rounding it to 2,00 kr hides the typo.
 * - **A lone period followed by exactly three digits.** `4.725` is either
 *   4 725 kr (period as grouping) or 4,725 kr (period as the decimal mark),
 *   and the two readings are a factor of a thousand apart. The same digits
 *   are fine when something else settles it: `4.725,–` and `4.725,50` are
 *   grouped, `4 725` and `4725` are whole kroner, `12.345.678` has two
 *   periods so neither can be a decimal mark. This also means the output of
 *   `formatOre` with `grouping: "period"` in the `kr` or `bare` style does
 *   not round-trip for whole amounts of 1 000–999 999 kr (`"126.000 kr"`):
 *   pre-fill an input with the default space grouping, which always does.
 * - **An amount past `Number.MAX_SAFE_INTEGER` øre**, where the result would
 *   only look exact.
 *
 * The digits are read directly, never through a float krone value, so
 * `parseOre("1,005")` is refused rather than silently becoming 100 øre.
 *
 * Returns `null` for empty input (the field was left blank — usually "no
 * price", not an error) and `NaN` for input that is not a price, so callers
 * can tell the two apart:
 *
 *     const ore = parseOre(input);
 *     if (Number.isNaN(ore)) return "Ugyldig pris";
 *     listing.priceOre = ore;   // number | null
 */
export function parseOre(input) {
    const trimmed = input.trim();
    if (!trimmed)
        return null;
    // Strip currency words and all whitespace, including the non-breaking space
    // that nb-NO grouping produces (so a formatted value round-trips).
    let s = trimmed
        .replace(/kr\.?/gi, "")
        .replace(/[\s  ]/g, "");
    // A trailing ",-" / ",–" / ",—" means "and no øre" — which also settles
    // that any mark left in front of it is grouping.
    const stripped = s.replace(/[,.][-–—]$/, "");
    const wholeKroner = stripped !== s;
    s = stripped;
    // Accept a real minus sign as well as a hyphen. No leading plus.
    let negative = false;
    if (/^[-−]/.test(s)) {
        negative = true;
        s = s.slice(1);
    }
    // Only digits and the two marks may remain, and at least one digit.
    if (!/^[\d.,]+$/.test(s) || !/\d/.test(s))
        return Number.NaN;
    const parts = splitDecimal(s, wholeKroner);
    if (parts === null)
        return Number.NaN;
    const [integer, fraction] = parts;
    if (fraction.length > 2)
        return Number.NaN;
    // Whole øre from the digits alone: no float krone value anywhere.
    const ore = BigInt((integer || "0") + fraction.padEnd(2, "0"));
    if (ore > MAX_SAFE_ORE)
        return Number.NaN;
    const n = Number(ore);
    return negative ? -n || 0 : n;
}
/**
 * Split a cleaned amount (digits, `.` and `,` only) into its integer digits
 * and its fraction digits, with grouping marks removed. `null` when the marks
 * do not read as one decimal mark plus well-formed grouping.
 */
function splitDecimal(s, wholeKroner) {
    const commas = count(s, ",");
    const periods = count(s, ".");
    if (commas === 0 && periods === 0)
        return [s, ""];
    // Every mark is grouping: either the dash suffix said so, or there are
    // several of the same mark and a number has at most one decimal mark.
    if (wholeKroner || (commas > 1 && periods === 0) || (periods > 1 && commas === 0)) {
        const integer = ungroup(s);
        return integer === null ? null : [integer, ""];
    }
    // Both marks present: the last one is the decimal mark, the other is
    // grouping. "4.725,50" and "4,725.50" both work.
    if (commas >= 1 && periods >= 1) {
        const decimalAt = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
        const decimalMark = s.charAt(decimalAt);
        if (count(s, decimalMark) > 1)
            return null; // "1.2,3,4"
        const integer = ungroup(s.slice(0, decimalAt));
        return integer === null ? null : [integer, s.slice(decimalAt + 1)];
    }
    // One mark, once. A comma is the decimal mark. A period is the decimal mark
    // too — unless exactly three digits follow it, which is the one reading we
    // cannot settle ("4.725": 4 725 kr or 4,725 kr?), so it is refused.
    const at = s.search(/[.,]/);
    const fraction = s.slice(at + 1);
    if (s.charAt(at) === "." && fraction.length === 3)
        return null;
    return [s.slice(0, at), fraction];
}
/**
 * Remove grouping marks from an integer part, checking that they sit where
 * grouping marks sit: `12.345.678` yes, `1.23.4` no. A string with no marks
 * passes through. `null` when the grouping is not grouping.
 */
function ungroup(s) {
    if (!/[.,]/.test(s))
        return s;
    if (s.includes(".") && s.includes(","))
        return null;
    const groups = s.split(/[.,]/);
    const first = groups[0] ?? "";
    if (first.length === 0 || first.length > 3)
        return null;
    if (groups.slice(1).some((g) => g.length !== 3))
        return null;
    return groups.join("");
}
function count(s, ch) {
    return s.split(ch).length - 1;
}
/**
 * Format whole øre for display.
 *
 *     formatOre(472500)                      // "4 725 kr"
 *     formatOre(472550)                      // "4 725,50 kr"
 *     formatOre(472500, { style: "dash" })   // "4 725,–"
 *     formatOre(null)                        // "–"
 *
 * Only a whole, safe-integer øre count is money. `null`, `undefined`, `NaN`,
 * a fractional øre amount and an amount past `Number.MAX_SAFE_INTEGER` all
 * render as `empty` — a fraction of an øre is a bug upstream, and printing
 * it rounded would hide the bug.
 *
 * The space in the output is U+00A0, the non-breaking space `Intl` uses for
 * nb-NO. Negative amounts carry U+2212, the real minus sign, not a hyphen.
 */
export function formatOre(ore, options = {}) {
    const opts = typeof options === "string" ? { style: options } : options;
    const { style = "kr", grouping = "space", dash = "–", signed = false, empty = "–" } = opts;
    if (ore == null)
        return empty;
    if (!Number.isSafeInteger(ore))
        return empty;
    // Split in integer arithmetic so the last øre survives at every magnitude —
    // `ore / 100` as a float does not past 2^53 / 100.
    const abs = BigInt(Math.abs(ore));
    const kroner = abs / BigInt(ORE_PER_KRONE);
    const rest = Number(abs % BigInt(ORE_PER_KRONE));
    const whole = rest === 0;
    const decimals = style === "kr-exact" || !whole ? 2 : 0;
    let text = kroner.toLocaleString("nb-NO");
    if (decimals === 2)
        text += "," + String(rest).padStart(2, "0");
    if (ore < 0)
        text = "−" + text;
    if (grouping === "period")
        text = text.replace(/[\s  ]/g, ".");
    if (style === "dash" && whole)
        text += "," + dash;
    if (style === "kr" || style === "kr-exact")
        text += " kr";
    if (signed && ore > 0)
        text = "+" + text;
    return text;
}
/**
 * Format a decimal kroner amount for display.
 *
 * A bridge for columns that are still `decimal` in the database. It converts
 * to øre and formats through {@link formatOre}, so a decimal column and an
 * øre column render identically. New money should be øre; this exists so a
 * repo can adopt one formatter before it migrates its schema.
 */
export function formatKroner(kroner, options = {}) {
    if (kroner == null)
        return typeof options === "string" ? "–" : (options.empty ?? "–");
    return formatOre(kronerToOre(kroner), options);
}
//# sourceMappingURL=money.js.map