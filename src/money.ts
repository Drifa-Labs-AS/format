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
 */

/**
 * A whole number of øre. This is a documentation alias, not a checked type —
 * TypeScript cannot stop you passing kroner where øre are expected. The unit
 * lives in the parameter name at every call site instead.
 */
export type Ore = number;

/** Øre in one krone. */
export const ORE_PER_KRONE = 100;

/**
 * Kroner (possibly fractional) → whole øre.
 *
 * For reading legacy decimal columns and for arithmetic that arrives in
 * kroner. Rounds to the nearest øre, half away from zero.
 *
 * Note the usual binary-float caveat: 1.005 is not exactly representable, so
 * `kronerToOre(1.005)` is 100, not 101. Parse from the original string with
 * `parseOre` where you can — it does not go through a float krone value.
 */
export function kronerToOre(kroner: number): Ore {
  if (!Number.isFinite(kroner)) return Number.NaN;
  // Half away from zero, not `Math.round`'s half-up: a refund of −0.005 kr
  // must round to the same magnitude as a charge of 0.005 kr, or repeated
  // credits drift against repeated debits.
  const scaled = kroner * ORE_PER_KRONE;
  return (Math.sign(scaled) * Math.round(Math.abs(scaled))) || 0;
}

/**
 * Whole øre → kroner as a decimal number.
 *
 * Only for handing money to something that insists on kroner — a legacy API,
 * an export format. Do not compute with the result.
 */
export function oreToKroner(ore: Ore): number {
  return ore / ORE_PER_KRONE;
}

/**
 * Parse user input in kroner into whole øre.
 *
 * Accepts what a Norwegian actually types or pastes: `389`, `389,50`,
 * `389.50`, `4 725` (space or non-breaking space), `4.725` (period as the
 * thousands separator), `kr 389`, `389 kr`, `4 725,–`.
 *
 * Returns `null` for empty input (the field was left blank — usually "no
 * price", not an error) and `NaN` for input that is not a number at all, so
 * callers can tell the two apart:
 *
 *     const ore = parseOre(input);
 *     if (Number.isNaN(ore)) return "Ugyldig pris";
 *     listing.priceOre = ore;   // number | null
 */
export function parseOre(input: string): Ore | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Strip currency words and all whitespace, including the non-breaking space
  // that nb-NO grouping produces (so a formatted value round-trips).
  let s = trimmed
    .replace(/kr\.?/gi, "")
    .replace(/[\s\u00A0\u202F]/g, "");

  // A trailing ",-" / ",–" / ",—" means "and no øre".
  s = s.replace(/[,.][-\u2013\u2014]$/, "");

  // Normalise the sign: accept a real minus sign as well as a hyphen.
  s = s.replace(/^[\u2212]/, "-");

  // Decide which of "." and "," is the decimal mark. Whichever comes last is
  // the decimal mark; the other is grouping. "4.725,50" and "4,725.50" both
  // work, and so does the ambiguous-looking "4.725" (period = grouping,
  // because Norwegian input never writes three decimals).
  const lastComma = s.lastIndexOf(",");
  const lastPeriod = s.lastIndexOf(".");
  if (lastComma >= 0 && lastPeriod >= 0) {
    const decimalAt = Math.max(lastComma, lastPeriod);
    s = s.slice(0, decimalAt).replace(/[.,]/g, "") + "." + s.slice(decimalAt + 1);
  } else if (lastComma >= 0) {
    s = s.replace(/,/g, ".");
  } else if (lastPeriod >= 0) {
    const decimals = s.length - lastPeriod - 1;
    // Exactly three digits after a lone period is grouping ("4.725"), not a
    // decimal fraction — nobody prices in tenths of an øre.
    s = decimals === 3 ? s.replace(/\./g, "") : s;
  }

  if (!/^-?\d*\.?\d*$/.test(s) || !/\d/.test(s)) return Number.NaN;

  const kroner = Number(s);
  if (!Number.isFinite(kroner)) return Number.NaN;
  return kronerToOre(kroner);
}

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
 * The space in the output is U+00A0, the non-breaking space `Intl` uses for
 * nb-NO. Negative amounts carry U+2212, the real minus sign, not a hyphen.
 */
export function formatOre(
  ore: Ore | null | undefined,
  options: MoneyOptions | MoneyStyle = {},
): string {
  const opts: MoneyOptions = typeof options === "string" ? { style: options } : options;
  const { style = "kr", grouping = "space", dash = "–", signed = false, empty = "–" } = opts;

  if (ore == null) return empty;
  if (!Number.isFinite(ore)) return empty;

  const whole = ore % ORE_PER_KRONE === 0;
  const decimals = style === "kr-exact" || !whole ? 2 : 0;

  let text = (ore / ORE_PER_KRONE).toLocaleString("nb-NO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (grouping === "period") text = text.replace(/[\s\u00A0\u202F]/g, ".");

  if (style === "dash" && whole) text += "," + dash;
  if (style === "kr" || style === "kr-exact") text += "\u00A0kr";

  if (signed && ore > 0) text = "+" + text;

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
export function formatKroner(
  kroner: number | null | undefined,
  options: MoneyOptions | MoneyStyle = {},
): string {
  if (kroner == null) return typeof options === "string" ? "–" : (options.empty ?? "–");
  return formatOre(kronerToOre(kroner), options);
}
