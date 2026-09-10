/**
 * Norwegian dates and times.
 *
 * Every function takes what an API hands you — an ISO string, a `Date`, or a
 * timestamp — and returns nb-NO text. The style is always named at the call
 * site, because "format a date" is four different jobs, and a default would
 * quietly pick one of them for you.
 */
export type DateInput = string | number | Date;
/**
 * - `short`  — `15.01.2026`. Numeric, fixed width; for tables and lists.
 * - `medium` — `15. jan. 2026`. Unambiguous without being long.
 * - `long`   — `15. januar 2026`. For a single date the reader will dwell on.
 * - `day-month` — `15. jan.`. No year, for recent-activity lists where the
 *   year is understood and repeating it is noise.
 */
export type DateStyle = "short" | "medium" | "long" | "day-month";
/**
 *     formatDate("2026-01-15T10:30:00Z")           // "15.01.2026"
 *     formatDate("2026-01-15T10:30:00Z", "long")   // "15. januar 2026"
 *
 * Renders in the *runtime's* time zone. On a server that means UTC unless the
 * process says otherwise, which is how an evening order can show yesterday's
 * date — format in the browser, or pass an already-localised value.
 */
export declare function formatDate(value: DateInput, style?: DateStyle, empty?: string): string;
/** `15.01.2026 10:30` — the same styles, with the clock appended. */
export declare function formatDateTime(value: DateInput, style?: DateStyle, empty?: string): string;
/** `10:30`. */
export declare function formatTime(value: DateInput, empty?: string): string;
/**
 * `i går`, `om 3 timer`, `for 2 dager siden`.
 *
 * Pass `now` to make the result testable, or to render consistently against a
 * clock you already have.
 */
export declare function formatRelativeTime(value: DateInput, now?: DateInput, empty?: string): string;
/**
 * `2026-01-15` — the value a `<input type="date">` expects, in local time.
 *
 * `toISOString()` is the wrong tool here: it converts to UTC first, so on a
 * Norwegian evening it hands you tomorrow. The `sv-SE` locale renders
 * ISO-shaped dates without leaving the local zone.
 */
export declare function toDateInputValue(value?: DateInput): string;
//# sourceMappingURL=date.d.ts.map