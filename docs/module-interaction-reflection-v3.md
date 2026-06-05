# Module Interaction Reflection V3

## 1. Module Evaluation

The calendar dimension must represent operational time, not merely the existence of a date field. A date field on master data can be useful for record keeping, but it does not always deserve a calendar workbench.

| Module | Current Time Meaning | Calendar Decision | Reason |
| --- | --- | --- | --- |
| Dashboard | Current portfolio state from entered prices, FX, trades, and cashflows | No calendar panel | Dashboard should show current calculated state and a clear data date, not behave like a ledger. |
| Accounts | Account setup and account attributes | Remove calendar | `initial_entry_date` is master-data onboarding, not account daily performance. |
| Securities | Security master data | No calendar | No operational date dimension. |
| Transactions | Trade execution ledger | Keep calendar | Trade date is a real operational dimension. |
| Cashflows | Cash movements and corporate actions | Keep calendar | Cashflow date is a real operational dimension. |
| Prices | Manual market price records | Keep calendar | Price date is the quote coverage dimension. |
| FX Rates | Manual FX records | Keep calendar | Rate date is the quote coverage dimension. |
| Sources | Information evidence records | Keep calendar | Information date, obtained date, and entered date support research workflow review. |
| Theses | Thesis lifecycle and review planning | Keep calendar, default to next review date | Review due date is more useful than initial thesis establishment for daily operation. |
| Review Events | Scheduled events and review tasks | Keep calendar | Expected date is the primary workflow. |
| Trade Decisions | Pre-trade decision log | Keep calendar | Decision time is the audit timeline. |
| Risk Rules | Configuration master data | No calendar | Risk thresholds are configuration, not date activity. |
| Exceptions | Audit exceptions and violations | Keep calendar | Exception date is an operational review timeline. |
| Export | Data extraction action | No calendar | Export is an action page. |

## 2. More Reasonable Transformation

The generic rule should be explicit:

- Date workbench is opt-in by module semantics, not automatic for every date field.
- Static master-data modules can retain date fields inside forms and tables, but should not render calendar panels.
- Modules with multiple useful dates should have a deliberate default date field.
- Calculated portfolio surfaces should show their data date so the user can tell whether numbers reflect the latest entered data.

For accounts specifically, the right future feature is not an account setup calendar. It is an account performance module based on daily account-level snapshots:

- account ID
- snapshot date
- market value
- cash value
- net asset value
- daily P&L
- cumulative P&L
- external cashflow adjustment

That dataset does not currently exist as a complete feature, so V3 should not pretend that account master data is account performance.

## 3. Transformation Requirements

Immediate V3 requirements:

- Add module metadata for calendar behavior.
- Disable calendar for `accounts`.
- Keep calendar for transaction, cashflow, price, FX, source, thesis, review event, trade decision, and exception workflows.
- Default thesis calendar to `next_review_date`.
- Keep all date fields available in forms and data tables.
- Make dashboard recompute from the latest entered market price date instead of a fixed hardcoded date.
- Show dashboard data date as a visible metric.
- Use latest price and FX rate on or before the calculation date.
- Add tests proving static master data does not show a calendar and operational modules still do.

Deferred requirements:

- Add a real account performance or account NAV module.
- Add explicit snapshot generation for account-level daily P&L.
- Add historical as-of controls once account and portfolio snapshots are complete.

## 4. Self-Review

The first version of the calendar workbench was too mechanical: it rendered a calendar wherever a module had a date field. That is wrong for accounts because it conflates setup metadata with investment performance.

The corrected approach is stronger because the module metadata captures product intent. It also keeps the generic component reusable while giving each module a semantic override.

The dashboard also needed correction. If users manually add a newer price, the dashboard should recalculate from that newer market data. A fixed date is inconsistent with the manual-data workflow.

## 5. Second Iteration

Second-pass refinements:

- Do not build account P&L until the account-level daily snapshot model exists.
- Use current holdings and latest available price/FX for dashboard recalculation.
- Show the dashboard data date to avoid hidden calculation state.
- Keep thesis review planning visible by defaulting its calendar to next review date.
- Preserve dense table workflows; the calendar remains a filter and orientation layer, not a replacement for records.

## Implemented in V3

- `accounts` calendar removed.
- `theses` calendar defaults to `next_review_date`.
- dashboard data date added.
- portfolio snapshot calculation now uses latest price and FX on or before `asOfDate`.
- dashboard `asOfDate` now follows latest entered market price date.
- tests added for calendar semantics and latest-data recomputation.
