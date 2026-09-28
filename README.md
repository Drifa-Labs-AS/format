# @drifa/format

Norwegian formatting, written once. **Money is a whole number of øre.**

Small, dependency-free helpers for writing money, dates and numbers the way a
Norwegian reader expects them — `4 725,50 kr`, `15. januar 2026`, `25,5 %` —
and for reading back what a Norwegian types into a price field.

## The convention

Money is an integer count of øre. 1 kr = 100 øre.

A price is `472550`, not `4725.50`. Amounts add and subtract without a
rounding rule, comparisons are exact, and there is no fractional øre to lose —
because a fraction of an øre is not something you can pay, invoice or
reconcile. It is a rounding error that has not surfaced yet.

There is one money formatter, and its name says the unit. Two formatters side
by side — one taking kroner, one taking øre — are one factor of 100 apart, and
a formatter you can pick wrong is a wrong invoice waiting for a distracted
afternoon.

`decimal(10,2)` in a database is *also* exact and is not a bug — see
[Money that is stored as decimals](#money-that-is-stored-as-decimals) below.
What this convention rules out is money in a float.

## Install

```bash
npm install github:Drifa-Labs-AS/format#v1.0.0
```

No registry account, no token, no `.npmrc`. `npm ci` resolves it from the
lockfile like any other dependency. Upgrading is a new tag and a lockfile
change, which means it shows up in review.

## Money

```ts
import { formatOre, parseOre, kronerToOre, formatKroner } from "@drifa/format";

formatOre(472500)                     // "4 725 kr"
formatOre(472550)                     // "4 725,50 kr"
formatOre(472500, "kr-exact")         // "4 725,00 kr"
formatOre(472500, "dash")             // "4 725,–"
formatOre(472500, { style: "dash", dash: "-" })               // "4 725,-"
formatOre(472500, "bare")             // "4 725"
formatOre(null)                       // "–"

formatOre(12600000, { style: "dash", grouping: "period" })   // "126.000,–"

parseOre("389,50")                    // 38950
parseOre("4.725,-")                   // 472500
parseOre("")                          // null   — blank field
parseOre("abc")                       // NaN    — not a number
```

`parseOre` returns `null` for an empty field and `NaN` for garbage so a form
can tell "no price" from "you typed nonsense":

```ts
const ore = parseOre(input);
if (Number.isNaN(ore)) return "Ugyldig pris";
listing.priceOre = ore;               // number | null
```

The space in the output is U+00A0, so a price never wraps across two lines.
Negatives carry U+2212, the real minus sign.

## Dates and numbers

```ts
formatDate("2026-01-15T10:30:00Z")            // "15.01.2026"
formatDate(iso, "medium")                     // "15. jan. 2026"
formatDate(iso, "long")                       // "15. januar 2026"
formatDate(iso, "day-month")                  // "15. jan."
formatDateTime(iso)                           // "15.01.2026, 11:30"
formatTime(iso)                               // "11:30"
formatRelativeTime(iso)                       // "i går"
toDateInputValue()                            // "2026-01-15" for <input type="date">

formatNumber(1234567.5)                       // "1 234 567,5"
formatPercent(0.255, { fraction: true, decimals: 1 })  // "25,5 %"
formatDelta(-3)                               // "−3"  (a real minus sign)
formatMinutes(150)                            // "~2 t 30 min"
```

`formatDate` has no default beyond `short`; "format a date" is several
different jobs, so the style is named at the call site.

Dates render in the runtime's time zone. On a server that is usually UTC,
which is how an evening order shows yesterday's date — format in the browser,
or pass an already-localised value. `toDateInputValue` is the exception and is
deliberately local: `toISOString()` hands you tomorrow on a Norwegian evening.

## Using it in an app

Keep a small `format.ts` in the app that *binds* the styles you want —
`formatPrice = (ore) => formatOre(ore, "kr-exact")` and so on — and import
from that. The app's screens get short, consistent names, and the arithmetic
stays here.

Add a rule to this package, not to a binding. A binding that starts doing
arithmetic is the thing this package exists to delete.

## Money that is stored as decimals

`formatKroner` renders a `decimal` column identically to an øre one, so an app
can adopt the single formatter before — or instead of — migrating its schema:

```ts
formatKroner(4725) === formatOre(472500)      // true
```

A `decimal(10,2)` column is an exact money type, not the float this convention
exists to prevent. Converting a large codebase from decimals to øre can be real
risk for no correctness gained, so adopting the formatter on its own is a
legitimate stopping point.

New money is øre.

## Working on this package

```bash
npm run check     # typecheck, tests included
npm test          # 38 tests, no test framework to install
npm run build     # emit dist/
npm run verify    # all of the above, and fails if dist/ is stale
```

`dist/` is committed, because a `github:` dependency installs what the repo
contains. Run `npm run build` and commit the result before tagging a version.

CI runs `npm run verify` on Node 24 for every push and pull request
(`.github/workflows/verify.yml`), so a stale `dist/` or a red test cannot reach
`main` unnoticed.

Three tests are skipped on purpose. Each sits next to a test that pins a
behaviour that is wrong for money — `formatOre` rounding a fractional øre,
`parseOre` rounding `"1,999"` to two decimals, `kronerToOre` returning an
imprecise number past `Number.MAX_SAFE_INTEGER` — and describes the safer
behaviour instead. Making them pass changes the API, which is a v2 decision;
until then the pin is what stops the change from happening by accident.

Tests run on Node's own runner against the TypeScript sources directly — Node
24 strips the types. The date suite pins its own time zone, so it does not pass
in Oslo and fail in CI. There is no test framework and no bundler in this repo,
and it should stay that way.

Scope is deliberately small: money, dates, numbers. Not a component library,
not a design system.
