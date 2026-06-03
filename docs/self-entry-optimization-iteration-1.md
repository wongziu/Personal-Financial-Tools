# Self-Entry Optimization Iteration 1

## Scope

This iteration focuses on the manual data-entry path for the trading loop. The current system can already relate accounts, securities, transactions, and prices, but a human user still has to do avoidable arithmetic while entering trades.

## External Reference Notes

Open-source portfolio products converge on three patterns:

- Activities or transactions are treated as the core event stream for portfolio calculation.
- Accounts and securities are selected from existing data instead of typed repeatedly.
- Local-first/private portfolio trackers emphasize fast manual entry, because not every asset or broker can be imported automatically.

For this app, the matching design direction is not to add import yet. The next highest-leverage improvement is to make manual transaction entry behave like a structured ticket: select known entities, enter only market facts, and let the system calculate accounting fields.

## Page-by-Page Reflection

### Accounts

Current status is acceptable for V1. Accounts are master data, and the form already separates basic information from strategy restrictions. No change in this iteration.

### Securities

The account relationship now exists and is selected from existing accounts. The remaining issue is that downstream forms should use this relationship to reduce repeated account selection. This iteration will use the security's linked account as a default when a transaction security is selected.

### Transactions

Current pain:

- User selects account and security separately, even though a security now has a linked account.
- User must fill currency even though it can be inferred from the selected security/account.
- User must calculate `gross_amount = quantity * unit_price`.
- User must calculate `base_currency_amount` from gross amount, fees, and FX rate.

Better interaction:

- Selecting a security should default the account to the security's linked account.
- Selecting a security should default the transaction currency to the security currency.
- Gross amount and base currency amount should be computed result fields, not manual fields.
- Server-side logic should recompute these values on save so the database never depends on client arithmetic.

### Prices

The price queue already improves the date + security workflow. In this iteration, selecting a security in the generic price form should also fill the price currency automatically.

### Cashflows

Cashflow form already benefits from account/security references. A future iteration can add flow-type-specific amount signs and defaults. No change in this iteration.

## Backend Requirements

- Reference options need metadata, not just display labels. Security options should expose `account_id` and `currency`; account options should expose `currency`.
- Transaction insertion and editing must derive:
  - `gross_amount = quantity * unit_price`
  - `base_currency_amount = adjusted transaction amount * fx_rate`
- Buy-like transactions should include fees in cost. Sell-like transactions should subtract fees from proceeds.
- Server derivation should run before validation and insert/update.

## UI Requirements

- Transaction form should render `成交总额` and `基准货币金额` as read-only computed fields.
- When the user picks a security in Transactions, account and currency should update automatically.
- When quantity, unit price, fees, type, or FX rate changes, computed values should update immediately.
- Price form should fill currency from the selected security.

## Acceptance Tests

- Unit/integration: transaction records saved without manual gross/base values are stored with derived gross and base amounts.
- E2E: transaction form selecting Apple fills the account/currency and shows computed gross/base values after quantity and price are entered.
- E2E: price form selecting Apple fills USD as currency.

## Iteration Self-Review

This is a narrow but meaningful improvement: it removes arithmetic from a high-frequency form and makes the database the authority for derived amounts. It does not solve import, broker matching, or advanced reconciliation. Those are larger workflows and should be handled after manual entry is no longer fragile.
