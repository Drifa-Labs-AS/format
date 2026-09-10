/**
 * Norwegian dates and times.
 *
 * Every function takes what an API hands you — an ISO string, a `Date`, or a
 * timestamp — and returns nb-NO text. The style is always named at the call
 * site, because "format a date" is four different jobs, and a default would
 * quietly pick one of them for you.
 */
const DATE_OPTIONS = {
    short: { day: "2-digit", month: "2-digit", year: "numeric" },
    medium: { day: "numeric", month: "short", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    "day-month": { day: "numeric", month: "short" },
};
const TIME_OPTIONS = { hour: "2-digit", minute: "2-digit" };
function toDate(value) {
    return value instanceof Date ? value : new Date(value);
}
/** True for a date that cannot be rendered — an unparseable string, mostly. */
function invalid(date) {
    return Number.isNaN(date.getTime());
}
/**
 *     formatDate("2026-01-15T10:30:00Z")           // "15.01.2026"
 *     formatDate("2026-01-15T10:30:00Z", "long")   // "15. januar 2026"
 *
 * Renders in the *runtime's* time zone. On a server that means UTC unless the
 * process says otherwise, which is how an evening order can show yesterday's
 * date — format in the browser, or pass an already-localised value.
 */
export function formatDate(value, style = "short", empty = "–") {
    const date = toDate(value);
    if (invalid(date))
        return empty;
    return date.toLocaleDateString("nb-NO", DATE_OPTIONS[style]);
}
/** `15.01.2026 10:30` — the same styles, with the clock appended. */
export function formatDateTime(value, style = "short", empty = "–") {
    const date = toDate(value);
    if (invalid(date))
        return empty;
    return date.toLocaleString("nb-NO", { ...DATE_OPTIONS[style], ...TIME_OPTIONS });
}
/** `10:30`. */
export function formatTime(value, empty = "–") {
    const date = toDate(value);
    if (invalid(date))
        return empty;
    return date.toLocaleTimeString("nb-NO", TIME_OPTIONS);
}
/**
 * `i går`, `om 3 timer`, `for 2 dager siden`.
 *
 * Pass `now` to make the result testable, or to render consistently against a
 * clock you already have.
 */
export function formatRelativeTime(value, now = new Date(), empty = "–") {
    const date = toDate(value);
    if (invalid(date))
        return empty;
    const seconds = Math.round((date.getTime() - toDate(now).getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    const rtf = new Intl.RelativeTimeFormat("nb-NO", { numeric: "auto" });
    if (Math.abs(days) >= 1)
        return rtf.format(days, "day");
    if (Math.abs(hours) >= 1)
        return rtf.format(hours, "hour");
    if (Math.abs(minutes) >= 1)
        return rtf.format(minutes, "minute");
    return rtf.format(seconds, "second");
}
/**
 * `2026-01-15` — the value a `<input type="date">` expects, in local time.
 *
 * `toISOString()` is the wrong tool here: it converts to UTC first, so on a
 * Norwegian evening it hands you tomorrow. The `sv-SE` locale renders
 * ISO-shaped dates without leaving the local zone.
 */
export function toDateInputValue(value = new Date()) {
    const date = toDate(value);
    if (invalid(date))
        return "";
    return date.toLocaleDateString("sv-SE");
}
//# sourceMappingURL=date.js.map