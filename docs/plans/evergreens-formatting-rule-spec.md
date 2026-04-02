# Evergreens Formatting Rule Spec

## Purpose

This document captures the current formatting-rule updates being designed for the Evergreens Assistant (EG-A, `content_table`) so the work can be resumed later without losing context.

The goal is to replace broad legacy numeric/date exclusion behavior with a more precise semantic formatting system that preserves meaning in a structured way.

## High-Level Decision

Prefer semantic replacement tokens over generic removal or `{variable}` substitution when EG-A detects:

- dates
- times
- date-time strings
- financial amounts
- financial deltas
- percentages
- links
- legal disclaimers and disclosure blocks
- names and entity names
- contact information
- addresses and location strings
- reference numbers and codes
- counts, quantities, measurements, and durations

The new rules should replace the current generic formatting-related logic where it creates ambiguity or destroys useful meaning.

## Why The Old Rules Need Replacement

Current code paths include legacy behavior that is too broad for the new EG-A formatting goals:

- `custom/config.json`
  - `Date/time stamp` currently excludes matching date/time strings completely.
- `src/core/contentTable/exclusionRules.ts`
  - standalone numeric values are excluded
  - standalone currency values are excluded
  - mixed text plus numerics are rewritten with `variableizeNumerics()`

This creates conflicts with the new desired behavior because some numbers should be preserved as semantic placeholders instead of being removed or replaced with a generic `{variable}` token.

## Replacement Strategy

Replace formatting-related legacy rules with typed formatting placeholders.

Recommended replacement direction:

1. Remove or disable the current date/time exclusion rule once the new date/time formatter is implemented.
2. Remove or disable built-in generic numeric and currency exclusion for values that now match the financial formatting rules.
3. Remove or disable broad `variableizeNumerics()` behavior for formatting-like content that should become typed placeholders.
4. Keep non-formatting hygiene rules only if they still make sense after review.

Likely keep for separate review:

- dash placeholder exclusion
- short uppercase flagging such as ticker-like text

These are not part of the new formatting-token family and should be reviewed independently.

## Ignore Strategy For Universal Figma Shell Elements

EG-A also needs a first-pass ignore mechanism for screen regions that are present in many files but are often not part of the design content being inventoried.

Common examples:

- top navigation bars
- left-side rails
- global app chrome
- reusable headers/footers
- shared shell components from a design system library
- repeated utility elements that should not enter the content inventory

### Best Strategy

For the open-source project, the best strategy is:

1. maintain a **human-editable ignore source file** in the repo
2. keep that file easy to update in a normal code editor
3. compile or normalize that file into the plugin's ignore-rule structure at build time
4. run ignore filtering **before** semantic placeholder classification

This avoids hardcoding one team's navigation names into the product while still giving each implementation team a simple way to tune EG-A for its own design system and shell patterns.

### Recommended Source Of Truth

Preferred authoring model:

- author rules in a markdown or text file under `custom/`
- parse that file into typed ignore rules used by the plugin

Recommended file shape:

- `custom/content-table-ignore-rules.md`

Why this is preferable:

- easy for non-engineers or occasional contributors to edit
- can hold comments, rationale, examples, and sections
- keeps project-specific ignore patterns out of code
- works well for open source because each adopter can customize it without changing core logic

If markdown parsing feels too heavy for the first pass, a plain text format is also acceptable:

- `custom/content-table-ignore-rules.txt`

But markdown is the better long-term authoring format because it can document _why_ a pattern exists.

### Rule Types To Support

The current scan architecture already supports these ignore rule concepts:

- `nodeNamePatterns`
- `nodeIdPrefixes`
- `componentKeyAllowlist`
- `componentKeyDenylist`
- `textValuePatterns`

Recommended priority for open-source use:

1. `componentKeyDenylist`
   Use when ignored shell elements come from shared library instances with stable component keys.
2. `nodeNamePatterns`
   Use for stable component or frame names like nav, rail, header, sidebar, app shell, or footer variants.
3. `textValuePatterns`
   Use sparingly for obvious utility-only strings that should never enter the content table.
4. `nodeIdPrefixes`
   Lowest priority for hand-authored configuration because IDs are fragile and design-file-specific.

### Recommended Ignore Categories

The ignore file should support categories like:

- global navigation
- left rail / side rail
- persistent app shell
- shared footer
- utility banners
- repeated support or chrome widgets

Example patterns that a project might choose to include:

- component names such as `Top Nav`, `Header`, `Global Header`, `Side Rail`, `Left Rail`, `App Shell`
- regex patterns such as `(?i).*nav.*`, `(?i).*sidebar.*`, `(?i).*rail.*`
- design-system component keys for shell instances when available

### Suggested File Structure

Recommended markdown authoring structure:

```md
# Content Table Ignore Rules

## Notes

- Ignore universal shell elements before EG-A semantic extraction.
- Prefer component keys over names when available.

## Component Key Denylist

- abc123globalnavkey
- xyz456siderailkey

## Node Name Patterns

- (?i)^top nav$
- (?i)^global header$
- (?i)^left rail$
- (?i)^side rail$
- (?i)^app shell$

## Text Value Patterns

- (?i)^skip to content$
```

### Behavior Requirements

Ignore filtering should happen early and deterministically:

1. selection is resolved
2. ignore rules are loaded
3. ignored nodes are excluded from the scan
4. only remaining content enters formatting/placeholder classification

This is important because universal shell text should not even reach the semantic placeholder pipeline.

### Guardrails

- prefer ignoring by component key or stable node name, not by loose text matching
- do not use aggressive text-value ignore rules for real product copy
- do not make the default open-source ignore set too opinionated
- keep the shipped defaults conservative; let adopters extend the ignore file for their own system
- when in doubt, preserve content rather than over-ignore it

## Token Standard

Use semantic wrapper tokens with Excel-style format codes where appropriate.

## Reversible Tokenization UX

Semantic tokenization must be reversible in the EG-A UI.

The user should be able to:

- see that a value was tokenized
- inspect the original scanned text without losing context
- revert a tokenized value back to the original scanned text if the tokenization was incorrect

### Required UX Behavior

For any tokenized value such as `{{FirstName}}`, `{{TickerSymbol}}`, or `{{Date: mmm dd, yyyy}}`:

1. hovering, focusing, or otherwise inspecting the token should reveal the original scanned text
2. the UI should provide an explicit affordance to revert to the original scanned text
3. revert should be available per item, not only as a global reset

Recommended affordances:

- tooltip or hover card showing `Original text: Biagio`
- inline action such as `Revert`
- icon button such as a restore/reset arrow next to tokenized cells

Example behavior:

| Tokenized value shown in table | On hover / inspect                              | Revert action result                                       |
| ------------------------------ | ----------------------------------------------- | ---------------------------------------------------------- |
| `{{FirstName}}`                | show original scanned text `Biagio`             | replace visible token with `Biagio`                        |
| `{{Year}} contributions`       | show original scanned text `2026 contributions` | replace visible tokenized phrase with `2026 contributions` |
| `{{Link: Privacy Policy}}`     | show original scanned text `Privacy Policy`     | restore literal text                                       |

### Data Model Requirement

Tokenization should not destroy the original scanned text.

Each tokenized item should preserve at least:

- the original scanned text
- the tokenized/effective text
- metadata indicating that the value was tokenized
- optional token classification metadata such as `FirstName`, `Date`, `TickerSymbol`, or `Disclaimer`

Recommended model concept:

- original value remains the source-of-truth scan result
- tokenized value is an overlay or derived view
- revert simply removes the tokenized override and falls back to original content

### Best Strategy For This Repo

The current `ContentTableSession` model already follows the right architectural pattern:

- the original scanned table is immutable
- per-item changes are stored as overlays
- effective items are computed from base + overlay

That means Claude Code should implement tokenization as a session overlay rather than mutating the original scanned content destructively.

This is preferable because:

- revert becomes simple and reliable
- original text can always be shown in a tooltip or side panel
- tokenization mistakes are recoverable without re-running the scan
- future actions like `accept token`, `revert token`, or `show token source` become easier

### Guardrails

- do not replace original scanned text irreversibly
- do not require the user to rescan the frame just to recover one item
- do not hide the fact that a value was tokenized
- make the revert affordance discoverable for both mouse and keyboard users
- if a tokenized phrase covers only part of the original text, the revert action should restore the full original phrase, not just the token segment

### Dates And Times

Use these token families:

- `{{Date: <excel-format>}}`
- `{{Time: <excel-format>}}`
- `{{DateTime: <excel-format>}}`

Examples:

| Source text                 | Replacement                                  |
| --------------------------- | -------------------------------------------- |
| `Apr 28, 2025`              | `{{Date: mmm dd, yyyy}}`                     |
| `Friday, February 28, 2025` | `{{Date: [$-x-sysdate]dddd, mmmm dd, yyyy}}` |
| `4 PM`                      | `{{Time: h AM/PM}}`                          |
| `4:36 PM`                   | `{{Time: h:mm AM/PM}}`                       |
| `16:36`                     | `{{Time: hh:mm}}`                            |
| `Apr 28, 2025 4:36 PM`      | `{{DateTime: mmm dd, yyyy h:mm AM/PM}}`      |

Notes:

- The wrapper token is an EG-A convention.
- The format string inside the token should follow Microsoft Excel custom date/time format structure.
- `[$-x-sysdate]` and `[$-x-systime]` may be used when system-aware formatting is desired.

### Financial Values

Use ISO 4217 currency codes rather than relying only on symbols like `$`.

Use these token families:

- `{{Currency:<ISO>:#,##0.00}}`
- `{{DeltaCurrency:<ISO>:+#,##0.00;-#,##0.00}}`
- `{{Amount:#,##0.00}}`
- `{{Delta:+#,##0.00;-#,##0.00}}`
- `{{Percent:0.00%}}`
- `{{DeltaPercent:+0.00%;-0.00%}}`

Examples:

| Source text           | Replacement                                                                |
| --------------------- | -------------------------------------------------------------------------- |
| `$500,561.88`         | `{{Currency:USD:#,##0.00}}`                                                |
| `+$2,545.34`          | `{{DeltaCurrency:USD:+#,##0.00;-#,##0.00}}`                                |
| `+2,545`              | `{{Delta:+#,##0;-#,##0}}`                                                  |
| `2,545`               | `{{Amount:#,##0}}`                                                         |
| `-$2,545.34`          | `{{DeltaCurrency:USD:+#,##0.00;-#,##0.00}}`                                |
| `+$2,545.34 (+4.59%)` | `{{DeltaCurrency:USD:+#,##0.00;-#,##0.00}} {{DeltaPercent:+0.00%;-0.00%}}` |
| `-$2,545.34 (-4.59%)` | `{{DeltaCurrency:USD:+#,##0.00;-#,##0.00}} {{DeltaPercent:+0.00%;-0.00%}}` |

Currency examples:

- `{{Currency:USD:#,##0.00}}`
- `{{Currency:EUR:#,##0.00}}`
- `{{Currency:GBP:#,##0.00}}`
- `{{Currency:JPY:#,##0}}`
- `{{Currency:CAD:#,##0.00}}`

### Links

Use this token family:

- `{{Link: <visible label>}}`

Examples:

| Source text       | Detection signal              | Replacement                 |
| ----------------- | ----------------------------- | --------------------------- |
| `Privacy Policy`  | actual hyperlink              | `{{Link: Privacy Policy}}`  |
| `Learn more`      | underlined text               | `{{Link: Learn more}}`      |
| `Contact support` | actual hyperlink or underline | `{{Link: Contact support}}` |

Notes:

- The actual URL is not needed in the token.
- Preserve the visible label only.
- A link should remain recognizable as a link in the formatted output.

### Legal Disclaimers And Disclosure Blocks

Long legal/compliance copy should usually be represented as a placeholder rather than fully expanded into EG-A rows.

These blocks are often:

- long paragraphs at the bottom of a screen
- fine print below financial claims, charts, rates, or performance data
- disclosure-heavy footers attached to promotions, products, or investing guidance

Recommended token families:

- `{{Disclaimer}}`
- `{{LegalDisclosure}}`
- `{{DisclaimerSummary}}`

Recommended treatment:

| Source pattern                                     | Recommended treatment |
| -------------------------------------------------- | --------------------- |
| long legal paragraph at bottom of screen           | `{{Disclaimer}}`      |
| financial disclosure block under rates/performance | `{{LegalDisclosure}}` |
| collapsible or expandable fine print region        | `{{Disclaimer}}`      |

Preferred default:

- replace the full disclaimer block with a single placeholder
- keep one visible heading or label if it is meaningful, such as `Important disclosures` or `Legal disclaimer`
- do not explode the disclaimer into many individual EG-A rows unless a future compliance-focused mode explicitly needs that

Optional enhanced handling:

- if the block has a visible heading, preserve the heading and then use the placeholder
- if the block is clearly a disclosure tied to a chart, table, APR/rate claim, or investment product, prefer `{{LegalDisclosure}}`
- if a short disclaimer sentence is embedded inline near a claim, it may remain as normal content instead of being collapsed

### Additional Common Variable Content

These variable families are common in UI copy, transactional content, and form-driven product experiences and should be treated as first-class EG-A variables instead of falling through to generic numeric replacement.

Unlike dates, times, and financial values, these tokens do not need Excel-style format codes. Prefer descriptive semantic token names.

#### Identity And Entity Names

Use token families such as:

- `{{PersonName}}`
- `{{FirstName}}`
- `{{LastName}}`
- `{{PreferredName}}`
- `{{DisplayName}}`
- `{{OrganizationName}}`
- `{{CompanyName}}`
- `{{ProductName}}`
- `{{PlanName}}`
- `{{ProjectName}}`

Examples:

| Source text      | Replacement                            |
| ---------------- | -------------------------------------- |
| `John Appleseed` | `{{PersonName}}`                       |
| `Biagio`         | `{{FirstName}}` or `{{PreferredName}}` |
| `Acme Health`    | `{{OrganizationName}}`                 |
| `Premium Plus`   | `{{PlanName}}`                         |

#### Contact Information

Use token families such as:

- `{{Email}}`
- `{{Phone}}`
- `{{PhoneExtension}}`

Examples:

| Source text              | Replacement                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `name@example.com`       | `{{Email}}`                                                  |
| `866-440-1238`           | `{{Phone}}`                                                  |
| `(800) 555-1212 ext. 45` | `{{Phone}} {{PhoneExtension}}` or `{{Phone}}` for first pass |

#### Addresses And Locations

Use token families such as:

- `{{AddressLine1}}`
- `{{AddressLine2}}`
- `{{City}}`
- `{{StateOrRegion}}`
- `{{PostalCode}}`
- `{{Country}}`
- `{{FullAddress}}`
- `{{LocationName}}`

Examples:

| Source text               | Replacement                                  |
| ------------------------- | -------------------------------------------- |
| `123 Main St.`            | `{{AddressLine1}}`                           |
| `Apt 5B`                  | `{{AddressLine2}}`                           |
| `San Francisco, CA 94105` | `{{City}}, {{StateOrRegion}} {{PostalCode}}` |
| `United States`           | `{{Country}}`                                |
| `Chicago Office`          | `{{LocationName}}`                           |

#### Reference Numbers And Codes

Use token families such as:

- `{{OrderNumber}}`
- `{{InvoiceNumber}}`
- `{{ReferenceNumber}}`
- `{{TrackingNumber}}`
- `{{ConfirmationNumber}}`
- `{{TicketId}}`
- `{{CaseNumber}}`
- `{{AccountId}}`
- `{{MemberId}}`
- `{{PromoCode}}`
- `{{VerificationCode}}`

Examples:

| Source text                    | Replacement                                        |
| ------------------------------ | -------------------------------------------------- |
| `Order #123456`                | `{{OrderNumber}}`                                  |
| `Tracking: 1Z999AA10123456784` | `{{TrackingNumber}}`                               |
| `Confirmation code: 482913`    | `{{ConfirmationNumber}}` or `{{VerificationCode}}` |
| `Ticket ID ABC-1042`           | `{{TicketId}}`                                     |
| `Promo code: SAVE20`           | `{{PromoCode}}`                                    |

#### Fixed Names That Contain Numbers

Some phrases contain numbers but should **not** be treated as variable values because the number is part of an established name, label, product, index, form, or program.

These should be excluded from variable replacement and preserved literally.

Common financial and banking examples:

- `S&P 500`
- `401(k)`
- `529 plan`
- `Form 1099`
- `1099-INT`
- `W-2`
- `Roth IRA` when paired with year-independent fixed naming

Recommended treatment:

| Source text | Recommended treatment |
| ----------- | --------------------- |
| `S&P 500`   | preserve literal text |
| `401(k)`    | preserve literal text |
| `529 plan`  | preserve literal text |
| `1099-INT`  | preserve literal text |

Detection guidance:

- if the number is part of a recognized proper name, product name, account type, form name, index name, or program name, do not tokenize the numeric portion
- do not split fixed named entities into mixed literal and variable tokens
- maintain an explicit preserve-list for high-confidence financial named entities with numeric components

#### Years And Partial Variableization

A standalone four-digit year is context-sensitive and should not always be tokenized.

Recommended treatment:

- preserve the year literally when it is acting as static copy, a fixed label, or part of a named term
- partially tokenize the year when it is clearly functioning as a dynamic period or reporting qualifier

Examples:

| Source text          | Recommended treatment                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `2026 contributions` | `{{Year}} contributions` when the year is a true period selector or recurring label        |
| `Tax year 2026`      | `Tax year {{Year}}`                                                                        |
| `2026 outlook`       | `{{Year}} outlook` if the label is generated for a changing year                           |
| `Class of 2026`      | preserve literal text unless the product explicitly treats graduation year as dynamic data |
| `S&P 500`            | preserve literal text; do not treat `500` as variable                                      |

Year decision heuristic:

1. If the phrase is a known fixed name, preserve it literally.
2. If the year modifies a recurring business concept like contributions, tax year, statement year, forecast, performance, filing, or enrollment period, prefer partial variableization.
3. If the year appears inside a full date, apply the date/date-time rules instead.
4. If confidence is low, prefer preserving the literal phrase over incorrect tokenization.

#### Ticker And Security Symbols

Ticker-like values are common in financial content, but EG-A should identify them using context rather than a giant maintained symbol list.

Recommended token families:

- `{{TickerSymbol}}`
- `{{SecuritySymbol}}`
- `{{BondIdentifier}}`
- `{{SecurityIdentifier}}`

Recommended treatment:

| Source text       | Recommended treatment                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| `AAPL`            | `{{TickerSymbol}}` when adjacent context indicates equity/security symbol |
| `GOOGL`           | `{{TickerSymbol}}` when adjacent context indicates equity/security symbol |
| `BRK.A`           | `{{TickerSymbol}}`                                                        |
| `NYSE: IBM`       | `{{TickerSymbol}}` or `{{SecuritySymbol}}`                                |
| `CUSIP 037833100` | `{{BondIdentifier}}` or `{{SecurityIdentifier}}`                          |
| `US0378331005`    | `{{SecurityIdentifier}}`                                                  |

Detection guidance:

- do not rely on a full symbol allowlist
- require contextual evidence before converting a short uppercase token into a ticker placeholder
- when context indicates a broader security instrument rather than an equity ticker, prefer `{{SecuritySymbol}}` or `{{SecurityIdentifier}}`
- if the token could plausibly be an acronym, UI label, or fixed name rather than a tradable symbol, do not replace it unless supporting context exists

High-confidence context cues:

- explicit nearby labels such as `Ticker`, `Symbol`, `Exchange`, `Security`, `CUSIP`, `ISIN`, `Bond`, `ETF`, `Fund`, `Stock`
- exchange-qualified patterns such as `NYSE: IBM`, `NASDAQ: AAPL`, `LSE: VOD`
- company-name plus parenthetical ticker patterns such as `Apple (AAPL)`
- watchlist, holdings, portfolio, quote, trade-ticket, asset-detail, market-data, or screener contexts

Pattern guidance:

- common equity ticker pattern: short uppercase token, often 1 to 5 letters
- allow dotted share-class variants such as `BRK.A`
- allow exchange-qualified variants
- treat CUSIP and ISIN as separate identifier families rather than plain tickers

Low-confidence / avoid replacing without context:

- isolated uppercase tokens in general UI copy
- short acronyms that may be labels, navigation items, or program names
- fixed financial names already handled by the preserve-list

#### Counts, Quantities, Measurements, And Durations

Use token families such as:

- `{{Count}}`
- `{{Quantity}}`
- `{{ItemCount}}`
- `{{UnitCount:<unit>}}`
- `{{Duration}}`
- `{{Distance}}`
- `{{Weight}}`
- `{{Dimension}}`
- `{{Age}}`
- `{{Rating}}`

Examples:

| Source text           | Replacement     |
| --------------------- | --------------- |
| `3 items`             | `{{ItemCount}}` |
| `2 tickets remaining` | `{{Quantity}}`  |
| `25 miles`            | `{{Distance}}`  |
| `15 min`              | `{{Duration}}`  |
| `6 ft x 8 ft`         | `{{Dimension}}` |
| `4.8 stars`           | `{{Rating}}`    |

Notes:

- Prefer semantic unit-aware tokens over plain numeric fallback when the unit is explicit in the content.
- If the unit is visible and meaningful, preserve that meaning in the token instead of collapsing everything to `{{Amount}}` or `{variable}`.

### Tables And Charts

For financial and analytics-heavy content, EG-A should not treat every numeric cell or chart label as normal body copy.

Instead, preserve the structure and semantic meaning needed to understand the content without flooding the content table with repetitive data values.

#### Tables

Best-practice extraction goal:

- preserve table context
- preserve column headers
- preserve row-header labels when they exist
- avoid capturing every numeric data cell as independent content rows
- capture one representative data row only when it helps explain the variable structure of the table

Recommended token families:

- `{{Table: <caption-or-label>}}`
- `{{TableColumnHeader: <label>}}`
- `{{TableRowHeader: <label>}}`
- `{{TableSampleRow}}`

Recommended extraction behavior:

1. If content is clearly part of a data table, capture the table label or caption if one exists.
2. Capture the column header labels as content-bearing rows.
3. Capture row-header labels if they carry meaning independent of the data values.
4. Do not capture all repeated numeric cells in the body by default.
5. Optionally capture the first body row as a sample row when it helps reveal what variables each column represents.
6. If a table is purely decorative, image-based, or too ambiguous to parse reliably, capture a single table-presence marker instead of noisy cell-by-cell output.

Examples:

| Source pattern                                     | Recommended treatment                                         |
| -------------------------------------------------- | ------------------------------------------------------------- |
| financial performance table with labeled columns   | capture caption/title, column headers, meaningful row headers |
| dense numeric grid with repeated values            | omit most body values                                         |
| first row demonstrates variable categories clearly | capture one representative sample row                         |
| simple summary card list laid out like a table     | treat as normal structured content, not as a formal table     |

Important note:

- Capturing the first body row is a useful fallback for financial tables, but it should be a controlled opt-in behavior, not a blanket rule for all tables.

#### Charts

Best-practice extraction goal:

- preserve the existence and purpose of the chart
- preserve chart title or label when available
- preserve high-level meaning, not every plotted value or axis label

Recommended token families:

- `{{Chart: <chart-type-or-label>}}`
- `{{ChartTitle: <label>}}`
- `{{ChartSummary}}`

Recommended extraction behavior:

1. If content is clearly part of a chart or graph, capture that a chart exists.
2. Capture the chart title if it exists and is meaningful.
3. Do not capture every axis label, legend item, or plotted value by default.
4. Prefer a concise summary marker over exhaustive chart transcription.
5. If the chart includes one or two highly meaningful textual insights outside the plotted data, those may be preserved separately.

Examples:

| Source pattern                                      | Recommended treatment                                     |
| --------------------------------------------------- | --------------------------------------------------------- |
| bar chart titled `Revenue by Quarter`               | `{{Chart: bar}}` and `{{ChartTitle: Revenue by Quarter}}` |
| line chart with many dates and values               | capture chart presence and title only                     |
| donut chart with decorative percentages around arcs | do not inventory every number by default                  |
| chart card with one prominent takeaway sentence     | keep the takeaway sentence as content                     |

Preferred default:

- For charts, it is usually enough for EG-A to indicate that a chart exists and what it is about.

## Detection Rules

### Link Detection

Treat text as a link if either of these is true:

- the text has an actual hyperlink in Figma
- the text is underlined and underline is being used as the link indicator

Preferred implementation:

- support substring-aware detection if only part of a text node is linked
- if substring-aware handling is too large for the first pass, support whole-node link detection first

### Date/Time Detection

Detect and replace recognized date/time patterns instead of excluding them.

Initial supported families:

- abbreviated month date
- long weekday plus long month date
- standard 12-hour time
- standard 24-hour time
- combined date-time strings

### Financial Detection

Detect and replace recognized financial patterns instead of excluding them.

Initial supported families:

- currency amount
- signed currency delta
- unsigned amount
- signed non-currency delta
- percent
- signed percent delta
- compound financial string containing amount plus percent

### Identity, Contact, Address, And Reference Detection

Detect and replace common dynamic content fields that frequently appear in UI copy, forms, confirmation states, and transactional messages.

Initial supported families:

- person and organization names
- email addresses
- phone numbers
- street addresses and postal addresses
- order, invoice, tracking, confirmation, account, member, and ticket identifiers
- promo and verification codes
- explicit counts with units
- measurements, dimensions, and durations

### Fixed Named Numeric Phrase Detection

Detect phrases where numerals are part of an official or widely recognized name rather than dynamic content.

Initial supported families:

- financial indexes
- account and plan types
- tax forms and document names
- banking or investing program names
- other preserve-listed named entities with numeric components

Detection guidance:

- run fixed-name detection before generic numeric, date, amount, and quantity rules when the phrase matches a known preserve pattern
- prefer literal preservation over tokenization for recognized names such as `S&P 500` and `401(k)`
- use a curated preserve-list for high-confidence matches and allow future extension in config if needed

### Ticker And Security Detection

Detect ticker-like and security-like identifiers using context-first heuristics instead of a giant allowlist.

Initial supported families:

- equity tickers
- ETF and fund symbols
- exchange-qualified symbols
- dotted share-class symbols
- bond/security identifiers labeled as CUSIP or ISIN

Detection guidance:

- require context signals before classifying an uppercase token as a ticker
- use local surrounding labels, card titles, table headers, and nearby company names to increase confidence
- treat `Ticker`, `Symbol`, `Exchange`, `CUSIP`, and `ISIN` labels as strong cues
- differentiate tickers from broader security IDs when the format or label indicates that distinction
- if confidence is medium or low, preserve the literal token instead of replacing it
- fixed-name preserve rules still win when a matched phrase is a known name like `S&P 500`

### Disclaimer And Disclosure Detection

Detect long legal/compliance blocks and replace them with a low-noise placeholder in the default EG-A mode.

Initial supported families:

- legal disclaimers
- financial disclosure blocks
- fine-print footers
- promotional terms-and-conditions blocks

Detection guidance:

- use position, density, length, and heading cues together rather than a single keyword alone
- prefer block-level detection over line-level detection
- if the block is long and clearly legal/disclosure-oriented, replace it with one placeholder row
- if the region contains a heading and body, preserve the heading and collapse the body
- if confidence is low, keep the text literal rather than incorrectly collapsing non-legal content

### Year-Like Label Detection

Detect year values that may be acting as period qualifiers rather than arbitrary numbers.

Initial supported families:

- contribution year labels
- tax-year labels
- statement-year labels
- annual performance or forecast labels
- reporting-period labels

Detection guidance:

- allow partial replacement like `{{Year}} contributions` when the noun phrase is clearly recurring and the year is the changing variable
- preserve the surrounding text when only the year is dynamic
- do not convert every four-digit number into `{{Year}}`
- if the year is part of a fixed name, preserve the full phrase literally
- if the year is part of a complete date expression, defer to date/date-time classification

### Table And Chart Detection

Detect when text is acting as structural data-visualization scaffolding rather than normal UI copy.

Initial supported families:

- data tables with visible column headers
- tables with row headers
- chart titles
- chart-adjacent labels that identify chart type or purpose

Detection guidance:

- prefer identifying table headers over capturing all body values
- prefer chart-presence markers over extracting every label inside a chart
- if a region appears to be a table, treat header rows and row headers as high-value content and body numerics as low-value by default
- if a region appears to be a chart, treat the title or caption as high-value content and plotted labels as low-value by default
- allow a representative first-row sample only when it adds clear interpretive value for financial or reporting use cases
- avoid exploding one chart into dozens of low-signal EG-A rows

## Recommended Detection Priority

Apply matches in this order to reduce false positives:

0. pre-scan ignore rules for universal shell and excluded components
1. disclaimer and disclosure blocks
2. explicit hyperlink metadata
3. underline-as-link
4. email
5. phone
6. combined amount plus percent strings
7. date-time
8. date
9. time
10. fixed named numeric phrases
11. ticker and security identifiers with strong context
12. year-like recurring labels
13. currency delta
14. currency amount
15. percent delta
16. percent
17. reference IDs and codes
18. address and location strings
19. table headers and table-structure markers
20. chart titles and chart-presence markers
21. unit-bearing measurements and durations
22. numeric delta
23. plain amount
24. count and quantity fallback

## Scope Guardrails

To avoid false positives:

- do not apply broad generic numeric variableization to all mixed text
- prefer full-string formatting matches first
- only replace substrings when the implementation can do so safely and deterministically
- do not keep actual link URLs in the final token output
- do not infer a currency code from `$` alone unless a project default is intentionally defined
- do not collapse emails, phones, addresses, order numbers, promo codes, or names into generic numeric or text placeholders
- prefer descriptive token names over ambiguous placeholders like `{{Value}}` or `{{Variable}}`
- do not inventory entire financial table bodies cell-by-cell unless a later mode explicitly requires that level of detail
- do not expand charts into full data dumps when a chart-presence marker and title are sufficient
- do not tokenize numbers that are integral to fixed names such as indexes, plan names, or form names
- when only one part of a phrase is variable, preserve the non-variable words literally and replace only the dynamic segment
- do not classify arbitrary uppercase acronyms as tickers without supporting financial context
- prefer false negatives over false positives for ticker detection
- do not fully inventory long legal/disclaimer blocks in the default EG-A mode
- preserve short inline disclaimers as normal content when they are tightly coupled to a nearby claim and still readable in context

Recommended handling for `$`:

- default to `USD` only if the project explicitly accepts that convention
- otherwise allow a configurable currency default or require explicit mapping rules

Recommended handling for general placeholders:

- prefer semantic wrappers such as `{{OrderNumber}}` over anonymous wrappers
- when a specific subtype is confidently known, use the specific token instead of a broader category
- if subtype confidence is low, prefer a broad but still meaningful category such as `{{ReferenceNumber}}` instead of `{variable}`

## Current Code Constraints

Current scan output does not yet preserve link metadata or underline state in `ContentItemV1`, so link detection will require code changes in the scanner and schema.

Current numeric handling is implemented in `src/core/contentTable/exclusionRules.ts`, so Claude Code should treat this file as a primary replacement target for the new formatting logic.

The current scan architecture already has an ignore-rule concept in `src/core/work/adapter.ts` via `ContentTableIgnoreRules`, but in the public/open-source path this needs a user-editable source file plus a way to load or generate those rules without requiring a custom Work adapter.

The current session overlay architecture in `src/core/contentTable/session.ts` is compatible with reversible tokenization because the original scanned table is immutable and effective item values are already computed from base data plus per-item overlays.

## Implementation Direction For Claude Code

Claude Code should implement the new EG-A formatting rules as a replacement-oriented pass, not as a conflicting add-on.

Recommended implementation direction:

1. Add a repo-managed ignore source file for universal shell elements, ideally `custom/content-table-ignore-rules.md`, and compile/load it into the existing ignore-rule model.
2. Apply ignore filtering before semantic classification so nav bars, rails, app shell, and other excluded components never enter EG-A output.
3. Add a semantic formatting classifier for dates, times, date-time values, financial values, links, names, contact fields, addresses, IDs/codes, and unit-bearing quantities.
4. Store tokenized values as non-destructive session overlays so each tokenized item can reveal its original text and revert cleanly.
5. Add UI affordances for token inspection and revert, including hover/focus disclosure of original text and a per-item revert action.
6. Add block-level disclaimer/disclosure detection so long legal text can collapse into a single placeholder.
7. Add preserve-list detection for fixed named numeric phrases such as financial indexes and account/form names.
8. Add context-first ticker/security detection that does not depend on a full maintained symbol list.
9. Add year-like label detection that supports partial replacement when only the year is dynamic.
10. Add table/chart-aware structural detection so EG-A can preserve headers and chart presence without ingesting every body value.
11. Replace formatting-related legacy exclusions and broad numeric variableization where the new classifier now applies.
12. Extend scan-time data capture to preserve hyperlink and underline signals needed for link detection.
13. Keep non-formatting hygiene rules separate from semantic formatting rules.
14. Add focused tests for each supported variable family and for ordering/precedence behavior, including revert behavior and original-text disclosure.

## Claude Code Execution Brief

This document should be sufficient for Claude Code to review and implement the EG-A upgrade without requiring a second design brief.

### Request To Claude Code

Run a full audit of the Evergreens Assistant (EG-A / `content_table`) implementation and its nearby dependencies, then design and implement the best solution to achieve the outcomes in this document.

Do not treat this document as a rigid implementation recipe.

Instead:

- use it as the source of truth for desired behavior
- review the existing code carefully
- identify where the current architecture is already strong
- improve and extend existing patterns where possible
- choose the best enterprise-grade implementation path

### Explicit Guidance

- do a full audit before coding
- review both plugin logic and relevant supporting UI/session/schema code
- review existing duplicate-content logic and ignore-rule logic and improve on them rather than re-inventing them blindly
- review dependencies and nearby architecture for the most maintainable approach
- use the superpowers planning/brainstorming workflow where helpful to identify the strongest solution before implementation
- do not be constrained to only the examples in this document; use them as behavioral targets

### Existing Areas Claude Code Should Audit

Primary areas:

- `src/assistants/evergreens/`
- `src/core/contentTable/`
- `src/core/figma/`
- `src/ui.tsx`
- `src/ui/components/ContentTableView.tsx`
- `src/core/work/adapter.ts`
- `custom/config.json`
- generated/custom-config and any overlay-generation paths that influence EG-A behavior

Particularly relevant existing logic:

- duplicate detection
- ignore-rule support
- session overlays and editable content-table state
- scan pipeline and selection handling
- existing exclusion rules and numeric variableization

### Success Looks Like

Claude Code should aim to deliver an enterprise-level EG-A experience with the following outcomes:

1. EG-A identifies meaningful variable content across financial and general-product screens with much higher precision than the current implementation.
2. EG-A avoids noisy extraction of low-value content such as universal shell elements, repeated table numerics, chart internals, and long disclaimer blocks.
3. EG-A preserves high-value structure such as headers, chart titles, and meaningful labels.
4. Tokenization is reversible in the UI: users can inspect original scanned text and revert mistaken tokenization per item.
5. Ignore behavior is configurable in a repo-managed, editor-friendly way suitable for open-source adopters.
6. Named financial terms, fixed numeric names, and low-confidence ticker-like acronyms are handled safely.
7. The solution builds on existing duplicate and ignore capabilities rather than fighting them.
8. The final system feels coherent, extensible, and maintainable rather than like a pile of special cases.

### What Not To Do

- do not simply stack more regexes on top of the old behavior if a cleaner architectural refactor is warranted
- do not preserve legacy numeric/date exclusion behavior when it conflicts with the new semantic-placeholder goals
- do not make the default ignore behavior overly opinionated for all open-source adopters
- do not make tokenization destructive
- do not optimize for narrow demo cases at the expense of maintainability

### Expected Deliverables

Claude Code should ideally deliver:

- code updates needed to implement the new EG-A behavior
- any schema/session/model changes needed to support reversible tokenization
- a repo-managed ignore-rule authoring path
- focused automated tests
- concise documentation updates if implementation details need to be captured for future maintainers

### Recommended Prompt To Give Claude Code

Use this document as the primary brief and ask Claude Code to:

`Review figmai_plugin/docs/plans/evergreens-formatting-rule-spec.md, audit the full EG-A implementation and nearby dependencies, identify the best enterprise-grade solution using the repo's existing patterns where possible, and implement the upgrade end-to-end. Start with an audit and plan, then execute the work.`

## Summary

EG-A should move from:

- excluding dates
- excluding standalone numerics/currencies
- replacing mixed numerics with `{variable}`

to:

- preserving meaningful formatted content as typed semantic placeholders
- using Excel-style formatting codes for dates, times, and numeric presentation
- preserving link meaning as `{{Link: label}}`
- preserving common dynamic content such as names, contact fields, addresses, IDs, and unit-bearing values as descriptive semantic placeholders
- preserving table and chart structure at a high-information, low-noise level that works for financial content
- preserving fixed numeric names literally while still supporting partial variableization for truly dynamic year-based labels
- identifying ticker/security symbols with context-aware heuristics while avoiding a brittle master list
- collapsing long legal/disclaimer blocks into a disclaimer placeholder in the default EG-A mode
- excluding universal shell elements like nav bars and side rails through a repo-managed pre-scan ignore rule file
- letting users inspect tokenized values, see the original scanned text, and revert mistaken tokenization without rescanning

This should become the new baseline rule set for formatting-aware Evergreen extraction.
