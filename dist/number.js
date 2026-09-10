/**
 * Norwegian numbers that are not money. For money use `./money.ts` — it knows
 * about øre, and these functions do not.
 */
export function formatNumber(value, options = {}) {
    const { decimals, grouping = true, empty = "–" } = options;
    if (value == null || !Number.isFinite(value))
        return empty;
    return value.toLocaleString("nb-NO", {
        minimumFractionDigits: decimals ?? 0,
        maximumFractionDigits: decimals ?? 3,
        useGrouping: grouping,
    });
}
/**
 * `25 %`. The space before the sign is non-breaking and is the Norwegian
 * convention — `25%` is the English one.
 *
 * Decimals are shown when the value has them. Forcing them to zero by default
 * would render a 12,5 % commission as `13 %`, which is a different deal.
 */
export function formatPercent(value, options = {}) {
    const { decimals, fraction = false, empty = "–" } = options;
    if (value == null || !Number.isFinite(value))
        return empty;
    const percent = fraction ? value * 100 : value;
    const digits = decimals === undefined ? {} : { decimals };
    return `${formatNumber(percent, digits)}\u00A0%`;
}
/**
 * A change, with its direction made visible: plus twelve, minus three, zero.
 *
 * The minus is U+2212, the real minus sign, so it lines up with a plus and is
 * not mistaken for a hyphen or a list bullet.
 */
export function formatDelta(value, options = {}) {
    const { empty = "–" } = options;
    if (value == null || !Number.isFinite(value))
        return empty;
    if (value === 0)
        return "0";
    const magnitude = formatNumber(Math.abs(value), options);
    return value > 0 ? `+${magnitude}` : `\u2212${magnitude}`;
}
/**
 * Minutes as an approximate duration: `~45 min`, `~3 t`, `~2 t 30 min`.
 *
 * The tilde is deliberate — these come from estimates (packing time, travel),
 * and rendering an estimate as an exact figure invites someone to plan against
 * it.
 */
export function formatMinutes(total, empty = "–") {
    if (total == null || !Number.isFinite(total))
        return empty;
    const rounded = Math.round(total);
    if (rounded <= 0)
        return "0 min";
    const hours = Math.floor(rounded / 60);
    const minutes = rounded % 60;
    if (hours === 0)
        return `~${minutes} min`;
    if (minutes === 0)
        return `~${hours} t`;
    return `~${hours} t ${minutes} min`;
}
//# sourceMappingURL=number.js.map