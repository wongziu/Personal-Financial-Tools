# Interaction Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the local investment system easier to operate by adding reusable date workbench interactions, lightweight FX quick lookup/entry, and more modern data-page affordances.

**Architecture:** Keep the existing Next.js App Router and metadata-driven module architecture. Add pure helper functions for date/filter logic, then wire those helpers into `ModulePage` and a small FX-specific client panel.

**Tech Stack:** Next.js App Router, TypeScript, React client components, SQLite via existing API routes, shadcn/ui, lucide-react, Vitest, Playwright.

---

## File Structure

- `docs/interaction-modernization-v2.md`: product interaction principles, detailed requirements, self-review notes.
- `src/lib/module-interactions.ts`: pure functions for date fields, date filtering, calendar cells, summary metrics, and latest FX rates.
- `src/lib/module-interactions.test.ts`: unit tests for the helper functions.
- `src/lib/i18n.ts`: add labels for calendar workbench, filters, metrics, and FX quick entry.
- `src/components/module-page.tsx`: render summary metrics, date controls, calendar activity, and filtered table.
- `src/components/fx-quick-panel.tsx`: lightweight latest-rate lookup and quick rate insertion form.
- `tests/e2e/core.spec.ts`: add calendar-filter and FX quick-entry coverage.

## Tasks

### Task 1: Pure Interaction Helpers

- [x] Create `src/lib/module-interactions.ts` with helpers:
  - `getDateFields(definition)` returns module fields with `type === "date"`.
  - `formatDateKey(value)` returns `YYYY-MM-DD` or `null`.
  - `buildCalendarMonth(rows, dateColumn, month)` returns stable day cells with counts.
  - `filterRowsByDate(rows, dateColumn, filter)` supports all, last30, month, and day.
  - `getLatestDate(rows, dateColumn)` returns latest date key.
  - `getLatestFxRates(rows)` returns latest rows by `from_currency -> to_currency`.

- [x] Add unit tests in `src/lib/module-interactions.test.ts` for each helper.

### Task 2: Generic Module Workbench

- [x] Modify `src/components/module-page.tsx`:
  - Detect date fields from module metadata.
  - Add summary metric cards.
  - Add date field selector, preset buttons, month input, and clear filter.
  - Add calendar month grid for date-enabled modules.
  - Apply search and date filtering before rendering table rows.

### Task 3: FX Quick Panel

- [x] Create `src/components/fx-quick-panel.tsx`:
  - Show latest non-CNY rates.
  - Provide quick `from`, `to`, `rate`, `date`, and source controls.
  - Save through `/api/modules/fx-rates` and refresh on success.

- [x] Render this panel only on the `fx-rates` module page.

### Task 4: i18n and Tests

- [x] Add dictionary labels for calendar/filter/FX interactions in `src/lib/i18n.ts`.
- [x] Add Playwright checks:
  - Transactions page shows calendar dimension and clicking a populated day filters rows.
  - FX page shows latest rates and saving a quick rate adds visible data.

### Task 5: Verification and Audit

- [x] Run `npm run lint`.
- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `npm run test:e2e`.
- [x] Start local dev server and inspect every primary route for blank pages, framework overlays, console errors, and obvious interaction/layout issues.
- [x] Perform a second cleanup pass for issues found during route audit.
