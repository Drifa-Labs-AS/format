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
/**
 * A whole number of øre. This is a documentation alias, not a checked type —
 * TypeScript cannot stop you passing kroner where øre are expected. The unit
 * lives in the parameter name at every call site instead.
 */
export type Ore = number;
/** Øre in one krone. */
export declare const ORE_PER_KRONE = 100;
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
export declare function kronerToOre(kroner: number): Ore;
/**
 * Whole øre → kroner as a decimal number.
 *
 * Only for handing money to something that insists on kroner — a legacy API,
 * an export format. Do not compute with the result.
 */
export declare function oreToKroner(ore: Ore): number;
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
export declare function parseOre(input: string): Ore | null;
/**
 * How a money amount is written.
 *
 * - `kr`       — `4 725 kr`, `4 725,50 kr`. The default. Decimals appear only
 *                when there are øre to show.
 * - `kr-exact` — `4 725,00 kr`. Always two decimals; for tables of figures
 *                that should line up, and for anything accounting reads.
 * - `dash`     — `4 725,–`, `4 725,50`. Norwegian retail pricing, no unit.
 * - `bare`     — `4 725`, `4 725,50`. The number alone, for when the column
 *                header already says kroner.
 */
export type MoneyStyle = "kr" | "kr-exact" | "dash" | "bare";
export interface MoneyOptions {
    /** Default `"kr"`. */
    style?: MoneyStyle;
    /**
     * Thousands separator. `"space"` (default) is the Norwegian standard and
     * what `Intl` produces — a non-breaking space, so a price never wraps
     * across two lines. `"period"` is the older retail style (`4.725,–`).
     */
    grouping?: "space" | "period";
    /**
     * The mark the `dash` style ends on. Norwegian retail writes both: an en
     * dash (`4 725,–`, the default) and a plain hyphen (`4 725,-`). They look
     * near enough identical that neither is worth changing an existing design
     * for, so it is an option rather than a rule.
     */
    dash?: "–" | "-";
    /** Show `+` on positive amounts. For deltas and adjustments. Default `false`. */
    signed?: boolean;
    /** What to render for `null`/`undefined`. Default `"–"`. */
    empty?: string;
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
export declare function formatOre(ore: Ore | null | undefined, options?: MoneyOptions | MoneyStyle): string;
/**
 * Format a decimal kroner amount for display.
 *
 * A bridge for columns that are still `decimal` in the database. It converts
 * to øre and formats through {@link formatOre}, so a decimal column and an
 * øre column render identically. New money should be øre; this exists so a
 * repo can adopt one formatter before it migrates its schema.
 */
export declare function formatKroner(kroner: number | null | undefined, options?: MoneyOptions | MoneyStyle): string;
//# sourceMappingURL=money.d.ts.map