# Self-Entry Optimization Iteration 2

## Scope

This iteration focuses on cashflow and corporate-action entry. After transaction entry was simplified, cashflows remain too accounting-heavy: a user still has to decide whether a row is external capital, investment income, and how much the base-currency amount should be.

## External Reference Notes

Open-source finance products tend to separate user-facing event selection from bookkeeping effects:

- Personal finance tools classify movements by transaction type and category, then derive reporting meaning from that classification.
- Portfolio tools model deposits, withdrawals, dividends, fees, and taxes as distinct activity types instead of making users manually tag every accounting flag.

For this app, the matching direction is to keep the cashflow form event-driven: the user chooses the account/security and event type, enters the economic fact, and the system derives reporting attributes.

## Page-by-Page Reflection

### Accounts

No change in this iteration. Account master data already defines currency and net-worth inclusion, which cashflows can reuse.

### Securities

No schema change. Cashflows should use existing security metadata to infer the linked account and currency when a cashflow is security-related, such as dividends, taxes, or rights issues.

### Transactions

No change. Transaction gross/base derivation was completed in iteration 1.

### Cashflows

Current pain:

- User must manually set `外部现金流`, even though only deposits and withdrawals should affect performance exclusion.
- User must manually set `计入收益`, even though only dividends and interest should count as investment income in V1.
- User must manually calculate base-currency amount.
- Security-related flows still require redundant account and currency selection.

Better interaction:

- Selecting a security should default the account to the security's linked account and the currency to the security currency.
- Selecting an account should still default the currency when no security is selected.
- `基准金额`, `外部现金流`, and `计入收益` should be computed result fields.
- Amount entry should be positive; cash direction is determined by cashflow type.

### Prices

No change in this iteration. Price queue and security selection already target the date + security workflow.

## Backend Requirements

- Cashflow insertion and editing must derive:
  - `amount = abs(input amount)`
  - `base_currency_amount = abs(amount) * fx_rate`
  - `is_external = true` for `Deposit` and `Withdrawal`; otherwise `false`
  - `is_investment_income = true` for `Dividend` and `Interest`; otherwise `false`
- Derivation must run server-side before validation and insert/update.
- Existing account performance logic should continue using cashflow type to apply signs, so deposits and withdrawals are excluded correctly from daily P&L.

## UI Requirements

- Cashflow form should show `基准金额`, `外部现金流`, and `计入收益` as read-only computed fields.
- Selecting a security should fill linked account and currency.
- Changing type, amount, or FX rate should update computed values immediately.
- Boolean computed fields should display localized `是/否`, not raw `true/false` or `1/0`.

## Acceptance Tests

- Integration: deposit rows saved with missing or wrong derived fields are stored with correct base amount and external/income flags.
- Integration: dividend rows saved with wrong derived flags are stored as non-external investment income.
- E2E: cashflow form selecting Apple fills account/currency, computes base amount, and shows dividend flags as `否` / `是`.

## Iteration Self-Review

This is a stronger usability improvement than merely adding helper text. It removes accounting classification from the user's task and makes the server the final authority. It is still V1-conservative: it does not introduce double-entry accounting, transfer pairing, tax lots, or broker import. A future iteration should evaluate whether FX cashflows need a paired two-currency form.
