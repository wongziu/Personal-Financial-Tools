# Interaction Modernization V2

## Current-State Reflection

The V1 app already covers the trading loop, but the interaction model is still mostly "open a table, search text, add a record". That is workable for data entry, but not enough for day-to-day investment use because the user needs to answer time-sensitive questions quickly:

- What changed recently?
- Which records belong to this month or a specific date?
- Which review events are coming up?
- What is the latest FX rate before I enter a non-CNY transaction?
- Am I looking at all data or a narrowed operational subset?

The current generic module structure is the right foundation. Most pages share the same `ModulePage`, so the highest-leverage improvement is to add modern, reusable interaction layers to the generic page instead of creating one-off pages for every table.

## Principles

1. **Time first where time matters.** Any module with a date field must expose a calendar dimension, date presets, and the active date field clearly.
2. **Decision support before raw data.** Pages should surface total records, visible records, latest date, and active filters before the table.
3. **Fast common tasks, detailed forms on demand.** Quick actions such as FX lookup and FX entry should be visible without opening a large generic form.
4. **Progressive disclosure.** Keep tables dense and scan-friendly, but move explanations into hover/focus help and secondary panels.
5. **Consistent controls across modules.** Search, date filters, calendar activity, and clear-filter behaviors should work the same way on every data page.
6. **No hidden state traps.** If the user filters by text, month, day, or range, the UI must show that state and offer a clear reset path.
7. **Desktop-first but not brittle.** Layouts should use responsive grids and scrollable tables so mobile remains readable.
8. **Code stays data-driven.** Reuse module field metadata for labels, dates, default values, and help text instead of hardcoding page variants.
9. **Explanations stay close to content.** Important metrics, page titles, table columns, filters, and quick-entry controls should expose small hover/focus help affordances instead of adding permanent instructional copy.

## Functional Adjustments

### Shared Data Pages

All generic data pages should get a modern workbench header:

- A compact metric strip showing total records, currently visible records, latest relevant date, and active date range.
- A search box that works with all filters.
- Date dimension controls when the module has at least one `date` field:
  - Date field selector when there are multiple date fields.
  - Quick presets: all dates, last 30 days, current selected month.
  - Month selector.
  - Clear date filter.
- Calendar activity panel:
  - Month grid.
  - Each day shows a record count.
  - Clicking a day filters the table to that date.
  - Empty days remain visible so the month shape is stable.
- Table remains the primary data surface and should reflect search plus date filters.
- Page titles, metric labels, search, date controls, and table columns should show a small question-mark help icon with localized wording.

### Date-Enabled Modules

Date interactions apply to:

- `accounts`: initial entry date.
- `transactions`: trade date.
- `cashflows`: cashflow date.
- `prices`: price date.
- `fx-rates`: rate date.
- `sources`: information date, obtained date, entered date.
- `theses`: established date, next review date.
- `review-events`: expected date.
- `exceptions`: exception date.

The selected date field must be explicit because pages like Sources and Theses have multiple valid time dimensions.

### FX Rates

The FX page should be simpler than a full accounting workflow:

- Show the latest known CNY rate for each non-CNY currency.
- Provide a compact quick-entry form for `from`, `to`, `rate`, `date`, and source.
- Default to `USD -> CNY`, today's date, and `Manual quick set`.
- Saving the quick rate uses the same server API and refreshes the page.
- The generic table and calendar remain available below the quick panel for auditability.

### Modern UI Direction

- Prefer a workbench layout: page heading, action row, metric strip, contextual panel, table.
- Keep card radius restrained and use clear hierarchy through spacing, muted labels, and compact badges.
- Use icons only where they clarify actions or state.
- Avoid decorative surfaces that do not improve scanning or workflow.
- Preserve the existing i18n system; new interaction labels must support Simplified Chinese, Traditional Chinese via OpenCC, and English.

## Self-Review Pass 1

The first version of this spec would be incomplete if it only added calendars to one page. The actual user need is repeated, date-aware operation across modules, so the date logic must live in shared helpers and `ModulePage`.

The FX quick-entry feature must not bypass server validation or write directly to SQLite from the client. It should call the existing `/api/modules/fx-rates` route.

The calendar must not replace the table. Investment work still needs dense row comparison, so the calendar should narrow and explain the table rather than become the main storage UI.

## Self-Review Pass 2

The implementation should prove:

- Date pages visibly expose calendar controls.
- Clicking a calendar date changes the row set.
- FX quick lookup is visible without opening a modal.
- FX quick save creates a row and keeps the page usable.
- Existing language switching, theme switching, export, decision flow, and help tooltips keep working.

This means the test plan must include both unit coverage for date filtering helpers and e2e coverage for calendar filtering and FX quick entry.

## Implementation Checklist

- Add focused date/filter helper functions.
- Add tests for date detection, filtering, calendar month generation, and latest FX summaries.
- Extend i18n dictionary for workbench, calendar, and FX labels.
- Refactor `ModulePage` to render summary metrics, date controls, calendar activity, and filtered tables.
- Add `FxQuickPanel` for latest rate lookup and quick entry.
- Add e2e tests for calendar filtering and FX quick entry.
- Run full verification: lint, typecheck, unit tests, build, e2e.
- Perform rendered page audit across all primary routes.
- Do one cleanup/refinement pass after the first rendered audit.
