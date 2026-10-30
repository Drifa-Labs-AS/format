# Changelog

## v2.0.0 — 2026-10-30

**The money functions refuse rather than guess.** Every change below turns an
amount that v1 rounded or approximated into `NaN` (parsers) or the `empty`
text (formatter), with one widening (comma-only grouping, below). Nothing
that v1 read as an exact øre count reads differently.
Decided by Andreas, 30 Oct 2026; products stay on v1 until each chooses to
upgrade.

### `parseOre`

- **More than two decimals is refused.** `"1,999"` was 200 øre; it is `NaN`.
  Same for `"0,005"`, `"1,005"`, `"1.2345"`.
- **A lone period followed by exactly three digits is refused.** `"4.725"`
  was read as 4 725 kr (period as grouping), while `"4,725"` was read as
  4,725 kr and rounded to 472 øre — the same keystrokes a factor of a thousand
  apart. Both are `NaN` now. The digits still parse when something settles the
  reading: `"4.725,–"`, `"4.725,-"` and `"4.725,50"` are grouped; `"4 725"`
  and `"4725"` are whole kroner; `"12.345.678"` has two periods, so neither
  can be the decimal mark. The price of this rule: `formatOre` output with
  `grouping: "period"` in the `kr` or `bare` style no longer round-trips for
  whole amounts of 1 000–999 999 kr (`"126.000 kr"` is `NaN`). The default
  space grouping and the `dash` style always round-trip — pre-fill an input
  with one of those.
- **Comma-only grouping is accepted.** `"1,234,567"` was `NaN` in v1 (the
  commas were all read as decimal marks); two commas cannot both be the
  decimal mark, so it is 123 456 700 øre now. The one widening in v2.
- **Grouping is checked.** `"1.23.4"` and `"1234.567,50"` were accepted; they
  are `NaN`. Groups after the first must be exactly three digits, as in
  `"12.345.678"` and `"1,234,567"`.
- **Past `Number.MAX_SAFE_INTEGER` øre is refused** instead of returning a
  float that only looks like an integer.
- **No float anywhere.** The digits are read into øre directly, so the
  `kronerToOre(1.005)` caveat no longer applies to parsed input — and the
  `kronerToOre` doc comment, which claimed as much in v1, is now true.

### `formatOre`

- **A fractional øre amount renders as `empty`** (`"–"` by default).
  `formatOre(472550.5)` was `"4 725,51 kr"`; a fraction of an øre is a bug
  upstream, and printing it rounded hid the bug.
- **Past `Number.MAX_SAFE_INTEGER` renders as `empty`** instead of an
  approximation, and every amount up to that limit renders exactly (the
  split into kroner and øre is integer arithmetic, not `ore / 100`).

### `kronerToOre`

- **Returns `NaN`** when the rounded result is not a safe integer.
  `kronerToOre(1e20)` was `1e22`. `formatKroner` inherits this and renders
  such an amount as `empty`.

### Unchanged

`oreToKroner`, the date and number modules, every `MoneyStyle` and
`MoneyOptions`, and the output of `formatOre` for every whole, safe-integer
øre amount.

### Upgrading

```bash
npm install github:Drifa-Labs-AS/format#v2.0.0
```

Then look at where `parseOre`'s `NaN` goes: a form that already shows
«Ugyldig pris» on `NaN` needs nothing else. A screen that formats a computed
amount and now shows `–` where it showed a number has found a fractional øre
upstream — fix the arithmetic, not the formatter.

## v1.0.0 — 2026-09-28

First release: money as whole øre (`parseOre`, `formatOre`, `formatKroner`,
`kronerToOre`, `oreToKroner`), dates and numbers.
